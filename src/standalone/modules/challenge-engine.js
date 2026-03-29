function getChallengeProfile() {
    const difficulty = (state.currentInstance && state.currentInstance.difficulty) || 'medium';
    const benchmarkProfile = getBenchmarkProfileConfig(state.currentInstance && state.currentInstance.benchmarkProfile);
    const profiles = {
        easy: {
            tierLabel: 'Bronze Trial',
            targetCount: 1,
            mandatoryTools: 0,
            actionBudget: 1,
            inspectAll: false,
            parTimeMs: 150000,
            penaltyMultiplier: 0.85,
            comboWindowMs: 30000,
            comboThreshold: 2,
            cleanBonus: 35,
            speedBonus: 25,
            comboBonus: 20,
            wardBonus: 15
        },
        medium: {
            tierLabel: 'Silver Circuit',
            targetCount: 2,
            mandatoryTools: 0,
            actionBudget: 1,
            inspectAll: false,
            parTimeMs: 120000,
            penaltyMultiplier: 1,
            comboWindowMs: 26000,
            comboThreshold: 3,
            cleanBonus: 55,
            speedBonus: 40,
            comboBonus: 30,
            wardBonus: 20
        },
        hard: {
            tierLabel: 'Gold Gauntlet',
            targetCount: 2,
            mandatoryTools: 1,
            actionBudget: 2,
            inspectAll: true,
            parTimeMs: 90000,
            penaltyMultiplier: 1.2,
            comboWindowMs: 22000,
            comboThreshold: 3,
            cleanBonus: 75,
            speedBonus: 55,
            comboBonus: 45,
            wardBonus: 30
        },
        nightmare: {
            tierLabel: 'Obsidian Gauntlet',
            targetCount: 3,
            mandatoryTools: 1,
            actionBudget: 3,
            inspectAll: true,
            parTimeMs: 70000,
            penaltyMultiplier: 1.45,
            comboWindowMs: 18000,
            comboThreshold: 4,
            cleanBonus: 100,
            speedBonus: 75,
            comboBonus: 60,
            wardBonus: 40
        }
    };

    const base = { ...((profiles[difficulty]) || profiles.medium), difficulty };
    const fantasyBoost = state.fantasyMode ? {
        tierLabel: 'Mythic Trial',
        targetCount: 1,
        mandatoryTools: 1,
        actionBudget: 1,
        inspectAll: true,
        parTimeMultiplier: 0.72,
        penaltyBonus: 0.45,
        comboWindowDelta: -4000,
        comboThreshold: 3,
        cleanBonus: 35,
        speedBonus: 25,
        comboBonus: 20,
        wardBonus: 25
    } : {
        tierLabel: base.tierLabel,
        targetCount: 0,
        mandatoryTools: 0,
        actionBudget: 0,
        inspectAll: false,
        parTimeMultiplier: 1,
        penaltyBonus: 0,
        comboWindowDelta: 0,
        comboThreshold: base.comboThreshold,
        cleanBonus: 0,
        speedBonus: 0,
        comboBonus: 0,
        wardBonus: 0
    };

    return {
        ...base,
        tierLabel: state.fantasyMode ? fantasyBoost.tierLabel : benchmarkProfile.label,
        profileLabel: benchmarkProfile.label,
        profileKey: (state.currentInstance && state.currentInstance.benchmarkProfile) || getDefaultBenchmarkProfile(state.fantasyMode),
        targetCount: Math.max(1, Math.min(4, base.targetCount + benchmarkProfile.targetDelta + fantasyBoost.targetCount)),
        mandatoryTools: Math.max(base.mandatoryTools, benchmarkProfile.mandatoryTools, fantasyBoost.mandatoryTools),
        actionBudget: Math.max(0, base.actionBudget + benchmarkProfile.actionBudgetDelta + fantasyBoost.actionBudget),
        inspectAll: base.inspectAll || benchmarkProfile.inspectAll || fantasyBoost.inspectAll,
        preferredActions: benchmarkProfile.preferredActions || [],
        preferredIntents: benchmarkProfile.preferredIntents || [],
        parTimeMs: Math.max(45000, Math.round(base.parTimeMs * benchmarkProfile.parTimeMultiplier * fantasyBoost.parTimeMultiplier)),
        penaltyMultiplier: +((base.penaltyMultiplier + fantasyBoost.penaltyBonus) * benchmarkProfile.penaltyMultiplier).toFixed(2),
        comboWindowMs: Math.max(12000, base.comboWindowMs + fantasyBoost.comboWindowDelta),
        comboThreshold: Math.max(fantasyBoost.comboThreshold || base.comboThreshold, base.comboThreshold),
        cleanBonus: base.cleanBonus + benchmarkProfile.targetDelta * 8 + fantasyBoost.cleanBonus,
        speedBonus: base.speedBonus + benchmarkProfile.mandatoryTools * 10 + fantasyBoost.speedBonus,
        comboBonus: base.comboBonus + benchmarkProfile.actionBudgetDelta * 5 + fantasyBoost.comboBonus,
        wardBonus: base.wardBonus + (benchmarkProfile.preferredActions.includes('denied') ? 10 : 0) + fantasyBoost.wardBonus
    };
}

function getChallengePenaltyValue(kind = 'answer') {
    const basePenalties = {
        context: 10,
        answer: 15,
        detour: 8,
        skip: 30
    };
    const multiplier = (state.activeMission && state.activeMission.profile && state.activeMission.profile.penaltyMultiplier)
        || (state.fantasyMode ? 1.35 : 1);
    return Math.max(5, Math.round((basePenalties[kind] || basePenalties.answer) * multiplier));
}

function getPageMissionCapabilities(page) {
    const sections = Array.isArray(page && page.layoutSections) ? page.layoutSections : [];
    const permissions = getPermissionEnvelope(state.currentInstance, page && page.path);
    return {
        canInspect: Array.isArray(page && page.fields) && page.fields.length > 0 && permissions.canReviewSensitive,
        canSave: (sections.includes('editableForm') || sections.includes('dataTable') || sections.includes('wizard')) && permissions.canSave,
        canDelete: sections.includes('dataTable') && permissions.canDelete,
        canDeny: true
    };
}

function pickMissionField(page, generator) {
    const fieldPool = Array.isArray(page && page.fields) ? page.fields.filter(field => field && field.name) : [];
    if (!fieldPool.length) {
        return { name: 'Primary Value', value: page && page.title ? page.title : '' };
    }
    const preferred = fieldPool.slice(0, Math.min(6, fieldPool.length));
    return preferred[generator.randomInt(0, Math.max(preferred.length - 1, 0))] || preferred[0];
}

function stringifyMissionValue(value) {
    if (value == null) return '';
    return String(value).trim();
}

function appendMissionCaptureTarget(targets, target) {
    if (!target || !target.fieldName) return;
    const value = stringifyMissionValue(target.value);
    if (!value) return;
    const normalized = normalizeChallengeAnswer(value);
    if (!normalized) return;
    const duplicate = targets.some(existing =>
        existing.fieldName === target.fieldName
        && stringifyMissionValue(existing.value) === value
        && String(existing.contextLabel || '') === String(target.contextLabel || '')
    );
    if (duplicate) return;
    targets.push({
        fieldName: target.fieldName,
        value,
        source: target.source || 'field',
        contextLabel: target.contextLabel || '',
        recordKeyName: target.recordKeyName || '',
        recordKeyValue: stringifyMissionValue(target.recordKeyValue || ''),
        acceptedAnswers: Array.isArray(target.acceptedAnswers) ? target.acceptedAnswers.map(stringifyMissionValue).filter(Boolean) : [value],
        surfaceLabel: target.surfaceLabel || '',
        visibilityHint: target.visibilityHint || ''
    });
}

function appendMissionFieldGroupTargets(targets, fields, options = {}) {
    const list = Array.isArray(fields) ? fields : [];
    list.forEach(field => {
        if (!field || !field.name) return;
        appendMissionCaptureTarget(targets, {
            fieldName: field.name,
            value: field.value,
            source: options.source || 'field',
            contextLabel: options.contextLabel || '',
            surfaceLabel: options.surfaceLabel || '',
            visibilityHint: options.visibilityHint || ''
        });
    });
}

function collectMissionKpiTargets(page, targets) {
    if (!Array.isArray(page && page.kpis)) return;
    page.kpis.slice(0, 4).forEach(card => {
        appendMissionCaptureTarget(targets, {
            fieldName: card.label,
            value: card.value,
            source: 'kpi',
            contextLabel: card.label,
            surfaceLabel: 'KPI cards',
            visibilityHint: state.fantasyMode
                ? 'The inscription is visible in the scrying metrics cards near the top of the chamber.'
                : 'The value is visible in the KPI cards near the top of the page.'
        });
    });
}

function collectMissionStatsTargets(page, targets) {
    if (!Array.isArray(page && page.stats)) return;
    page.stats.slice(0, 5).forEach(stat => {
        appendMissionCaptureTarget(targets, {
            fieldName: stat.label,
            value: stat.value,
            source: 'stat',
            contextLabel: stat.label,
            surfaceLabel: 'Summary statistics',
            visibilityHint: state.fantasyMode
                ? 'The rune appears in the summary statistics strip for this chamber.'
                : 'The value is visible in the summary statistics strip on the page.'
        });
    });
}

function collectMissionCardTargets(page, targets) {
    if (!Array.isArray(page && page.infoCards)) return;
    page.infoCards.slice(0, 4).forEach(card => {
        appendMissionCaptureTarget(targets, {
            fieldName: card.title,
            value: card.value,
            source: 'card',
            contextLabel: card.title,
            surfaceLabel: 'Key information cards',
            visibilityHint: state.fantasyMode
                ? 'The inscription is visible on one of the key information cards in this chamber.'
                : 'The value is visible on one of the key information cards on the page.'
        });
    });
}

function collectMissionDetailTargets(page, targets) {
    if (!Array.isArray(page && page.detailGroups) || !page.detailGroups.length) return;
    const visibleGroups = page.detailGroups.slice(0, 1);
    visibleGroups.forEach(group => {
        appendMissionFieldGroupTargets(targets, (group.fields || []).slice(0, 4), {
            source: 'detail',
            contextLabel: group.label,
            surfaceLabel: group.label,
            visibilityHint: state.fantasyMode
                ? `The ${group.label} details are already expanded in the chamber ledger.`
                : `${group.label} is expanded in the visible details accordion.`
        });
    });
}

function collectMissionTableTargets(page, targets) {
    if (!Array.isArray(page && page.records) || !page.records.length) return;
    const visibleFields = Array.isArray(page.fields) ? page.fields.slice(0, 4) : [];
    if (!visibleFields.length) return;
    const pageSize = Math.max(1, Number(page.defaultVisibleRows) || Math.min(8, page.records.length || 1));
    const pageIndex = Math.max(0, Number(page.runtimeMeta && page.runtimeMeta.tablePageIndex) || 0);
    const startIndex = pageIndex * pageSize;
    const visibleRows = page.records.slice(startIndex, startIndex + pageSize).slice(0, 2);
    const anchorField = visibleFields[0];
    visibleRows.forEach(record => {
        const recordKeyValue = stringifyMissionValue(anchorField ? (record.values[anchorField.name] || anchorField.value) : page.title);
        visibleFields.forEach(field => {
            appendMissionCaptureTarget(targets, {
                fieldName: field.name,
                value: record.values[field.name] || field.value,
                source: 'record',
                contextLabel: recordKeyValue || 'top row',
                recordKeyName: anchorField ? anchorField.name : '',
                recordKeyValue,
                surfaceLabel: 'Visible records table',
                visibilityHint: state.fantasyMode
                    ? `Use the visible row marked by ${recordKeyValue || 'the top row'} in the chronicle table.`
                    : `Use the visible row identified by ${recordKeyValue || 'the top row'} in the records table.`
            });
        });
    });
}

function collectMissionSplitTargets(page, targets) {
    if (!Array.isArray(page && page.splitItems) || !page.splitItems.length) return;
    const activeItem = page.splitItems[0];
    if (!activeItem) return;

    appendMissionCaptureTarget(targets, {
        fieldName: activeItem.label || 'Selected Item',
        value: activeItem.detail || activeItem.subtitle || activeItem.value,
        source: 'split',
        contextLabel: activeItem.kicker || activeItem.status || activeItem.label || '',
        surfaceLabel: activeItem.label || 'Selected item',
        visibilityHint: state.fantasyMode
            ? 'The selected record detail pane is already open in the chamber inspector.'
            : 'The selected record detail pane is already open in the split view.'
    });

    (activeItem.facts || []).slice(0, 4).forEach(fact => {
        appendMissionCaptureTarget(targets, {
            fieldName: fact.label,
            value: fact.value,
            source: 'split-detail',
            contextLabel: activeItem.label || '',
            surfaceLabel: activeItem.label || 'Selected item',
            visibilityHint: state.fantasyMode
                ? `The ${activeItem.label || 'selected'} detail panel shows this fact openly.`
                : `The ${activeItem.label || 'selected'} detail panel shows this fact openly.`
        });
    });

    (activeItem.sections || []).slice(0, 2).forEach(section => {
        appendMissionFieldGroupTargets(targets, (section.fields || []).slice(0, 3), {
            source: 'split-detail',
            contextLabel: activeItem.label || section.label || '',
            surfaceLabel: section.label || activeItem.label || 'Selected item',
            visibilityHint: state.fantasyMode
                ? `Open detail notes for ${activeItem.label || 'the selected entry'} are visible in the right-hand panel.`
                : `Open detail notes for ${activeItem.label || 'the selected entry'} are visible in the right-hand panel.`
        });
    });
}

function collectMissionTabTargets(page, targets) {
    const tabs = Array.isArray(page && page.tabs) && page.tabs.length
        ? page.tabs
        : [{
            label: 'Overview',
            kind: 'summary',
            heading: page && page.title ? page.title : 'Overview',
            intro: page && page.description ? page.description : '',
            cards: Array.isArray(page && page.fields) ? page.fields.slice(0, 3).map(field => ({ label: field.name, value: field.value })) : []
        }];
    const activeTab = tabs[0];
    if (!activeTab) return;

    if (activeTab.kind === 'summary') {
        (activeTab.cards || []).slice(0, 4).forEach(card => {
            appendMissionCaptureTarget(targets, {
                fieldName: card.label,
                value: card.value,
                source: 'tab',
                contextLabel: activeTab.label || 'Overview',
                surfaceLabel: activeTab.label || 'Overview',
                visibilityHint: state.fantasyMode
                    ? `The active ${activeTab.label || 'overview'} tab already displays this inscription.`
                    : `The active ${activeTab.label || 'overview'} tab already displays this value.`
            });
        });
        return;
    }

    if (activeTab.kind === 'fields') {
        (activeTab.groups || []).slice(0, 2).forEach(group => {
            appendMissionFieldGroupTargets(targets, (group.fields || []).slice(0, 4), {
                source: 'tab',
                contextLabel: group.label || activeTab.label || 'Fields',
                surfaceLabel: activeTab.label || 'Fields',
                visibilityHint: state.fantasyMode
                    ? `The active ${activeTab.label || 'fields'} tab lists this inscription openly.`
                    : `The active ${activeTab.label || 'fields'} tab lists this value openly.`
            });
        });
        return;
    }

    if (activeTab.kind === 'timeline') {
        (activeTab.items || []).slice(0, 3).forEach(item => {
            appendMissionCaptureTarget(targets, {
                fieldName: item.title,
                value: item.meta || item.detail,
                source: 'tab',
                contextLabel: activeTab.label || 'Timeline',
                surfaceLabel: activeTab.label || 'Timeline',
                visibilityHint: state.fantasyMode
                    ? `The active ${activeTab.label || 'timeline'} tab shows this note in plain sight.`
                    : `The active ${activeTab.label || 'timeline'} tab shows this note in plain sight.`
            });
        });
        return;
    }

    if (activeTab.kind === 'records') {
        (activeTab.items || []).slice(0, 3).forEach(item => {
            appendMissionCaptureTarget(targets, {
                fieldName: item.meta || activeTab.label || 'Related Item',
                value: item.title,
                source: 'tab',
                contextLabel: activeTab.label || 'Related Records',
                surfaceLabel: activeTab.label || 'Related Records',
                visibilityHint: state.fantasyMode
                    ? `The active ${activeTab.label || 'records'} tab surfaces this related record directly.`
                    : `The active ${activeTab.label || 'records'} tab surfaces this related record directly.`
            });
        });
    }
}

function collectMissionTimelineTargets(page, targets) {
    if (!Array.isArray(page && page.activities)) return;
    page.activities.slice(0, 3).forEach(activity => {
        appendMissionCaptureTarget(targets, {
            fieldName: state.fantasyMode ? 'Chronicle Entry' : 'Activity Entry',
            value: activity.label,
            source: 'timeline',
            contextLabel: activity.time || '',
            surfaceLabel: 'Activity timeline',
            visibilityHint: state.fantasyMode
                ? 'The chronicle feed shows this entry in the visible timeline.'
                : 'The activity timeline shows this entry in plain sight.'
        });
    });
}

function collectMissionKanbanTargets(page, targets) {
    const columns = page && page.kanban && Array.isArray(page.kanban.columns) ? page.kanban.columns : [];
    columns.slice(0, 2).forEach(column => {
        (column.cards || []).slice(0, 2).forEach(card => {
            appendMissionCaptureTarget(targets, {
                fieldName: column.title || 'Board Column',
                value: card.title,
                source: 'kanban',
                contextLabel: card.assignee || column.title || '',
                surfaceLabel: column.title || 'Task Board',
                visibilityHint: state.fantasyMode
                    ? `The task board shows this card openly in the ${column.title || 'visible'} lane.`
                    : `The task board shows this card openly in the ${column.title || 'visible'} lane.`
            });
        });
    });
}

function collectMissionCarouselTargets(page, targets) {
    const slides = Array.isArray(page && page.featuredSlides) && page.featuredSlides.length
        ? page.featuredSlides
        : [];
    const firstSlide = slides[0];
    if (!firstSlide) return;
    appendMissionCaptureTarget(targets, {
        fieldName: firstSlide.title || 'Featured Slide',
        value: firstSlide.body || firstSlide.meta || firstSlide.subtitle,
        source: 'carousel',
        contextLabel: firstSlide.subtitle || '',
        surfaceLabel: firstSlide.title || 'Featured Slide',
        visibilityHint: state.fantasyMode
            ? 'The first featured slide is visible in the carousel without changing slides.'
            : 'The first featured slide is visible in the carousel without changing slides.'
    });
}

function collectMissionInlineTargets(page, targets) {
    if (!Array.isArray(page && page.inlineItems)) return;
    page.inlineItems.slice(0, 5).forEach(item => {
        appendMissionCaptureTarget(targets, {
            fieldName: item.label,
            value: item.value,
            source: 'inline',
            contextLabel: item.label,
            surfaceLabel: 'Editable item list',
            visibilityHint: state.fantasyMode
                ? 'The inscription is visible in the editable list on the page.'
                : 'The value is visible in the editable list on the page.'
        });
    });
}

function collectMissionTreeTargets(page, targets) {
    if (!Array.isArray(page && page.treeNodes)) return;
    page.treeNodes.slice(0, 3).forEach(node => {
        appendMissionCaptureTarget(targets, {
            fieldName: state.fantasyMode ? 'Realm Node' : 'Tree Node',
            value: node.label,
            source: 'tree',
            contextLabel: node.meta || '',
            surfaceLabel: 'Hierarchy tree',
            visibilityHint: state.fantasyMode
                ? 'The visible realm structure already shows this node label.'
                : 'The visible hierarchy tree already shows this node label.'
        });
    });
}

function collectMissionCaptureTargets(page) {
    const targets = [];
    const sections = Array.isArray(page && page.layoutSections) ? page.layoutSections : [];

    if (sections.includes('kpiDashboard')) collectMissionKpiTargets(page, targets);
    if (sections.includes('statsSummary')) collectMissionStatsTargets(page, targets);
    if (sections.includes('infoCardsGrid')) collectMissionCardTargets(page, targets);
    if (sections.includes('accordionDetails')) collectMissionDetailTargets(page, targets);
    if (sections.includes('dataTable')) collectMissionTableTargets(page, targets);
    if (sections.includes('splitView')) collectMissionSplitTargets(page, targets);
    if (sections.includes('tabPanel')) collectMissionTabTargets(page, targets);
    if (sections.includes('activityTimeline')) collectMissionTimelineTargets(page, targets);
    if (sections.includes('kanbanBoard')) collectMissionKanbanTargets(page, targets);
    if (sections.includes('carousel')) collectMissionCarouselTargets(page, targets);
    if (sections.includes('inlineEditableList')) collectMissionInlineTargets(page, targets);
    if (sections.includes('treeView')) collectMissionTreeTargets(page, targets);

    if (!targets.length && (sections.includes('editableForm') || sections.includes('wizard'))) {
        page.fields.slice(0, Math.min(6, page.fields.length)).forEach(field => {
            appendMissionCaptureTarget(targets, {
                fieldName: field.name,
                value: field.value,
                source: 'field',
                surfaceLabel: state.fantasyMode ? 'Editable chamber form' : 'Editable form',
                visibilityHint: state.fantasyMode
                    ? 'The inscription is visible in the open form fields on the page.'
                    : 'The value is visible in the open form fields on the page.'
            });
        });
    }

    if (!targets.length) {
        appendMissionCaptureTarget(targets, {
            fieldName: state.fantasyMode ? 'Chamber Title' : 'Page Title',
            value: page && page.title ? page.title : '',
            source: 'page',
            contextLabel: '',
            surfaceLabel: state.fantasyMode ? 'Page header' : 'Page header',
            visibilityHint: state.fantasyMode
                ? 'The inscription is visible in the current chamber title.'
                : 'The value is visible in the current page title.'
        });
    }

    return targets;
}

function pickMissionCaptureTarget(page, generator) {
    const targets = collectMissionCaptureTargets(page);
    if (!targets.length) {
        const fallback = pickMissionField(page, generator);
        return {
            fieldName: fallback.name,
            value: stringifyMissionValue(fallback.value),
            source: 'field',
            contextLabel: ''
        };
    }
    return targets[generator.randomInt(0, Math.max(targets.length - 1, 0))] || targets[0];
}

function chooseWeightedMissionOption(generator, options) {
    const weighted = (options || []).filter(option => option && option.weight > 0);
    const totalWeight = weighted.reduce((sum, option) => sum + option.weight, 0);
    if (!totalWeight) return null;
    let cursor = (generator.randomInt(0, 10000) / 10000) * totalWeight;
    for (const option of weighted) {
        cursor -= option.weight;
        if (cursor <= 0) {
            return option;
        }
    }
    return weighted[weighted.length - 1] || null;
}

function createMissionTarget(path, page, generator) {
    return {
        path,
        page,
        pageTitle: page.title,
        sectionTitle: getSectionTitleForPath(path),
        intent: page.intent,
        field: pickMissionField(page, generator),
        captureTarget: pickMissionCaptureTarget(page, generator),
        capabilities: getPageMissionCapabilities(page)
    };
}

function pageMatchesScenario(page, rule) {
    if (!page || !rule) return false;
    const haystack = `${page.title || ''} ${page.path || ''} ${page.sectionTitle || ''} ${page.intent || ''}`.toLowerCase();
    return String(rule)
        .split('|')
        .some(part => haystack.includes(part.trim().toLowerCase()));
}

const DOMAIN_CHALLENGE_SCENARIO_PACKS = {
    crm: [
        {
            key: 'lead-qualification',
            label: state.fantasyMode ? 'Alliance Qualification' : 'Lead Qualification',
            titles: state.fantasyMode ? ['Alliance Oath', 'Envoy Vetting'] : ['Lead Qualification Sprint', 'Pipeline Validation'],
            summary: state.fantasyMode ? 'Trace a promising alliance from roster to prophecy and confirm the next steward.' : 'Confirm the right lead context, capture the qualifying signal, and commit the pipeline update.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['lead|opportunit|account|pipeline|forecast'],
            weight: 3
        },
        {
            key: 'account-renewal',
            label: state.fantasyMode ? 'Banner Renewal' : 'Account Renewal',
            titles: state.fantasyMode ? ['Banner Renewal', 'Covenant Stewardship'] : ['Account Renewal Review', 'Customer Expansion Check'],
            summary: state.fantasyMode ? 'Confirm the loyal house, trace the renewal omen, and reseal the covenant path.' : 'Review the right account trail, capture the renewal signal, and save the ownership update.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['account|renew|contract|forecast|owner'],
            weight: 2
        },
        {
            key: 'forecast-escalation',
            label: state.fantasyMode ? 'Oracle Forecast' : 'Forecast Escalation',
            titles: state.fantasyMode ? ['Oracle Ledger', 'Crown Forecast'] : ['Forecast Escalation', 'Pipeline Pressure Run'],
            summary: state.fantasyMode ? 'Inspect the prophecy ledger, navigate the sales halls, and survive the escalated handoff.' : 'Validate forecast details under pressure and route the record through the right escalation path.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['forecast|pipeline|quota|stage|approval'],
            weight: 2
        },
        {
            key: 'campaign-handoff',
            label: state.fantasyMode ? 'Herald Handoff' : 'Campaign Handoff',
            titles: state.fantasyMode ? ['Festival Relay', 'Herald Routing'] : ['Campaign Handoff', 'Marketing Routing Review'],
            summary: state.fantasyMode ? 'Trace the omen campaign, confirm the cohort, and hand the trail to the right herald.' : 'Validate campaign context, capture the routing signal, and complete the marketing-to-sales handoff.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['campaign|segment|journey|routing|lead'],
            weight: 2
        },
        {
            key: 'case-escalation',
            label: state.fantasyMode ? 'Petition Escalation' : 'Case Escalation',
            titles: state.fantasyMode ? ['Petition Escalation', 'Crisis Oath'] : ['Case Escalation', 'Service Resolution Sprint'],
            summary: state.fantasyMode ? 'Inspect the petition trail, confirm the oath window, and escalate the plea without losing the ward.' : 'Review the active case trail, capture the SLA or entitlement signal, and route the escalation cleanly.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['case|service|support|entitlement|knowledge|escalation'],
            weight: 2
        },
        {
            key: 'quote-approval',
            label: state.fantasyMode ? 'Tribute Approval' : 'Quote Approval',
            titles: state.fantasyMode ? ['Royal Quote Review', 'Price Ledger Exception'] : ['Quote Approval', 'Commercial Exception Review'],
            summary: state.fantasyMode ? 'Confirm the tribute ledger, inspect the pricing wards, and seal the order path.' : 'Validate the right quote or price-book context and move the commercial record through the correct approval path.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['workflow_accuracy', 'permission_maze'],
            pagePatterns: ['quote|price book|product|order|commercial'],
            weight: 2
        },
        {
            key: 'partner-registration',
            label: state.fantasyMode ? 'Alliance Registry' : 'Partner Registration',
            titles: state.fantasyMode ? ['Alliance Registry', 'Guild Oath Review'] : ['Partner Registration', 'Channel Deal Review'],
            summary: state.fantasyMode ? 'Validate the allied guild, review the oath conflict, and preserve the co-sell trail.' : 'Confirm the partner or deal-registration context, capture the conflict signal, and save the channel update.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['partner|deal registration|co-sell|channel'],
            weight: 1
        }
    ],
    erp: [
        {
            key: 'inventory-balancing',
            label: state.fantasyMode ? 'Storehouse Balance' : 'Inventory Balancing',
            titles: state.fantasyMode ? ['Storehouse Recount', 'Forge Transfer'] : ['Inventory Balancing Run', 'Warehouse Transfer Check'],
            summary: state.fantasyMode ? 'Inspect the stock ledger, move through the storehouse, and steady the resource count.' : 'Verify stock conditions, inspect the right warehouse record, and complete the balancing workflow.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['inventory|warehouse|transfer|shipment|cycle count|stock'],
            weight: 2
        },
        {
            key: 'receiving-exception',
            label: state.fantasyMode ? 'Caravan Exception' : 'Receiving Exception',
            titles: state.fantasyMode ? ['Caravan Hold', 'Dockside Exception'] : ['Receiving Exception', 'Dock Reconciliation'],
            summary: state.fantasyMode ? 'Find the delayed caravan, validate the manifest, and reseal the exception trail.' : 'Investigate a receiving mismatch, confirm the manifest data, and resolve the operational exception.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['resilience_recovery'],
            pagePatterns: ['receiving|purchase order|supplier|warehouse|match|exception'],
            weight: 2
        },
        {
            key: 'invoice-match-exception',
            label: state.fantasyMode ? 'Ledger Match Exception' : 'Invoice Match Exception',
            titles: state.fantasyMode ? ['Coin Ledger Mismatch', 'Merchant Ledger Hold'] : ['Invoice Match Exception', 'Three-Way Match Review'],
            summary: state.fantasyMode ? 'Trace the merchant ledger, compare the crate tally, and settle the mismatch before the treasury seals.' : 'Review the supplier invoice, purchase order, and receipt trail, then route the match exception through the correct save path.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['workflow_accuracy', 'permission_maze'],
            pagePatterns: ['invoice|payable|match|supplier|purchase order|receiving|ledger'],
            weight: 2
        },
        {
            key: 'order-release',
            label: state.fantasyMode ? 'Caravan Release' : 'Order Release',
            titles: state.fantasyMode ? ['Caravan Dispatch', 'Credit Seal Review'] : ['Order Release', 'Fulfillment Hold Review'],
            summary: state.fantasyMode ? 'Follow the caravan decree through pricing wards, lift the credit seal, and send the shipment onward.' : 'Trace the sales order through pricing, credit, and fulfillment signals, then clear the right release step.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['sales order|pricing|fulfillment|shipment|collections|credit'],
            weight: 2
        },
        {
            key: 'production-planning',
            label: state.fantasyMode ? 'Forge Planning' : 'Production Planning',
            titles: state.fantasyMode ? ['Forge Queue Review', 'Anvil Capacity Review'] : ['Production Planning', 'MRP Release Review'],
            summary: state.fantasyMode ? 'Inspect the forge plan, trace the rune bill, and release the proper build action without starving the line.' : 'Review BOM, MRP, and work-order context, capture the planning signal, and commit the correct production step.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['mrp|work order|bom|capacity|planning|routing'],
            weight: 2
        },
        {
            key: 'project-billing-readiness',
            label: state.fantasyMode ? 'Expedition Billing' : 'Project Billing Readiness',
            titles: state.fantasyMode ? ['Expedition Tribute Review', 'Milestone Ledger'] : ['Project Billing Readiness', 'Revenue Recognition Check'],
            summary: state.fantasyMode ? 'Inspect the expedition charter, confirm the tribute model, and advance the milestone ledger to the proper chamber.' : 'Validate the project, task, and billing model context, then complete the project-to-profit update cleanly.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['project|resource|timesheet|billing|milestone|revenue recognition'],
            weight: 2
        },
        {
            key: 'close-operations',
            label: state.fantasyMode ? 'Forge Close' : 'Close Operations',
            titles: state.fantasyMode ? ['Forge Closeout', 'Ledger Furnace'] : ['Close Operations', 'Period Close Review'],
            summary: state.fantasyMode ? 'Walk the forge ledgers, capture the right closing sigil, and clear the end-of-cycle queue before the vault is sealed.' : 'Review ledger, reconciliation, and close-task context, then complete the period-close step without leaving stale work behind.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['workflow_accuracy', 'permission_maze'],
            pagePatterns: ['close|journal|reconciliation|ledger|cash|period'],
            weight: 2
        }
    ],
    hrms: [
        {
            key: 'candidate-progress',
            label: state.fantasyMode ? 'Apprentice Trial' : 'Candidate Progression',
            titles: state.fantasyMode ? ['Apprentice Vetting', 'Guild Recruitment'] : ['Candidate Progression', 'Recruiting Handoff'],
            summary: state.fantasyMode ? 'Advance the apprentice through the guild trial while keeping the handoff record coherent.' : 'Move a candidate through recruiting, confirm the right details, and commit the handoff cleanly.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['requisition|candidate|pipeline|interview|offer|job'],
            weight: 3
        },
        {
            key: 'onboarding-readiness',
            label: state.fantasyMode ? 'Initiation Readiness' : 'Onboarding Readiness',
            titles: state.fantasyMode ? ['Initiation Board', 'New Scribe Arrival'] : ['Onboarding Readiness', 'Hiring Packet Check'],
            summary: state.fantasyMode ? 'Confirm the new scribe’s initiation trail and keep the welcome rites aligned.' : 'Review onboarding tasks, validate the assigned manager, and save the final readiness update.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['onboard|hire|checklist|task|manager|candidate profile'],
            weight: 2
        },
        {
            key: 'job-change-approval',
            label: state.fantasyMode ? 'Oath Change Review' : 'Job Change Approval',
            titles: state.fantasyMode ? ['Oath Change Review', 'Warband Transfer'] : ['Job Change Approval', 'Position Transfer Review'],
            summary: state.fantasyMode ? 'Review the adventurer\'s oath change, confirm the new house and stipend signal, and seal the transfer without breaking the chain of command.' : 'Review an employee lifecycle change, confirm the position and compensation details, and complete the transfer approval cleanly.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['job change|lifecycle|employee profile|position control|manager|compensation'],
            weight: 2
        },
        {
            key: 'timecard-approval',
            label: state.fantasyMode ? 'Watch Ledger Approval' : 'Timecard Approval',
            titles: state.fantasyMode ? ['Watch Ledger Approval', 'Captain Queue Review'] : ['Timecard Approval', 'Attendance Exception Review'],
            summary: state.fantasyMode ? 'Inspect the watch ledgers, resolve the attendance exception, and move the right roster action through the captain queue.' : 'Review timecard detail, confirm the exception reason, and complete the correct approval path for the worker record.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['timecard|attendance|schedule|approval queue|exception|shift'],
            weight: 2
        },
        {
            key: 'payroll-exception',
            label: state.fantasyMode ? 'Coin Roll Exception' : 'Payroll Exception',
            titles: state.fantasyMode ? ['Coin Roll Exception', 'Stipend Reconciliation'] : ['Payroll Exception', 'Compensation Verification'],
            summary: state.fantasyMode ? 'Inspect the stipend ledgers, hit the blocked path, and still settle the right compensation trail.' : 'Validate a payroll discrepancy under permission pressure and recover with the correct workflow action.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['payroll|payslip|pre-pay|compensation|salary|deduction|retro pay'],
            weight: 2
        },
        {
            key: 'benefits-enrollment-review',
            label: state.fantasyMode ? 'Blessing Enrollment Review' : 'Benefits Enrollment Review',
            titles: state.fantasyMode ? ['Blessing Enrollment', 'Leave Petition Review'] : ['Benefits Enrollment Review', 'Leave Balance Review'],
            summary: state.fantasyMode ? 'Inspect the blessings ledger, confirm the qualifying omen, and preserve the right respite or coverage action for the guild member.' : 'Review benefit or leave context, confirm the qualifying event, and commit the correct enrollment or balance action.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['benefit|enrollment|leave|dependent|beneficiary|coverage|life event'],
            weight: 2
        },
        {
            key: 'performance-cycle-review',
            label: state.fantasyMode ? 'Valor Review Cycle' : 'Performance Cycle Review',
            titles: state.fantasyMode ? ['Valor Review Cycle', 'Lore Path Check'] : ['Performance Cycle Review', 'Learning Compliance Check'],
            summary: state.fantasyMode ? 'Read the quest goals, inspect the lore path, and preserve the right readiness signal for the guild successor.' : 'Review goals, learning, and review-cycle context, capture the right readiness signal, and save the talent action cleanly.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['goal|review|learning|succession|check-in|talent'],
            weight: 1
        },
        {
            key: 'access-provisioning-review',
            label: state.fantasyMode ? 'Seal Provisioning Review' : 'Access Provisioning Review',
            titles: state.fantasyMode ? ['Seal Provisioning Review', 'Sigil Audit'] : ['Access Provisioning Review', 'HR Platform Security Review'],
            summary: state.fantasyMode ? 'Trace the warded sigils, strike the blocked seal, and recover the provisioning trail without opening the wrong chamber.' : 'Navigate an HR platform access issue under permission pressure, capture the provisioning signal, and recover through the correct security path.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['security|access|provision|role|permission|audit|interface'],
            weight: 2
        }
    ],
    healthcare: [
        {
            key: 'registration-identity-resolution',
            label: state.fantasyMode ? 'Identity Sigil Review' : 'Registration Identity Resolution',
            titles: state.fantasyMode ? ['Identity Sigil Review', 'Gate Registry Repair'] : ['Registration Identity Resolution', 'MPI Verification'],
            summary: state.fantasyMode ? 'Untangle the duplicate registry marks, confirm the right ward traveler, and keep the intake chain intact.' : 'Review MPI and registration context, resolve the identity mismatch, and complete the intake step cleanly.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['mpi|registration|check-in|scheduling|adt|patient access'],
            weight: 2
        },
        {
            key: 'care-coordination',
            label: state.fantasyMode ? 'Sanctum Coordination' : 'Care Coordination',
            titles: state.fantasyMode ? ['Ward Stewardship', 'Healing Route'] : ['Care Coordination', 'Patient Routing'],
            summary: state.fantasyMode ? 'Trace the patient ward, confirm the treatment signal, and keep the healing chain intact.' : 'Review patient context, capture the correct clinical detail, and complete the coordination step.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['patient|chart|clinical|flowsheet|care plan|appointment'],
            weight: 3
        },
        {
            key: 'orders-results-follow-up',
            label: state.fantasyMode ? 'Oracle Result Follow-up' : 'Orders and Results Follow-up',
            titles: state.fantasyMode ? ['Oracle Result Follow-up', 'Alchemy Queue Review'] : ['Orders and Results Follow-up', 'Diagnostic Review'],
            summary: state.fantasyMode ? 'Inspect the order sigils, trace the specimen omen, and land the follow-up in the proper chamber.' : 'Review orders, results, and diagnostic context, capture the correct signal, and complete the downstream follow-up.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['order|results|lab|imaging|specimen'],
            weight: 2
        },
        {
            key: 'medication-reconciliation',
            label: state.fantasyMode ? 'Potion Reconciliation' : 'Medication Reconciliation',
            titles: state.fantasyMode ? ['Potion Reconciliation', 'Apothecary Verification'] : ['Medication Reconciliation', 'Pharmacy Verification'],
            summary: state.fantasyMode ? 'Inspect the potion ledger, reconcile the remedy trail, and keep the apothecary queue from drifting.' : 'Review medication, allergy, and dispensing context, then save the correct reconciliation update.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['medication|pharmacy|emar|prescribing|reconciliation'],
            weight: 2
        },
        {
            key: 'discharge-clearance',
            label: state.fantasyMode ? 'Sanctum Release' : 'Discharge Clearance',
            titles: state.fantasyMode ? ['Sanctum Release', 'Recovery Passage'] : ['Discharge Clearance', 'Patient Release Review'],
            summary: state.fantasyMode ? 'Verify the recovery marks, trace the release path, and clear the final ward.' : 'Confirm the discharge trail, validate the release details, and complete the closeout cleanly.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['discharge|patient|care|appointment|billing'],
            weight: 2
        },
        {
            key: 'referral-trace',
            label: state.fantasyMode ? 'Healer Referral' : 'Referral Trace',
            titles: state.fantasyMode ? ['Healer Referral', 'Sanctum Chain'] : ['Referral Trace', 'Specialist Handoff'],
            summary: state.fantasyMode ? 'Follow the referral sigil across the care chain and keep the handoff coherent under delay.' : 'Navigate the referral chain, capture the right handoff data, and recover through the correct service touchpoints.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['navigation_only', 'resilience_recovery'],
            pagePatterns: ['referral|care|specialist|patient|queue'],
            weight: 2
        },
        {
            key: 'claim-denial-review',
            label: state.fantasyMode ? 'Tribute Denial Review' : 'Claim Denial Review',
            titles: state.fantasyMode ? ['Tribute Denial Review', 'Claim Tribunal'] : ['Claim Denial Review', 'Revenue Cycle Appeal'],
            summary: state.fantasyMode ? 'Trace the denied tribute, recover the right codex details, and push the appeal through the proper tribunal.' : 'Review claim, coding, and remittance context under friction, then recover to the correct denial-management action.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['charge|coding|claim|denial|remittance|eligibility'],
            weight: 2
        },
        {
            key: 'bed-board-coordination',
            label: state.fantasyMode ? 'Ward Board Coordination' : 'Bed Board Coordination',
            titles: state.fantasyMode ? ['Ward Board Coordination', 'Sanctum Throughput'] : ['Bed Board Coordination', 'Capacity Flow Review'],
            summary: state.fantasyMode ? 'Navigate the ward board, confirm the transfer trail, and move the right chamber resource without losing the route.' : 'Review capacity, bed, and transfer context, then complete the correct throughput action across operations pages.',
            inspectMode: 'random',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['navigation_only', 'workflow_accuracy'],
            pagePatterns: ['capacity|bed|transfer|or schedule|supply'],
            weight: 2
        },
        {
            key: 'interface-audit',
            label: state.fantasyMode ? 'Rune Interface Audit' : 'Interface and Audit Review',
            titles: state.fantasyMode ? ['Rune Interface Audit', 'Chronicle Review'] : ['Interface and Audit Review', 'Platform Governance Check'],
            summary: state.fantasyMode ? 'Inspect the portal monitor, survive the blocked seal, and still land the correct audit trail outcome.' : 'Review interface, access, and quality context under friction, then recover to the right governance action.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['interface|api|access|audit|quality|fhir'],
            weight: 1
        }
    ],
    itsm: [
        {
            key: 'incident-recovery',
            label: state.fantasyMode ? 'Rune Incident Recovery' : 'Incident Recovery',
            titles: state.fantasyMode ? ['Ward Failure Sprint', 'Runic Recovery'] : ['Incident Recovery', 'Escalation Stabilization'],
            summary: state.fantasyMode ? 'Cut through the ward network, trigger the right denial, and restore the service trail.' : 'Recover a live incident, prove you can handle blocked actions, and stabilize the service workflow.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['resilience_recovery', 'permission_maze'],
            pagePatterns: ['incident|major incident|bridge|escalation|service desk|sla'],
            weight: 3
        },
        {
            key: 'service-request-fulfillment',
            label: state.fantasyMode ? 'Petition Fulfillment' : 'Service Request Fulfillment',
            titles: state.fantasyMode ? ['Petition Fulfillment', 'Aid Catalog Relay'] : ['Service Request Fulfillment', 'Catalog Approval Handoff'],
            summary: state.fantasyMode ? 'Trace the guild petition from aid catalog to fulfillment queue, confirm the right service boon, and seal the request trail.' : 'Review the catalog request, confirm the correct fulfillment detail, and complete the approval handoff cleanly.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['request|catalog|fulfillment|approval|service offering|petition'],
            weight: 2
        },
        {
            key: 'problem-investigation',
            label: state.fantasyMode ? 'Curse Pattern Investigation' : 'Problem Investigation',
            titles: state.fantasyMode ? ['Curse Pattern Investigation', 'Root Cause Scrying'] : ['Problem Investigation', 'Known Error Review'],
            summary: state.fantasyMode ? 'Inspect the recurring curse trail, confirm the true cause, and preserve the workaround lore for the next responder.' : 'Review the recurring failure, capture the root-cause signal, and save the problem record with the right known-error context.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['problem|root cause|known error|trend|investigation'],
            weight: 2
        },
        {
            key: 'change-window',
            label: state.fantasyMode ? 'Ritual Window' : 'Change Window',
            titles: state.fantasyMode ? ['Ritual Window', 'Ward Schedule'] : ['Change Window Review', 'Maintenance Approval'],
            summary: state.fantasyMode ? 'Inspect the maintenance sigils, confirm the service owner, and survive the approval wards.' : 'Validate the change window, inspect the owner trail, and resolve the approval path cleanly.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze'],
            pagePatterns: ['change|release|cab|window|owner|approval|calendar'],
            weight: 2
        },
        {
            key: 'asset-ownership',
            label: state.fantasyMode ? 'Relic Stewardship' : 'CMDB Impact Trace',
            titles: state.fantasyMode ? ['Relic Stewardship', 'CMDB Wardwalk'] : ['CMDB Impact Trace', 'CI Stewardship'],
            summary: state.fantasyMode ? 'Trace the relic through the tower records, confirm the right constellation links, and carry the stewardship trail to the proper chamber.' : 'Inspect configuration relationships, capture the right CI ownership detail, and trace the impact path through the CMDB correctly.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['asset|cmdb|service|owner|configuration|ci|relationship|discovery|reconciliation'],
            weight: 2
        },
        {
            key: 'knowledge-publication',
            label: state.fantasyMode ? 'Grimoire Publication' : 'Knowledge Publication',
            titles: state.fantasyMode ? ['Grimoire Publication', 'Scroll Review'] : ['Knowledge Publication', 'Article Review'],
            summary: state.fantasyMode ? 'Inspect the grimoire draft, confirm the right audience and known-incantation link, and publish the lore without breaking the wards.' : 'Review the article draft, capture the right publication detail, and save the knowledge record into the correct review path.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['knowledge|article|faq|search|grimoire|known error'],
            weight: 1
        },
        {
            key: 'sla-breach-review',
            label: state.fantasyMode ? 'Oath Breach Review' : 'SLA Breach Review',
            titles: state.fantasyMode ? ['Oath Breach Review', 'Breach Board Watch'] : ['SLA Breach Review', 'Service Level Escalation'],
            summary: state.fantasyMode ? 'Read the oath timers, confirm the endangered service, and survive the breach watch without losing the trail.' : 'Inspect the service-level dashboard, capture the correct breach signal, and route the escalation through the right ownership path.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['sla|breach|ola|service portfolio|dashboard'],
            weight: 2
        },
        {
            key: 'service-review-analytics',
            label: state.fantasyMode ? 'War Room Analytics' : 'Service Review Analytics',
            titles: state.fantasyMode ? ['War Room Analytics', 'Improvement Codex'] : ['Service Review Analytics', 'Continual Improvement Review'],
            summary: state.fantasyMode ? 'Survey the war-room charts, capture the trend omen, and preserve the right improvement record for the council.' : 'Review the operations analytics, capture the right trend detail, and save the reporting update into the improvement workflow.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['analytics|report|operations command|performance|continual improvement'],
            weight: 1
        }
    ],
    procurement: [
        {
            key: 'guided-buying-intake',
            label: state.fantasyMode ? 'Bazaar Intake' : 'Guided Buying Intake',
            titles: state.fantasyMode ? ['Guided Bazaar', 'Seal Queue'] : ['Guided Buying Home', 'Approval Queue'],
            summary: state.fantasyMode ? 'Trace the bazaar petition, capture the right buying channel, and seal the approval route without straying into the wrong hall.' : 'Review the guided-buying intake, capture the correct request context, and move the approval path through the right procurement queue.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['guided buying|intake|requisition|cart|approval|goods request|seal queue'],
            weight: 3
        },
        {
            key: 'catalog-punchout-review',
            label: state.fantasyMode ? 'Portal Caravan Review' : 'Catalog & PunchOut',
            titles: state.fantasyMode ? ['Catalog Scrying', 'Portal Caravans'] : ['Catalog Search', 'PunchOut Sessions'],
            summary: state.fantasyMode ? 'Inspect the merchant codex, confirm the right caravan return, and keep the taxonomy sigils aligned.' : 'Review hosted catalog and punchout content, capture the correct item context, and save the compliant buying record cleanly.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['catalog|item detail|punchout|classification|taxonomy'],
            weight: 2
        },
        {
            key: 'sourcing-award',
            label: state.fantasyMode ? 'Award Tribunal' : 'Sourcing Award',
            titles: state.fantasyMode ? ['Bid Mirrors', 'Award Tribunal'] : ['Bid Evaluation', 'Award Recommendations'],
            summary: state.fantasyMode ? 'Read the mirrored bids, capture the winning merchant signal, and guide the award through the proper tribunal.' : 'Review the sourcing event, capture the right bid outcome, and complete the award recommendation without drifting into the wrong lane.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['sourcing|bid|award|auction|invitation'],
            weight: 2
        },
        {
            key: 'contract-clause-governance',
            label: state.fantasyMode ? 'Pact Foundry Governance' : 'Contract & Clause Governance',
            titles: state.fantasyMode ? ['Clause Vault', 'Renewal Almanac'] : ['Clause Library', 'Contract Workspace'],
            summary: state.fantasyMode ? 'Inspect the pact foundry, capture the right clause signal, and keep the renewal lore aligned with the contract path.' : 'Review procurement contract terms, capture the correct clause or renewal detail, and save the record into the right governance flow.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'audit_marathon'],
            pagePatterns: ['contract|clause|renewal|terms|template'],
            weight: 2
        },
        {
            key: 'supplier-onboarding-risk',
            label: state.fantasyMode ? 'Merchant Registry Risk' : 'Supplier Onboarding Risk',
            titles: state.fantasyMode ? ['Merchant Onboarding', 'Risk Omens'] : ['Supplier Onboarding', 'Risk & Scorecards'],
            summary: state.fantasyMode ? 'Trace the merchant registry, survive the warded approval trail, and still land the right risk outcome.' : 'Review supplier onboarding and qualification under governance friction, capture the correct risk or activation detail, and recover to the right next step.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['supplier onboarding|supplier profile|qualification|risk|scorecard|merchant'],
            weight: 2
        },
        {
            key: 'order-receipt-collaboration',
            label: state.fantasyMode ? 'Caravan Receipt Relay' : 'Order Receipt Collaboration',
            titles: state.fantasyMode ? ['Purchase Charters', 'Goods Receipt'] : ['PO Workbench', 'Goods Receipt'],
            summary: state.fantasyMode ? 'Follow the caravan ledger, capture the right receipt signal, and reconcile the supplier handoff before it goes astray.' : 'Review the PO and receiving path, capture the correct collaboration or receipt detail, and complete the order workflow cleanly.',
            inspectMode: 'random',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['po workbench|supplier collaboration|goods receipt|service acceptance|asn|receiving'],
            weight: 2
        },
        {
            key: 'invoice-match-exception',
            label: state.fantasyMode ? 'Coin Match Exception' : 'Invoice Match Exception',
            titles: state.fantasyMode ? ['Match Anomalies', 'Remittance Watch'] : ['Match Exceptions', 'Payment Status'],
            summary: state.fantasyMode ? 'Inspect the invoice scrolls, trigger the blocked branch, and still recover the remittance trail correctly.' : 'Review the AP exception path under friction, capture the right match detail, and recover to the correct payment or coding action.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'workflow_accuracy'],
            pagePatterns: ['invoice|match exception|payment|remittance|coding'],
            weight: 3
        },
        {
            key: 'spend-governance-review',
            label: state.fantasyMode ? 'Steward Oversight' : 'Spend Governance Review',
            titles: state.fantasyMode ? ['Spend Observatory', 'Workflow Sigils'] : ['Spend Dashboard', 'Workflow Designer'],
            summary: state.fantasyMode ? 'Read the stewardship omens, capture the right classification signal, and keep the integration wards intact.' : 'Review spend analytics and workflow governance, capture the correct control detail, and complete the administration update without losing the audit trail.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['audit_marathon', 'permission_maze'],
            pagePatterns: ['spend dashboard|classification|workflow|integration|audit|access'],
            weight: 1
        }
    ],
    finance: [
        {
            key: 'invoice-control',
            label: state.fantasyMode ? 'Treasury Control' : 'Invoice Control',
            titles: state.fantasyMode ? ['Vault Reconciliation', 'Coin Ledger Review'] : ['Invoice Control', 'Receivables Validation'],
            summary: state.fantasyMode ? 'Inspect the treasury path, confirm the ledger detail, and resist the wrong branch of the vault.' : 'Validate the invoice path, capture the correct ledger value, and complete the financial workflow with care.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['invoice|receivable|payable|cash application|aging|statement'],
            weight: 2
        },
        {
            key: 'bank-reconciliation',
            label: state.fantasyMode ? 'Vault Reconciliation' : 'Bank Reconciliation',
            titles: state.fantasyMode ? ['Vault Balance', 'Treasury Sigil Match'] : ['Bank Reconciliation', 'Treasury Matching Review'],
            summary: state.fantasyMode ? 'Match the vault records to the kingdom ledger, resolve the stray coin trail, and preserve the treasury seal.' : 'Trace bank activity, reconcile the right balances, and resolve the treasury exception without drifting into the wrong queue.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['bank reconciliation|cash position|treasury|transfer|liquidity|bank'],
            weight: 2
        },
        {
            key: 'month-end-close',
            label: state.fantasyMode ? 'Vault Close' : 'Month-End Close',
            titles: state.fantasyMode ? ['Vault Close', 'Coinhouse Seal'] : ['Month-End Close', 'Closebook Reconciliation'],
            summary: state.fantasyMode ? 'Walk the closing ledgers, validate the settlement values, and seal the final record chain.' : 'Review close-cycle data, capture the right values, and commit the close without leaving loose entries behind.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save', 'denied'],
            preferredProfiles: ['workflow_accuracy', 'audit_marathon'],
            pagePatterns: ['close|ledger|journal|trial balance|financial statements|reconciliation'],
            weight: 2
        },
        {
            key: 'budget-forecast-review',
            label: state.fantasyMode ? 'Prophecy Review' : 'Budget Forecast Review',
            titles: state.fantasyMode ? ['Royal Forecast Review', 'Variance Prophecy'] : ['Budget Forecast Review', 'Variance Commentary Check'],
            summary: state.fantasyMode ? 'Read the prophecy tables, compare the treasury omens, and preserve the right budget tale for the council.' : 'Inspect the active planning scenario, capture the variance signal, and commit the correct planning update.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['budget|forecast|scenario|variance|planning'],
            weight: 2
        },
        {
            key: 'asset-lifecycle',
            label: state.fantasyMode ? 'Relic Ledger' : 'Asset Lifecycle',
            titles: state.fantasyMode ? ['Relic Register', 'Depreciation Rune Review'] : ['Asset Lifecycle', 'Depreciation Review'],
            summary: state.fantasyMode ? 'Inspect the relic register, confirm the rune method, and move the treasury artifact through the right lifecycle gate.' : 'Review the fixed asset trail, confirm the capitalization or depreciation signal, and complete the correct lifecycle action.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy'],
            pagePatterns: ['asset|depreciation|capitalization|disposal|fixed asset'],
            weight: 1
        },
        {
            key: 'control-exception',
            label: state.fantasyMode ? 'Ward Exception' : 'Control Exception',
            titles: state.fantasyMode ? ['Treasury Ward Breach', 'Audit Sigil Review'] : ['Control Exception', 'Finance Compliance Review'],
            summary: state.fantasyMode ? 'Strike the warded control path, capture the breach type, and recover the audit chain without breaking the seal.' : 'Navigate a finance control issue under permission friction, capture the exception signal, and recover through the correct governance path.',
            inspectMode: 'random',
            preferredToolCount: 1,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['control|compliance|audit trail|roles|access|exception'],
            weight: 2
        }
    ],
    legal: [
        {
            key: 'contract-intake-execution',
            label: state.fantasyMode ? 'Pact Intake' : 'Contract Intake',
            titles: state.fantasyMode ? ['Petition Intake', 'Drafting Desk'] : ['Contract Requests', 'Drafting Studio'],
            summary: state.fantasyMode ? 'Open a new pact trail, confirm the right grimoire, and keep the execution path coherent.' : 'Validate contract intake, capture the right template and clause context, and save the agreement into the correct workflow.',
            inspectMode: 'first',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'navigation_only'],
            pagePatterns: ['request|contract|template|draft|assembly|petition|grimoire'],
            weight: 3
        },
        {
            key: 'approval-signature',
            label: state.fantasyMode ? 'Signet Tribunal' : 'Approval & Signature',
            titles: state.fantasyMode ? ['Review Queue', 'Signature Sigils'] : ['Approval Queue', 'Signature Requests'],
            summary: state.fantasyMode ? 'Trace the tribunal route, inspect the signet branch, and survive the warded execution path.' : 'Follow the approval route, capture the signoff detail, and complete the signature workflow under permission pressure.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['denied', 'save'],
            preferredProfiles: ['permission_maze', 'workflow_accuracy'],
            pagePatterns: ['approval|workflow|signature|review|monitor|signet'],
            weight: 3
        },
        {
            key: 'negotiation-redline',
            label: state.fantasyMode ? 'Redline Mirror' : 'Negotiation Redline',
            titles: state.fantasyMode ? ['Redline Mirror', 'Negotiation Table'] : ['Redline Compare', 'Negotiation Workspace'],
            summary: state.fantasyMode ? 'Compare the mirrored clauses, capture the contested wording, and keep the pact coherent through revision.' : 'Review the redline path, capture the negotiation detail, and save the record after version comparison.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['redline|negotiation|comment|counterparty|compare|mirror'],
            weight: 2
        },
        {
            key: 'renewal-obligation',
            label: state.fantasyMode ? 'Oathkeeping Review' : 'Renewal & Obligation',
            titles: state.fantasyMode ? ['Obligation Ledger', 'Renewal Almanac'] : ['Obligation Register', 'Renewal Calendar'],
            summary: state.fantasyMode ? 'Trace the oath ledger, capture the next omen date, and recover the renewal branch before it slips.' : 'Inspect obligation ownership, capture the milestone detail, and keep the renewal workflow on track.',
            inspectMode: 'all',
            preferredToolCount: 0,
            requiredActions: ['save'],
            preferredProfiles: ['workflow_accuracy', 'resilience_recovery'],
            pagePatterns: ['obligation|renewal|amendment|milestone|calendar|ledger|almanac'],
            weight: 3
        },
        {
            key: 'repository-audit',
            label: state.fantasyMode ? 'Archive Audit' : 'Repository Audit',
            titles: state.fantasyMode ? ['Pact Registry', 'Audit Scrolls'] : ['Contract Library', 'Audit Log'],
            summary: state.fantasyMode ? 'Inspect the pact archive, capture the correct version trail, and survive the warded audit branch.' : 'Review repository metadata, capture the right version detail, and navigate the archive under audit restrictions.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['denied'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['repository|library|version|audit|document|search|archive'],
            weight: 2
        },
        {
            key: 'analytics-risk-review',
            label: state.fantasyMode ? 'Risk Omens' : 'Risk Analytics',
            titles: state.fantasyMode ? ['Pact Observatory', 'Risk Omens'] : ['Legal Ops Dashboard', 'Risk Scoring'],
            summary: state.fantasyMode ? 'Read the omen charts, capture the binding risk signal, and keep the reporting path intact.' : 'Navigate the analytics surface, capture the right risk signal, and save the resulting review state cleanly.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['navigation_only', 'workflow_accuracy'],
            pagePatterns: ['dashboard|analytics|risk|report|cycle|observatory|omens'],
            weight: 2
        },
        {
            key: 'integration-sync-review',
            label: state.fantasyMode ? 'Arcane Sync Review' : 'Integration Sync Review',
            titles: state.fantasyMode ? ['Sync Relays', 'API Sigils'] : ['Sync Monitor', 'API & Webhooks'],
            summary: state.fantasyMode ? 'Check the bound relays, capture the faltering sigil, and restore the integration path without losing context.' : 'Inspect connector health, capture the sync detail, and recover the integration flow after a handoff break.',
            inspectMode: 'first',
            preferredToolCount: 1,
            requiredActions: ['save'],
            preferredProfiles: ['resilience_recovery', 'workflow_accuracy'],
            pagePatterns: ['integration|sync|api|webhook|import|export|relay|sigil'],
            weight: 2
        },
        {
            key: 'access-governance',
            label: state.fantasyMode ? 'Ward Governance' : 'Access Governance',
            titles: state.fantasyMode ? ['Permission Seals', 'Security Watch'] : ['Permission Matrix', 'Security Audit'],
            summary: state.fantasyMode ? 'Inspect the ward matrix, capture the role sigil, and survive the guarded branch before the archive closes.' : 'Review access controls, capture the right role detail, and navigate the governance surface under security restrictions.',
            inspectMode: 'all',
            preferredToolCount: 1,
            requiredActions: ['denied'],
            preferredProfiles: ['permission_maze', 'resilience_recovery'],
            pagePatterns: ['role|permission|security|access|settings|audit|ward'],
            weight: 2
        }
    ]
};

const DOMAIN_SCENARIO_DEFAULTS = {
    crm: {
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'hubspoke'],
        preferredFrictionModes: ['balanced', 'realistic'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['workflow', 'collection', 'detail', 'dashboard', 'board']
    },
    erp: {
        preferredRoles: ['analyst', 'manager', 'admin'],
        preferredNavStyles: ['sidebar', 'ribbon', 'topnav'],
        preferredFrictionModes: ['balanced', 'realistic'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['workflow', 'collection', 'detail', 'dashboard', 'board']
    },
    hrms: {
        preferredRoles: ['analyst', 'manager', 'admin', 'auditor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop', 'commandpalette'],
        preferredFrictionModes: ['balanced', 'realistic'],
        preferredComplexities: ['simple', 'moderate', 'complex'],
        preferredIntents: ['workflow', 'detail', 'collection', 'dashboard', 'board']
    },
    healthcare: {
        preferredRoles: ['analyst', 'manager', 'auditor', 'admin'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop', 'commandpalette'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['board', 'workflow', 'detail', 'collection', 'dashboard']
    },
    itsm: {
        preferredRoles: ['analyst', 'manager', 'admin', 'auditor'],
        preferredNavStyles: ['sidebar', 'commandpalette', 'topnav', 'lefttop'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['board', 'workflow', 'detail', 'collection', 'dashboard']
    },
    procurement: {
        preferredRoles: ['analyst', 'manager', 'admin', 'auditor'],
        preferredNavStyles: ['sidebar', 'ribbon', 'topnav', 'commandpalette', 'lefttop'],
        preferredFrictionModes: ['balanced', 'realistic', 'adversarial'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['workflow', 'collection', 'detail', 'dashboard']
    },
    finance: {
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredNavStyles: ['sidebar', 'ribbon', 'topnav'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['detail', 'workflow', 'dashboard', 'collection', 'board']
    },
    legal: {
        preferredRoles: ['analyst', 'manager', 'admin', 'auditor', 'contractor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop', 'commandpalette'],
        preferredFrictionModes: ['balanced', 'adversarial'],
        preferredComplexities: ['moderate', 'complex'],
        preferredIntents: ['knowledge', 'detail', 'workflow', 'collection', 'dashboard']
    },
    generic: {
        preferredRoles: ['analyst', 'manager', 'admin', 'auditor', 'contractor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        preferredFrictionModes: ['balanced', 'realistic'],
        preferredComplexities: ['simple', 'moderate', 'complex'],
        preferredIntents: ['collection', 'detail', 'workflow']
    }
};

const SCENARIO_RULE_OVERRIDES = {
    'lead-qualification': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['pipeline', 'qualification']
    },
    'account-renewal': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst'],
        preferredComplexities: ['moderate', 'complex'],
        tags: ['renewal', 'ownership']
    },
    'forecast-escalation': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['manager', 'admin'],
        preferredNavStyles: ['hubspoke', 'commandpalette', 'topnav'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['forecast', 'escalation']
    },
    'campaign-handoff': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['campaign', 'routing']
    },
    'case-escalation': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['manager', 'admin'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['case', 'sla']
    },
    'quote-approval': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['manager', 'admin'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['quote', 'approval']
    },
    'partner-registration': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['partner', 'channel']
    },
    'inventory-balancing': {
        minTargets: 2,
        preferredNavStyles: ['ribbon', 'sidebar'],
        tags: ['warehouse', 'inventory']
    },
    'receiving-exception': {
        minTargets: 2,
        requiresTool: true,
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['receiving', 'exception']
    },
    'close-operations': {
        minTargets: 2,
        preferredRoles: ['manager', 'admin'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['close', 'settlement']
    },
    'candidate-progress': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav'],
        tags: ['recruiting', 'handoff']
    },
    'onboarding-readiness': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst', 'contractor'],
        tags: ['onboarding', 'readiness']
    },
    'job-change-approval': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['lifecycle', 'job-change']
    },
    'timecard-approval': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['manager', 'analyst'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['time', 'approval']
    },
    'payroll-exception': {
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['payroll', 'exception']
    },
    'benefits-enrollment-review': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['benefits', 'enrollment']
    },
    'performance-cycle-review': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['performance', 'learning']
    },
    'access-provisioning-review': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['admin', 'auditor', 'manager'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        preferredNavStyles: ['commandpalette', 'sidebar', 'topnav'],
        tags: ['security', 'provisioning']
    },
    'registration-identity-resolution': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'lefttop'],
        tags: ['registration', 'identity']
    },
    'care-coordination': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'lefttop'],
        tags: ['care', 'coordination']
    },
    'orders-results-follow-up': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'commandpalette'],
        tags: ['orders', 'results']
    },
    'medication-reconciliation': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredNavStyles: ['sidebar', 'lefttop'],
        tags: ['medication', 'pharmacy']
    },
    'discharge-clearance': {
        minTargets: 2,
        preferredRoles: ['manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['discharge', 'clearance']
    },
    'referral-trace': {
        minTargets: 2,
        requiresTool: true,
        preferredNavStyles: ['topnav', 'sidebar', 'commandpalette'],
        tags: ['referral', 'trace']
    },
    'claim-denial-review': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['claim', 'denial']
    },
    'bed-board-coordination': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['capacity', 'bed']
    },
    'interface-audit': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['auditor', 'admin', 'manager'],
        preferredNavStyles: ['commandpalette', 'sidebar', 'topnav'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['interface', 'audit']
    },
    'incident-recovery': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager', 'admin'],
        preferredNavStyles: ['commandpalette', 'sidebar'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['incident', 'recovery']
    },
    'service-request-fulfillment': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'commandpalette'],
        tags: ['request', 'fulfillment']
    },
    'problem-investigation': {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'commandpalette', 'topnav'],
        tags: ['problem', 'root-cause']
    },
    'change-window': {
        minTargets: 2,
        preferredRoles: ['manager', 'admin'],
        preferredNavStyles: ['commandpalette', 'topnav', 'sidebar'],
        preferredFrictionModes: ['adversarial', 'realistic'],
        tags: ['change', 'cab']
    },
    'asset-ownership': {
        preferredRoles: ['analyst', 'admin', 'auditor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['cmdb', 'asset']
    },
    'knowledge-publication': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav'],
        tags: ['knowledge', 'publication']
    },
    'sla-breach-review': {
        minTargets: 2,
        preferredRoles: ['manager', 'auditor', 'admin'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        preferredNavStyles: ['sidebar', 'topnav', 'commandpalette'],
        tags: ['sla', 'breach']
    },
    'service-review-analytics': {
        minTargets: 2,
        preferredRoles: ['manager', 'auditor'],
        preferredNavStyles: ['topnav', 'commandpalette', 'sidebar'],
        tags: ['analytics', 'reporting']
    },
    'guided-buying-intake': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        tags: ['guided-buying', 'approval']
    },
    'catalog-punchout-review': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'commandpalette', 'topnav'],
        tags: ['catalog', 'punchout']
    },
    'sourcing-award': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredNavStyles: ['ribbon', 'sidebar', 'topnav'],
        tags: ['sourcing', 'award']
    },
    'contract-clause-governance': {
        minTargets: 2,
        preferredRoles: ['manager', 'admin', 'auditor'],
        preferredNavStyles: ['commandpalette', 'lefttop', 'sidebar'],
        tags: ['contract', 'clause']
    },
    'supplier-onboarding-risk': {
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['supplier', 'risk']
    },
    'order-receipt-collaboration': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['order', 'receipt']
    },
    'invoice-match-exception': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['invoice', 'match']
    },
    'spend-governance-review': {
        minTargets: 2,
        preferredRoles: ['manager', 'admin', 'auditor'],
        preferredNavStyles: ['commandpalette', 'topnav', 'sidebar'],
        tags: ['spend', 'governance']
    },
    'invoice-control': {
        minTargets: 2,
        preferredRoles: ['analyst', 'auditor', 'manager'],
        preferredNavStyles: ['ribbon', 'sidebar'],
        tags: ['invoice', 'control']
    },
    'bank-reconciliation': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['treasury', 'reconciliation']
    },
    'month-end-close': {
        minTargets: 2,
        preferredRoles: ['manager', 'auditor', 'admin'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['close', 'finance']
    },
    'budget-forecast-review': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['sidebar', 'topnav', 'ribbon'],
        tags: ['planning', 'forecast']
    },
    'asset-lifecycle': {
        preferredRoles: ['analyst', 'manager'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['asset', 'depreciation']
    },
    'control-exception': {
        preferredRoles: ['auditor', 'manager', 'analyst'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['control', 'exception']
    },
    'contract-intake-execution': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'contractor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['contract', 'intake']
    },
    'approval-signature': {
        minTargets: 2,
        preferredRoles: ['manager', 'admin', 'auditor'],
        preferredFrictionModes: ['balanced', 'adversarial'],
        tags: ['approval', 'signature']
    },
    'negotiation-redline': {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst', 'contractor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop'],
        tags: ['negotiation', 'redline']
    },
    'renewal-obligation': {
        minTargets: 2,
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['renewal', 'obligation']
    },
    'repository-audit': {
        preferredRoles: ['auditor', 'admin', 'manager'],
        preferredFrictionModes: ['balanced', 'adversarial'],
        tags: ['repository', 'audit']
    },
    'analytics-risk-review': {
        preferredRoles: ['analyst', 'manager', 'auditor'],
        preferredNavStyles: ['sidebar', 'topnav', 'lefttop', 'commandpalette'],
        tags: ['analytics', 'risk']
    },
    'integration-sync-review': {
        minTargets: 2,
        preferredRoles: ['admin', 'analyst', 'manager'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['integration', 'sync']
    },
    'access-governance': {
        preferredRoles: ['admin', 'auditor', 'manager'],
        preferredFrictionModes: ['balanced', 'adversarial'],
        tags: ['access', 'governance']
    },
    audit: {
        preferredRoles: ['auditor', 'analyst'],
        preferredFrictionModes: ['balanced', 'realistic'],
        preferredComplexities: ['moderate', 'complex'],
        tags: ['audit', 'verification']
    },
    triage: {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager'],
        preferredNavStyles: ['commandpalette', 'hubspoke', 'sidebar'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['triage', 'response']
    },
    handoff: {
        minTargets: 2,
        preferredRoles: ['manager', 'analyst', 'contractor'],
        preferredFrictionModes: ['balanced', 'realistic'],
        tags: ['handoff', 'continuity']
    },
    recovery: {
        minTargets: 2,
        requiresTool: true,
        preferredRoles: ['analyst', 'manager', 'admin'],
        preferredNavStyles: ['commandpalette', 'sidebar', 'hubspoke'],
        preferredFrictionModes: ['realistic', 'adversarial'],
        tags: ['recovery', 'restore']
    },
    purge: {
        maxTargets: 2,
        preferredRoles: ['manager', 'admin'],
        preferredFrictionModes: ['adversarial', 'realistic'],
        tags: ['cleanup', 'delete']
    }
};

const GENERIC_CHALLENGE_SCENARIO_PACKS = [
    {
        key: 'audit',
        label: 'Audit Sprint',
        titles: ['Cross-Module Verification', 'Integrity Sweep', 'Workflow Audit', 'Record Trace'],
        summary: 'Inspect the right records, capture exact values, and keep the route clean enough for a reliable benchmark read.',
        inspectMode: 'all',
        preferredToolCount: 0,
        requiredActions: []
    },
    {
        key: 'triage',
        label: 'Triage Relay',
        titles: ['Signal Recovery Run', 'Hot Queue Triage', 'Escalation Relay', 'Response Corridor'],
        summary: 'Bounce between hot spots, use the fastest navigation path available, and prove you can recover under interruption noise.',
        inspectMode: 'first',
        preferredToolCount: 1,
        requiredActions: ['denied']
    },
    {
        key: 'handoff',
        label: 'Handoff Circuit',
        titles: ['Workflow Handoff', 'Ownership Relay', 'Record Continuity Run', 'Shift Transfer'],
        summary: 'Verify context, capture the right data, and finish with a clean save so the workflow looks truly handed off.',
        inspectMode: 'first',
        preferredToolCount: 0,
        requiredActions: ['save']
    },
    {
        key: 'recovery',
        label: 'Recovery Loop',
        titles: ['Recovery Loop', 'Service Restore Sprint', 'Queue Restoration', 'Escalation Repair'],
        summary: 'Recover stalled work by taking the quickest route, validating the right data, and committing the fix without extra churn.',
        inspectMode: 'random',
        preferredToolCount: 1,
        requiredActions: ['save']
    },
    {
        key: 'purge',
        label: 'Cleanup Run',
        titles: ['Cleanup Drill', 'Backlog Purge', 'Queue Hygiene Run', 'Stale Work Sweep'],
        summary: 'Trace stale work, confirm the right values, and remove the dead branch without wandering into extra noise.',
        inspectMode: 'first',
        preferredToolCount: 0,
        requiredActions: ['delete']
    }
];

function uniqueScenarioValues(...lists) {
    return Array.from(new Set(lists.flat().filter(Boolean)));
}

function normalizeChallengeScenario(archetype, domainKey = 'generic') {
    const domainDefaults = DOMAIN_SCENARIO_DEFAULTS[domainKey] || DOMAIN_SCENARIO_DEFAULTS.generic;
    const overrides = SCENARIO_RULE_OVERRIDES[archetype.key] || {};

    return {
        ...archetype,
        domainKey,
        inspectMode: archetype.inspectMode || overrides.inspectMode || 'first',
        preferredToolCount: Math.max(0, Number(overrides.preferredToolCount ?? archetype.preferredToolCount ?? 0) || 0),
        requiredActions: uniqueScenarioValues(archetype.requiredActions || [], overrides.requiredActions || []),
        preferredProfiles: uniqueScenarioValues(domainDefaults.preferredProfiles || [], archetype.preferredProfiles || [], overrides.preferredProfiles || []),
        preferredRoles: uniqueScenarioValues(domainDefaults.preferredRoles || [], archetype.preferredRoles || [], overrides.preferredRoles || []),
        preferredNavStyles: uniqueScenarioValues(domainDefaults.preferredNavStyles || [], archetype.preferredNavStyles || [], overrides.preferredNavStyles || []),
        preferredFrictionModes: uniqueScenarioValues(domainDefaults.preferredFrictionModes || [], archetype.preferredFrictionModes || [], overrides.preferredFrictionModes || []),
        preferredComplexities: uniqueScenarioValues(domainDefaults.preferredComplexities || [], archetype.preferredComplexities || [], overrides.preferredComplexities || []),
        preferredIntents: uniqueScenarioValues(domainDefaults.preferredIntents || [], archetype.preferredIntents || [], overrides.preferredIntents || []),
        pagePatterns: uniqueScenarioValues(archetype.pagePatterns || [], overrides.pagePatterns || []),
        tags: uniqueScenarioValues(archetype.tags || [], overrides.tags || [], [domainKey]),
        requiresTool: Boolean(overrides.requiresTool ?? archetype.requiresTool),
        minTargets: Math.max(1, Number(overrides.minTargets ?? archetype.minTargets ?? 1) || 1),
        maxTargets: Math.max(1, Number(overrides.maxTargets ?? archetype.maxTargets ?? 4) || 4),
        weight: Math.max(1, Number(overrides.weight ?? archetype.weight ?? 1) || 1)
    };
}

function getDomainChallengeScenarioPool() {
    const domain = (state.currentInstance && state.currentInstance.domain) || 'crm';
    return (DOMAIN_CHALLENGE_SCENARIO_PACKS[domain] || []).map(archetype => normalizeChallengeScenario(archetype, domain));
}

function getArchetypeSelectionWeight(archetype, profile, pageEntries) {
    let weight = Math.max(1, Number(archetype.weight) || 1);
    const currentRole = (state.currentInstance && state.currentInstance.role) || 'analyst';
    const navStyle = (state.currentInstance && state.currentInstance.nav_style) || 'sidebar';
    const frictionMode = (state.currentInstance && state.currentInstance.frictionMode)
        || getDefaultFrictionMode(state.currentInstance && state.currentInstance.benchmarkProfile, !!(state.currentInstance && state.currentInstance.isFantasy));
    const complexity = (state.currentInstance && state.currentInstance.complexity) || 'moderate';
    const patternMatches = (archetype.pagePatterns || []).filter(rule =>
        pageEntries.some(([, page]) => pageMatchesScenario(page, rule))
    ).length;

    if ((archetype.preferredProfiles || []).includes(profile.profileKey || profile.profileLabel)) {
        weight += 3;
    }
    if ((profile.preferredActions || []).some(action => (archetype.requiredActions || []).includes(action))) {
        weight += 2;
    }
    if (patternMatches) {
        weight += Math.min(4, patternMatches * 2);
    }
    if ((archetype.preferredIntents || []).length && pageEntries.some(([, page]) => (archetype.preferredIntents || []).includes(page.intent))) {
        weight += 2;
    }
    if ((profile.preferredIntents || []).length && pageEntries.some(([, page]) => (profile.preferredIntents || []).includes(page.intent))) {
        weight += 1;
    }
    if ((archetype.preferredRoles || []).includes(currentRole)) {
        weight += 2;
    }
    if ((archetype.preferredNavStyles || []).includes(navStyle)) {
        weight += 2;
    }
    if ((archetype.preferredFrictionModes || []).includes(frictionMode)) {
        weight += 2;
    }
    if ((archetype.preferredComplexities || []).includes(complexity)) {
        weight += 1;
    }
    if (archetype.requiresTool && getChallengeToolType()) {
        weight += 2;
    }
    return weight;
}

function getChallengeArchetypePool() {
    const generic = GENERIC_CHALLENGE_SCENARIO_PACKS.map(archetype => normalizeChallengeScenario(archetype, 'generic'));
    return getDomainChallengeScenarioPool().concat(generic);
}

function selectChallengeArchetype(generator, pageEntries) {
    const caps = pageEntries.map(([, page]) => getPageMissionCapabilities(page));
    const hasSave = caps.some(cap => cap.canSave);
    const hasDelete = caps.some(cap => cap.canDelete);
    const toolType = getChallengeToolType();
    const preferredActions = getChallengeProfile().preferredActions || [];
    const profile = getChallengeProfile();
    const pool = getChallengeArchetypePool().filter(archetype => {
        if (archetype.requiredActions.includes('save') && !hasSave) return false;
        if (archetype.requiredActions.includes('delete') && !hasDelete) return false;
        if (archetype.requiresTool && !toolType) return false;
        return true;
    });
    const preferredPool = pool.filter(archetype =>
        !preferredActions.length
        || preferredActions.some(action => archetype.requiredActions.includes(action))
        || (action => action && archetype.key.includes(action))(preferredActions[0])
    );
    const source = preferredPool.length ? preferredPool : (pool.length ? pool : getChallengeArchetypePool());
    return chooseWeightedMissionOption(generator, source.map(archetype => ({
        ...archetype,
        weight: getArchetypeSelectionWeight(archetype, profile, pageEntries)
    }))) || source[generator.randomInt(0, source.length - 1)];
}

function selectMissionTargets(pageEntries, generator, profile, archetype) {
    const source = pageEntries.length > 1 ? pageEntries.slice(1) : pageEntries.slice();
    const pool = source.length ? source : pageEntries.slice();
    const targetCapacity = pool.length || pageEntries.length;
    const desiredCount = Math.max(
        1,
        Math.min(
            Math.max(profile.targetCount, archetype.minTargets || 1),
            archetype.maxTargets || Math.max(profile.targetCount, archetype.minTargets || 1),
            targetCapacity
        )
    );
    const selected = [];
    const usedPaths = new Set();
    const patternEntries = pool.filter(([, page]) =>
        (archetype.pagePatterns || []).some(rule => pageMatchesScenario(page, rule))
    );
    const intentEntries = pool.filter(([, page]) =>
        (archetype.preferredIntents || []).includes(page.intent)
        || (profile.preferredIntents || []).includes(page.intent)
    );
    const preferredEntries = patternEntries.length ? patternEntries : intentEntries;

    const addTarget = (predicate, preferredOnly = false) => {
        const sourcePool = preferredOnly && preferredEntries.length ? preferredEntries : pool;
        const candidates = sourcePool.filter(([path, page]) => !usedPaths.has(path) && predicate(getPageMissionCapabilities(page), page));
        if (!candidates.length) return null;
        const pick = candidates[generator.randomInt(0, candidates.length - 1)];
        usedPaths.add(pick[0]);
        selected.push(pick);
        return pick;
    };

    if (archetype.requiredActions.includes('save')) {
        addTarget(capabilities => capabilities.canSave, true);
    }
    if (archetype.requiredActions.includes('delete')) {
        addTarget(capabilities => capabilities.canDelete, true);
    }
    if ((profile.inspectAll || archetype.inspectMode === 'all') && selected.length < desiredCount) {
        addTarget(capabilities => capabilities.canInspect, true);
    }

    while (selected.length < desiredCount && preferredEntries.length) {
        const pick = preferredEntries[generator.randomInt(0, preferredEntries.length - 1)];
        if (!pick || usedPaths.has(pick[0])) {
            if (usedPaths.size >= preferredEntries.length) break;
            continue;
        }
        usedPaths.add(pick[0]);
        selected.push(pick);
    }

    while (selected.length < desiredCount) {
        if (!pool.length) break;
        const pick = pool[generator.randomInt(0, pool.length - 1)];
        if (!pick || usedPaths.has(pick[0])) {
            if (usedPaths.size >= pool.length) break;
            continue;
        }
        usedPaths.add(pick[0]);
        selected.push(pick);
    }

    if (!selected.length && pageEntries.length) {
        selected.push(pageEntries[0]);
    }

    return selected.map(([path, page]) => createMissionTarget(path, page, generator));
}

function planMissionTargets(targets, generator, profile, archetype, toolType) {
    const plans = targets.map(target => ({
        ...target,
        useTool: false,
        inspect: false,
        actions: []
    }));

    if (!plans.length) return plans;

    if (profile.inspectAll || archetype.inspectMode === 'all') {
        plans.forEach(plan => {
            plan.inspect = plan.capabilities.canInspect;
        });
    } else if (archetype.inspectMode === 'first' && plans[0].capabilities.canInspect) {
        plans[0].inspect = true;
    } else if (archetype.inspectMode === 'random') {
        const inspectable = plans.filter(plan => plan.capabilities.canInspect);
        if (inspectable.length) {
            inspectable[generator.randomInt(0, inspectable.length - 1)].inspect = true;
        }
    }

    const canPlanAction = (plan, type) => {
        if (type === 'save') return plan.capabilities.canSave;
        if (type === 'delete') return plan.capabilities.canDelete;
        if (type === 'denied') return plan.capabilities.canDeny;
        return false;
    };

    const assignAction = (type, desiredCount = 1) => {
        let assigned = 0;
        for (let attempt = 0; attempt < desiredCount; attempt++) {
            const candidates = plans.filter(plan => canPlanAction(plan, type) && !plan.actions.includes(type));
            if (!candidates.length) break;
            const pick = candidates[generator.randomInt(0, candidates.length - 1)];
            pick.actions.push(type);
            assigned++;
        }
        return assigned;
    };

    let assignedActions = 0;
    archetype.requiredActions.forEach(type => {
        assignedActions += assignAction(type, 1);
    });

    if (state.fantasyMode) {
        assignedActions += assignAction('denied', 1);
    }

    while (assignedActions < profile.actionBudget) {
        const option = chooseWeightedMissionOption(generator, [
            { type: 'save', weight: (archetype.key === 'handoff' || archetype.key === 'recovery') ? 6 : 2 },
            { type: 'delete', weight: archetype.key === 'purge' ? 7 : 1 },
            { type: 'denied', weight: (archetype.key === 'triage' || state.fantasyMode) ? 6 : 3 }
        ].filter(option => plans.some(plan => canPlanAction(plan, option.type) && !plan.actions.includes(option.type))));
        if (!option) break;
        const added = assignAction(option.type, 1);
        if (!added) continue;
        assignedActions += added;
    }

    if (toolType) {
        const lateTargetIndices = plans.map((_, idx) => idx).filter(idx => plans.length === 1 || idx > 0);
        const allIndices = plans.map((_, idx) => idx);
        const candidateIndices = lateTargetIndices.length ? lateTargetIndices.slice() : allIndices.slice();
        let desiredTools = Math.max(profile.mandatoryTools, archetype.preferredToolCount || 0, archetype.requiresTool ? 1 : 0);
        if (state.fantasyMode) {
            desiredTools = Math.max(desiredTools, Math.min(2, plans.length));
        }
        desiredTools = Math.min(plans.length, desiredTools);

        while (desiredTools > 0 && candidateIndices.length) {
            const pickIndex = candidateIndices.splice(generator.randomInt(0, candidateIndices.length - 1), 1)[0];
            plans[pickIndex].useTool = true;
            desiredTools--;
        }
    }

    return plans;
}

function createToolMissionStep(plan, idx, toolType) {
    return {
        id: `tool-${idx + 1}`,
        type: 'tool',
        tool: toolType,
        path: plan.path,
        pageTitle: plan.pageTitle,
        label: state.fantasyMode
            ? `Breach the veil with ${toolType === 'search' ? 'the scrying field' : 'command runes'}`
            : `Use ${toolType === 'search' ? 'header search' : 'the command palette'} for ${plan.pageTitle}`,
        description: state.fantasyMode
            ? `The realm shifts here. Use the faster path before entering ${plan.pageTitle}.`
            : `Fast travel is part of this run. Use the quickest navigation surface to land on ${plan.pageTitle}.`,
        hint: toolType === 'search'
            ? (state.fantasyMode ? `Search for a clue tied to ${plan.pageTitle}.` : `Search by page title or field name to land on ${plan.pageTitle}.`)
            : (state.fantasyMode ? 'Press Ctrl+K to summon the command runes.' : 'Press Ctrl+K to open the command palette.'),
        points: state.fantasyMode ? 80 : 65,
        assistLabel: toolType === 'search'
            ? (state.fantasyMode ? 'Focus Scrying Field' : 'Focus Search')
            : (state.fantasyMode ? 'Open Command Runes' : 'Open Palette')
    };
}

function createNavigateMissionStep(plan, idx) {
    return {
        id: `nav-${idx + 1}`,
        type: 'navigate',
        path: plan.path,
        pageTitle: plan.pageTitle,
        label: state.fantasyMode ? `Reach the ${plan.pageTitle} chamber` : `Navigate to ${plan.pageTitle}`,
        description: state.fantasyMode
            ? `Pass through ${plan.sectionTitle || 'the guild'} and confirm the waystones end at ${plan.pageTitle}.`
            : `Use the app navigation to reach ${plan.pageTitle}${plan.sectionTitle ? ` within ${plan.sectionTitle}` : ''}.`,
        hint: state.fantasyMode ? `The breadcrumb trail should end at ${plan.pageTitle}.` : `The breadcrumb should end with ${plan.pageTitle}.`,
        points: 70
    };
}

function createInspectMissionStep(plan, idx) {
    return {
        id: `inspect-${idx + 1}`,
        type: 'inspect',
        path: plan.path,
        pageTitle: plan.pageTitle,
        fieldName: plan.field.name,
        label: state.fantasyMode ? `Inspect the ${plan.field.name} sigil` : `Inspect ${plan.field.name}`,
        description: state.fantasyMode
            ? `Open the marked field brief on ${plan.pageTitle} before the archive accepts a transcription.`
            : `Open the field details for ${plan.field.name} on ${plan.pageTitle} before capturing the value.`,
        hint: state.fantasyMode
            ? 'Use a field detail affordance on the page. The quest board can help you locate it, but it will not open it for you.'
            : 'Use a field details control on the page. The mission board can help you locate it, but it will not open it for you.',
        points: 85,
        assistLabel: state.fantasyMode ? 'Locate Sigil' : 'Locate Field'
    };
}

function createActionMissionStep(type, plan, idx) {
    if (type === 'save') {
        return {
            id: `save-${idx + 1}`,
            type: 'save',
            path: plan.path,
            pageTitle: plan.pageTitle,
            label: state.fantasyMode ? `Seal the ${plan.pageTitle} record` : `Save changes on ${plan.pageTitle}`,
            description: state.fantasyMode
                ? `Commit a save from the target chamber so the ledger reflects your correction.`
                : `Use a real save action on ${plan.pageTitle}; form saves and record edits both count.`,
            hint: state.fantasyMode ? 'Use Save Changes or a record editor on the page itself. The quest board will not seal it for you.' : 'Use Save Changes or a row editor save on the page itself. The mission board will not fire the save for you.',
            points: 105,
            assistLabel: state.fantasyMode ? 'Open Save Flow' : 'Open Save Flow'
        };
    }

    if (type === 'delete') {
        return {
            id: `delete-${idx + 1}`,
            type: 'delete',
            path: plan.path,
            pageTitle: plan.pageTitle,
            label: state.fantasyMode ? `Purge stale parchment in ${plan.pageTitle}` : `Delete a stale record in ${plan.pageTitle}`,
            description: state.fantasyMode
                ? `Remove one stale entry from ${plan.pageTitle} after you confirm the correct chamber.`
                : `Use a real delete flow on ${plan.pageTitle}; the confirmation counts once the record is removed.`,
            hint: state.fantasyMode ? 'Use a delete control on the page and confirm the purge there. The quest board will not press it for you.' : 'Use a delete control on the page and confirm the removal there. The mission board will not press it for you.',
            points: 125,
            assistLabel: state.fantasyMode ? 'Open Purge Flow' : 'Open Delete Flow'
        };
    }

    return {
        id: `denied-${idx + 1}`,
        type: 'denied',
        path: plan.path,
        pageTitle: plan.pageTitle,
        label: state.fantasyMode ? `Break a ward on ${plan.pageTitle}` : `Trigger a restricted action on ${plan.pageTitle}`,
        description: state.fantasyMode
            ? `Trigger a sealed action so the ward reveals itself before you continue.`
            : `Intentionally hit a blocked or restricted action on ${plan.pageTitle} to prove the agent can recover from permission friction.`,
        hint: state.fantasyMode ? 'Trigger the ward from the page itself. The quest board will not trigger denials for you.' : 'Trigger the restricted prompt from the page itself. The mission board will not trigger denials for you.',
        points: 90,
        assistLabel: state.fantasyMode ? 'Trigger Ward' : 'Trigger Denial'
    };
}

function createCaptureMissionStep(plan, idx) {
    const target = plan.captureTarget || {
        fieldName: plan.field ? plan.field.name : 'Primary Value',
        value: plan.field ? stringifyMissionValue(plan.field.value) : '',
        source: 'field',
        contextLabel: ''
    };
    const fieldName = target.fieldName || 'Primary Value';
    const expectedValue = stringifyMissionValue(target.value);
    const isRecordTarget = target.source === 'record' && target.contextLabel;
    const surfaceLabel = target.surfaceLabel || '';
    const defaultSourceHint = ({
        kpi: state.fantasyMode
            ? `Look in the scrying metrics cards on ${plan.pageTitle}.`
            : `Look in the KPI cards on ${plan.pageTitle}.`,
        stat: state.fantasyMode
            ? `Look in the summary rune strip on ${plan.pageTitle}.`
            : `Look in the summary statistics strip on ${plan.pageTitle}.`,
        card: state.fantasyMode
            ? `Look at the key information cards in ${plan.pageTitle}.`
            : `Look at the key information cards in ${plan.pageTitle}.`,
        detail: state.fantasyMode
            ? `Use the already expanded ${surfaceLabel || target.contextLabel || 'detail'} section in this chamber.`
            : `Use the already expanded ${surfaceLabel || target.contextLabel || 'detail'} section on this page.`,
        record: state.fantasyMode
            ? `Use the visible row marked by ${target.contextLabel || 'the top row'} in the chronicle table.`
            : `Use the visible row marked by ${target.contextLabel || 'the top row'} in the records table.`,
        split: state.fantasyMode
            ? `Use the selected detail pane in the chamber inspector.`
            : `Use the selected detail pane in the split view.`,
        'split-detail': state.fantasyMode
            ? `Use the selected detail pane in the chamber inspector.`
            : `Use the selected detail pane in the split view.`,
        tab: state.fantasyMode
            ? `Use the currently open archive tab on ${plan.pageTitle}.`
            : `Use the currently open tab on ${plan.pageTitle}.`,
        timeline: state.fantasyMode
            ? `Use the visible chronicle feed on ${plan.pageTitle}.`
            : `Use the visible activity timeline on ${plan.pageTitle}.`,
        kanban: state.fantasyMode
            ? `Use the task board lanes that are already visible on ${plan.pageTitle}.`
            : `Use the task board lanes that are already visible on ${plan.pageTitle}.`,
        carousel: state.fantasyMode
            ? `Use the first visible featured panel on ${plan.pageTitle}.`
            : `Use the first visible featured panel on ${plan.pageTitle}.`,
        inline: state.fantasyMode
            ? `Use the editable list entries shown on ${plan.pageTitle}.`
            : `Use the editable list entries shown on ${plan.pageTitle}.`,
        tree: state.fantasyMode
            ? `Use the visible realm structure on ${plan.pageTitle}.`
            : `Use the visible hierarchy tree on ${plan.pageTitle}.`,
        field: state.fantasyMode
            ? `Use the open form fields in ${plan.pageTitle}.`
            : `Use the open form fields in ${plan.pageTitle}.`,
        page: state.fantasyMode
            ? `Use the chamber title shown at the top of the page.`
            : `Use the page title shown at the top of the page.`
    })[target.source || 'field'];
    const label = isRecordTarget
        ? (state.fantasyMode ? `Transcribe ${fieldName} for ${target.contextLabel}` : `Capture ${fieldName} for ${target.contextLabel}`)
        : (state.fantasyMode ? `Transcribe the ${fieldName} inscription` : `Capture the ${fieldName} value`);
    const description = isRecordTarget
        ? (state.fantasyMode
            ? `Record the exact ${fieldName} value shown on the ${target.contextLabel} row within ${plan.pageTitle}.`
            : `Enter the exact ${fieldName} value shown for ${target.contextLabel} on ${plan.pageTitle}.`)
        : (state.fantasyMode
            ? `Record the exact value shown for ${fieldName} on ${plan.pageTitle}${surfaceLabel ? ` in ${surfaceLabel}` : ''}.`
            : `Enter the exact on-page value for ${fieldName} from ${plan.pageTitle}${surfaceLabel ? ` in ${surfaceLabel}` : ''}.`);
    const hint = target.visibilityHint || (isRecordTarget
        ? (state.fantasyMode
            ? `Use the row identified by ${target.contextLabel}. The archive will accept the exact value only.`
            : `Use the row identified by ${target.contextLabel}. Enter the exact value shown there.`)
        : (defaultSourceHint || (state.fantasyMode
            ? `${fieldName} appears within the live chamber details for ${plan.pageTitle}.`
            : `${fieldName} is surfaced on ${plan.pageTitle}.`)));

    return {
        id: `capture-${idx + 1}`,
        type: 'capture',
        path: plan.path,
        pageTitle: plan.pageTitle,
        fieldName,
        expectedValue,
        acceptedAnswers: (target.acceptedAnswers && target.acceptedAnswers.length) ? target.acceptedAnswers : [expectedValue],
        captureSource: target.source || 'field',
        contextLabel: target.contextLabel || '',
        recordKeyName: target.recordKeyName || '',
        recordKeyValue: target.recordKeyValue || '',
        surfaceLabel,
        label,
        description,
        hint,
        points: 120,
        attempts: 0,
        submittedValue: ''
    };
}

function buildChallengeMission() {
    if (!state.blueprint || !state.currentInstance) return null;

    const generator = createScenarioGenerator('mission');
    const pageEntries = Object.entries(state.blueprint.pages);
    const profile = getChallengeProfile();
    const toolType = getChallengeToolType();
    const archetype = selectChallengeArchetype(generator, pageEntries);
    const targets = selectMissionTargets(pageEntries, generator, profile, archetype);
    const plans = planMissionTargets(targets, generator, profile, archetype, toolType);
    const steps = [];

    plans.forEach((plan, idx) => {
        if (plan.useTool && toolType) {
            steps.push(createToolMissionStep(plan, idx, toolType));
        }
        steps.push(createNavigateMissionStep(plan, idx));

        if (plan.actions.includes('denied')) {
            steps.push(createActionMissionStep('denied', plan, idx));
        }
        if (plan.inspect) {
            steps.push(createInspectMissionStep(plan, idx));
        }

        steps.push(createCaptureMissionStep(plan, idx));

        if (plan.actions.includes('save')) {
            steps.push(createActionMissionStep('save', plan, idx));
        }
        if (plan.actions.includes('delete')) {
            steps.push(createActionMissionStep('delete', plan, idx));
        }
    });

    const modifiers = [
        {
            key: 'clean-finish',
            label: state.fantasyMode ? 'Untarnished Chronicle' : 'Clean Finish',
            description: state.fantasyMode
                ? `Finish with no penalties to earn a ${profile.cleanBonus}-point boon.`
                : `Finish with no penalties to earn a ${profile.cleanBonus}-point bonus.`
        },
        {
            key: 'par-time',
            label: state.fantasyMode ? 'Fading Lantern' : 'Par Timer',
            description: state.fantasyMode
                ? `Beat ${formatMissionTime(profile.parTimeMs)} before the lantern goes out for ${profile.speedBonus} bonus points.`
                : `Finish within ${formatMissionTime(profile.parTimeMs)} for a ${profile.speedBonus}-point speed bonus.`
        }
    ];

    if (plans.some(plan => plan.useTool) && toolType) {
        modifiers.push({
            key: 'fast-travel',
            label: state.fantasyMode ? 'Veilwalk Required' : 'Fast Travel Locked',
            description: toolType === 'search'
                ? (state.fantasyMode ? 'Some chambers only count if reached through the scrying field.' : 'At least one target must be reached through global search.')
                : (state.fantasyMode ? 'Some chambers only count if reached through the command runes.' : 'At least one target must be reached through the command palette.')
        });
    }

    if (plans.some(plan => plan.inspect)) {
        modifiers.push({
            key: 'inspection-lock',
            label: state.fantasyMode ? 'Runic Audit' : 'Inspection Lock',
            description: state.fantasyMode
                ? 'Marked fields must be inspected before the archive will accept a transcription.'
                : 'Some targets require an inspection step before capture can be trusted.'
        });
    }

    if (plans.some(plan => plan.actions.includes('save'))) {
        modifiers.push({
            key: 'commit-step',
            label: state.fantasyMode ? 'Seal the Ledger' : 'Commit Step',
            description: state.fantasyMode
                ? 'A proper save is part of the route, not just a final flourish.'
                : 'At least one target must end with a real save action.'
        });
    }

    if (plans.some(plan => plan.actions.includes('delete'))) {
        modifiers.push({
            key: 'purge-step',
            label: state.fantasyMode ? 'Ash Tithe' : 'Purge Step',
            description: state.fantasyMode
                ? 'One stale record must be deliberately purged during the run.'
                : 'One stale record must be deleted as part of the mission.'
        });
    }

    if (plans.some(plan => plan.actions.includes('denied'))) {
        modifiers.push({
            key: 'ward-step',
            label: state.fantasyMode ? 'Warded Gate' : 'Permission Friction',
            description: state.fantasyMode
                ? `Trigger at least one ward to earn a ${profile.wardBonus}-point wardbreaker bonus.`
                : 'A blocked action is deliberately included so the run captures recovery from permission noise.'
        });
    }

    if (state.fantasyMode) {
        modifiers.push({
            key: 'arcane-interference',
            label: 'Arcane Interference',
            description: `Fantasy mode tightens the clock and pushes penalties to ${Math.round(profile.penaltyMultiplier * 100)}% strength.`
        });
    }

    modifiers.push({
        key: 'benchmark-profile',
        label: profile.profileLabel || getBenchmarkProfileLabel(),
        description: getBenchmarkProfileConfig(state.currentInstance && state.currentInstance.benchmarkProfile).summary
    });

    const bonusPotential = profile.cleanBonus + profile.speedBonus + profile.comboBonus + (state.fantasyMode ? profile.wardBonus : 0);
    const baseScore = steps.reduce((sum, step) => sum + step.points, 0);
    const title = `${generator.randomFromArray(archetype.titles)} :: ${state.blueprint.navigation.title}`;

    return {
        title,
        summary: archetype.summary,
        steps,
        baseScore,
        maxScore: baseScore + bonusPotential,
        difficulty: profile.difficulty,
        archetypeKey: archetype.key,
        scenarioKey: archetype.key,
        archetypeLabel: archetype.label,
        scenarioLabel: archetype.label,
        scenarioTags: Array.isArray(archetype.tags) ? archetype.tags.slice() : [],
        modifiers,
        parTimeMs: profile.parTimeMs,
        profile,
        targetCount: plans.length,
        bonusesAwarded: null
    };
}

function initializeBenchmarkSession(instance) {
    state.pagesVisited = 0;
    state.complexityLevel = 0;
    state.commandPaletteQuery = '';
    state.activeMission = buildChallengeMission();
    state.benchmark = {
        instanceId: instance.id,
        startedAt: Date.now(),
        score: 0,
        penalties: 0,
        wrongAnswers: 0,
        deniedActions: 0,
        searchJumps: 0,
        paletteJumps: 0,
        saves: 0,
        combo: 0,
        maxCombo: 0,
        lastStepAt: 0,
        bonusScore: 0,
        events: [],
        visitedPages: state.currentPage ? [state.currentPage] : [],
        eventCounts: {},
        pageVisitMap: state.currentPage ? { [state.currentPage]: 1 } : {},
        pageIssueMap: {},
        wrongTurns: 0,
        detours: 0,
        falseLeads: 0,
        savedRunId: null
    };

    if (state.activeMission) {
        recordBenchmarkEvent('session_start', state.activeMission.title, { path: state.currentPage }, false);
    }
}

function startInstanceTimer() {
    /* Clear any previous timer interval */
    if (state._instanceTimerInterval) {
        clearInterval(state._instanceTimerInterval);
        state._instanceTimerInterval = null;
    }
    const timerEl = document.getElementById('instance-timer');
    if (!timerEl || !state.benchmark) return;

    const update = () => {
        if (!state.benchmark) {
            if (state._instanceTimerInterval) clearInterval(state._instanceTimerInterval);
            return;
        }
        const elapsed = Date.now() - state.benchmark.startedAt;
        timerEl.textContent = formatMissionTime(elapsed);
    };
    update();
    state._instanceTimerInterval = setInterval(update, 1000);
}

function stopInstanceTimer() {
    if (state._instanceTimerInterval) {
        clearInterval(state._instanceTimerInterval);
        state._instanceTimerInterval = null;
    }
    const timerEl = document.getElementById('instance-timer');
    if (timerEl) timerEl.classList.add('is-hidden');
}

function recordBenchmarkEvent(type, detail, meta = {}, shouldRefresh = true) {
    if (!state.benchmark) return;

    const event = {
        type,
        detail,
        page: meta.path || state.currentPage || null,
        atMs: Date.now() - state.benchmark.startedAt
    };

    state.benchmark.eventCounts[type] = (state.benchmark.eventCounts[type] || 0) + 1;
    state.benchmark.events.unshift(event);
    state.benchmark.events = state.benchmark.events.slice(0, 40);

    if (type === 'navigate' && event.page) {
        state.benchmark.visitedPages.push(event.page);
    }
    if (event.page) {
        state.benchmark.pageVisitMap[event.page] = (state.benchmark.pageVisitMap[event.page] || 0) + 1;
    }
    if (meta.expectedPath && event.page && meta.expectedPath !== event.page) {
        state.benchmark.detours += 1;
    }
    if (meta.falseLead) {
        state.benchmark.falseLeads += 1;
    }
    if (['wrong_context', 'wrong_answer', 'denied', 'step_skipped', 'false_lead', 'session_expired'].includes(type)) {
        state.benchmark.wrongTurns += 1;
        if (event.page) {
            state.benchmark.pageIssueMap[event.page] = (state.benchmark.pageIssueMap[event.page] || 0) + 1;
        }
    }

    if (typeof signalFantasyMechanicCue === 'function') {
        signalFantasyMechanicCue(type, detail, meta);
    }

    if (shouldRefresh) {
        refreshMissionUi();
    }
}

function getMissionProgressStats() {
    if (!state.activeMission || !state.benchmark) {
        return { completed: 0, total: 0, elapsed: '00:00', uniquePages: 0 };
    }

    const completed = state.activeMission.steps.filter(step => step.completedAt).length;
    const total = state.activeMission.steps.length;
    return {
        completed,
        total,
        elapsed: formatMissionTime(Date.now() - state.benchmark.startedAt),
        uniquePages: new Set(state.benchmark.visitedPages).size
    };
}

function getNetMissionScore() {
    if (!state.benchmark) return 0;
    return state.benchmark.score - state.benchmark.penalties;
}

function getMissionStanding() {
    if (!state.activeMission || !state.benchmark) {
        return { grade: 'D', label: state.fantasyMode ? 'Fading' : 'D Rank', className: 'd' };
    }

    const progress = getMissionProgressStats();
    const completionRatio = progress.total ? progress.completed / progress.total : 0;
    const maxScore = Math.max(1, state.activeMission.maxScore || state.activeMission.baseScore || 1);
    const elapsedMs = Math.max(1000, Date.now() - state.benchmark.startedAt);
    const paceRatio = state.activeMission.parTimeMs ? Math.min(1.15, state.activeMission.parTimeMs / elapsedMs) : 0.8;
    const scoreRatio = Math.min(1.15, getNetMissionScore() / maxScore);
    const comboRatio = Math.min(1, (state.benchmark.maxCombo || 0) / Math.max(2, state.activeMission.profile.comboThreshold || 3));
    const penaltyDrag = Math.min(0.38, (state.benchmark.penalties + (state.benchmark.wrongAnswers * 12)) / Math.max(80, maxScore));

    let rating = (completionRatio * 0.58) + (scoreRatio * 0.24) + (paceRatio * 0.1) + (comboRatio * 0.08) - penaltyDrag;
    if (progress.total > 0 && progress.completed === progress.total) {
        rating += 0.08;
    }

    const tiers = [
        { min: 1.02, grade: 'S', label: state.fantasyMode ? 'Legend' : 'S Rank', className: 's' },
        { min: 0.84, grade: 'A', label: state.fantasyMode ? 'Heroic' : 'A Rank', className: 'a' },
        { min: 0.66, grade: 'B', label: state.fantasyMode ? 'Steady' : 'B Rank', className: 'b' },
        { min: 0.46, grade: 'C', label: state.fantasyMode ? 'Worn' : 'C Rank', className: 'c' }
    ];

    const standing = tiers.find(tier => rating >= tier.min) || { grade: 'D', label: state.fantasyMode ? 'Fading' : 'D Rank', className: 'd' };
    return { ...standing, rating };
}

function applyMissionCompletionBonuses() {
    if (!state.activeMission || !state.benchmark) return 0;
    if (Array.isArray(state.activeMission.bonusesAwarded)) {
        return state.activeMission.bonusesAwarded.reduce((sum, bonus) => sum + bonus.points, 0);
    }

    const profile = state.activeMission.profile || getChallengeProfile();
    const elapsedMs = Math.max(0, Date.now() - state.benchmark.startedAt);
    const bonuses = [];

    if (state.benchmark.penalties === 0 && state.benchmark.wrongAnswers === 0) {
        bonuses.push({
            key: 'clean',
            label: state.fantasyMode ? 'Untarnished Chronicle' : 'Clean Finish',
            points: profile.cleanBonus
        });
    }

    if (state.activeMission.parTimeMs && elapsedMs <= state.activeMission.parTimeMs) {
        bonuses.push({
            key: 'speed',
            label: state.fantasyMode ? 'Fading Lantern' : 'Par Time',
            points: profile.speedBonus
        });
    }

    if ((state.benchmark.maxCombo || 0) >= (profile.comboThreshold || 3)) {
        bonuses.push({
            key: 'combo',
            label: state.fantasyMode ? 'Chain of Sigils' : 'Combo Chain',
            points: profile.comboBonus
        });
    }

    if (state.fantasyMode && state.benchmark.deniedActions > 0) {
        bonuses.push({
            key: 'wardbreaker',
            label: 'Wardbreaker',
            points: profile.wardBonus
        });
    }

    const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus.points, 0);
    state.activeMission.bonusesAwarded = bonuses;

    if (totalBonus > 0) {
        state.benchmark.score += totalBonus;
        state.benchmark.bonusScore += totalBonus;
        bonuses.forEach(bonus => {
            recordBenchmarkEvent('bonus', `${bonus.label} +${bonus.points}`, { path: state.currentPage }, false);
        });
    }

    return totalBonus;
}

function isMissionStepUnlocked(stepIndex) {
    if (!state.activeMission) return false;
    return state.activeMission.steps.slice(0, stepIndex).every(step => step.completedAt);
}

function getNextPendingMissionStep() {
    if (!state.activeMission) return null;
    return state.activeMission.steps.find(step => !step.completedAt) || null;
}

function shouldPersistBenchmarkRun(status = 'abandoned') {
    if (!state.currentInstance || !state.activeMission || !state.benchmark || state.benchmark.savedRunId) {
        return false;
    }
    if (status === 'completed') return true;

    const progress = getMissionProgressStats();
    return progress.completed > 0
        || progress.uniquePages > 1
        || state.benchmark.score > 0
        || state.benchmark.penalties > 0
        || state.benchmark.wrongAnswers > 0
        || state.benchmark.deniedActions > 0;
}

function buildBenchmarkRunResult(status = 'completed') {
    if (!state.currentInstance || !state.activeMission || !state.benchmark) return null;

    const progress = getMissionProgressStats();
    const standing = getMissionStanding();
    const captureSteps = state.activeMission.steps.filter(step => step.type === 'capture');
    const firstTryCaptures = captureSteps.filter(step => (step.attempts || 0) <= 1 && step.completedAt && step.source !== 'skip').length;
    const skippedSteps = state.activeMission.steps.filter(step => step.source === 'skip').length;
    const coveragePct = Object.keys(state.blueprint.pages || {}).length
        ? Math.round((progress.uniquePages / Object.keys(state.blueprint.pages || {}).length) * 100)
        : 0;
    const firstTryRate = captureSteps.length ? Math.round((firstTryCaptures / captureSteps.length) * 100) : 100;
    const eventTimeline = state.benchmark.events.slice().reverse().slice(-24);
    const pageSequence = Array.from(new Set(state.benchmark.visitedPages)).slice(0, 24);
    const pageVisitMap = { ...(state.benchmark.pageVisitMap || {}) };
    const pageIssueMap = { ...(state.benchmark.pageIssueMap || {}) };
    const eventCounts = { ...(state.benchmark.eventCounts || {}) };
    const wrongTurns = Math.max(0, Number(state.benchmark.wrongTurns) || 0);
    const routeEfficiency = Math.max(
        10,
        Math.min(
            100,
            Math.round((progress.uniquePages / Math.max(progress.uniquePages + wrongTurns + (state.benchmark.detours || 0), 1)) * 100)
        )
    );
    const failureSummary = summarizeRunFailure({
        status,
        penalties: state.benchmark.penalties,
        wrongAnswers: state.benchmark.wrongAnswers,
        deniedActions: state.benchmark.deniedActions,
        skippedSteps,
        wrongTurns
    });
    return {
        id: Math.random().toString(36).substr(2, 9),
        recordedAt: new Date().toISOString(),
        initials: '---',
        status,
        missionTitle: state.activeMission.title,
        archetypeLabel: state.activeMission.archetypeLabel || '',
        scenarioLabel: state.activeMission.scenarioLabel || state.activeMission.archetypeLabel || '',
        modifierLabels: (state.activeMission.modifiers || []).map(modifier => modifier.label),
        rank: standing.grade,
        rawScore: state.benchmark.score,
        penalties: state.benchmark.penalties,
        netScore: getNetMissionScore(),
        bonusScore: state.benchmark.bonusScore || 0,
        completedSteps: progress.completed,
        totalSteps: progress.total,
        elapsedMs: Math.max(0, Date.now() - state.benchmark.startedAt),
        parTimeMs: state.activeMission.parTimeMs || 0,
        uniquePages: progress.uniquePages,
        wrongAnswers: state.benchmark.wrongAnswers,
        deniedActions: state.benchmark.deniedActions,
        searchJumps: state.benchmark.searchJumps,
        paletteJumps: state.benchmark.paletteJumps,
        saves: state.benchmark.saves,
        maxCombo: state.benchmark.maxCombo || 0,
        role: state.currentInstance.role || 'analyst',
        isFantasy: !!state.currentInstance.isFantasy,
        benchmarkProfile: state.currentInstance.benchmarkProfile || getDefaultBenchmarkProfile(!!state.currentInstance.isFantasy),
        frictionMode: state.currentInstance.frictionMode || getDefaultFrictionMode(state.currentInstance.benchmarkProfile, !!state.currentInstance.isFantasy),
        seed: state.currentInstance.seed || 0,
        navStyle: state.currentInstance.nav_style || 'sidebar',
        benchmarkPreset: state.currentInstance.benchmarkPreset || '',
        scenarioKey: state.activeMission.scenarioKey || state.activeMission.archetypeKey || '',
        scenarioTags: Array.isArray(state.activeMission.scenarioTags) ? state.activeMission.scenarioTags.slice(0, 8) : [],
        skippedSteps,
        coveragePct,
        firstTryRate,
        wrongTurns,
        falseLeads: state.benchmark.falseLeads || 0,
        routeEfficiency,
        failureSummary,
        eventTimeline,
        pageSequence,
        eventCounts,
        pageVisitMap,
        pageIssueMap
    };
}

function finalizeBenchmarkRun(status = 'abandoned') {
    if (!shouldPersistBenchmarkRun(status)) return null;

    const result = buildBenchmarkRunResult(status);
    const savedRun = state.instanceManager.recordRunResult(state.currentInstance.id, result);
    if (savedRun) {
        state.benchmark.savedRunId = savedRun.id;
    }
    stopInstanceTimer();
    return savedRun;
}

function completeMissionStep(stepId, source = 'manual', pointsAwardOverride = null) {
    if (!state.activeMission || !state.benchmark) return false;
    const step = state.activeMission.steps.find(item => item.id === stepId);
    if (!step || step.completedAt) return false;

    const completedAt = Date.now();
    const comboWindowMs = (state.activeMission.profile && state.activeMission.profile.comboWindowMs) || 24000;
    if (state.benchmark.lastStepAt && (completedAt - state.benchmark.lastStepAt) <= comboWindowMs) {
        state.benchmark.combo = (state.benchmark.combo || 0) + 1;
    } else {
        state.benchmark.combo = 1;
    }
    state.benchmark.lastStepAt = completedAt;
    state.benchmark.maxCombo = Math.max(state.benchmark.maxCombo || 0, state.benchmark.combo);

    step.completedAt = completedAt;
    step.source = source;
    step.awardedPoints = typeof pointsAwardOverride === 'number' ? Math.max(0, pointsAwardOverride) : step.points;
    state.benchmark.score += step.awardedPoints;
    recordBenchmarkEvent('step_complete', step.label, { path: step.path || state.currentPage }, false);

    if (!state.activeMission.completedAt && state.activeMission.steps.every(item => item.completedAt)) {
        state.activeMission.completedAt = completedAt;
        const bonusTotal = applyMissionCompletionBonuses();
        const standing = getMissionStanding();
        recordBenchmarkEvent('mission_complete', `${state.activeMission.title} :: ${standing.grade}`, { path: state.currentPage }, false);
        const savedRun = finalizeBenchmarkRun('completed');
        showToast(
            state.fantasyMode
                ? `Quest complete. ${standing.label} rating. Final ledger score: ${getNetMissionScore()}${bonusTotal ? ` (+${bonusTotal} bonus)` : ''}`
                : `Mission complete. ${standing.label}. Final benchmark score: ${getNetMissionScore()}${bonusTotal ? ` (+${bonusTotal} bonus)` : ''}`,
            'success',
            6000
        );
        openChallengePanel(state.currentInstance ? state.currentInstance.id : '');
        if (savedRun && state.currentInstance) {
            setTimeout(() => openRunInitialsModal(state.currentInstance.id, savedRun.id), 220);
        }
    } else {
        const comboSuffix = (state.benchmark.combo || 0) > 1
            ? (state.fantasyMode ? ` • Chain x${state.benchmark.combo}` : ` • Combo x${state.benchmark.combo}`)
            : '';
        showToast(
            (state.fantasyMode ? `Quest step complete: ${step.label}` : `Mission step complete: ${step.label}`) + comboSuffix,
            'success',
            2800
        );
    }

    refreshMissionUi();
    return true;
}

function maybeCompleteNavigationStep() {
    const nextStep = getNextPendingMissionStep();
    if (nextStep && nextStep.type === 'navigate' && nextStep.path === state.currentPage) {
        completeMissionStep(nextStep.id, 'navigate');
    }
}

function maybeCompleteToolStep(toolType, path) {
    const nextStep = getNextPendingMissionStep();
    if (nextStep && nextStep.type === 'tool' && nextStep.tool === toolType && nextStep.path === path) {
        completeMissionStep(nextStep.id, toolType);
    }
}

function maybeCompleteInspectStep(fieldName) {
    const nextStep = getNextPendingMissionStep();
    if (!nextStep || nextStep.type !== 'inspect' || nextStep.path !== state.currentPage) return;
    if (normalizeChallengeAnswer(fieldName) === normalizeChallengeAnswer(nextStep.fieldName)) {
        completeMissionStep(nextStep.id, 'inspect');
    }
}

function maybeCompleteActionStep(actionType, path = state.currentPage) {
    const nextStep = getNextPendingMissionStep();
    if (nextStep && nextStep.type === actionType && nextStep.path === path) {
        completeMissionStep(nextStep.id, actionType);
    }
}

function getMissionStepTypeLabel(stepType) {
    return ({
        tool: state.fantasyMode ? 'Veilwalk' : 'Fast Travel',
        navigate: state.fantasyMode ? 'Traverse' : 'Navigate',
        inspect: state.fantasyMode ? 'Inspect Sigil' : 'Inspect',
        capture: state.fantasyMode ? 'Transcribe' : 'Capture',
        save: state.fantasyMode ? 'Seal' : 'Save',
        delete: state.fantasyMode ? 'Purge' : 'Delete',
        denied: state.fantasyMode ? 'Ward' : 'Denied'
    })[stepType] || 'Step';
}

function canUseMissionAssist(step) {
    return !!(step && (step.type === 'tool' || step.type === 'inspect'));
}

function locateMissionFieldHint(fieldName) {
    if (!fieldName || typeof document === 'undefined') return false;
    const normalizedFieldName = normalizeChallengeAnswer(fieldName);
    const candidates = Array.from(document.querySelectorAll([
        '#content-area label',
        '#content-area th',
        '#content-area .form-group label',
        '#content-area .detail-label',
        '#content-area .row-details-label',
        '#content-area .tab-pane-row-label',
        '#content-area .split-view-item',
        '#content-area .accordion-header',
        '#content-area .card h3',
        '#content-area .component-title'
    ].join(',')));
    const match = candidates.find(element => normalizeChallengeAnswer(element.textContent || '') === normalizedFieldName)
        || candidates.find(element => normalizeChallengeAnswer(element.textContent || '').includes(normalizedFieldName));
    if (!match) return false;

    const previousOutline = match.style.outline;
    const previousBoxShadow = match.style.boxShadow;
    const previousBackground = match.style.backgroundColor;
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    match.style.outline = '3px solid rgba(99, 102, 241, 0.7)';
    match.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.18)';
    match.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
    setTimeout(() => {
        match.style.outline = previousOutline;
        match.style.boxShadow = previousBoxShadow;
        match.style.backgroundColor = previousBackground;
    }, 2200);
    return true;
}

function renderBenchmarkStatusBar() {
    if (!state.activeMission || !state.benchmark) return '';
    const progress = getMissionProgressStats();
    const isComplete = progress.total > 0 && progress.completed === progress.total;
    const standing = getMissionStanding();
    const comboValue = Math.max(state.benchmark.combo || 0, state.benchmark.maxCombo || 0);
    return `
        <div class="benchmark-strip-inner">
            <div class="benchmark-strip-title">${state.fantasyMode ? 'Quest Ledger' : 'Mission Board'}</div>
            <div class="benchmark-chip benchmark-chip-rank rank-${standing.className}">${standing.grade} ${standing.label}</div>
            <div class="benchmark-chip">${escapeHtml(state.activeMission.archetypeLabel || 'Mission')}</div>
            <div class="benchmark-chip benchmark-chip-strong">${progress.completed}/${progress.total} Steps</div>
            <div class="benchmark-chip">${getNetMissionScore()} Pts</div>
            <div class="benchmark-chip">${comboValue || 0}x Combo</div>
            <div class="benchmark-chip ${state.benchmark.penalties ? 'benchmark-chip-warning' : ''}">${state.benchmark.penalties} Penalty</div>
            <div class="benchmark-chip">${progress.uniquePages} Pages</div>
            <div class="benchmark-chip">${formatMissionTime(state.activeMission.parTimeMs || 0)} Par</div>
            <div class="benchmark-chip ${isComplete ? 'benchmark-chip-success' : ''}">${progress.elapsed}</div>
        </div>
    `;
}

function jumpToMissionStep(stepId) {
    if (!state.activeMission) return;
    const step = state.activeMission.steps.find(item => item.id === stepId);
    if (!step) return;

    if (step.path) {
        navigateToPage(step.path);
    }

    recordBenchmarkEvent(
        'mission_jump',
        state.fantasyMode ? `Quest board jump to ${step.pageTitle || step.label}` : `Mission board jump to ${step.pageTitle || step.label}`,
        { path: step.path, stepId },
        false
    );

    if (step.type === 'tool') {
        showToast(
            step.tool === 'search'
                ? (state.fantasyMode ? 'Use the scrying field to finish this step.' : 'Use the header search to finish this step.')
                : (state.fantasyMode ? 'Summon the command runes to finish this step.' : 'Open the command palette to finish this step.'),
            'info'
        );
    }
}

function generateChallengesLegacy() {
    if (!state.activeMission || !state.benchmark) {
        return `<div class="challenge-empty">${state.fantasyMode ? 'No quest briefing is available in this realm.' : 'No active benchmark mission is available.'}</div>`;
    }

    const mission = state.activeMission;
    const progress = getMissionProgressStats();
    const progressPct = mission.steps.length ? Math.round((progress.completed / mission.steps.length) * 100) : 0;
    const recentEvents = state.benchmark.events.slice(0, 6);
    const nextStep = getNextPendingMissionStep();
    const nextStepOnPage = nextStep && nextStep.path === state.currentPage;

    return `
        <div class="challenge-panel-shell">
            <div class="challenge-panel-overview">
        <div class="challenge-summary">
            <div class="challenge-summary-title">${escapeHtml(mission.title)}</div>
            <div class="challenge-summary-text">${escapeHtml(mission.summary)}</div>
        </div>

        <div class="challenge-stats-grid">
            <div class="challenge-stat">
                <div class="challenge-stat-label">Net Score</div>
                <div class="challenge-stat-value">${getNetMissionScore()}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">Unique Pages</div>
                <div class="challenge-stat-value">${progress.uniquePages}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">Denied Actions</div>
                <div class="challenge-stat-value">${state.benchmark.deniedActions}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">Wrong Captures</div>
                <div class="challenge-stat-value">${state.benchmark.wrongAnswers}</div>
            </div>
        </div>

        <div class="challenge-progress">
            <div class="challenge-progress-meta">
                <span>${progress.completed}/${progress.total} steps complete</span>
                <span>${progress.elapsed}</span>
            </div>
            <div class="challenge-progress-bar">
                <div class="challenge-progress-fill" style="width:${progressPct}%;"></div>
            </div>
        </div>

        ${nextStep ? `
            <div class="challenge-next-step">
                <div class="challenge-next-kicker">${state.fantasyMode ? 'Next quest target' : 'Next mission target'}</div>
                <div class="challenge-next-label">${escapeHtml(nextStep.label)}</div>
                <div class="challenge-next-meta">
                    ${escapeHtml(nextStep.description)}<br/>
                    ${nextStepOnPage
                        ? (state.fantasyMode ? 'You are already in the correct chamber.' : 'You are already on the correct page.')
                        : `${state.fantasyMode ? 'Target chamber' : 'Target page'}: ${escapeHtml(nextStep.pageTitle || nextStep.path)}`} • ${nextStep.points} pts
                </div>
                <div class="challenge-next-actions">
                    <button class="button button-secondary" onclick="jumpToMissionStep('${nextStep.id}')">${nextStepOnPage ? (state.fantasyMode ? 'Refocus Step' : 'Refocus Step') : (state.fantasyMode ? 'Open Target Chamber' : 'Open Target Page')}</button>
                </div>
            </div>
        ` : ''}
            </div>

            <div class="challenge-step-list">
        ${mission.steps.map((step, idx) => {
            const unlocked = isMissionStepUnlocked(idx);
            const completed = !!step.completedAt;
            const isActive = unlocked && !completed;
            const toolHint = step.type === 'tool'
                ? (step.tool === 'search'
                    ? (state.fantasyMode ? 'Use the scrying field in the header to jump to the correct chamber.' : 'Use the header search to jump to the correct module.')
                    : (state.fantasyMode ? 'Press Ctrl+K to summon the command runes.' : 'Press Ctrl+K to open the command palette.'))
                : '';
            const feedback = step.lastFeedback || (completed && step.submittedValue ? `${state.fantasyMode ? 'Accepted inscription' : 'Captured value'}: ${step.submittedValue}` : '');

            return `
                <div class="challenge-item ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}">
                    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                        <div>
                            <div class="challenge-field-name"><span class="challenge-step-index">${idx + 1}</span>${escapeHtml(step.label)}</div>
                            <div class="challenge-field-type">${escapeHtml(step.description)}</div>
                        </div>
                        <div class="challenge-status-badge challenge-status-${completed ? 'completed' : (unlocked ? 'pending' : 'locked')}">${completed ? 'Complete' : (unlocked ? 'Active' : 'Locked')}</div>
                    </div>

                    <div class="challenge-step-hint">${escapeHtml(step.hint || toolHint)} • ${step.points} pts</div>

                    ${step.type === 'capture' ? `
                        <div class="challenge-answer-row">
                            <input
                                class="challenge-answer-input"
                                id="mission-input-${step.id}"
                                placeholder="${state.fantasyMode ? 'Transcribe the inscription' : 'Enter the observed value'}"
                                ${isActive ? '' : 'disabled'}
                            />
                            <button
                                class="button button-primary challenge-answer-btn"
                                onclick="submitChallengeAnswer('${step.id}')"
                                ${isActive ? '' : 'disabled'}
                            >Validate</button>
                        </div>
                    ` : ''}

                    ${feedback ? `<div class="challenge-step-hint">${escapeHtml(feedback)}</div>` : ''}
                </div>
            `;
        }).join('')}

        <div class="challenge-event-feed">
            <div class="challenge-event-title">${state.fantasyMode ? 'Chronicle Feed' : 'Recent Telemetry'}</div>
            ${recentEvents.length ? recentEvents.map(event => `
                <div class="challenge-event-item">
                    <div class="challenge-event-label">${escapeHtml(event.detail)}</div>
                    <div class="challenge-event-meta">
                        <span>${escapeHtml(event.type.replace(/_/g, ' '))}</span>
                        <span>${formatMissionTime(event.atMs)}</span>
                    </div>
                </div>
            `).join('') : `<div class="challenge-empty">${state.fantasyMode ? 'The chronicle is still blank.' : 'Telemetry will appear once the run begins.'}</div>`}
        </div>
    `;
}

function assistMissionStep(stepId) {
    if (!state.activeMission) return;
    const stepIndex = state.activeMission.steps.findIndex(item => item.id === stepId);
    const step = state.activeMission.steps[stepIndex];
    if (!step) return;

    if (!isMissionStepUnlocked(stepIndex) || step.completedAt) {
        showToast(state.fantasyMode ? 'That task is already settled in the chronicle.' : 'That mission step is not active right now.', 'warning');
        return;
    }

    if (step.type === 'tool') {
        if (step.tool === 'search') {
            const input = document.getElementById('search-input');
            if (!input) {
                showToast(state.fantasyMode ? 'The scrying field is unavailable in this realm.' : 'Search is not enabled for this instance.', 'warning');
                return;
            }
            input.focus();
            if (typeof input.select === 'function') input.select();
            showToast(state.fantasyMode ? 'The scrying field is ready.' : 'Search is ready for the jump.', 'info');
            return;
        }
        openCommandPalette();
        return;
    }

    if (step.path && state.currentPage !== step.path) {
        showToast(
            state.fantasyMode ? `Travel to ${step.pageTitle} before invoking this aid.` : `Open ${step.pageTitle} before using this assist.`,
            'warning'
        );
        return;
    }

    if (step.type === 'inspect') {
        const located = locateMissionFieldHint(step.fieldName);
        showToast(
            located
                ? (state.fantasyMode ? `The ${step.fieldName} sigil is highlighted. Open its details from the page to complete the step.` : `${step.fieldName} is highlighted. Open its details from the page to complete the step.`)
                : (state.fantasyMode ? `Look for ${step.fieldName} within the current chamber and open its detail view manually.` : `Look for ${step.fieldName} on the current page and open its detail view manually.`),
            'info',
            3600
        );
        return;
    }

    if (step.type === 'save') {
        showToast(
            state.fantasyMode
                ? 'Use Save Changes or a record editor on the page itself. The quest board will not seal it for you.'
                : 'Use Save Changes or a record editor on the page itself. The mission board will not save it for you.',
            'info',
            3600
        );
        return;
    }

    if (step.type === 'delete') {
        showToast(
            state.fantasyMode
                ? 'Use a delete control on the page and confirm the purge there. The quest board will not trigger it for you.'
                : 'Use a delete control on the page and confirm the removal there. The mission board will not trigger it for you.',
            'info',
            3600
        );
        return;
    }

    if (step.type === 'denied') {
        showToast(
            state.fantasyMode
                ? 'Trigger a warded action from the page itself to satisfy this step.'
                : 'Trigger a restricted action from the page itself to satisfy this step.',
            'info',
            3600
        );
        return;
    }
}

function generateChallengesLegacyBoard() {
    if (!state.activeMission || !state.benchmark) {
        return `<div class="challenge-empty">${state.fantasyMode ? 'No quest briefing is available in this realm.' : 'No active benchmark mission is available.'}</div>`;
    }

    const mission = state.activeMission;
    const progress = getMissionProgressStats();
    const progressPct = mission.steps.length ? Math.round((progress.completed / mission.steps.length) * 100) : 0;
    const recentEvents = state.benchmark.events.slice(0, 6);
    const nextStep = getNextPendingMissionStep();
    const nextStepOnPage = nextStep && nextStep.path === state.currentPage;
    const standing = getMissionStanding();
    const bonusesAwarded = Array.isArray(mission.bonusesAwarded) ? mission.bonusesAwarded : [];

    return `
        <div class="challenge-summary">
            <div class="challenge-summary-head">
                <div>
                    <div class="challenge-summary-title">${escapeHtml(mission.title)}</div>
                    <div class="challenge-summary-text">${escapeHtml(mission.summary)}</div>
                </div>
                <div class="challenge-rank-pill rank-${standing.className}">
                    <span class="challenge-rank-overline">${state.fantasyMode ? 'Current Fate' : 'Current Rank'}</span>
                    <span class="challenge-rank-value">${standing.grade}</span>
                    <span class="challenge-rank-caption">${escapeHtml(standing.label)}</span>
                </div>
            </div>

            <div class="challenge-summary-badges">
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.archetypeLabel || 'Mission')}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.profile.tierLabel || mission.difficulty)}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.profile.profileLabel || getBenchmarkProfileLabel())}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(getRoleDisplayName((state.currentInstance && state.currentInstance.role) || 'analyst', !!state.fantasyMode))}</strong></div>
                <div class="challenge-summary-badge"><strong>${formatMissionTime(mission.parTimeMs || 0)}</strong> par</div>
                <div class="challenge-summary-badge"><strong>${mission.targetCount || 0}</strong> targets</div>
            </div>

            ${(mission.modifiers && mission.modifiers.length) ? `
                <div class="challenge-modifier-grid">
                    ${mission.modifiers.map(modifier => `
                        <div class="challenge-modifier">
                            <div class="challenge-modifier-label">${escapeHtml(modifier.label)}</div>
                            <div class="challenge-modifier-copy">${escapeHtml(modifier.description)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="challenge-stats-grid">
            <div class="challenge-stat">
                <div class="challenge-stat-label">Net Score</div>
                <div class="challenge-stat-value">${getNetMissionScore()}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">${state.fantasyMode ? 'Chain Peak' : 'Max Combo'}</div>
                <div class="challenge-stat-value">${state.benchmark.maxCombo || 0}x</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">Unique Pages</div>
                <div class="challenge-stat-value">${progress.uniquePages}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">${state.fantasyMode ? 'Rune Faults' : 'Wrong Captures'}</div>
                <div class="challenge-stat-value">${state.benchmark.wrongAnswers}</div>
            </div>
        </div>

        <div class="challenge-progress">
            <div class="challenge-progress-meta">
                <span>${progress.completed}/${progress.total} steps complete</span>
                <span>${progress.elapsed}</span>
            </div>
            <div class="challenge-progress-bar">
                <div class="challenge-progress-fill" style="width:${progressPct}%;"></div>
            </div>
        </div>

        ${nextStep ? `
            <div class="challenge-next-step">
                <div class="challenge-next-kicker">${state.fantasyMode ? 'Next quest target' : 'Next mission target'}</div>
                <div class="challenge-next-label">${escapeHtml(nextStep.label)}</div>
                <div class="challenge-next-meta">
                    ${escapeHtml(nextStep.description)}<br/>
                    ${nextStepOnPage
                        ? (state.fantasyMode ? 'You are already in the correct chamber.' : 'You are already on the correct page.')
                        : `${state.fantasyMode ? 'Target chamber' : 'Target page'}: ${escapeHtml(nextStep.pageTitle || nextStep.path)}`} â€¢ ${nextStep.points} pts
                </div>
                <div class="challenge-next-actions">
                    <button class="button button-secondary" onclick="jumpToMissionStep('${nextStep.id}')">${nextStepOnPage ? 'Refocus Step' : (state.fantasyMode ? 'Open Target Chamber' : 'Open Target Page')}</button>
                    ${nextStep.type !== 'capture' && nextStep.type !== 'navigate' ? `
                        <button class="button button-primary" onclick="assistMissionStep('${nextStep.id}')">${escapeHtml(nextStep.assistLabel || (state.fantasyMode ? 'Invoke Assist' : 'Use Assist'))}</button>
                    ` : ''}
                    <button class="button button-secondary" onclick="skipMissionStep('${nextStep.id}')">${state.fantasyMode ? `Skip for ${getChallengePenaltyValue('skip')} Penalty` : `Skip for ${getChallengePenaltyValue('skip')} Penalty`}</button>
                </div>
            </div>
        ` : ''}

        ${mission.steps.map((step, idx) => {
            const unlocked = isMissionStepUnlocked(idx);
            const completed = !!step.completedAt;
            const isActive = unlocked && !completed;
            const toolHint = step.type === 'tool'
                ? (step.tool === 'search'
                    ? (state.fantasyMode ? 'Use the scrying field in the header to jump to the correct chamber.' : 'Use the header search to jump to the correct module.')
                    : (state.fantasyMode ? 'Press Ctrl+K to summon the command runes.' : 'Press Ctrl+K to open the command palette.'))
                : '';
            const feedback = step.lastFeedback || (completed && step.submittedValue ? `${state.fantasyMode ? 'Accepted inscription' : 'Captured value'}: ${step.submittedValue}` : '');

            return `
                <div class="challenge-item ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}">
                    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                        <div>
                            <div class="challenge-field-name"><span class="challenge-step-index">${idx + 1}</span>${escapeHtml(step.label)}</div>
                            <div class="challenge-field-type">${escapeHtml(step.description)}</div>
                        </div>
                        <div class="challenge-status-badge challenge-status-${completed ? 'completed' : (unlocked ? 'pending' : 'locked')}">${completed ? 'Complete' : (unlocked ? 'Active' : 'Locked')}</div>
                    </div>

                    <div class="challenge-step-meta">
                        <div class="challenge-step-kind">${escapeHtml(getMissionStepTypeLabel(step.type))}</div>
                        <div class="challenge-step-points">${step.points} pts</div>
                    </div>

                    <div class="challenge-step-hint">${escapeHtml(step.hint || toolHint)}</div>

                    ${step.type === 'capture' ? `
                        <div class="challenge-answer-row">
                            <input
                                class="challenge-answer-input"
                                id="mission-input-${step.id}"
                                placeholder="${state.fantasyMode ? 'Transcribe the inscription' : 'Enter the observed value'}"
                                ${isActive ? '' : 'disabled'}
                            />
                            <button
                                class="button button-primary challenge-answer-btn"
                                onclick="submitChallengeAnswer('${step.id}')"
                                ${isActive ? '' : 'disabled'}
                            >Validate</button>
                            <button
                                class="button button-secondary challenge-answer-btn"
                                onclick="skipMissionStep('${step.id}')"
                                ${isActive ? '' : 'disabled'}
                            >Skip</button>
                        </div>
                    ` : ''}

                    ${isActive && step.type !== 'capture' && step.type !== 'navigate' ? `
                        <div class="challenge-step-actions">
                            <button class="button button-secondary" onclick="jumpToMissionStep('${step.id}')">${state.currentPage === step.path ? 'Stay Aligned' : (state.fantasyMode ? 'Open Chamber' : 'Open Page')}</button>
                            <button class="button button-primary" onclick="assistMissionStep('${step.id}')">${escapeHtml(step.assistLabel || (state.fantasyMode ? 'Invoke Assist' : 'Use Assist'))}</button>
                            <button class="button button-secondary" onclick="skipMissionStep('${step.id}')">${state.fantasyMode ? `Skip | ${getChallengePenaltyValue('skip')}` : `Skip | ${getChallengePenaltyValue('skip')}`}</button>
                        </div>
                    ` : ''}

                    ${feedback ? `<div class="challenge-step-hint">${escapeHtml(feedback)}</div>` : ''}
                </div>
            `;
        }).join('')}
            </div>

        ${bonusesAwarded.length ? `
            <div class="challenge-bonus-list">
                ${bonusesAwarded.map(bonus => `
                    <div class="challenge-bonus-item">
                        <span>${escapeHtml(bonus.label)}</span>
                        <span class="challenge-bonus-points">+${bonus.points}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="challenge-event-feed">
            <div class="challenge-event-title">${state.fantasyMode ? 'Chronicle Feed' : 'Recent Telemetry'}</div>
            ${recentEvents.length ? recentEvents.map(event => `
                <div class="challenge-event-item">
                    <div class="challenge-event-label">${escapeHtml(event.detail)}</div>
                    <div class="challenge-event-meta">
                        <span>${escapeHtml(event.type.replace(/_/g, ' '))}</span>
                        <span>${formatMissionTime(event.atMs)}</span>
                    </div>
                </div>
            `).join('') : `<div class="challenge-empty">${state.fantasyMode ? 'The chronicle is still blank.' : 'Telemetry will appear once the run begins.'}</div>`}
        </div>
        </div>
    `;
}

function generateChallenges() {
    if (!state.activeMission || !state.benchmark) {
        return `<div class="challenge-empty">${state.fantasyMode ? 'No quest briefing is available in this realm.' : 'No active benchmark mission is available.'}</div>`;
    }

    const mission = state.activeMission;
    const progress = getMissionProgressStats();
    const progressPct = mission.steps.length ? Math.round((progress.completed / mission.steps.length) * 100) : 0;
    const recentEvents = state.benchmark.events.slice(0, 6);
    const nextStep = getNextPendingMissionStep();
    const nextStepOnPage = nextStep && nextStep.path === state.currentPage;
    const standing = getMissionStanding();
    const bonusesAwarded = Array.isArray(mission.bonusesAwarded) ? mission.bonusesAwarded : [];

    return `
        <div class="challenge-summary">
            <div class="challenge-summary-head">
                <div>
                    <div class="challenge-summary-title">${escapeHtml(mission.title)}</div>
                    <div class="challenge-summary-text">${escapeHtml(mission.summary)}</div>
                </div>
                <div class="challenge-rank-pill rank-${standing.className}">
                    <span class="challenge-rank-overline">${state.fantasyMode ? 'Current Fate' : 'Current Rank'}</span>
                    <span class="challenge-rank-value">${standing.grade}</span>
                    <span class="challenge-rank-caption">${escapeHtml(standing.label)}</span>
                </div>
            </div>

            <div class="challenge-summary-badges">
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.archetypeLabel || 'Mission')}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.profile.tierLabel || mission.difficulty)}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(mission.profile.profileLabel || getBenchmarkProfileLabel())}</strong></div>
                <div class="challenge-summary-badge"><strong>${escapeHtml(getRoleDisplayName((state.currentInstance && state.currentInstance.role) || 'analyst', !!state.fantasyMode))}</strong></div>
                <div class="challenge-summary-badge"><strong>${formatMissionTime(mission.parTimeMs || 0)}</strong> par</div>
                <div class="challenge-summary-badge"><strong>${mission.targetCount || 0}</strong> targets</div>
            </div>

            ${(mission.modifiers && mission.modifiers.length) ? `
                <div class="challenge-modifier-grid">
                    ${mission.modifiers.map(modifier => `
                        <div class="challenge-modifier">
                            <div class="challenge-modifier-label">${escapeHtml(modifier.label)}</div>
                            <div class="challenge-modifier-copy">${escapeHtml(modifier.description)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="challenge-stats-grid">
            <div class="challenge-stat">
                <div class="challenge-stat-label">Net Score</div>
                <div class="challenge-stat-value">${getNetMissionScore()}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">${state.fantasyMode ? 'Chain Peak' : 'Max Combo'}</div>
                <div class="challenge-stat-value">${state.benchmark.maxCombo || 0}x</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">Unique Pages</div>
                <div class="challenge-stat-value">${progress.uniquePages}</div>
            </div>
            <div class="challenge-stat">
                <div class="challenge-stat-label">${state.fantasyMode ? 'Rune Faults' : 'Wrong Captures'}</div>
                <div class="challenge-stat-value">${state.benchmark.wrongAnswers}</div>
            </div>
        </div>

        <div class="challenge-progress">
            <div class="challenge-progress-meta">
                <span>${progress.completed}/${progress.total} steps complete</span>
                <span>${progress.elapsed}</span>
            </div>
            <div class="challenge-progress-bar">
                <div class="challenge-progress-fill" style="width:${progressPct}%;"></div>
            </div>
        </div>

        ${nextStep ? `
            <div class="challenge-next-step">
                <div class="challenge-next-kicker">${state.fantasyMode ? 'Next quest target' : 'Next mission target'}</div>
                <div class="challenge-next-label">${escapeHtml(nextStep.label)}</div>
                <div class="challenge-next-meta">
                    ${escapeHtml(nextStep.description)}<br/>
                    ${nextStepOnPage
                        ? (state.fantasyMode ? 'You are already in the correct chamber.' : 'You are already on the correct page.')
                        : `${state.fantasyMode ? 'Target chamber' : 'Target page'}: ${escapeHtml(nextStep.pageTitle || nextStep.path)}`} | ${nextStep.points} pts
                </div>
                <div class="challenge-next-actions">
                    <button class="button button-secondary" onclick="jumpToMissionStep('${nextStep.id}')">${nextStepOnPage ? 'Refocus Step' : (state.fantasyMode ? 'Open Target Chamber' : 'Open Target Page')}</button>
                    ${canUseMissionAssist(nextStep) ? `
                        <button class="button button-primary" onclick="assistMissionStep('${nextStep.id}')">${escapeHtml(nextStep.assistLabel || (state.fantasyMode ? 'Invoke Assist' : 'Use Assist'))}</button>
                    ` : ''}
                    <button class="button button-secondary" onclick="skipMissionStep('${nextStep.id}')">${getSkipMissionButtonLabel(nextStep)}</button>
                </div>
            </div>
        ` : ''}

        ${mission.steps.map((step, idx) => {
            const unlocked = isMissionStepUnlocked(idx);
            const completed = !!step.completedAt;
            const isActive = unlocked && !completed;
            const toolHint = step.type === 'tool'
                ? (step.tool === 'search'
                    ? (state.fantasyMode ? 'Use the scrying field in the header to jump to the correct chamber.' : 'Use the header search to jump to the correct module.')
                    : (state.fantasyMode ? 'Press Ctrl+K to summon the command runes.' : 'Press Ctrl+K to open the command palette.'))
                : '';
            const feedback = step.lastFeedback || (completed && step.submittedValue ? `${state.fantasyMode ? 'Accepted inscription' : 'Captured value'}: ${step.submittedValue}` : '');

            return `
                <div class="challenge-item ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}">
                    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                        <div>
                            <div class="challenge-field-name"><span class="challenge-step-index">${idx + 1}</span>${escapeHtml(step.label)}</div>
                            <div class="challenge-field-type">${escapeHtml(step.description)}</div>
                        </div>
                        <div class="challenge-status-badge challenge-status-${completed ? 'completed' : (unlocked ? 'pending' : 'locked')}">${completed ? 'Complete' : (unlocked ? 'Active' : 'Locked')}</div>
                    </div>

                    <div class="challenge-step-meta">
                        <div class="challenge-step-kind">${escapeHtml(getMissionStepTypeLabel(step.type))}</div>
                        <div class="challenge-step-points">${step.points} pts</div>
                    </div>

                    <div class="challenge-step-hint">${escapeHtml(step.hint || toolHint)}</div>

                    ${step.type === 'capture' ? `
                        <div class="challenge-answer-row">
                            <input
                                class="challenge-answer-input"
                                id="mission-input-${step.id}"
                                placeholder="${state.fantasyMode ? 'Transcribe the inscription' : 'Enter the observed value'}"
                                ${isActive ? '' : 'disabled'}
                            />
                            <button
                                class="button button-primary challenge-answer-btn"
                                onclick="submitChallengeAnswer('${step.id}')"
                                ${isActive ? '' : 'disabled'}
                            >Validate</button>
                            <button
                                class="button button-secondary challenge-answer-btn"
                                onclick="skipMissionStep('${step.id}')"
                                ${isActive ? '' : 'disabled'}
                            >${isActive ? 'Skip & Reveal' : 'Skip'}</button>
                        </div>
                    ` : ''}

                    ${isActive && step.type === 'navigate' ? `
                        <div class="challenge-step-actions">
                            <button class="button button-secondary" onclick="jumpToMissionStep('${step.id}')">${state.fantasyMode ? 'Open Chamber' : 'Open Page'}</button>
                            <button class="button button-secondary" onclick="skipMissionStep('${step.id}')">${getSkipMissionButtonLabel(step)}</button>
                        </div>
                    ` : ''}

                    ${isActive && canUseMissionAssist(step) ? `
                        <div class="challenge-step-actions">
                            <button class="button button-secondary" onclick="jumpToMissionStep('${step.id}')">${state.currentPage === step.path ? 'Stay Aligned' : (state.fantasyMode ? 'Open Chamber' : 'Open Page')}</button>
                            <button class="button button-primary" onclick="assistMissionStep('${step.id}')">${escapeHtml(step.assistLabel || (state.fantasyMode ? 'Invoke Assist' : 'Use Assist'))}</button>
                            <button class="button button-secondary" onclick="skipMissionStep('${step.id}')">${getSkipMissionButtonLabel(step)}</button>
                        </div>
                    ` : ''}

                    ${feedback ? `<div class="challenge-step-hint">${escapeHtml(feedback)}</div>` : ''}
                </div>
            `;
        }).join('')}

        ${bonusesAwarded.length ? `
            <div class="challenge-bonus-list">
                ${bonusesAwarded.map(bonus => `
                    <div class="challenge-bonus-item">
                        <span>${escapeHtml(bonus.label)}</span>
                        <span class="challenge-bonus-points">+${bonus.points}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="challenge-event-feed">
            <div class="challenge-event-title">${state.fantasyMode ? 'Chronicle Feed' : 'Recent Telemetry'}</div>
            ${recentEvents.length ? recentEvents.map(event => `
                <div class="challenge-event-item">
                    <div class="challenge-event-label">${escapeHtml(event.detail)}</div>
                    <div class="challenge-event-meta">
                        <span>${escapeHtml(event.type.replace(/_/g, ' '))}</span>
                        <span>${formatMissionTime(event.atMs)}</span>
                    </div>
                </div>
            `).join('') : `<div class="challenge-empty">${state.fantasyMode ? 'The chronicle is still blank.' : 'Telemetry will appear once the run begins.'}</div>`}
        </div>
    `;
}

function refreshMissionUi() {
    const strip = document.getElementById('benchmark-strip');
    if (strip) {
        strip.innerHTML = renderBenchmarkStatusBar();
        if (typeof syncChallengePanelUiState === 'function') {
            syncChallengePanelUiState();
        }
    }

    const challengeContent = document.getElementById('challenge-content');
    if (challengeContent) {
        challengeContent.innerHTML = generateChallenges();
    }

    const subtitle = document.getElementById('challenge-panel-subtitle');
    if (subtitle && state.activeMission) {
        subtitle.textContent = state.activeMission.title;
    }

    const challengeBtn = document.getElementById('challengeLaunchBtn');
    if (challengeBtn && state.activeMission) {
        const progress = getMissionProgressStats();
        const standing = getMissionStanding();
        challengeBtn.textContent = state.fantasyMode
            ? `⚔️ Quest Board ${progress.completed}/${progress.total} | ${standing.grade}`
            : `⚔️ Challenge ${progress.completed}/${progress.total} | ${standing.grade}`;
    }
}

// ==================== EVENT HANDLERS ====================
