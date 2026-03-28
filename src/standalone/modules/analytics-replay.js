function getInstanceRunHistory(instance) {
    return Array.isArray(instance && instance.runHistory) ? instance.runHistory : [];
}

function getRunCompletionRatio(run) {
    const total = Math.max(0, Number(run && run.totalSteps) || 0);
    return total ? Math.min(1, Math.max(0, (Number(run.completedSteps) || 0) / total)) : 0;
}

function compareRunResults(a, b) {
    const aComplete = a && a.status === 'completed';
    const bComplete = b && b.status === 'completed';
    if (aComplete !== bComplete) return aComplete ? -1 : 1;
    if ((b.netScore || 0) !== (a.netScore || 0)) return (b.netScore || 0) - (a.netScore || 0);
    if (getRunCompletionRatio(b) !== getRunCompletionRatio(a)) return getRunCompletionRatio(b) - getRunCompletionRatio(a);
    if ((a.elapsedMs || Infinity) !== (b.elapsedMs || Infinity)) return (a.elapsedMs || Infinity) - (b.elapsedMs || Infinity);
    return new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0);
}

function getBestRunForInstance(instance) {
    const history = getInstanceRunHistory(instance).slice().sort(compareRunResults);
    return history[0] || null;
}

function getLatestRunForInstance(instance) {
    const history = getInstanceRunHistory(instance).slice().sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0));
    return history[0] || null;
}

function getNavigationLabel(navStyle) {
    return ({
        sidebar: 'Sidebar',
        topnav: 'Top Nav',
        megamenu: 'Mega Menu',
        hamburger: 'Hamburger',
        hubspoke: 'Hub & Spoke',
        ribbon: 'Ribbon',
        commandpalette: 'Command Palette',
        lefttop: 'Left + Top'
    })[navStyle] || (navStyle || 'Sidebar');
}

function collectRunResults(instances) {
    return instances.flatMap(instance => getInstanceRunHistory(instance).map(run => ({
        ...run,
        instanceId: instance.id,
        appName: instance.appName,
        domain: run.domain || instance.domain,
        seed: Number.isFinite(run.seed) ? run.seed : instance.seed,
        nav_style: instance.nav_style,
        navStyle: run.navStyle || instance.nav_style,
        difficulty: run.difficulty || instance.difficulty,
        complexity: run.complexity || instance.complexity,
        role: run.role || instance.role || 'analyst',
        isFantasy: typeof run.isFantasy === 'boolean' ? run.isFantasy : !!instance.isFantasy,
        scenarioKey: run.scenarioKey || run.archetypeKey || '',
        scenarioTags: Array.isArray(run.scenarioTags) ? run.scenarioTags : [],
        falseLeads: Number(run.falseLeads) || Math.max(0, Number(run.eventCounts && run.eventCounts.false_lead) || 0),
        benchmarkProfile: run.benchmarkProfile || instance.benchmarkProfile || getDefaultBenchmarkProfile(!!instance.isFantasy),
        frictionMode: run.frictionMode || instance.frictionMode || getDefaultFrictionMode(instance.benchmarkProfile, !!instance.isFantasy),
        benchmarkPreset: run.benchmarkPreset || instance.benchmarkPreset || ''
    })));
}

function getRunEventCount(run, eventType) {
    return Math.max(0, Number(run && run.eventCounts && run.eventCounts[eventType]) || 0);
}

function createComparisonBucket(key, label) {
    return {
        key,
        label,
        runs: 0,
        completed: 0,
        best: 0,
        avgScore: 0,
        avgCoverage: 0,
        avgEfficiency: 0
    };
}

function accumulateComparisonBucket(bucket, run) {
    bucket.runs += 1;
    if (run.status === 'completed') bucket.completed += 1;
    bucket.best = Math.max(bucket.best, Number(run.netScore) || 0);
    bucket.avgScore += Number(run.netScore) || 0;
    bucket.avgCoverage += Number(run.coveragePct) || 0;
    bucket.avgEfficiency += Number(run.routeEfficiency) || 0;
}

function finalizeComparisonBuckets(bucketMap, limit = 4, sortField = 'avgScore') {
    return Object.values(bucketMap).map(bucket => ({
        ...bucket,
        avgScore: bucket.runs ? Math.round(bucket.avgScore / bucket.runs) : 0,
        avgCoverage: bucket.runs ? Math.round(bucket.avgCoverage / bucket.runs) : 0,
        avgEfficiency: bucket.runs ? Math.round(bucket.avgEfficiency / bucket.runs) : 0,
        completionRate: bucket.runs ? Math.round((bucket.completed / bucket.runs) * 100) : 0
    })).sort((a, b) => {
        if ((b[sortField] || 0) !== (a[sortField] || 0)) return (b[sortField] || 0) - (a[sortField] || 0);
        return (b.runs || 0) - (a.runs || 0);
    }).slice(0, limit);
}

function getRunFailureBucket(run) {
    const signals = [
        { key: 'false_leads', value: Number(run.falseLeads) || getRunEventCount(run, 'false_lead') },
        { key: 'wrong_turns', value: Number(run.wrongTurns) || 0 },
        { key: 'capture_errors', value: Number(run.wrongAnswers) || 0 },
        { key: 'permission_blocks', value: Number(run.deniedActions) || 0 },
        { key: 'skips', value: Number(run.skippedSteps) || 0 }
    ].sort((a, b) => b.value - a.value);

    if (run.status === 'completed') {
        return (Number(run.penalties) || 0) > 0 ? 'penalty_finish' : 'clean_finish';
    }
    if (run.status === 'expired') return 'session_timeout';
    if (signals[0] && signals[0].value > 0) return signals[0].key;
    return run.status === 'abandoned' ? 'partial_exit' : 'other';
}

function getFailureBucketLabel(key, isFantasy) {
    const labels = {
        clean_finish: isFantasy ? 'Clean Chronicle' : 'Clean Finish',
        penalty_finish: isFantasy ? 'Scarred Chronicle' : 'Penalty Finish',
        session_timeout: isFantasy ? 'Lantern Out' : 'Session Timeout',
        false_leads: isFantasy ? 'False Omens' : 'False Leads',
        wrong_turns: isFantasy ? 'Lost Corridors' : 'Wrong Turns',
        capture_errors: isFantasy ? 'Broken Inscriptions' : 'Capture Errors',
        permission_blocks: isFantasy ? 'Warded Gates' : 'Permission Blocks',
        skips: isFantasy ? 'Skipped Rites' : 'Skipped Steps',
        partial_exit: isFantasy ? 'Broken Quest' : 'Partial Exit',
        other: isFantasy ? 'Unsorted Echoes' : 'Other'
    };
    return labels[key] || key;
}

function buildRunAnalyticsAggregate(allRuns) {
    const pageHeat = {};
    const pageIssues = {};
    const seedSummary = {};
    const profileComparison = {};
    const domainComparison = {};
    const roleComparison = {};
    const navComparison = {};
    const presetComparison = {};
    const failureBuckets = {};

    allRuns.forEach(run => {
        Object.entries(run.pageVisitMap || {}).forEach(([path, visits]) => {
            if (!pageHeat[path]) pageHeat[path] = { path, visits: 0, runs: 0 };
            pageHeat[path].visits += Number(visits) || 0;
            pageHeat[path].runs += 1;
        });

        Object.entries(run.pageIssueMap || {}).forEach(([path, issues]) => {
            if (!pageIssues[path]) pageIssues[path] = { path, issues: 0, runs: 0 };
            pageIssues[path].issues += Number(issues) || 0;
            pageIssues[path].runs += 1;
        });

        const seedKey = String(Number.isFinite(run.seed) ? run.seed : 'unknown');
        if (!seedSummary[seedKey]) {
            seedSummary[seedKey] = { seed: seedKey, runs: 0, best: 0, avgScore: 0, avgCoverage: 0 };
        }
        seedSummary[seedKey].runs += 1;
        seedSummary[seedKey].best = Math.max(seedSummary[seedKey].best, Number(run.netScore) || 0);
        seedSummary[seedKey].avgScore += Number(run.netScore) || 0;
        seedSummary[seedKey].avgCoverage += Number(run.coveragePct) || 0;

        const profileKey = run.benchmarkProfile || 'workflow_accuracy';
        if (!profileComparison[profileKey]) {
            profileComparison[profileKey] = createComparisonBucket(profileKey, getBenchmarkProfileLabel(profileKey, !!run.isFantasy));
        }
        accumulateComparisonBucket(profileComparison[profileKey], run);

        const domainKey = run.domain || 'crm';
        if (!domainComparison[domainKey]) {
            domainComparison[domainKey] = createComparisonBucket(domainKey, String(domainKey).toUpperCase());
        }
        accumulateComparisonBucket(domainComparison[domainKey], run);

        const roleKey = run.role || 'analyst';
        if (!roleComparison[roleKey]) {
            roleComparison[roleKey] = createComparisonBucket(roleKey, getRoleDisplayName(roleKey, !!run.isFantasy));
        }
        accumulateComparisonBucket(roleComparison[roleKey], run);

        const navKey = run.navStyle || run.nav_style || 'sidebar';
        if (!navComparison[navKey]) {
            navComparison[navKey] = createComparisonBucket(navKey, getNavigationLabel(navKey));
        }
        accumulateComparisonBucket(navComparison[navKey], run);

        const presetKey = run.benchmarkPreset || 'custom_mix';
        if (!presetComparison[presetKey]) {
            const presetLabel = presetKey === 'custom_mix'
                ? (run.isFantasy ? 'Custom Realm' : 'Custom Mix')
                : getBenchmarkPresetLabel(presetKey, !!run.isFantasy);
            presetComparison[presetKey] = createComparisonBucket(presetKey, presetLabel);
        }
        accumulateComparisonBucket(presetComparison[presetKey], run);

        const failureKey = getRunFailureBucket(run);
        if (!failureBuckets[failureKey]) {
            failureBuckets[failureKey] = {
                key: failureKey,
                label: getFailureBucketLabel(failureKey, !!run.isFantasy),
                runs: 0,
                avgScore: 0
            };
        }
        failureBuckets[failureKey].runs += 1;
        failureBuckets[failureKey].avgScore += Number(run.netScore) || 0;
    });

    return {
        hotPages: Object.values(pageHeat).sort((a, b) => b.visits - a.visits).slice(0, 5),
        confusingPages: Object.values(pageIssues).sort((a, b) => b.issues - a.issues).slice(0, 5),
        seedSummary: Object.values(seedSummary).map(item => ({
            ...item,
            avgScore: item.runs ? Math.round(item.avgScore / item.runs) : 0,
            avgCoverage: item.runs ? Math.round(item.avgCoverage / item.runs) : 0
        })).sort((a, b) => b.best - a.best).slice(0, 4),
        profileComparison: finalizeComparisonBuckets(profileComparison, 4, 'avgScore'),
        domainComparison: finalizeComparisonBuckets(domainComparison, 4, 'runs'),
        roleComparison: finalizeComparisonBuckets(roleComparison, 4, 'avgScore'),
        navComparison: finalizeComparisonBuckets(navComparison, 4, 'avgEfficiency'),
        presetComparison: finalizeComparisonBuckets(presetComparison, 4, 'runs'),
        failureBuckets: Object.values(failureBuckets).map(item => ({
            ...item,
            avgScore: item.runs ? Math.round(item.avgScore / item.runs) : 0
        })).sort((a, b) => b.runs - a.runs).slice(0, 5)
    };
}

function formatRunStatusLabel(status) {
    return ({
        completed: 'Completed',
        expired: 'Expired',
        abandoned: 'Abandoned'
    })[status] || 'Recorded';
}

function formatRunTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRunSummary(run) {
    if (!run) return 'No runs yet';
    const initials = run.initials || '---';
    return `${initials} | ${run.netScore} pts`;
}

function formatRunProgressSummary(run) {
    if (!run) return 'No run recorded';
    const completion = run.totalSteps ? `${run.completedSteps}/${run.totalSteps}` : '0/0';
    return `${formatRunStatusLabel(run.status)} | ${completion} steps`;
}

function formatPct(value) {
    return `${Math.max(0, Math.min(100, Math.round(Number(value) || 0)))}%`;
}

function summarizeRunFailure(run) {
    if (!run) return '';
    if (run.failureSummary) return run.failureSummary;
    if (run.status === 'completed') {
        return run.penalties > 0
            ? `${run.penalties} penalty points absorbed before completion.`
            : 'Clean completion.';
    }
    const notes = [];
    if (run.falseLeads) notes.push(`${run.falseLeads} false lead${run.falseLeads === 1 ? '' : 's'}`);
    if (run.wrongTurns) notes.push(`${run.wrongTurns} wrong turn${run.wrongTurns === 1 ? '' : 's'}`);
    if (run.wrongAnswers) notes.push(`${run.wrongAnswers} wrong capture${run.wrongAnswers === 1 ? '' : 's'}`);
    if (run.deniedActions) notes.push(`${run.deniedActions} blocked action${run.deniedActions === 1 ? '' : 's'}`);
    if (run.skippedSteps) notes.push(`${run.skippedSteps} skipped step${run.skippedSteps === 1 ? '' : 's'}`);
    return notes.length ? notes.join(' | ') : 'Run ended before completion.';
}

function getComparableRuns(targetRun, allRuns) {
    return allRuns
        .filter(run => !(run.instanceId === targetRun.instanceId && run.id === targetRun.id))
        .map(run => {
            let score = 0;
            const reasons = [];

            if (run.seed === targetRun.seed) {
                score += 6;
                reasons.push(`Seed ${targetRun.seed}`);
            }
            if ((run.benchmarkProfile || '') === (targetRun.benchmarkProfile || '')) {
                score += 4;
                reasons.push(getBenchmarkProfileLabel(run.benchmarkProfile || 'workflow_accuracy', !!run.isFantasy));
            }
            if ((run.domain || '') === (targetRun.domain || '')) {
                score += 3;
                reasons.push(String(run.domain || '').toUpperCase());
            }
            if ((run.benchmarkPreset || '') && run.benchmarkPreset === targetRun.benchmarkPreset) {
                score += 3;
                reasons.push(getBenchmarkPresetLabel(run.benchmarkPreset, !!run.isFantasy));
            }
            if ((run.scenarioKey || '') && run.scenarioKey === (targetRun.scenarioKey || '')) {
                score += 3;
                reasons.push(run.scenarioLabel || run.archetypeLabel || 'Same scenario');
            }
            if ((run.role || '') === (targetRun.role || '')) {
                score += 2;
                reasons.push(getRoleDisplayName(run.role || 'analyst', !!run.isFantasy));
            }
            if ((run.navStyle || '') === (targetRun.navStyle || '')) {
                score += 2;
                reasons.push(getNavigationLabel(run.navStyle || 'sidebar'));
            }
            if (!!run.isFantasy === !!targetRun.isFantasy) {
                score += 1;
            }

            return { run, score, reasons: reasons.slice(0, 3) };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return compareRunResults(a.run, b.run);
        })
        .slice(0, 4);
}

function openRunReplay(instanceId, runId) {
    const instance = state.instanceManager.getInstanceById(instanceId);
    if (!instance) return;

    const allRuns = collectRunResults(state.instanceManager.getInstances());
    const run = allRuns.find(entry => entry.instanceId === instanceId && entry.id === runId);
    if (!run) return;

    const eventCounts = run.eventCounts || {};
    const pageVisits = Object.entries(run.pageVisitMap || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const pageIssues = Object.entries(run.pageIssueMap || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const comparableRuns = getComparableRuns(run, allRuns);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
        <div class="modal" style="max-width:920px;">
            <div class="modal-header">
                <h2>${escapeHtml(run.missionTitle || run.scenarioLabel || 'Run Replay')}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">x</button>
            </div>
            <div class="modal-body">
                <div class="stats-grid" style="margin-bottom:18px;">
                    <div class="stat-card"><div class="value">${run.netScore}</div><div class="subtitle">Net Score</div></div>
                    <div class="stat-card"><div class="value">${formatPct(run.coveragePct)}</div><div class="subtitle">Coverage</div></div>
                    <div class="stat-card"><div class="value">${formatPct(run.firstTryRate)}</div><div class="subtitle">First-Try Rate</div></div>
                    <div class="stat-card"><div class="value">${formatPct(run.routeEfficiency || 0)}</div><div class="subtitle">Route Efficiency</div></div>
                </div>
                <div class="dashboard-chip-row" style="margin-bottom:18px;">
                    <span class="dashboard-chip">${escapeHtml(getRoleDisplayName(run.role || instance.role || 'analyst', !!run.isFantasy))}</span>
                    <span class="dashboard-chip">${escapeHtml(getBenchmarkProfileLabel(run.benchmarkProfile || instance.benchmarkProfile, !!run.isFantasy))}</span>
                    <span class="dashboard-chip">${escapeHtml(getFrictionModeLabel(run.frictionMode || instance.frictionMode))}</span>
                    <span class="dashboard-chip">${escapeHtml(run.scenarioLabel || run.archetypeLabel || 'Run')}</span>
                    <span class="dashboard-chip">Seed ${escapeHtml(String(run.seed || instance.seed || ''))}</span>
                    <span class="dashboard-chip">${escapeHtml(getNavigationLabel(run.navStyle || instance.nav_style || 'sidebar'))}</span>
                    ${run.benchmarkPreset ? `<span class="dashboard-chip">${escapeHtml(getBenchmarkPresetLabel(run.benchmarkPreset, !!run.isFantasy))}</span>` : ''}
                </div>
                <p class="section-copy" style="margin-bottom:18px;">${escapeHtml(summarizeRunFailure(run))}</p>
                <div class="dashboard-summary-grid" style="margin-bottom:18px;">
                    <div class="dashboard-summary-item">
                        <div class="dashboard-summary-label">${run.isFantasy ? 'False Omens' : 'False Leads'}</div>
                        <div class="dashboard-summary-value">${run.falseLeads || 0}</div>
                    </div>
                    <div class="dashboard-summary-item">
                        <div class="dashboard-summary-label">${run.isFantasy ? 'Lost Corridors' : 'Wrong Turns'}</div>
                        <div class="dashboard-summary-value">${run.wrongTurns || 0}</div>
                    </div>
                    <div class="dashboard-summary-item">
                        <div class="dashboard-summary-label">Search Jumps</div>
                        <div class="dashboard-summary-value">${run.searchJumps || 0}</div>
                    </div>
                    <div class="dashboard-summary-item">
                        <div class="dashboard-summary-label">${run.isFantasy ? 'Skipped Rites' : 'Skipped Steps'}</div>
                        <div class="dashboard-summary-value">${run.skippedSteps || 0}</div>
                    </div>
                </div>
                <div class="dashboard-results-grid" style="margin-bottom:18px;">
                    <div class="dashboard-panel">
                        <div class="section-eyebrow">${state.fantasyMode ? 'Trail Heat' : 'Visit Heatmap'}</div>
                        <div class="results-board">
                            ${pageVisits.length ? pageVisits.map(([path, visits]) => `
                                <div class="results-row">
                                    <div class="results-main">
                                        <div class="results-title">${escapeHtml(path)}</div>
                                        <div class="results-meta">${visits} visit${visits === 1 ? '' : 's'}</div>
                                    </div>
                                </div>
                            `).join('') : `<div class="results-row" style="grid-template-columns:1fr;"><div class="results-main"><div class="results-title">No page heatmap data stored for this run.</div></div></div>`}
                        </div>
                    </div>
                    <div class="dashboard-panel">
                        <div class="section-eyebrow">${state.fantasyMode ? 'Snare Points' : 'Confusion Points'}</div>
                        <div class="results-board">
                            ${pageIssues.length ? pageIssues.map(([path, issues]) => `
                                <div class="results-row">
                                    <div class="results-main">
                                        <div class="results-title">${escapeHtml(path)}</div>
                                        <div class="results-meta">${issues} friction event${issues === 1 ? '' : 's'}</div>
                                    </div>
                                </div>
                            `).join('') : `<div class="results-row" style="grid-template-columns:1fr;"><div class="results-main"><div class="results-title">This run did not record any confusion hotspots.</div></div></div>`}
                        </div>
                    </div>
                </div>
                ${comparableRuns.length ? `
                    <div class="dashboard-panel" style="margin-bottom:18px;">
                        <div class="section-eyebrow">${run.isFantasy ? 'Mirror Chronicles' : 'Comparable Runs'}</div>
                        <div class="results-board">
                            ${comparableRuns.map(item => `
                                <div class="results-row">
                                    <div class="results-main">
                                        <div class="results-main-top">
                                            <span class="results-status status-${item.run.status}">${formatRunStatusLabel(item.run.status)}</span>
                                            <span class="results-title">${escapeHtml(item.run.initials || '---')} | ${escapeHtml(item.run.appName || item.run.domain || 'Run')}</span>
                                        </div>
                                        <div class="results-meta">${escapeHtml(item.reasons.join(' | '))} | ${formatRunTimestamp(item.run.recordedAt)}</div>
                                    </div>
                                    <div class="results-score">${item.run.netScore}<span>${formatPct(item.run.coveragePct)} coverage</span></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${Object.keys(eventCounts).length ? `
                    <div class="dashboard-chip-row" style="margin-bottom:18px;">
                        ${Object.entries(eventCounts).slice(0, 8).map(([key, value]) => `<span class="dashboard-chip">${escapeHtml(key.replace(/_/g, ' '))}: ${value}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="results-board">
                    ${(run.eventTimeline && run.eventTimeline.length ? run.eventTimeline : []).map(event => `
                        <div class="results-row">
                            <div class="results-main">
                                <div class="results-main-top">
                                    <span class="results-status">${escapeHtml((event.type || 'event').replace(/_/g, ' '))}</span>
                                    <span class="results-title">${escapeHtml(event.detail || event.title || 'Runtime event')}</span>
                                </div>
                                <div class="results-meta">${escapeHtml(event.page || 'workspace')} | ${formatMissionTime(event.atMs || 0)}</div>
                            </div>
                        </div>
                    `).join('') || `<div class="results-row" style="grid-template-columns:1fr;"><div class="results-main"><div class="results-title">No replay events were stored for this run.</div></div></div>`}
                </div>
            </div>
            <div class="modal-footer">
                <button class="button button-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
