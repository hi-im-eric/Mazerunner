function normalizeChallengeAnswer(value) {
    let normalized = String(value == null ? '' : value).trim().toLowerCase();
    if (typeof normalized.normalize === 'function') {
        normalized = normalized.normalize('NFKD');
    }
    return normalized.replace(/[^a-z0-9]/g, '');
}

function formatMissionTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function getSkipMissionButtonLabel(step) {
    const penalty = getChallengePenaltyValue('skip');
    if (step && step.type === 'capture') {
        return `Skip & Reveal | ${penalty} pts`;
    }
    return `Skip | ${penalty} pts`;
}

function getPortableDemoSeedConfigs() {
    return [
        {
            domain: 'crm',
            complexity: 'advanced',
            nav_style: 'sidebar',
            seed: 2114,
            theme: 'blue',
            include_search: true,
            anti_patterns: false,
            difficulty: 'medium',
            role: 'analyst',
            benchmarkProfile: 'workflow_accuracy',
            frictionMode: 'balanced'
        },
        {
            domain: 'itsm',
            complexity: 'advanced',
            nav_style: 'ribbon',
            seed: 3188,
            theme: 'dark',
            include_search: true,
            anti_patterns: true,
            difficulty: 'hard',
            role: 'manager',
            benchmarkProfile: 'resilience_recovery',
            frictionMode: 'realistic'
        },
        {
            domain: 'finance',
            complexity: 'moderate',
            nav_style: 'topnav',
            seed: 4472,
            theme: 'green',
            include_search: true,
            anti_patterns: false,
            difficulty: 'medium',
            role: 'auditor',
            benchmarkProfile: 'permission_maze',
            frictionMode: 'balanced'
        },
        {
            domain: 'procurement',
            complexity: 'advanced',
            nav_style: 'hubspoke',
            seed: 5521,
            include_search: true,
            anti_patterns: true,
            difficulty: 'nightmare',
            role: 'manager',
            isFantasy: true,
            benchmarkProfile: 'fantasy_hard_mode',
            frictionMode: 'adversarial'
        },
        {
            domain: 'hrms',
            complexity: 'advanced',
            nav_style: 'lefttop',
            seed: 6617,
            include_search: true,
            anti_patterns: true,
            difficulty: 'nightmare',
            role: 'analyst',
            isFantasy: true,
            benchmarkProfile: 'fantasy_hard_mode',
            frictionMode: 'adversarial'
        }
    ];
}

function getPortableDemoSeedInstanceId(config = {}) {
    return [
        'demo',
        config.domain || 'crm',
        config.seed || 0,
        config.nav_style || 'sidebar',
        config.isFantasy ? 'fantasy' : 'standard'
    ]
        .join('-')
        .replace(/[^a-z0-9-]+/gi, '')
        .toLowerCase();
}

function buildPortableDemoRouteSnapshot(instance) {
    if (!instance) return null;
    return {
        id: instance.id,
        domain: instance.domain,
        complexity: instance.complexity,
        nav_style: instance.nav_style,
        seed: instance.seed,
        theme: instance.theme,
        include_search: !!instance.include_search,
        anti_patterns: !!instance.anti_patterns,
        difficulty: instance.difficulty || 'medium',
        role: instance.role || 'analyst',
        benchmarkProfile: instance.benchmarkProfile || getDefaultBenchmarkProfile(!!instance.isFantasy),
        frictionMode: instance.frictionMode || getDefaultFrictionMode(instance.benchmarkProfile, !!instance.isFantasy),
        benchmarkPreset: instance.benchmarkPreset || '',
        fieldCount: instance.fieldCount || 0,
        createdAt: instance.createdAt || '',
        lastAccessed: instance.lastAccessed || '',
        isFantasy: !!instance.isFantasy,
        appName: instance.appName || '',
        runHistory: Array.isArray(instance.runHistory) ? instance.runHistory.slice(0, 10) : []
    };
}

function parsePortableDemoRouteSnapshot(rawValue) {
    if (!rawValue) return null;
    try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
}

function buildInstanceRouteUrl(instanceId, options = {}) {
    const url = new URL(window.location.href.split('#')[0]);
    const params = new URLSearchParams();
    params.set('instance', instanceId);
    if (options.challenge) {
        params.set('challenge', '1');
    }
    if (MAZERUNNER_RELEASE.portableDemo) {
        const instance = state.instanceManager.getInstanceById(instanceId);
        const snapshot = buildPortableDemoRouteSnapshot(instance);
        if (snapshot) {
            params.set('portableInstance', JSON.stringify(snapshot));
        }
    }
    url.hash = params.toString();
    return url.toString();
}

function ensurePortableDemoSeedData() {
    if (!MAZERUNNER_RELEASE.portableDemo) return;
    if (state.instanceManager.getInstances().length > 0) return;

    const demoConfigs = getPortableDemoSeedConfigs();
    demoConfigs.forEach(config => state.instanceManager.addInstance({
        id: getPortableDemoSeedInstanceId(config),
        ...config
    }));
    state.fantasyMode = false;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function hashString(value) {
    const input = String(value == null ? '' : value);
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) % 2147483647;
    }
    return hash;
}

function createScenarioGenerator(scope = 'scenario') {
    const instance = state.currentInstance || {};
    const baseSeed = (instance.seed || 1) + hashString([
        scope,
        instance.domain || 'crm',
        instance.nav_style || 'sidebar',
        instance.difficulty || 'medium',
        state.fantasyMode ? 'fantasy' : 'standard'
    ].join('|'));
    return new DataGenerator(instance.domain || 'crm', (baseSeed % 2147483646) + 1);
}

const ROLE_CONFIGS = {
    analyst: {
        label: 'Analyst',
        fantasyLabel: 'Court Scribe',
        canSave: true,
        canDelete: false,
        canReviewSensitive: true,
        canApprove: false,
        canAdminister: false,
        readOnly: false
    },
    manager: {
        label: 'Manager',
        fantasyLabel: 'Guild Marshal',
        canSave: true,
        canDelete: true,
        canReviewSensitive: true,
        canApprove: true,
        canAdminister: false,
        readOnly: false
    },
    admin: {
        label: 'Administrator',
        fantasyLabel: 'High Chancellor',
        canSave: true,
        canDelete: true,
        canReviewSensitive: true,
        canApprove: true,
        canAdminister: true,
        readOnly: false
    },
    auditor: {
        label: 'Auditor',
        fantasyLabel: 'Keeper of Ledgers',
        canSave: false,
        canDelete: false,
        canReviewSensitive: true,
        canApprove: false,
        canAdminister: false,
        readOnly: true
    },
    contractor: {
        label: 'Contractor',
        fantasyLabel: 'Bound Mercenary',
        canSave: true,
        canDelete: false,
        canReviewSensitive: false,
        canApprove: false,
        canAdminister: false,
        readOnly: false
    }
};

const BENCHMARK_PROFILE_CONFIGS = {
    navigation_only: {
        label: 'Navigation Only',
        fantasyLabel: 'Pathfinder Trial',
        targetDelta: -1,
        mandatoryTools: 1,
        actionBudgetDelta: -1,
        inspectAll: false,
        parTimeMultiplier: 0.95,
        penaltyMultiplier: 0.92,
        preferredActions: [],
        preferredIntents: ['collection', 'hierarchy', 'knowledge'],
        frictionBias: 'guided',
        summary: 'Emphasizes route-finding, page discovery, and fast traversal over destructive actions.'
    },
    workflow_accuracy: {
        label: 'Workflow Accuracy',
        fantasyLabel: 'Ledger Accuracy',
        targetDelta: 0,
        mandatoryTools: 0,
        actionBudgetDelta: 1,
        inspectAll: true,
        parTimeMultiplier: 1,
        penaltyMultiplier: 1,
        preferredActions: ['save'],
        preferredIntents: ['workflow', 'detail', 'collection'],
        frictionBias: 'balanced',
        summary: 'Prioritizes correct captures, inspection steps, and committing the right workflow action.'
    },
    permission_maze: {
        label: 'Permission Maze',
        fantasyLabel: 'Warded Passage',
        targetDelta: 1,
        mandatoryTools: 0,
        actionBudgetDelta: 1,
        inspectAll: true,
        parTimeMultiplier: 0.92,
        penaltyMultiplier: 1.18,
        preferredActions: ['denied', 'save'],
        preferredIntents: ['detail', 'workflow', 'dashboard'],
        frictionBias: 'adversarial',
        summary: 'Adds more blocked actions, approvals, and recovery moments around role limits.'
    },
    resilience_recovery: {
        label: 'Resilience / Recovery',
        fantasyLabel: 'Storm Recovery',
        targetDelta: 1,
        mandatoryTools: 1,
        actionBudgetDelta: 1,
        inspectAll: false,
        parTimeMultiplier: 0.88,
        penaltyMultiplier: 1.1,
        preferredActions: ['save', 'denied'],
        preferredIntents: ['board', 'dashboard', 'workflow'],
        frictionBias: 'realistic',
        summary: 'Focuses on interruptions, hot queues, and recovering quickly after mistakes or detours.'
    },
    fantasy_hard_mode: {
        label: 'Fantasy Hard Mode',
        fantasyLabel: 'Mythic Gauntlet',
        targetDelta: 1,
        mandatoryTools: 1,
        actionBudgetDelta: 2,
        inspectAll: true,
        parTimeMultiplier: 0.78,
        penaltyMultiplier: 1.28,
        preferredActions: ['denied', 'save', 'delete'],
        preferredIntents: ['hierarchy', 'workflow', 'knowledge'],
        frictionBias: 'adversarial',
        summary: 'Pushes the clock, piles on cursed terminology, and leans into fantasy-specific impediments.'
    }
};

const FRICTION_PROFILE_CONFIGS = {
    guided: {
        label: 'Guided Friction',
        guidedOverlays: true,
        ambientNoise: false,
        antiPatternInjection: false,
        misleadingSearch: false,
        timePressure: 0.85,
        distractorMultiplier: 0.55,
        inlineAlertsMultiplier: 0.7,
        captchaMultiplier: 0.6
    },
    balanced: {
        label: 'Balanced Friction',
        guidedOverlays: false,
        ambientNoise: true,
        antiPatternInjection: false,
        misleadingSearch: false,
        timePressure: 1,
        distractorMultiplier: 1,
        inlineAlertsMultiplier: 1,
        captchaMultiplier: 1
    },
    realistic: {
        label: 'Operational Friction',
        guidedOverlays: false,
        ambientNoise: true,
        antiPatternInjection: true,
        misleadingSearch: false,
        timePressure: 1.08,
        distractorMultiplier: 1.2,
        inlineAlertsMultiplier: 1.12,
        captchaMultiplier: 1.08
    },
    adversarial: {
        label: 'Adversarial Friction',
        guidedOverlays: false,
        ambientNoise: true,
        antiPatternInjection: true,
        misleadingSearch: true,
        timePressure: 1.22,
        distractorMultiplier: 1.45,
        inlineAlertsMultiplier: 1.35,
        captchaMultiplier: 1.2
    }
};

const BENCHMARK_PRESET_CONFIGS = {
    guided_walkthrough: {
        label: 'Guided Walkthrough',
        fantasyLabel: 'Lantern Walk',
        summary: 'A lighter route-finding preset that keeps the benchmark readable for demos and first passes.',
        fantasyOnly: false,
        config: {
            complexity: 'simple',
            nav_style: 'sidebar',
            theme: 'blue',
            difficulty: 'easy',
            role: 'analyst',
            benchmarkProfile: 'navigation_only',
            frictionMode: 'guided',
            include_search: true,
            anti_patterns: false
        }
    },
    workflow_review: {
        label: 'Workflow Review',
        fantasyLabel: 'Ledger Review',
        summary: 'A balanced workflow-focused preset with realistic save paths and moderate navigation depth.',
        fantasyOnly: false,
        config: {
            complexity: 'moderate',
            nav_style: 'sidebar',
            theme: 'green',
            difficulty: 'medium',
            role: 'manager',
            benchmarkProfile: 'workflow_accuracy',
            frictionMode: 'balanced',
            include_search: true,
            anti_patterns: false
        }
    },
    permission_stress: {
        label: 'Permission Stress',
        fantasyLabel: 'Warded Passage',
        summary: 'Designed to force blocked actions, retries, and approval friction around sensitive data.',
        fantasyOnly: false,
        config: {
            complexity: 'complex',
            nav_style: 'lefttop',
            theme: 'dark',
            difficulty: 'hard',
            role: 'contractor',
            benchmarkProfile: 'permission_maze',
            frictionMode: 'adversarial',
            include_search: true,
            anti_patterns: true
        }
    },
    recovery_drill: {
        label: 'Recovery Drill',
        fantasyLabel: 'Storm Drill',
        summary: 'Pushes responders through hot queues, redirects, and resilience-oriented recoveries.',
        fantasyOnly: false,
        config: {
            complexity: 'complex',
            nav_style: 'ribbon',
            theme: 'teal',
            difficulty: 'hard',
            role: 'manager',
            benchmarkProfile: 'resilience_recovery',
            frictionMode: 'realistic',
            include_search: true,
            anti_patterns: true
        }
    },
    audit_marathon: {
        label: 'Audit Marathon',
        fantasyLabel: 'Archive Census',
        summary: 'A denser preset for longform review runs with heavier capture and comparison work.',
        fantasyOnly: false,
        config: {
            complexity: 'complex',
            nav_style: 'megamenu',
            theme: 'orange',
            difficulty: 'medium',
            role: 'auditor',
            benchmarkProfile: 'workflow_accuracy',
            frictionMode: 'balanced',
            include_search: true,
            anti_patterns: false
        }
    },
    fantasy_gauntlet: {
        label: 'Fantasy Gauntlet',
        fantasyLabel: 'Fantasy Gauntlet',
        summary: 'Locks the realm into its harshest configuration with cursed friction and hostile recovery pressure.',
        fantasyOnly: true,
        config: {
            complexity: 'complex',
            nav_style: 'lefttop',
            theme: 'fantasy',
            difficulty: 'nightmare',
            role: 'analyst',
            benchmarkProfile: 'fantasy_hard_mode',
            frictionMode: 'adversarial',
            include_search: true,
            anti_patterns: true
        }
    }
};

const MAZERUNNER_MODULE_SURFACES = Object.freeze({
    runtime: 'stateful',
    scenarios: 'domain-native',
    analytics: 'comparative',
    fantasy: 'adversarial',
    presets: 'seeded'
});

function getAvailableBenchmarkPresetEntries(isFantasy = state.fantasyMode) {
    return Object.entries(BENCHMARK_PRESET_CONFIGS).filter(([, preset]) => !!preset.fantasyOnly === !!isFantasy);
}

function getBenchmarkPresetConfig(presetKey = null) {
    if (!presetKey) return null;
    return BENCHMARK_PRESET_CONFIGS[presetKey] || null;
}

function getBenchmarkPresetLabel(presetKey = null, isFantasy = state.fantasyMode) {
    const preset = getBenchmarkPresetConfig(presetKey);
    if (!preset) return isFantasy ? 'Custom Realm' : 'Custom Mix';
    return isFantasy ? (preset.fantasyLabel || preset.label) : preset.label;
}

function refreshBenchmarkPresetSelect(selectedKey = null) {
    const select = document.getElementById('benchmark_preset');
    if (!select) return;

    const currentValue = selectedKey || select.value || '';
    const options = getAvailableBenchmarkPresetEntries(state.fantasyMode);
    const placeholder = state.fantasyMode ? 'custom_realm' : 'custom_mix';
    select.innerHTML = [
        `<option value="${placeholder}">${state.fantasyMode ? 'Custom Realm' : 'Custom Mix'}</option>`,
        ...options.map(([key, preset]) => `<option value="${key}">${escapeHtml(getBenchmarkPresetLabel(key, state.fantasyMode))}</option>`)
    ].join('');
    select.value = options.some(([key]) => key === currentValue) ? currentValue : placeholder;
}

function applyBenchmarkPresetToControls(presetKey) {
    const preset = getBenchmarkPresetConfig(presetKey);
    if (!preset) return;

    const { config } = preset;
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el && value != null) el.value = value;
    };
    setValue('complexity', config.complexity);
    setValue('nav_style', config.nav_style);
    setValue('theme', config.theme);
    setValue('difficulty', config.difficulty);
    setValue('role', config.role);
    setValue('benchmark_profile', config.benchmarkProfile);
    setValue('friction_mode', config.frictionMode);

    const includeSearch = document.getElementById('include_search');
    if (includeSearch && typeof config.include_search === 'boolean') {
        includeSearch.checked = config.include_search;
    }
    const antiPatterns = document.getElementById('anti_patterns');
    if (antiPatterns && typeof config.anti_patterns === 'boolean') {
        antiPatterns.checked = config.anti_patterns;
    }
}

function getDefaultBenchmarkProfile(isFantasy = state.fantasyMode) {
    return isFantasy ? 'fantasy_hard_mode' : 'workflow_accuracy';
}

function getDefaultFrictionMode(profileKey = getDefaultBenchmarkProfile(), isFantasy = state.fantasyMode) {
    const profile = BENCHMARK_PROFILE_CONFIGS[profileKey] || BENCHMARK_PROFILE_CONFIGS.workflow_accuracy;
    if (isFantasy && profileKey === 'fantasy_hard_mode') return 'adversarial';
    return profile.frictionBias || (isFantasy ? 'realistic' : 'balanced');
}

function getFantasyLockedGeneratorConfig() {
    return {
        theme: 'fantasy',
        difficulty: 'nightmare',
        benchmarkProfile: 'fantasy_hard_mode',
        frictionMode: 'adversarial',
        include_search: true,
        anti_patterns: true,
        isFantasy: true
    };
}

function normalizeGeneratorConfig(config = {}) {
    const normalized = { ...config };
    if (!Number.isFinite(normalized.seed)) {
        normalized.seed = Math.floor(Math.random() * 10000);
    }
    if (normalized.isFantasy) {
        Object.assign(normalized, getFantasyLockedGeneratorConfig());
    }
    return normalized;
}

function applyFantasyGeneratorUiLocks() {
    if (!state.fantasyMode) return;

    const fantasyLocks = getFantasyLockedGeneratorConfig();
    const disableStyle = 'opacity:0.55;cursor:not-allowed;';
    const selectIds = {
        theme: fantasyLocks.theme,
        difficulty: fantasyLocks.difficulty,
        benchmark_profile: fantasyLocks.benchmarkProfile,
        friction_mode: fantasyLocks.frictionMode
    };

    Object.entries(selectIds).forEach(([id, value]) => {
        const control = document.getElementById(id);
        if (!control) return;
        control.value = value;
        control.disabled = true;
        control.style.cssText = disableStyle;
    });

    const searchToggle = document.getElementById('include_search');
    if (searchToggle) {
        const searchLabel = searchToggle.closest('label');
        if (searchLabel) {
            searchLabel.innerHTML = `
                                <input type="checkbox" id="include_search" checked disabled />
                                Enable Scrying Field <span class="help-bubble">?<span class="help-tip">Fantasy mode always includes the scrying field. It helps with discovery, but cursed friction can still make its clues misleading.</span></span>
                            `;
        }
    }

    const antiPatternToggle = document.getElementById('anti_patterns');
    if (antiPatternToggle) {
        const antiPatternLabel = antiPatternToggle.closest('label');
        if (antiPatternLabel) {
            antiPatternLabel.innerHTML = `
                                <input type="checkbox" id="anti_patterns" checked disabled />
                                Enforce Curses & Illusions <span class="help-bubble">?<span class="help-tip">Fantasy mode always keeps cursed obstructions active: false leads, hostile banners, decoy actions, and ritualized confirmation traps.</span></span>
                            `;
        }
    }

    const controlGrid = document.querySelector('.controls-section .control-grid');
    if (controlGrid && !document.getElementById('fantasy-generator-lock-note')) {
        controlGrid.insertAdjacentHTML('afterend', `
                    <div class="results-row" id="fantasy-generator-lock-note" style="grid-template-columns:1fr;margin-top:16px;">
                        <div class="results-main">
                            <div class="results-title">Fantasy Locks</div>
                            <div class="results-meta">Dark Dungeon theme, Nightmare difficulty, Fantasy Hard Mode, adversarial friction, scrying field, and cursed anti-patterns remain fixed in every realm.</div>
                        </div>
                    </div>
                `);
    }
}

function getSelectedBenchmarkPresetKey() {
    const select = document.getElementById('benchmark_preset');
    if (!select) return '';
    const placeholder = state.fantasyMode ? 'custom_realm' : 'custom_mix';
    return select.value && select.value !== placeholder ? select.value : '';
}

function applyBenchmarkPresetSelection(presetKey) {
    const placeholder = state.fantasyMode ? 'custom_realm' : 'custom_mix';
    if (!presetKey || presetKey === placeholder) {
        applyFantasyGeneratorUiLocks();
        return;
    }
    applyBenchmarkPresetToControls(presetKey);
    applyFantasyGeneratorUiLocks();
    showToast(
        state.fantasyMode
            ? `${getBenchmarkPresetLabel(presetKey, true)} aligned to the realm forge.`
            : `${getBenchmarkPresetLabel(presetKey, false)} preset applied.`,
        'info',
        2200
    );
}

function getRoleConfig(role) {
    return ROLE_CONFIGS[role] || ROLE_CONFIGS.analyst;
}

function getRoleDisplayName(role, isFantasy = state.fantasyMode) {
    const config = getRoleConfig(role);
    return isFantasy ? config.fantasyLabel : config.label;
}

function getBenchmarkProfileConfig(profileKey = null) {
    const key = profileKey
        || (state.currentInstance && state.currentInstance.benchmarkProfile)
        || getDefaultBenchmarkProfile();
    return BENCHMARK_PROFILE_CONFIGS[key] || BENCHMARK_PROFILE_CONFIGS.workflow_accuracy;
}

function getBenchmarkProfileLabel(profileKey = null, isFantasy = state.fantasyMode) {
    const key = profileKey
        || (state.currentInstance && state.currentInstance.benchmarkProfile)
        || getDefaultBenchmarkProfile(isFantasy);
    const profile = BENCHMARK_PROFILE_CONFIGS[key] || BENCHMARK_PROFILE_CONFIGS.workflow_accuracy;
    return isFantasy ? profile.fantasyLabel : profile.label;
}

function getFrictionProfileConfig(modeKey = null) {
    const key = modeKey
        || (state.currentInstance && state.currentInstance.frictionMode)
        || getDefaultFrictionMode();
    return FRICTION_PROFILE_CONFIGS[key] || FRICTION_PROFILE_CONFIGS.balanced;
}

function getFrictionModeLabel(modeKey = null) {
    const mode = getFrictionProfileConfig(modeKey);
    return mode.label;
}

function createInstanceScopedGenerator(instance, scope = 'runtime') {
    const current = instance || state.currentInstance || {};
    const baseSeed = (current.seed || 1) + hashString([
        scope,
        current.id || 'instance',
        current.domain || 'crm',
        current.nav_style || 'sidebar',
        current.difficulty || 'medium',
        current.role || 'analyst',
        current.benchmarkProfile || getDefaultBenchmarkProfile(!!current.isFantasy),
        current.isFantasy ? 'fantasy' : 'standard'
    ].join('|'));
    return new DataGenerator(current.domain || 'crm', (baseSeed % 2147483646) + 1);
}

function isAdversarialFantasyActive(instance = state.currentInstance) {
    const current = instance || state.currentInstance;
    if (!current) return false;
    const friction = getFrictionProfileConfig(current.frictionMode);
    return !!(
        current.isFantasy
        && (current.anti_patterns || friction.antiPatternInjection)
        && (current.frictionMode === 'adversarial' || friction.misleadingSearch)
    );
}

function isFantasySpellcastingActive(instance = state.currentInstance) {
    const current = instance || state.currentInstance;
    return !!(current && current.isFantasy);
}

function decodeEncodedResultMeta(encodedMeta = '') {
    if (!encodedMeta) return {};
    try {
        const parsed = JSON.parse(decodeURIComponent(encodedMeta));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function getFantasyFalseLeadExpectedPath(results = []) {
    const nextStep = getNextPendingMissionStep();
    if (nextStep && nextStep.path) return nextStep.path;
    const firstRealResult = results.find(result => result && result.path && !(result.runtimeMeta && result.runtimeMeta.falseLead));
    return (firstRealResult && firstRealResult.path) || state.currentPage || '';
}

function scoreFantasyFalseLeadCandidate(candidatePath, candidatePage, basePath, basePage, expectedPath) {
    if (!candidatePage || !candidatePath || candidatePath === expectedPath) return -1;
    let score = 0;
    if (basePath && getSectionIndexForPath(candidatePath) === getSectionIndexForPath(basePath)) score += 4;
    if ((candidatePage.intent || '') === (basePage && basePage.intent || '')) score += 3;
    if ((candidatePage.sectionTitle || '') === (basePage && basePage.sectionTitle || '')) score += 2;
    if (/(queue|board|detail|record|ledger|archive|workflow|review|approval)/i.test(`${candidatePage.title || ''} ${candidatePath} ${candidatePage.intent || ''}`)) score += 1;
    return score;
}

function chooseFantasyFalseLeadPage(excludedPaths = [], expectedPath = '') {
    if (!state.blueprint || !state.blueprint.pages) return null;
    const excluded = new Set([...(excludedPaths || []), expectedPath, state.currentPage].filter(Boolean));
    const basePath = expectedPath || state.currentPage || '';
    const basePage = state.blueprint.pages[basePath] || state.blueprint.pages[state.currentPage] || null;
    const candidates = Object.entries(state.blueprint.pages)
        .map(([path, page]) => ({
            path,
            page,
            score: scoreFantasyFalseLeadCandidate(path, page, basePath, basePage, expectedPath)
        }))
        .filter(entry => entry.score >= 0 && !excluded.has(entry.path))
        .sort((a, b) => b.score - a.score || String(a.page.title || a.path).localeCompare(String(b.page.title || b.path)));

    if (!candidates.length) return null;
    const topScore = candidates[0].score;
    const pool = candidates.filter(entry => entry.score === topScore).slice(0, 4);
    const generator = createInstanceScopedGenerator(state.currentInstance, `false-lead-target-${basePath || 'root'}-${expectedPath || 'none'}`);
    return generator.randomFromArray(pool);
}

function toFantasyTitleCase(value) {
    return String(value == null ? '' : value)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function buildFantasyFalseLeadHeadline(query, generator, pageTitle) {
    const normalizedQuery = toFantasyTitleCase(query || pageTitle || 'Hidden');
    const prefixes = ['Veiled', 'Mirrored', 'Ashbound', 'Twilit', 'Hushed', 'Lantern'];
    const suffixes = ['Ledger', 'Registry', 'Index', 'Archive', 'Passage', 'Trace'];
    return `${generator.randomFromArray(prefixes)} ${normalizedQuery} ${generator.randomFromArray(suffixes)}`.trim();
}

function buildFantasyFalseLeadEntry(query, results, source = 'search') {
    if (!isAdversarialFantasyActive()) return null;
    const expectedPath = getFantasyFalseLeadExpectedPath(results);
    const pick = chooseFantasyFalseLeadPage(results.map(result => result.path), expectedPath);
    if (!pick) return null;

    const generator = createInstanceScopedGenerator(state.currentInstance, `false-lead-${source}-${query}-${pick.path}`);
    const cuePool = source === 'search'
        ? [
            'Recovered from a stale sigil trail. The naming still appears valid.',
            'Older archive entry surfaced before the living ledger.',
            'A mirrored chamber answers this term under prior registry marks.'
        ]
        : [
            'An echo route from the old ward index still responds to this phrase.',
            'This chamber shares a surviving alias in the command runes.',
            'A mirrored path surfaced ahead of the active route.'
        ];
    const trailLabel = source === 'search' ? 'scrying field' : 'command runes';
    const pageTitle = pick.page && pick.page.title ? pick.page.title : pick.path;
    return source === 'search'
        ? {
            field: buildFantasyFalseLeadHeadline(query, generator, pageTitle),
            value: generator.randomFromArray(cuePool),
            path: pick.path,
            page: pageTitle,
            runtimeMeta: {
                falseLead: true,
                path: pick.path,
                expectedPath,
                detail: `${trailLabel} drifted into ${pageTitle}.`,
                toast: `The veil bent the ${trailLabel}. ${pageTitle} answered first.`
            }
        }
        : {
            type: 'page',
            value: pick.path,
            name: buildFantasyFalseLeadHeadline(query, generator, pageTitle),
            subtitle: `${pageTitle} • ${generator.randomFromArray(cuePool)}`,
            meta: generator.randomFromArray(['Veiled Route', 'Echo Path', 'Mirror Index']),
            icon: '◈',
            runtimeMeta: {
                falseLead: true,
                path: pick.path,
                expectedPath,
                detail: `${trailLabel} drifted into ${pageTitle}.`,
                toast: `The veil bent the ${trailLabel}. ${pageTitle} surfaced before the true chamber.`
            }
        };
}

function applyFantasyFalseLeadOutcome(meta = {}, fallbackPath = state.currentPage, sourceLabel = 'trail') {
    if (!meta || !meta.falseLead) return;
    const destinationPath = meta.path || fallbackPath || state.currentPage;
    const penalty = Math.max(4, Math.round(getChallengePenaltyValue('context') * 0.55));
    const cueMeta = {
        path: destinationPath,
        expectedPath: meta.expectedPath || state.currentPage,
        falseLead: true
    };

    if (state.benchmark) {
        state.benchmark.penalties += penalty;
        recordBenchmarkEvent(
            'false_lead',
            meta.detail || (state.fantasyMode ? `The veil diverted the ${sourceLabel}.` : `A false lead diverted the ${sourceLabel}.`),
            cueMeta,
            false
        );
    }

    signalFantasyMechanicCue(
        'false_lead',
        meta.detail || (state.fantasyMode ? `The veil diverted the ${sourceLabel}.` : `A false lead diverted the ${sourceLabel}.`),
        cueMeta
    );

    showToast(
        meta.toast || (state.fantasyMode
            ? `The veil bent the ${sourceLabel}. ${penalty} penalty absorbed.`
            : `A false lead bent the ${sourceLabel}. ${penalty} penalty absorbed.`),
        'warning',
        4200
    );
}

function shiftFantasyTerminology(text, generator) {
    const original = String(text == null ? '' : text).trim();
    if (!original) return original;

    const replacements = [
        { pattern: /\bDashboard\b/gi, choices: ['War Table', 'Realm Gate'] },
        { pattern: /\bMission\b/gi, choices: ['Quest', 'Trial'] },
        { pattern: /\bBoard\b/gi, choices: ['Ledger', 'Table'] },
        { pattern: /\bQueue\b/gi, choices: ['Corridor', 'Procession'] },
        { pattern: /\bRecord\b/gi, choices: ['Chronicle', 'Entry'] },
        { pattern: /\bApproval\b/gi, choices: ['Seal', 'Sanction'] },
        { pattern: /\bSearch\b/gi, choices: ['Scrying', 'Seeking'] },
        { pattern: /\bPage\b/gi, choices: ['Chamber', 'Leaf'] },
        { pattern: /\bProfile\b/gi, choices: ['Sigil', 'Profile'] },
        { pattern: /\bWorkflow\b/gi, choices: ['Rite', 'Procession'] }
    ];

    let shifted = original;
    replacements.forEach(entry => {
        entry.pattern.lastIndex = 0;
        if (!entry.pattern.test(shifted)) return;
        entry.pattern.lastIndex = 0;
        shifted = shifted.replace(entry.pattern, entry.choices[generator.randomInt(0, entry.choices.length - 1)]);
    });

    if (shifted === original && original.split(/\s+/).length <= 3 && generator.rng() > 0.62) {
        shifted = `${original} ${generator.randomFromArray(['Archive', 'Registry', 'Sigil', 'Chamber'])}`;
    }

    return shifted;
}

function restoreFantasyAdversarialCopy() {
    document.querySelectorAll('[data-fantasy-original-text]').forEach(element => {
        element.textContent = element.getAttribute('data-fantasy-original-text') || element.textContent;
        element.classList.remove('fantasy-illusion-text');
        element.removeAttribute('data-fantasy-original-text');
    });
    const banner = document.getElementById('fantasy-illusion-banner');
    if (banner) banner.remove();
}

function stopFantasyAdversarialEffects() {
    if (state.fantasyIllusionTimer) clearInterval(state.fantasyIllusionTimer);
    if (state.fantasyIllusionRestoreTimer) clearTimeout(state.fantasyIllusionRestoreTimer);
    if (state.fantasyIllusionRefreshTimer) clearTimeout(state.fantasyIllusionRefreshTimer);
    if (state.fantasySpellCastTimer) clearTimeout(state.fantasySpellCastTimer);
    state.fantasyIllusionTimer = null;
    state.fantasyIllusionRestoreTimer = null;
    state.fantasyIllusionRefreshTimer = null;
    state.fantasySpellCastTimer = null;
    state.fantasySpellCastCount = 0;
    state.fantasySpellSessionStartedAt = 0;
    state.fantasySpellInstanceId = null;
    state.fantasyActiveSpell = null;
    restoreFantasyAdversarialCopy();
    clearFantasySpellUi();
    clearFantasySpellPenaltyUi();
}

function clearFantasySpellUi() {
    if (typeof window !== 'undefined' && window.__mazeRunner && typeof window.__mazeRunner.fantasySpellCleanup === 'function') {
        try {
            window.__mazeRunner.fantasySpellCleanup();
        } catch (error) {
            // Best effort cleanup for transient spell listeners and timers.
        }
        window.__mazeRunner.fantasySpellCleanup = null;
    }
    const host = document.getElementById('fantasy-spell-host');
    if (host) host.remove();
}

function clearFantasySpellPenaltyUi() {
    if (typeof window !== 'undefined' && window.__mazeRunner && typeof window.__mazeRunner.fantasySpellPenaltyCleanup === 'function') {
        try {
            window.__mazeRunner.fantasySpellPenaltyCleanup();
        } catch (error) {
            // Best effort cleanup for transient spell-penalty listeners and timers.
        }
        window.__mazeRunner.fantasySpellPenaltyCleanup = null;
    }
    document.body.classList.remove('fantasy-backlash-screen');
    const host = document.getElementById('fantasy-spell-penalty-host');
    if (host) host.remove();
}

function ensureFantasySpellPenaltyHost() {
    let host = document.getElementById('fantasy-spell-penalty-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'fantasy-spell-penalty-host';
    host.className = 'fantasy-spell-penalty-host';
    document.body.appendChild(host);
    return host;
}

function triggerFantasySpellPenalty(spell, reason = 'faded', options = {}) {
    if (!state.fantasyMode || state.mode !== 'app') return;

    const {
        popupCount = 10,
        floatingButtonCount = 50,
        shakeDurationMs = 10000,
        dragonDurationMs = null,
        dragonRiseDurationMs = null,
        dragonFrameIntervalMs = null,
        dragonFadeDurationMs = null,
        effectType = null
    } = options;

    clearFantasySpellPenaltyUi();

    const host = ensureFantasySpellPenaltyHost();
    const generator = createInstanceScopedGenerator(
        state.currentInstance,
        `spell-penalty-${spell && spell.id ? spell.id : Date.now()}-${reason}`
    );
    const dragonAssets = {
        2: '__INLINE_ASSET:FANTASY_DRAGON_2__',
        3: '__INLINE_ASSET:FANTASY_DRAGON_3__',
        4: '__INLINE_ASSET:FANTASY_DRAGON_4__',
        5: '__INLINE_ASSET:FANTASY_DRAGON_5__',
        6: '__INLINE_ASSET:FANTASY_DRAGON_6__',
        7: '__INLINE_ASSET:FANTASY_DRAGON_7__'
    };
    const backlashAssets = {
        livingScroll: '__INLINE_ASSET:FANTASY_LIVING_SCROLL__',
        summoningCircle: '__INLINE_ASSET:FANTASY_SUMMONING_CIRCLE__',
        inkpot: '__INLINE_ASSET:FANTASY_INKPOT__',
        inkSplatter: '__INLINE_ASSET:FANTASY_INK_SPLATTER__',
        gremlin: '__INLINE_ASSET:FANTASY_GREMLIN__'
    };
    const dragonFrameSequence = [4, 5, 6, 7];
    const dragonIntervalSteps = dragonFrameSequence.length + 1;
    const penaltyEffects = ['popups', 'buttons', 'shake', 'dragon', 'living-scroll', 'summoning-circle', 'ink-spill', 'lantern-blackout'];
    const selectedEffect = penaltyEffects.includes(effectType)
        ? effectType
        : generator.randomFromArray(penaltyEffects);
    host.dataset.effect = selectedEffect;
    const useCompressedDragonTiming = Number.isFinite(dragonDurationMs)
        && dragonDurationMs > 0
        && dragonRiseDurationMs == null
        && dragonFrameIntervalMs == null
        && dragonFadeDurationMs == null;
    const resolvedDragonRiseDurationMs = useCompressedDragonTiming
        ? Math.max(20, Math.round(dragonDurationMs * 0.18))
        : Math.max(20, dragonRiseDurationMs == null ? 1800 : dragonRiseDurationMs);
    const resolvedDragonFadeDurationMs = useCompressedDragonTiming
        ? Math.max(30, Math.round(dragonDurationMs * 0.24))
        : Math.max(30, dragonFadeDurationMs == null ? 3000 : dragonFadeDurationMs);
    const resolvedDragonFrameIntervalMs = useCompressedDragonTiming
        ? Math.max(10, Math.floor(Math.max(0, dragonDurationMs - resolvedDragonRiseDurationMs - resolvedDragonFadeDurationMs) / dragonIntervalSteps))
        : Math.max(10, dragonFrameIntervalMs == null ? 1000 : dragonFrameIntervalMs);
    const resolvedDragonTotalDurationMs = resolvedDragonRiseDurationMs + (resolvedDragonFrameIntervalMs * dragonIntervalSteps) + resolvedDragonFadeDurationMs;
    const timers = [];
    let effectCleanup = () => {};

    const queueTimeout = (fn, delay) => {
        const timeoutId = setTimeout(fn, delay);
        timers.push(timeoutId);
        return timeoutId;
    };

    const pruneHostIfIdle = () => {
        if (host.childElementCount === 0) {
            host.remove();
        }
    };

    const returnToInstanceLogin = (instanceId) => {
        const loginContainer = document.getElementById('instanceLogin');
        if (typeof window !== 'undefined' && typeof window.showInstanceLogin === 'function' && instanceId) {
            window.showInstanceLogin(instanceId);
            if (loginContainer && window.getComputedStyle(loginContainer).display !== 'none') {
                return;
            }
        }

        const fallbackInstance = (state.currentInstance && (!instanceId || state.currentInstance.id === instanceId))
            ? state.currentInstance
            : state.instanceManager.getInstances().find(instance => instance.id === instanceId);
        if (!fallbackInstance || !loginContainer) {
            clearFantasySpellPenaltyUi();
            return;
        }

        if (host.parentNode) host.remove();
        document.body.classList.remove('fantasy-backlash-screen');
        state.pendingInstanceId = instanceId || fallbackInstance.id;
        state.activeMission = null;
        state.benchmark = null;
        state.currentInstance = null;

        const appRoot = document.getElementById('app');
        if (appRoot) {
            appRoot.innerHTML = '';
        }

        loginContainer.style.display = 'block';
        loginContainer.classList.toggle('fantasy-login', !!state.fantasyMode);
        document.getElementById('loginAppName').textContent = fallbackInstance.appName || 'Application';
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        const subtitle = loginContainer.querySelector('.login-subtitle');
        if (subtitle) {
            subtitle.textContent = state.fantasyMode ? 'Enter thy credentials, adventurer' : 'Sign in to your account';
        }
    };

    const popupTitles = [
        'Rune Rebound',
        'Clerk of Embers',
        'Archive Alarm',
        'Goblin Audit',
        'Ward Residue',
        'Hex Notice'
    ];
    const popupBodies = [
        'The chamber has logged your lapse in excessively theatrical detail.',
        'A goblin clerk insists this interruption is both necessary and deeply funny.',
        'Residual magic requires immediate acknowledgement before the ink settles.',
        'The failed counterspell triggered a petty but fully authorized nuisance cascade.',
        'An ember-scribe has filed a complaint about your rune discipline.',
        'Please dismiss this notice so the castle can pretend everything is under control.'
    ];
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;
    const popupShapes = ['ledger', 'tablet', 'sigil', 'banner', 'hex'];
    const popupSizeProfiles = {
        small: {
            width: Math.min(236, Math.max(184, Math.round(viewportWidth * 0.18))),
            minHeight: Math.min(168, Math.max(132, Math.round(viewportHeight * 0.2)))
        },
        medium: {
            width: Math.min(294, Math.max(220, Math.round(viewportWidth * 0.22))),
            minHeight: Math.min(210, Math.max(156, Math.round(viewportHeight * 0.24)))
        },
        large: {
            width: Math.min(360, Math.max(260, Math.round(viewportWidth * 0.28))),
            minHeight: Math.min(248, Math.max(188, Math.round(viewportHeight * 0.28)))
        }
    };
    const popupSizes = Object.keys(popupSizeProfiles);
    const popupPalettes = [
        { bgA: 'rgba(42,24,16,0.98)', bgB: 'rgba(22,12,8,0.98)', accent: 'rgba(201,169,98,0.34)', text: '#f0debf' },
        { bgA: 'rgba(54,22,30,0.98)', bgB: 'rgba(30,12,18,0.98)', accent: 'rgba(228,138,168,0.34)', text: '#f6dce7' },
        { bgA: 'rgba(28,34,60,0.98)', bgB: 'rgba(16,18,34,0.98)', accent: 'rgba(132,196,255,0.34)', text: '#ddecff' },
        { bgA: 'rgba(46,36,16,0.98)', bgB: 'rgba(28,18,8,0.98)', accent: 'rgba(240,192,92,0.34)', text: '#f9e7be' }
    ];
    const popupActionSets = [
        { correctLabel: 'Seal Notice', decoys: ['Ignore Ember', 'Later'] },
        { correctLabel: 'Archive It', decoys: ['Remind Me', 'Do Not File'] },
        { correctLabel: 'Acknowledge Ward', decoys: ['Escalate Chaos', 'Wrong Rune'] },
        { correctLabel: 'Quench Ember', decoys: ['Fan Flames', 'Leave Open'] },
        { correctLabel: 'Banish Clerk', decoys: ['Negotiate', 'Appeal Goblin'] },
        { correctLabel: 'Close Rift', decoys: ['Inspect Later', 'Absolutely Not'] }
    ];
    const floatingLabels = [
        'Not This One',
        'Absolutely Maybe',
        'Wrong Lever',
        'Definitely Fine',
        'Nope, Wizard',
        'Try Again, Hero',
        'Mildly Cursed',
        'Still Not It',
        'Do Not Boop',
        'Totally Helpful',
        'Bad Idea',
        'Sneaky Sigil',
        'Goblin Approved',
        'Press for Regret',
        'Clerically Dubious',
        'Instant Nonsense',
        'Highly Unhelpful',
        'Mischief Toggle',
        'Chaos Shortcut',
        'Do Not Validate',
        'Wizard Nope',
        'False Proceed'
    ];
    const floatingShapes = ['pill', 'tablet', 'sigil', 'hex', 'charm'];
    const floatingSizes = ['small', 'medium', 'large'];
    const floatingMotions = [
        { key: 'hover', animation: 'fantasyBacklashHover', timing: 'ease-in-out', driftX: [10, 18], driftY: [16, 28], duration: [3200, 4700] },
        { key: 'whirl', animation: 'fantasyBacklashWhirl', timing: 'linear', driftX: [18, 32], driftY: [16, 30], duration: [2600, 4000] },
        { key: 'bounce', animation: 'fantasyBacklashBounce', timing: 'ease-in-out', driftX: [22, 42], driftY: [18, 34], duration: [2800, 4300] },
        { key: 'vertical', animation: 'fantasyBacklashVerticalBob', timing: 'ease-in-out', driftX: [8, 16], driftY: [22, 40], duration: [2400, 3800] },
        { key: 'horizontal', animation: 'fantasyBacklashHorizontalSway', timing: 'ease-in-out', driftX: [24, 48], driftY: [8, 16], duration: [2600, 4100] },
        { key: 'orbit', animation: 'fantasyBacklashOrbit', timing: 'linear', driftX: [16, 34], driftY: [16, 30], duration: [3000, 4600] }
    ];
    const floatingPalettes = [
        { bgA: 'rgba(58,30,18,0.94)', bgB: 'rgba(92,40,28,0.92)', accent: 'rgba(201,169,98,0.34)', text: '#ffe6bc' },
        { bgA: 'rgba(64,22,38,0.95)', bgB: 'rgba(112,44,68,0.92)', accent: 'rgba(236,132,181,0.34)', text: '#ffe0ef' },
        { bgA: 'rgba(26,48,62,0.94)', bgB: 'rgba(28,84,104,0.92)', accent: 'rgba(116,224,255,0.34)', text: '#dbf8ff' },
        { bgA: 'rgba(56,42,18,0.95)', bgB: 'rgba(116,78,22,0.92)', accent: 'rgba(247,195,91,0.36)', text: '#fff0c8' },
        { bgA: 'rgba(34,32,68,0.95)', bgB: 'rgba(82,66,136,0.92)', accent: 'rgba(174,158,255,0.36)', text: '#efebff' }
    ];

    const spawnPopups = () => {
        const cols = Math.min(4, popupCount);
        const rows = Math.max(1, Math.ceil(popupCount / cols));
        const averagePopupWidth = popupSizeProfiles.medium.width;
        const averagePopupHeight = popupSizeProfiles.medium.minHeight;
        const usableWidth = Math.max(24, viewportWidth - averagePopupWidth - 24);
        const usableHeight = Math.max(120, viewportHeight - averagePopupHeight - 32);
        const shapeOffset = generator.randomInt(0, popupShapes.length - 1);
        const sizeOffset = generator.randomInt(0, popupSizes.length - 1);
        const paletteOffset = generator.randomInt(0, popupPalettes.length - 1);
        const actionOffset = generator.randomInt(0, popupActionSets.length - 1);
        const titleOffset = generator.randomInt(0, popupTitles.length - 1);
        const bodyOffset = generator.randomInt(0, popupBodies.length - 1);
        const fragment = document.createDocumentFragment();
        const shuffleButtons = (buttons) => {
            const result = buttons.slice();
            for (let idx = result.length - 1; idx > 0; idx -= 1) {
                const swapIdx = generator.randomInt(0, idx);
                const current = result[idx];
                result[idx] = result[swapIdx];
                result[swapIdx] = current;
            }
            return result;
        };

        for (let index = 0; index < popupCount; index += 1) {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const shape = popupShapes[(index + shapeOffset) % popupShapes.length];
            const size = popupSizes[(index + sizeOffset + Math.floor(index / 3)) % popupSizes.length];
            const palette = popupPalettes[(index + paletteOffset + Math.floor(index / 2)) % popupPalettes.length];
            const actionSet = popupActionSets[(index + actionOffset) % popupActionSets.length];
            const profile = popupSizeProfiles[size];
            const left = 12 + (cols === 1 ? usableWidth / 2 : (usableWidth / Math.max(1, cols - 1)) * col) + generator.randomInt(-18, 18);
            const top = 24 + (rows === 1 ? usableHeight / 2 : (usableHeight / Math.max(1, rows - 1)) * row) + generator.randomInt(-20, 20);
            const clampedLeft = Math.max(12, Math.min(left, viewportWidth - profile.width - 12));
            const clampedTop = Math.max(18, Math.min(top, viewportHeight - profile.minHeight - 18));
            const buttonList = shuffleButtons([
                { label: actionSet.correctLabel, kind: 'correct' },
                ...actionSet.decoys.map(label => ({ label, kind: 'decoy' }))
            ]);

            const popup = document.createElement('div');
            popup.className = 'fantasy-backlash-popup';
            popup.dataset.shape = shape;
            popup.dataset.size = size;
            popup.dataset.correctAction = actionSet.correctLabel;
            popup.style.left = `${clampedLeft}px`;
            popup.style.top = `${clampedTop}px`;
            popup.style.width = `${profile.width}px`;
            popup.style.minHeight = `${profile.minHeight}px`;
            popup.style.zIndex = String(12676 + index);
            popup.style.setProperty('--popup-bg-a', palette.bgA);
            popup.style.setProperty('--popup-bg-b', palette.bgB);
            popup.style.setProperty('--popup-accent', palette.accent);
            popup.style.setProperty('--popup-text', palette.text);
            popup.innerHTML = `
                <div class="fantasy-backlash-popup-header">
                    <span>${popupTitles[(index + titleOffset) % popupTitles.length]}</span>
                </div>
                <div class="fantasy-backlash-popup-body">
                    ${popupBodies[(index + bodyOffset + Math.floor(index / 2)) % popupBodies.length]}
                    <div class="fantasy-backlash-popup-hint">Dismiss this notice with <strong>${actionSet.correctLabel}</strong>.</div>
                </div>
                <div class="fantasy-backlash-popup-actions">
                    ${buttonList.map(button => `
                        <button
                            type="button"
                            class="fantasy-backlash-popup-action ${button.kind === 'correct' ? 'is-primary' : 'is-decoy'}"
                            data-popup-action="${button.kind}"
                        >${button.label}</button>
                    `).join('')}
                </div>
            `;

            const dismissPopup = () => {
                popup.classList.add('is-clearing');
                queueTimeout(() => {
                    popup.remove();
                    pruneHostIfIdle();
                }, 180);
            };

            popup.addEventListener('click', (event) => {
                const actionButton = event.target instanceof Element
                    ? event.target.closest('[data-popup-action]')
                    : null;
                if (!actionButton) return;
                if (actionButton.getAttribute('data-popup-action') === 'correct') {
                    dismissPopup();
                    return;
                }
                if (actionButton.getAttribute('data-popup-action') === 'decoy') {
                    popup.classList.remove('is-misclick');
                    void popup.offsetWidth;
                    popup.classList.add('is-misclick');
                    queueTimeout(() => popup.classList.remove('is-misclick'), 220);
                    showToast(generator.randomFromArray([
                        'That seal only makes the goblins grin wider.',
                        'Wrong sigil. The notice refuses to budge.',
                        'That choice feeds the nuisance instead of closing it.'
                    ]), 'warning', 1900);
                }
            });

            fragment.appendChild(popup);
        }
        host.appendChild(fragment);
    };

    const spawnButtons = () => {
        const sizeProfiles = {
            small: {
                width: Math.min(190, Math.max(132, Math.round(viewportWidth * 0.14))),
                height: Math.min(72, Math.max(52, Math.round(viewportHeight * 0.075)))
            },
            medium: {
                width: Math.min(260, Math.max(170, Math.round(viewportWidth * 0.18))),
                height: Math.min(86, Math.max(62, Math.round(viewportHeight * 0.088)))
            },
            large: {
                width: Math.min(350, Math.max(220, Math.round(viewportWidth * 0.24))),
                height: Math.min(110, Math.max(78, Math.round(viewportHeight * 0.105)))
            }
        };
        const avgButtonWidth = sizeProfiles.medium.width;
        const avgButtonHeight = sizeProfiles.medium.height;
        const buttonCols = Math.max(5, Math.min(10, Math.ceil(Math.sqrt(floatingButtonCount * Math.max(0.8, viewportWidth / Math.max(1, viewportHeight))))));
        const buttonRows = Math.max(1, Math.ceil(floatingButtonCount / buttonCols));
        const buttonUsableWidth = Math.max(20, viewportWidth - avgButtonWidth - 20);
        const buttonUsableHeight = Math.max(40, viewportHeight - avgButtonHeight - 30);
        const shapeOffset = generator.randomInt(0, floatingShapes.length - 1);
        const sizeOffset = generator.randomInt(0, floatingSizes.length - 1);
        const motionOffset = generator.randomInt(0, floatingMotions.length - 1);
        const paletteOffset = generator.randomInt(0, floatingPalettes.length - 1);
        const labelOffset = generator.randomInt(0, floatingLabels.length - 1);
        const dispelIndex = generator.randomInt(0, Math.max(0, floatingButtonCount - 1));
        const buttonElements = [];
        const fragment = document.createDocumentFragment();
        let clearing = false;
        const clearButtons = () => {
            if (clearing) return;
            clearing = true;
            buttonElements.forEach(button => {
                if (!button || !button.isConnected) return;
                button.classList.add('is-dissipating');
                button.disabled = true;
            });
            queueTimeout(() => {
                buttonElements.forEach(button => {
                    if (button && button.isConnected) button.remove();
                });
                pruneHostIfIdle();
            }, 820);
        };

        for (let index = 0; index < floatingButtonCount; index += 1) {
            const col = index % buttonCols;
            const row = Math.floor(index / buttonCols);
            const shape = floatingShapes[(index + shapeOffset) % floatingShapes.length];
            const size = floatingSizes[(index + sizeOffset + Math.floor(index / 4)) % floatingSizes.length];
            const motion = floatingMotions[(index + motionOffset + Math.floor(index / 3)) % floatingMotions.length];
            const palette = floatingPalettes[(index + paletteOffset + Math.floor(index / 5)) % floatingPalettes.length];
            const profile = sizeProfiles[size];
            const driftX = generator.randomInt(motion.driftX[0], motion.driftX[1]);
            const driftY = generator.randomInt(motion.driftY[0], motion.driftY[1]);
            const horizontalMargin = driftX + 12;
            const verticalMargin = driftY + 12;
            const maxLeft = Math.max(horizontalMargin, viewportWidth - profile.width - horizontalMargin);
            const maxTop = Math.max(verticalMargin, viewportHeight - profile.height - verticalMargin);
            const baseLeft = 10 + (buttonCols === 1 ? buttonUsableWidth / 2 : (buttonUsableWidth / Math.max(1, buttonCols - 1)) * col) + generator.randomInt(-18, 18);
            const baseTop = 12 + (buttonRows === 1 ? buttonUsableHeight / 2 : (buttonUsableHeight / Math.max(1, buttonRows - 1)) * row) + generator.randomInt(-16, 16);
            const left = Math.max(horizontalMargin, Math.min(baseLeft, maxLeft));
            const top = Math.max(verticalMargin, Math.min(baseTop, maxTop));
            const motionDuration = generator.randomInt(motion.duration[0], motion.duration[1]);
            const isDispelTarget = index === dispelIndex;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = `fantasy-backlash-float-btn${isDispelTarget ? ' is-dispel-target' : ''}`;
            button.dataset.shape = shape;
            button.dataset.size = size;
            button.dataset.motion = motion.key;
            button.dataset.dispelTarget = isDispelTarget ? 'true' : 'false';
            button.textContent = isDispelTarget
                ? generator.randomFromArray([
                    'Break Glamour',
                    'Dispel Swarm',
                    'True Exit',
                    'Sever Illusion',
                    'Banish Decoys'
                ])
                : floatingLabels[(index + labelOffset + Math.floor(index / 2)) % floatingLabels.length];
            button.style.left = `${left}px`;
            button.style.top = `${top}px`;
            button.style.zIndex = String(isDispelTarget ? 12780 + floatingButtonCount : 12670 + index);
            button.style.setProperty('--btn-rot-start', `${generator.randomInt(-180, 180)}deg`);
            button.style.setProperty('--btn-x-drift', `${driftX}px`);
            button.style.setProperty('--btn-y-drift', `${driftY}px`);
            button.style.setProperty('--btn-tilt', `${generator.randomInt(4, 14)}deg`);
            button.style.setProperty('--btn-scale-max', `${(1 + (generator.randomInt(2, 10) / 100)).toFixed(2)}`);
            button.style.setProperty('--btn-motion-animation', `${motion.animation} ${motionDuration}ms ${motion.timing} infinite`);
            button.style.setProperty('--btn-bg-a', palette.bgA);
            button.style.setProperty('--btn-bg-b', palette.bgB);
            button.style.setProperty('--btn-accent', palette.accent);
            button.style.setProperty('--btn-text', palette.text);

            button.addEventListener('click', () => {
                if (isDispelTarget) {
                    showToast('The glowing sigil collapses the entire swarm.', 'success', 1800);
                    clearButtons();
                    return;
                }
                showToast(generator.randomFromArray([
                    'The chamber snickers. That button was never real.',
                    'A goblin somewhere applauds your optimism.',
                    'That sigil exists purely to waste your attention.'
                ]), 'warning', 1800);
            });

            buttonElements.push(button);
            fragment.appendChild(button);
        }
        host.appendChild(fragment);
        showToast('Only the glowing sigil will disperse the false controls.', 'warning', 2200);
    };

    const spawnShake = () => {
        document.body.classList.add('fantasy-backlash-screen');
        const flicker = document.createElement('div');
        flicker.className = 'fantasy-backlash-flicker';
        host.appendChild(flicker);
        queueTimeout(() => {
            document.body.classList.remove('fantasy-backlash-screen');
            flicker.remove();
            pruneHostIfIdle();
        }, shakeDurationMs);
    };

    const spawnLivingScroll = () => {
        host.dataset.livingScrollState = 'active';
        const livingScroll = document.createElement('div');
        livingScroll.className = 'fantasy-living-scroll-backlash';
        livingScroll.innerHTML = `
            <img src="${backlashAssets.livingScroll}" alt="">
            <div class="fantasy-living-scroll-caption">A living scroll seizes the chamber. Anchor it before it drags the page away.</div>
        `;

        const anchor = document.createElement('button');
        anchor.type = 'button';
        anchor.className = 'fantasy-living-scroll-anchor';
        anchor.innerHTML = `
            <span class="fantasy-living-scroll-anchor-glyph" aria-hidden="true"></span>
            <span class="fantasy-living-scroll-anchor-copy">
                <strong>Anchor Sigil</strong>
                <span>Click to pin the living scroll.</span>
            </span>
        `;

        host.appendChild(livingScroll);
        host.appendChild(anchor);

        let scrollDirection = 1;
        const getScrollTarget = () => {
            const contentArea = document.querySelector('.content-area');
            if (contentArea && contentArea.scrollHeight > contentArea.clientHeight + 12) {
                return {
                    type: 'element',
                    node: contentArea,
                    max: () => Math.max(0, contentArea.scrollHeight - contentArea.clientHeight),
                    getTop: () => contentArea.scrollTop,
                    scrollBy: (delta) => {
                        contentArea.scrollTop = Math.max(0, Math.min(contentArea.scrollTop + delta, Math.max(0, contentArea.scrollHeight - contentArea.clientHeight)));
                    }
                };
            }

            const scrollRoot = document.scrollingElement || document.documentElement;
            if (scrollRoot && scrollRoot.scrollHeight > window.innerHeight + 12) {
                return {
                    type: 'window',
                    node: scrollRoot,
                    max: () => Math.max(0, scrollRoot.scrollHeight - window.innerHeight),
                    getTop: () => window.scrollY || scrollRoot.scrollTop || 0,
                    scrollBy: (delta) => {
                        window.scrollTo(0, Math.max(0, Math.min((window.scrollY || scrollRoot.scrollTop || 0) + delta, Math.max(0, scrollRoot.scrollHeight - window.innerHeight))));
                    }
                };
            }

            return null;
        };

        const pulseScroll = () => {
            const target = getScrollTarget();
            if (!target) {
                livingScroll.classList.remove('is-buckling');
                void livingScroll.offsetWidth;
                livingScroll.classList.add('is-buckling');
                return;
            }
            const top = target.getTop();
            const max = target.max();
            if (top >= max - 120) {
                scrollDirection = -1;
            } else if (top <= 80) {
                scrollDirection = 1;
            } else if (generator.randomInt(0, 4) === 0) {
                scrollDirection *= -1;
            }
            target.scrollBy(scrollDirection * generator.randomInt(240, 420));
            livingScroll.classList.remove('is-buckling');
            void livingScroll.offsetWidth;
            livingScroll.classList.add('is-buckling');
        };

        const scrollInterval = setInterval(pulseScroll, 260);
        timers.push(scrollInterval);
        queueTimeout(pulseScroll, 120);

        const clearLivingScroll = () => {
            clearInterval(scrollInterval);
            host.dataset.livingScrollState = 'anchored';
            livingScroll.classList.add('is-clearing');
            anchor.classList.add('is-clearing');
            showToast('The anchor sigil pins the living scroll in place.', 'success', 1800);
            queueTimeout(() => {
                livingScroll.remove();
                anchor.remove();
                pruneHostIfIdle();
            }, 360);
        };

        anchor.addEventListener('click', clearLivingScroll, { once: true });
        effectCleanup = () => {
            clearInterval(scrollInterval);
        };
    };

    const spawnSummoningCircle = () => {
        const glyphs = [
            { key: 'north', left: '50%', top: '8%' },
            { key: 'northeast', left: '86%', top: '29%' },
            { key: 'southeast', left: '86%', top: '71%' },
            { key: 'south', left: '50%', top: '90%' },
            { key: 'southwest', left: '14%', top: '71%' },
            { key: 'northwest', left: '14%', top: '29%' }
        ];

        const clickOrder = glyphs.map((_, i) => i);
        for (let idx = clickOrder.length - 1; idx > 0; idx -= 1) {
            const swapIdx = generator.randomInt(0, idx);
            const tmp = clickOrder[idx];
            clickOrder[idx] = clickOrder[swapIdx];
            clickOrder[swapIdx] = tmp;
        }
        const glyphSequencePosition = new Array(glyphs.length);
        clickOrder.forEach((glyphIdx, seqPos) => { glyphSequencePosition[glyphIdx] = seqPos; });

        const circle = document.createElement('div');
        circle.className = 'fantasy-summoning-circle-backlash';
        circle.dataset.clearedCount = '0';
        circle.dataset.totalGlyphs = String(glyphs.length);
        circle.innerHTML = `
            <img src="${backlashAssets.summoningCircle}" alt="">
            <div class="fantasy-summoning-circle-hint">Click the glyphs in numbered order to break the circle.</div>
        `;
        host.appendChild(circle);

        let clearedCount = 0;
        const glyphButtons = glyphs.map((glyph, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fantasy-summoning-glyph';
            button.dataset.glyphKey = glyph.key;
            button.dataset.glyphIndex = String(index);
            button.style.left = glyph.left;
            button.style.top = glyph.top;
            const displayNum = glyphSequencePosition[index] + 1;
            button.setAttribute('aria-label', `Summoning glyph ${displayNum}`);
            button.innerHTML = `<span class="fantasy-summoning-glyph-core">${displayNum}</span>`;
            circle.appendChild(button);
            return button;
        });

        const resetCircle = () => {
            clearedCount = 0;
            circle.dataset.clearedCount = '0';
            glyphButtons.forEach(button => button.classList.remove('is-activated'));
            circle.classList.remove('is-jolted');
            void circle.offsetWidth;
            circle.classList.add('is-jolted');
        };

        glyphButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                if (index !== clickOrder[clearedCount]) {
                    resetCircle();
                    showToast('The circle rejects that order. Follow the numbered glyphs.', 'warning', 1800);
                    return;
                }

                clearedCount += 1;
                circle.dataset.clearedCount = String(clearedCount);
                button.classList.add('is-activated');
                if (clearedCount < glyphs.length) {
                    showToast(`${glyphs.length - clearedCount} glyph${glyphs.length - clearedCount === 1 ? '' : 's'} remain in the circle.`, 'info', 1200);
                    return;
                }

                circle.classList.add('is-clearing');
                showToast('The summoning circle collapses into sparks.', 'success', 1800);
                queueTimeout(() => {
                    circle.remove();
                    pruneHostIfIdle();
                }, 1650);
            });
        });
    };

    const spawnInkSpill = () => {
        host.dataset.inkState = 'descending';
        const spill = document.createElement('div');
        spill.className = 'fantasy-ink-spill-backlash';
        spill.innerHTML = `
            <div class="fantasy-ink-spread">
                <img class="fantasy-ink-splatter-img" src="${backlashAssets.inkSplatter}" alt="" draggable="false">
            </div>
            <div class="fantasy-ink-pot">
                <img src="${backlashAssets.inkpot}" alt="" draggable="false">
                <button type="button" class="fantasy-ink-stopper" aria-label="Plug the ink pot">
                    <span class="fantasy-ink-stopper-ring" aria-hidden="true"></span>
                    <span class="fantasy-ink-stopper-label">Seal It</span>
                </button>
            </div>
            <div class="fantasy-ink-spill-hint">The inkpot tips from above. Plug it before the page is swallowed.</div>
        `;
        host.appendChild(spill);

        const pot = spill.querySelector('.fantasy-ink-pot');
        const spread = spill.querySelector('.fantasy-ink-spread');
        const stopper = spill.querySelector('.fantasy-ink-stopper');
        const hint = spill.querySelector('.fantasy-ink-spill-hint');

        const beginSpill = () => {
            spill.classList.add('is-active');
            host.dataset.inkState = 'spilling';
        };
        queueTimeout(beginSpill, 90);
        queueTimeout(() => {
            spill.classList.add('is-spilling');
            host.dataset.inkState = 'spilled';
        }, 620);

        stopper.addEventListener('click', () => {
            if (spill.classList.contains('is-clearing')) return;
            host.dataset.inkState = 'sealed';
            spill.classList.add('is-clearing');
            pot.classList.add('is-sealed');
            spread.classList.add('is-clearing');
            hint.classList.add('is-clearing');
            stopper.disabled = true;
            showToast('The stopper catches the spill before it covers the chamber.', 'success', 1800);
            queueTimeout(() => {
                spill.remove();
                pruneHostIfIdle();
            }, 520);
        });
    };

    const spawnLanternBlackout = () => {
        host.dataset.gremlinRevealed = 'false';
        const gremlinWidth = Math.min(172, Math.max(96, Math.round(viewportWidth * 0.11)));
        const gremlinHeight = Math.round(gremlinWidth * 1.45);
        const sideMargin = Math.max(12, Math.round(viewportWidth * 0.02));
        const topMargin = Math.max(120, Math.round(viewportHeight * 0.14));
        const bottomMargin = Math.max(24, Math.round(viewportHeight * 0.04));
        const edgePositions = [
            { left: sideMargin, top: topMargin },
            { left: viewportWidth - gremlinWidth - sideMargin, top: topMargin },
            { left: sideMargin, top: Math.max(topMargin, Math.round(viewportHeight * 0.38)) },
            { left: viewportWidth - gremlinWidth - sideMargin, top: Math.max(topMargin, Math.round(viewportHeight * 0.42)) },
            { left: sideMargin, top: Math.max(topMargin, viewportHeight - gremlinHeight - bottomMargin) },
            { left: viewportWidth - gremlinWidth - sideMargin, top: Math.max(topMargin, viewportHeight - gremlinHeight - bottomMargin) }
        ];
        const gremlinPosition = generator.randomFromArray(edgePositions);
        const gremlinLeft = gremlinPosition.left;
        const gremlinTop = gremlinPosition.top;

        const blackout = document.createElement('div');
        blackout.className = 'fantasy-lantern-blackout';
        blackout.innerHTML = `<div class="fantasy-lantern-blackout-hint">Sweep the lantern through the dark and reveal the gremlin. Hold the light on it for 3 seconds.</div>`;

        const gremlin = document.createElement('div');
        gremlin.className = 'fantasy-lantern-gremlin';
        gremlin.style.left = `${gremlinLeft}px`;
        gremlin.style.top = `${gremlinTop}px`;
        gremlin.style.width = `${gremlinWidth}px`;
        gremlin.innerHTML = `<img src="${backlashAssets.gremlin}" alt="">`;

        const lanternPointer = document.createElement('div');
        lanternPointer.className = 'fantasy-lantern-pointer';
        lanternPointer.innerHTML = '<span class="fantasy-lantern-pointer-glow"></span><span class="fantasy-lantern-pointer-body"></span>';

        document.body.appendChild(gremlin);
        document.body.appendChild(blackout);
        document.body.appendChild(lanternPointer);
        document.body.classList.add('fantasy-lantern-blackout-active');

        let blackoutCleared = false;
        let lingerTimer = null;
        let lingerStartTime = 0;
        const lingerDurationMs = 3000;

        const placeLantern = (x, y) => {
            blackout.style.setProperty('--lantern-x', `${x}px`);
            blackout.style.setProperty('--lantern-y', `${y}px`);
            lanternPointer.style.left = `${x}px`;
            lanternPointer.style.top = `${y}px`;
        };

        const clearLanternBlackout = () => {
            if (blackoutCleared) return;
            blackoutCleared = true;
            if (lingerTimer) { clearTimeout(lingerTimer); lingerTimer = null; }
            document.removeEventListener('pointermove', pointerHandler, true);
            host.dataset.gremlinRevealed = 'true';
            gremlin.classList.remove('is-lingering');
            gremlin.classList.add('is-revealed');
            blackout.classList.add('is-clearing');
            showToast('The lantern catches the gremlin in the dark.', 'success', 1800);
            queueTimeout(() => {
                document.body.classList.remove('fantasy-lantern-blackout-active');
                lanternPointer.remove();
                gremlin.remove();
                blackout.remove();
                pruneHostIfIdle();
            }, 420);
        };

        const cancelLinger = () => {
            if (lingerTimer) { clearTimeout(lingerTimer); lingerTimer = null; }
            lingerStartTime = 0;
            gremlin.classList.remove('is-lingering');
            gremlin.style.removeProperty('--linger-progress');
        };

        const pointerHandler = (event) => {
            const x = Number.isFinite(event.clientX) ? event.clientX : viewportWidth * 0.5;
            const y = Number.isFinite(event.clientY) ? event.clientY : viewportHeight * 0.5;
            placeLantern(x, y);
            if (blackoutCleared) return;
            const rect = gremlin.getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            const centerY = rect.top + (rect.height / 2);
            const revealRadius = Math.max(96, Math.min(rect.width, rect.height) * 0.52);
            const dx = x - centerX;
            const dy = y - centerY;
            const isOverGremlin = (dx * dx) + (dy * dy) <= revealRadius * revealRadius;

            if (isOverGremlin) {
                if (!lingerTimer) {
                    lingerStartTime = Date.now();
                    gremlin.classList.add('is-lingering');
                    lingerTimer = setTimeout(clearLanternBlackout, lingerDurationMs);
                }
                const elapsed = Date.now() - lingerStartTime;
                gremlin.style.setProperty('--linger-progress', String(Math.min(1, elapsed / lingerDurationMs)));
            } else {
                cancelLinger();
            }
        };

        placeLantern(Math.round(viewportWidth * 0.52), Math.round(viewportHeight * 0.58));
        document.addEventListener('pointermove', pointerHandler, true);
        effectCleanup = () => {
            if (lingerTimer) { clearTimeout(lingerTimer); lingerTimer = null; }
            document.body.classList.remove('fantasy-lantern-blackout-active');
            document.removeEventListener('pointermove', pointerHandler, true);
            if (lanternPointer.parentNode) lanternPointer.remove();
            if (gremlin.parentNode) gremlin.remove();
            if (blackout.parentNode) blackout.remove();
        };
    };

    const spawnDragon = () => {
        const dragonRequiredHits = 5;
        const warning = document.createElement('div');
        warning.className = 'fantasy-dragon-warning';
        warning.textContent = 'THE RED KING APPROACHES, SLAY THE DRAGON!';
        host.appendChild(warning);

        const doom = document.createElement('div');
        doom.className = 'fantasy-dragon-doom';
        doom.innerHTML = '<div class="fantasy-dragon-doom-message">YOU HAVE PERISHED</div>';
        host.appendChild(doom);

        const dragon = document.createElement('div');
        dragon.className = 'fantasy-backlash-dragon';
        dragon.dataset.phase = 'rising';
        dragon.dataset.frame = '2';
        dragon.dataset.visitedFrames = '2';
        dragon.dataset.hitCount = '0';
        dragon.dataset.requiredHits = String(dragonRequiredHits);
        dragon.dataset.slayState = 'pending';
        dragon.style.setProperty('--dragon-rise-duration', `${resolvedDragonRiseDurationMs}ms`);
        dragon.style.setProperty('--dragon-fade-duration', `${resolvedDragonFadeDurationMs}ms`);
        dragon.innerHTML = `<img src="${dragonAssets[2]}" alt="">`;
        host.appendChild(dragon);
        host.dataset.dragonOutcome = 'pending';
        host.dataset.dragonHits = '0';
        host.dataset.dragonRequiredHits = String(dragonRequiredHits);

        let dragonResolved = false;
        let dragonSlain = false;
        let dragonHitCount = 0;
        const activeInstanceId = state.pendingInstanceId || (state.currentInstance && state.currentInstance.id) || null;
        const releaseSwordCursor = () => {
            document.body.classList.remove('fantasy-dragon-hunt-active');
        };
        const clearWarning = () => {
            if (!warning.parentNode) return;
            warning.classList.add('is-clearing');
            queueTimeout(() => {
                if (warning.parentNode) warning.remove();
            }, 320);
        };
        const registerDragonHitFeedback = () => {
            dragon.classList.remove('is-struck');
            void dragon.offsetWidth;
            dragon.classList.add('is-struck');
            queueTimeout(() => {
                dragon.classList.remove('is-struck');
            }, 260);
        };
        const updateDragonHitState = () => {
            dragon.dataset.hitCount = String(dragonHitCount);
            host.dataset.dragonHits = String(dragonHitCount);
        };
        const slayHandler = (event) => {
            if (dragonResolved || dragonSlain) return;
            dragonHitCount += 1;
            updateDragonHitState();
            registerDragonHitFeedback();
            if (event) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
            }
            if (dragonHitCount < dragonRequiredHits) {
                const hitsRemaining = dragonRequiredHits - dragonHitCount;
                warning.textContent = `THE RED KING STAGGERS! ${hitsRemaining} STRIKE${hitsRemaining === 1 ? '' : 'S'} REMAIN.`;
                return;
            }
            dragonSlain = true;
            host.dataset.dragonOutcome = 'slain';
            dragon.dataset.slayState = 'slain';
            warning.textContent = 'THE RED KING FALTERS BEFORE YOUR BLADE!';
            warning.classList.add('is-slain');
            releaseSwordCursor();
            document.removeEventListener('click', slayHandler, true);
            showToast('Your sword finds its mark. Hold fast while the beast collapses.', 'success', 2200);
            if (state.benchmark) {
                recordBenchmarkEvent('dragon_slain', 'The Red King was struck down during backlash.', {
                    path: state.currentPage,
                    spellType: spell ? spell.tier : 'unknown',
                    penaltyType: 'dragon'
                }, false);
            }
        };
        document.body.classList.add('fantasy-dragon-hunt-active');
        document.addEventListener('click', slayHandler, true);
        effectCleanup = () => {
            releaseSwordCursor();
            document.removeEventListener('click', slayHandler, true);
        };

        const dragonImage = dragon.querySelector('img');
        const setDragonFrame = (frameNumber) => {
            const asset = dragonAssets[frameNumber];
            if (!asset) return;
            dragon.dataset.frame = String(frameNumber);
            const visitedFrames = new Set(String(dragon.dataset.visitedFrames || '').split(',').filter(Boolean));
            visitedFrames.add(String(frameNumber));
            dragon.dataset.visitedFrames = Array.from(visitedFrames).join(',');
            dragonImage.src = asset;
        };

        const startRise = () => {
            dragon.classList.add('is-rising');
        };
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(startRise);
        } else {
            startRise();
        }

        queueTimeout(() => {
            dragon.classList.remove('is-rising');
            dragon.classList.add('is-fire-active');
            dragon.dataset.phase = 'breathing';
            setDragonFrame(3);
        }, resolvedDragonRiseDurationMs);

        dragonFrameSequence.forEach((frameNumber, index) => {
            queueTimeout(() => {
                dragon.dataset.phase = frameNumber >= 6 ? 'inferno' : 'breathing';
                setDragonFrame(frameNumber);
            }, resolvedDragonRiseDurationMs + (resolvedDragonFrameIntervalMs * (index + 1)));
        });

        queueTimeout(() => {
            if (dragonSlain) {
                dragonResolved = true;
                dragon.dataset.phase = 'fading';
                dragon.classList.add('is-fading');
                clearWarning();
            } else {
                dragonResolved = true;
                dragon.dataset.phase = 'perished';
                dragon.dataset.slayState = 'perished';
                host.dataset.dragonOutcome = 'perished';
                releaseSwordCursor();
                document.removeEventListener('click', slayHandler, true);
                warning.classList.add('is-clearing');
                doom.classList.add('is-visible');
                if (state.benchmark) {
                    recordBenchmarkEvent('dragon_perished', 'The Red King claimed the run and forced a return to login.', {
                        path: state.currentPage,
                        spellType: spell ? spell.tier : 'unknown',
                        penaltyType: 'dragon'
                    }, false);
                }
                queueTimeout(() => {
                    returnToInstanceLogin(activeInstanceId);
                }, 3000);
            }
        }, resolvedDragonRiseDurationMs + (resolvedDragonFrameIntervalMs * dragonIntervalSteps));

        queueTimeout(() => {
            if (dragonSlain) {
                dragon.remove();
                doom.remove();
                pruneHostIfIdle();
            }
        }, resolvedDragonTotalDurationMs);
    };

    switch (selectedEffect) {
        case 'popups':
            spawnPopups();
            break;
        case 'buttons':
            spawnButtons();
            break;
        case 'shake':
            spawnShake();
            break;
        case 'dragon':
            spawnDragon();
            break;
        case 'living-scroll':
            spawnLivingScroll();
            break;
        case 'summoning-circle':
            spawnSummoningCircle();
            break;
        case 'ink-spill':
            spawnInkSpill();
            break;
        case 'lantern-blackout':
            spawnLanternBlackout();
            break;
        default:
            spawnPopups();
            break;
    }

    if (state.benchmark) {
        recordBenchmarkEvent('spell_backlash', `${spell ? spell.title : 'Spell backlash'} triggered`, { path: state.currentPage, spellType: spell ? spell.tier : 'unknown', penaltyType: selectedEffect }, false);
    }
    const effectMessages = {
        popups: 'The failed ward floods the chamber with maddening notices.',
        buttons: 'The failed ward spawns a swarm of false controls.',
        shake: 'The failed ward hurls the chamber into a violent tremor.',
        dragon: 'The failed ward summons a dragon of living flame.',
        'living-scroll': 'A living scroll claws at the chamber and drags the page with it.',
        'summoning-circle': 'A summoning circle locks into place beneath the interface.',
        'ink-spill': 'A cursed inkpot topples from above and floods the workbench.',
        'lantern-blackout': 'The lantern light dies and something begins to grin in the dark.'
    };
    signalFantasyMechanicCue('spell_faded', effectMessages[selectedEffect] || 'The failed ward lashes back with chaos and fire.', {
        path: state.currentPage,
        spellType: spell ? spell.tier : 'unknown',
        penaltyType: selectedEffect,
        force: true
    });

    if (typeof window !== 'undefined' && window.__mazeRunner) {
        window.__mazeRunner.fantasySpellPenaltyCleanup = () => {
            timers.forEach(timeoutId => clearTimeout(timeoutId));
            effectCleanup();
            document.body.classList.remove('fantasy-backlash-screen');
            if (host.parentNode) host.remove();
        };
    }
}

function normalizeFantasySpellCode(value) {
    return String(value == null ? '' : value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function generateFantasySpellCode(generator) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let index = 0; index < 6; index += 1) {
        code += alphabet.charAt(generator.randomInt(0, alphabet.length - 1));
    }
    return code;
}

function buildFantasySpellDecoys(generator, realCode, count = 3) {
    const decoys = [];
    while (decoys.length < count) {
        const candidate = generateFantasySpellCode(generator);
        if (candidate !== realCode && !decoys.includes(candidate)) {
            decoys.push(candidate);
        }
    }
    return decoys;
}

/* ─────────────────────────────────────────────────────────────────
 * Spell Tier System — ramps difficulty based on cast count.
 *   Tier 1  Cantrip     (casts 0-1)  — single dismiss popup
 *   Tier 2  Ward        (casts 2-3)  — rune selection + decoy close
 *   Tier 3  Hex         (casts 4-5)  — scrollable grimoire + code entry
 *   Tier 4  Ritual      (casts 6-7)  — stacked modals + selection + code
 *   Tier 5  Conjuration (casts 8+)   — full gauntlet (banner + stacked + scroll + code)
 * ───────────────────────────────────────────────────────────────── */
function getFantasySpellTier(castCount = 0) {
    if (castCount <= 1) return 'cantrip';
    if (castCount <= 3) return 'ward';
    if (castCount <= 5) return 'hex';
    if (castCount <= 7) return 'ritual';
    return 'conjuration';
}

function getFantasySpellTierLabel(tier = 'cantrip') {
    const labels = {
        cantrip: 'Cantrip',
        ward: 'Ward',
        hex: 'Hex',
        ritual: 'Ritual',
        conjuration: 'Grand Conjuration'
    };
    return labels[tier] || labels.cantrip;
}

function buildFantasySpell(instance = state.currentInstance, castCount = 0) {
    const sessionKey = (state.benchmark && state.benchmark.startedAt) || Date.now();
    const generator = createInstanceScopedGenerator(instance, `spell-${sessionKey}-${castCount}`);
    const tier = getFantasySpellTier(castCount);
    const titles = {
        cantrip: ['Flickering Charm', 'Ember Wisp', 'Minor Hex', 'Spark Ward'],
        ward: ['Sigil Lock', 'Rune Barrier', 'Warding Glyph', 'Phantom Seal'],
        hex: ['Cascading Parchment', 'Archivist Drift', 'Creeping Fog Hex', 'Long Scroll Curse'],
        ritual: ['Rite of Three Seals', 'Layered Enchantment', 'Phantom Assembly', 'Stacked Binding'],
        conjuration: ['Grand Conjuration', 'The Full Gauntlet', 'Archmage Trial', 'Siege of Wards']
    };
    const prompts = {
        cantrip: 'A minor spell stirs. Dismiss the disturbance to restore order.',
        ward: 'A warding glyph settles over the ledger. Select the correct rune to break the seal.',
        hex: 'A hex coils around the parchment. Scroll through the grimoire to unearth the counterspell.',
        ritual: 'A layered ritual takes hold. Dismiss each phantom seal in turn, then break the final ward.',
        conjuration: 'A grand conjuration descends. Clear the cursed pact, dismiss the phantoms, find the counterspell in the grimoire, and inscribe it to dispel the siege.'
    };
    return {
        id: `spell-${Date.now()}-${castCount}`,
        castCount,
        tier,
        tierLabel: getFantasySpellTierLabel(tier),
        title: generator.randomFromArray(titles[tier] || titles.cantrip),
        prompt: prompts[tier] || prompts.cantrip,
        code: generateFantasySpellCode(generator),
        revealed: false
    };
}

function ensureFantasySpellHost() {
    let host = document.getElementById('fantasy-spell-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'fantasy-spell-host';
    host.className = 'fantasy-spell-host';
    document.body.appendChild(host);
    return host;
}

function dismissFantasySpell(reason = 'faded', options = {}) {
    const { quiet = false, detail = '' } = options;
    const spell = state.fantasyActiveSpell;
    clearFantasySpellUi();
    state.fantasyActiveSpell = null;
    if (!spell || quiet) return;
    const message = detail || (reason === 'replaced'
        ? 'An older ward collapsed beneath a stronger spell.'
        : 'The spell thinned before the counterspell was woven.');
    if (state.benchmark) {
        recordBenchmarkEvent('spell_faded', `${spell.title} :: ${message}`, { path: state.currentPage, spellType: spell.tier }, false);
    }
    signalFantasyMechanicCue('spell_faded', message, { path: state.currentPage, spellType: spell.tier });
    showToast(state.fantasyMode ? message : 'The temporary challenge faded.', 'info', 3200);
    if (reason === 'faded') {
        triggerFantasySpellPenalty(spell, reason);
    }
}

function completeFantasySpell(spell, detail = 'Counterspell woven. The chamber steadies.') {
    if (!spell || state.fantasyActiveSpell !== spell) return;
    clearFantasySpellUi();
    state.fantasyActiveSpell = null;
    if (state.benchmark) {
        recordBenchmarkEvent('spell_dispersed', `${spell.title} dispelled`, { path: state.currentPage, spellType: spell.tier }, false);
    }
    signalFantasyMechanicCue('spell_dispersed', detail, { path: state.currentPage, spellType: spell.tier });
    showToast(detail, 'success', 3600);
}

function scheduleFantasySpellCast(delay = 60000) {
    if (state.fantasySpellCastTimer) clearTimeout(state.fantasySpellCastTimer);
    if (!isFantasySpellcastingActive() || state.mode !== 'app') return;
    state.fantasySpellCastTimer = setTimeout(() => {
        state.fantasySpellCastTimer = null;
        castFantasySpell();
    }, delay);
}

function castFantasySpell() {
    if (!isFantasySpellcastingActive() || state.mode !== 'app') return;
    if (state.fantasyActiveSpell) {
        dismissFantasySpell('replaced', { quiet: true });
    }
    const spell = buildFantasySpell(state.currentInstance, state.fantasySpellCastCount || 0);
    state.fantasySpellCastCount = (state.fantasySpellCastCount || 0) + 1;
    state.fantasyActiveSpell = spell;
    applyFantasyAdversarialCopyShift();
    renderFantasySpell(spell);
    if (state.benchmark) {
        recordBenchmarkEvent('spell_cast', `${spell.title} (${spell.tierLabel})`, { path: state.currentPage, spellType: spell.tier }, false);
    }
    signalFantasyMechanicCue('spell_cast', `${spell.title} settles over the ledger.`, { path: state.currentPage, spellType: spell.tier });
    showToast(`${spell.title} grips the chamber. Dispel it to continue.`, 'warning', 4200);
    scheduleFantasySpellCast(60000);
}

/* ─────────────────────────────────────────────────────────────────
 * renderFantasySpell — browser-automation-challenge-inspired spell UI.
 *
 * Builds a full-screen overlay with layered modals, banners,
 * scrollable grimoires, rune selections, decoy close buttons,
 * and code entry — all flavored as magical spells. Difficulty
 * ramps with the tier (see getFantasySpellTier above).
 * ───────────────────────────────────────────────────────────────── */
function renderFantasySpell(spell) {
    clearFantasySpellUi();
    const host = ensureFantasySpellHost();
    const cleanupFns = [];
    const addCleanup = (fn) => cleanupFns.push(fn);
    const generator = createInstanceScopedGenerator(state.currentInstance, `spell-ui-${spell.id}`);

    // Shuffle helper
    const shuffle = (arr) => {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = generator.randomInt(0, i);
            const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
        }
        return copy;
    };

    // ── Backdrop ──
    const backdrop = document.createElement('div');
    backdrop.className = 'fantasy-spell-backdrop';
    host.appendChild(backdrop);

    // ── Timer bar ──
    const timerBar = document.createElement('div');
    timerBar.className = 'spell-timer-bar';
    timerBar.style.width = '100%';
    host.appendChild(timerBar);
    const timerDurations = { cantrip: 30, ward: 40, hex: 50, ritual: 60, conjuration: 75 };
    const totalTime = (timerDurations[spell.tier] || 40) * 1000;
    const timerStart = Date.now();
    const timerInterval = setInterval(() => {
        const elapsed = Date.now() - timerStart;
        const pct = Math.max(0, 100 - (elapsed / totalTime) * 100);
        timerBar.style.width = pct + '%';
        if (pct <= 0) {
            clearInterval(timerInterval);
            dismissFantasySpell('faded', { detail: 'The spell expired. The enchantment fades on its own.' });
        }
    }, 200);
    addCleanup(() => clearInterval(timerInterval));

    // Shared state for multi-step tiers
    let codeRevealed = false;
    let revealBox = null;
    let codeInput = null;

    function bringSpellElementIntoView(element, { focus = false } = {}) {
        if (!element) return;

        requestAnimationFrame(() => {
            const scrollContainer = element.closest('.spell-modal-body');

            if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const topDelta = elementRect.top - containerRect.top;
                const bottomDelta = elementRect.bottom - containerRect.bottom;

                if (topDelta < 12) {
                    scrollContainer.scrollTop += topDelta - 12;
                } else if (bottomDelta > -12) {
                    scrollContainer.scrollTop += bottomDelta + 12;
                }
            }

            try {
                element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            } catch (error) {
                // Some embedded browsers may not support smooth scroll options.
                element.scrollIntoView();
            }

            if (focus && typeof element.focus === 'function') {
                try {
                    element.focus({ preventScroll: true });
                } catch (error) {
                    element.focus();
                }
            }
        });
    }

    // Helper: create a modal at given position and z-index
    function createModal(opts) {
        const { title, body, actions, zIndex = 12630, top, left, width = 420, closeable = true, decoyClose = false, onClose } = opts;
        const modal = document.createElement('div');
    modal.className = 'spell-modal fantasy-spell-panel';
        modal.style.cssText = `z-index:${zIndex};top:${top};left:${left};width:${width}px;max-width:90vw;`;

        let headerHTML = `<h3>${title}</h3>`;
        if (closeable || decoyClose) {
            const closeClass = decoyClose ? 'spell-modal-close is-decoy' : 'spell-modal-close';
            headerHTML += `<button class="${closeClass}" data-close="${decoyClose ? 'decoy' : 'real'}" aria-label="Close">&times;</button>`;
        }
        modal.innerHTML = `
            <div class="spell-modal-header">${headerHTML}</div>
            <div class="spell-modal-body">${body}</div>
            ${actions ? `<div class="spell-modal-actions">${actions}</div>` : ''}
        `;

        const closeBtn = modal.querySelector('[data-close]');
        if (closeBtn) {
            const handler = () => {
                if (decoyClose) {
                    showToast('That seal is a decoy. Look for the real way to dismiss this phantom.', 'warning', 2800);
                } else if (onClose) {
                    onClose(modal);
                }
            };
            closeBtn.addEventListener('click', handler);
            addCleanup(() => closeBtn.removeEventListener('click', handler));
        }

        host.appendChild(modal);
        return modal;
    }

    // Helper: create the code entry section
    function createCodeEntry(container) {
        revealBox = document.createElement('div');
        revealBox.className = 'spell-reveal-box';
        revealBox.textContent = 'Counterspell hidden';
        container.appendChild(revealBox);

        const entryDiv = document.createElement('div');
        entryDiv.className = 'spell-code-entry';
        entryDiv.innerHTML = `
            <input type="text" class="spell-code-input" maxlength="6" autocomplete="off" spellcheck="false" placeholder="Inscribe runes" aria-label="Enter counterspell code">
            <button type="button" class="spell-btn spell-btn-primary">Dispel</button>
            <button type="button" class="spell-btn">Let It Fade</button>
        `;
        container.appendChild(entryDiv);

        codeInput = entryDiv.querySelector('.spell-code-input');
        const submitBtn = entryDiv.querySelector('.spell-btn-primary');
        const fadeBtn = entryDiv.querySelectorAll('.spell-btn')[1];

        const inputHandler = () => { codeInput.value = normalizeFantasySpellCode(codeInput.value); };
        const keyHandler = (e) => { if (e.key === 'Enter') { e.preventDefault(); trySubmit(); } };
        const trySubmit = () => {
            if (normalizeFantasySpellCode(codeInput.value) === spell.code) {
                completeFantasySpell(spell, 'Counterspell woven. The enchantment shatters!');
            } else {
                showToast('Those runes fail to dispel the magic. Try again.', 'warning', 2400);
                codeInput.select();
            }
        };
        const fade = () => dismissFantasySpell('faded');

        codeInput.addEventListener('input', inputHandler);
        codeInput.addEventListener('keydown', keyHandler);
        submitBtn.addEventListener('click', trySubmit);
        fadeBtn.addEventListener('click', fade);
        addCleanup(() => codeInput.removeEventListener('input', inputHandler));
        addCleanup(() => codeInput.removeEventListener('keydown', keyHandler));
        addCleanup(() => submitBtn.removeEventListener('click', trySubmit));
        addCleanup(() => fadeBtn.removeEventListener('click', fade));

        bringSpellElementIntoView(entryDiv);
    }

    function revealCode() {
        if (codeRevealed) return;
        codeRevealed = true;
        spell.revealed = true;
        if (revealBox) {
            revealBox.textContent = spell.code;
            revealBox.classList.add('is-revealed');
            bringSpellElementIntoView(revealBox);
        }
        if (codeInput) {
            setTimeout(() => bringSpellElementIntoView(codeInput), 80);
        }
    }

    // Helper: grimoire with hidden rune (for hex/conjuration tiers)
    function createGrimoire(container, lineCount = 20) {
        const loreLines = [
            'The archivist notes another ward, another seal, another name.',
            'Dust settles on the parchment as the ink dries slowly.',
            'A raven perches above the doorway, watching the quill move.',
            'The candle sputters. Shadows lengthen across the ancient text.',
            'Three sigils were found in the east wing. Two remain unbroken.',
            'The librarian mutters about misplaced tomes and unstamped scrolls.',
            'A draft carries the scent of old leather and dried sage.',
            'The catalog lists seven forbidden texts. Only four are accounted for.',
            'Between the lines, a faint watermark reads: trust the margin.',
            'The binding cracks as the cover opens. The pages are yellowed.',
            'Someone has underlined a passage about lunar ward sequences.',
            'A pressed flower marks a page about elemental attunements.',
            'The archivist logs each entry twice — once in rune, once in common.',
            'Footnote 14 references a sealed chamber beneath the observatory.',
            'The appendix contains nothing but blank pages and a single glyph.'
        ];
        const grimoire = document.createElement('div');
        grimoire.className = 'spell-grimoire';
        let lines = '';
        const runePosition = generator.randomInt(Math.floor(lineCount * 0.7), lineCount - 1);
        for (let i = 0; i < lineCount; i++) {
            if (i === runePosition) {
                lines += `<div class="spell-grimoire-line is-rune">Counterspell: ${spell.code}</div>`;
            } else {
                lines += `<div class="spell-grimoire-line">Section ${i + 1} — ${loreLines[i % loreLines.length]}</div>`;
            }
        }
        grimoire.innerHTML = lines;
        container.appendChild(grimoire);

        const scrollHandler = () => {
            if (grimoire.scrollTop + grimoire.clientHeight >= grimoire.scrollHeight - 20) {
                revealCode();
            }
            // Also reveal if the rune line is visible in viewport
            const runeLine = grimoire.querySelector('.is-rune');
            if (runeLine) {
                const rect = runeLine.getBoundingClientRect();
                const gRect = grimoire.getBoundingClientRect();
                if (rect.top >= gRect.top && rect.bottom <= gRect.bottom) {
                    revealCode();
                }
            }
        };
        grimoire.addEventListener('scroll', scrollHandler, { passive: true });
        addCleanup(() => grimoire.removeEventListener('scroll', scrollHandler));
    }

    // Helper: rune radio group (for ward/ritual tiers)
    function createRuneSelection(container, onCorrect) {
        const correctRune = generator.randomFromArray(['Aegis of Flame', 'Warden\'s Sigil', 'Lunar Ward', 'Ember Seal']);
        const decoyRunes = shuffle(['Shadow Bind', 'Hollow Glyph', 'Broken Crest', 'Fading Mark', 'Phantom Trace', 'Ash Rune'])
            .slice(0, generator.randomInt(3, 5));
        const allRunes = shuffle([correctRune, ...decoyRunes]);

        const group = document.createElement('div');
        group.className = 'spell-rune-group';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', 'Select the correct rune');
        allRunes.forEach(rune => {
            const opt = document.createElement('div');
            opt.className = 'spell-rune-option';
            opt.setAttribute('role', 'radio');
            opt.setAttribute('tabindex', '0');
            opt.setAttribute('aria-checked', 'false');
            opt.innerHTML = `<div class="spell-rune-radio"></div><span class="spell-rune-label">${rune}</span>`;
            const handler = () => {
                group.querySelectorAll('.spell-rune-option').forEach(o => {
                    o.classList.remove('is-selected');
                    o.setAttribute('aria-checked', 'false');
                });
                opt.classList.add('is-selected');
                opt.setAttribute('aria-checked', 'true');
            };
            opt.addEventListener('click', handler);
            addCleanup(() => opt.removeEventListener('click', handler));
            group.appendChild(opt);
        });
        container.appendChild(group);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'spell-btn spell-btn-primary';
        confirmBtn.textContent = 'Confirm Rune';
        confirmBtn.style.marginTop = '8px';
        container.appendChild(confirmBtn);
        const confirmHandler = () => {
            const selected = group.querySelector('.is-selected .spell-rune-label');
            if (!selected) {
                showToast('Select a rune before confirming.', 'warning', 2000);
                return;
            }
            if (selected.textContent === correctRune) {
                onCorrect();
            } else {
                showToast('The ward rejects that rune. Try another.', 'warning', 2400);
            }
        };
        confirmBtn.addEventListener('click', confirmHandler);
        addCleanup(() => confirmBtn.removeEventListener('click', confirmHandler));
    }

    // Helper: phantom popups to dismiss (for ritual/conjuration tiers)
    function createPhantomPopups(count, onAllDismissed) {
        let dismissed = 0;
        const phantomNames = shuffle(['Wraith of the Ledger', 'Phantom Auditor', 'Specter of Compliance', 'Ghost of the Archive', 'Shadow Clerk']);
        const phantomMessages = [
            'This phantom obscures the ward. Find the true way to banish it.',
            'A spectral form blocks your view. Dismiss it to proceed.',
            'The phantom lingers. It must be banished before the counterspell can surface.',
        ];
        for (let i = 0; i < count; i++) {
            const useDecoyClose = i < count - 1; // first popups have decoy close, last one has real close
            const hasRealDismiss = true;
            const topOffset = 120 + i * 60;
            const leftOffset = `calc(50% - ${220 - i * 30}px)`;

            let actionsHTML = '';
            if (useDecoyClose) {
                // Decoy close button but real dismiss via the action button
                actionsHTML = `
                    <button class="spell-btn is-decoy" data-decoy-dismiss>Dismiss</button>
                    <button class="spell-btn spell-btn-primary" data-real-dismiss>Banish Spirit</button>
                `;
            } else {
                actionsHTML = `<button class="spell-btn spell-btn-primary" data-real-dismiss>Banish Spirit</button>`;
            }

            const modal = createModal({
                title: phantomNames[i % phantomNames.length],
                body: `<p>${phantomMessages[i % phantomMessages.length]}</p>`,
                actions: actionsHTML,
                zIndex: 12632 + i * 2,
                top: topOffset + 'px',
                left: leftOffset,
                width: 380 + i * 20,
                closeable: false,
                decoyClose: useDecoyClose
            });

            const decoyBtn = modal.querySelector('[data-decoy-dismiss]');
            if (decoyBtn) {
                const decoyHandler = () => {
                    showToast('That button is cursed! Look for the true banishment.', 'warning', 2400);
                };
                decoyBtn.addEventListener('click', decoyHandler);
                addCleanup(() => decoyBtn.removeEventListener('click', decoyHandler));
            }

            const realBtn = modal.querySelector('[data-real-dismiss]');
            if (realBtn) {
                const realHandler = () => {
                    modal.remove();
                    dismissed++;
                    if (dismissed >= count) {
                        onAllDismissed();
                    }
                };
                realBtn.addEventListener('click', realHandler);
                addCleanup(() => realBtn.removeEventListener('click', realHandler));
            }
        }
    }

    // Helper: cursed pact banner (cookie-consent style, for conjuration tier)
    function createCursedPactBanner(onAccept) {
        const banner = document.createElement('div');
        banner.className = 'spell-banner';
        banner.innerHTML = `
            <span class="spell-banner-icon">📜</span>
            <span class="spell-banner-text">This realm requires a binding pact. Do you accept the terms of the arcane covenant to proceed?</span>
            <div class="spell-banner-actions">
                <button class="spell-btn" data-pact="decline">Decline</button>
                <button class="spell-btn spell-btn-primary" data-pact="accept">Accept Pact</button>
            </div>
        `;
        host.appendChild(banner);

        const declineBtn = banner.querySelector('[data-pact="decline"]');
        const acceptBtn = banner.querySelector('[data-pact="accept"]');
        const declineHandler = () => {
            showToast('The covenant persists. You must accept to continue.', 'warning', 2400);
        };
        const acceptHandler = () => {
            banner.remove();
            onAccept();
        };
        declineBtn.addEventListener('click', declineHandler);
        acceptBtn.addEventListener('click', acceptHandler);
        addCleanup(() => declineBtn.removeEventListener('click', declineHandler));
        addCleanup(() => acceptBtn.removeEventListener('click', acceptHandler));
    }

    /* ─── TIER RENDERING ─── */
    switch (spell.tier) {

        /* ── Tier 1: Cantrip — single popup, click Dispel ── */
        case 'cantrip': {
            const decoys = buildFantasySpellDecoys(generator, spell.code, 2);
            const modal = createModal({
                title: spell.title,
                body: `
                    <div class="spell-kicker">Spell Cast ${spell.castCount + 1} — ${spell.tierLabel}</div>
                    <p>${spell.prompt}</p>
                    <p>The counterspell rune is: <strong style="font-family:Cinzel,serif;letter-spacing:0.12em;color:#f4dd98;">${spell.code}</strong></p>
                `,
                actions: shuffle([
                    `<button class="spell-btn is-decoy" data-action="decoy">${decoys[0]}</button>`,
                    `<button class="spell-btn spell-btn-primary" data-action="dispel">Cast ${spell.code}</button>`,
                    `<button class="spell-btn is-decoy" data-action="decoy">${decoys[1]}</button>`,
                ]).join(''),
                zIndex: 12635,
                top: 'calc(50% - 140px)',
                left: 'calc(50% - 220px)',
                width: 440,
                closeable: true,
                onClose: () => dismissFantasySpell('faded')
            });

            modal.querySelectorAll('[data-action="decoy"]').forEach(btn => {
                const handler = () => showToast('That rune fizzles. It was a decoy.', 'warning', 2200);
                btn.addEventListener('click', handler);
                addCleanup(() => btn.removeEventListener('click', handler));
            });
            const dispelBtn = modal.querySelector('[data-action="dispel"]');
            if (dispelBtn) {
                const handler = () => completeFantasySpell(spell, 'The cantrip dissolves. Well done!');
                dispelBtn.addEventListener('click', handler);
                addCleanup(() => dispelBtn.removeEventListener('click', handler));
            }
            break;
        }

        /* ── Tier 2: Ward — rune radio selection + decoy X button ── */
        case 'ward': {
            const modal = createModal({
                title: spell.title,
                body: `
                    <div class="spell-kicker">Spell Cast ${spell.castCount + 1} — ${spell.tierLabel}</div>
                    <p>${spell.prompt}</p>
                    <div class="spell-status-msg">Select the correct warding rune below. The close button may not be what it seems.</div>
                    <div id="spell-rune-container"></div>
                `,
                actions: '',
                zIndex: 12635,
                top: '80px',
                left: 'calc(50% - 230px)',
                width: 460,
                closeable: false,
                decoyClose: true
            });

            const container = modal.querySelector('#spell-rune-container');
            createRuneSelection(container, () => {
                // Reveal code and show code entry
                const bodyEl = modal.querySelector('.spell-modal-body');
                const msg = document.createElement('div');
                msg.className = 'spell-status-msg is-success';
                msg.textContent = 'The correct rune glows. The counterspell surfaces.';
                bodyEl.appendChild(msg);
                createCodeEntry(bodyEl);
                revealCode();
                if (codeInput) setTimeout(() => bringSpellElementIntoView(codeInput, { focus: true }), 50);
            });
            break;
        }

        /* ── Tier 3: Hex — scrollable grimoire + code entry ── */
        case 'hex': {
            const modal = createModal({
                title: spell.title,
                body: `
                    <div class="spell-kicker">Spell Cast ${spell.castCount + 1} — ${spell.tierLabel}</div>
                    <p>${spell.prompt}</p>
                    <div class="spell-status-msg">Scroll through the grimoire below to find the counterspell rune. Then inscribe it.</div>
                    <div id="spell-grimoire-container"></div>
                    <div id="spell-code-container"></div>
                `,
                actions: '',
                zIndex: 12635,
                top: '60px',
                left: 'calc(50% - 250px)',
                width: 500,
                closeable: true,
                onClose: () => dismissFantasySpell('faded')
            });

            const grimoireContainer = modal.querySelector('#spell-grimoire-container');
            const codeContainer = modal.querySelector('#spell-code-container');
            createGrimoire(grimoireContainer, 25);
            createCodeEntry(codeContainer);
            break;
        }

        /* ── Tier 4: Ritual — stacked phantom modals, then rune selection + code ── */
        case 'ritual': {
            const phantomCount = generator.randomInt(2, 3);
            // Show instruction modal behind the phantoms
            const mainModal = createModal({
                title: spell.title,
                body: `
                    <div class="spell-kicker">Spell Cast ${spell.castCount + 1} — ${spell.tierLabel}</div>
                    <p>${spell.prompt}</p>
                    <div class="spell-status-msg">Banish all ${phantomCount} phantom seals first. Then select the correct warding rune to reveal the counterspell.</div>
                    <div id="spell-ritual-rune-container" style="display:none;"></div>
                    <div id="spell-ritual-code-container" style="display:none;"></div>
                `,
                actions: '',
                zIndex: 12630,
                top: '50px',
                left: 'calc(50% - 250px)',
                width: 500,
                closeable: true,
                onClose: () => dismissFantasySpell('faded')
            });

            createPhantomPopups(phantomCount, () => {
                // All phantoms banished — show rune selection
                showToast('All phantoms banished! Now break the ward.', 'success', 2800);
                const runeContainer = mainModal.querySelector('#spell-ritual-rune-container');
                const codeContainer = mainModal.querySelector('#spell-ritual-code-container');
                runeContainer.style.display = 'block';
                createRuneSelection(runeContainer, () => {
                    codeContainer.style.display = 'block';
                    const msg = document.createElement('div');
                    msg.className = 'spell-status-msg is-success';
                    msg.textContent = 'The ward crumbles. The counterspell is revealed.';
                    codeContainer.prepend(msg);
                    createCodeEntry(codeContainer);
                    revealCode();
                    if (codeInput) setTimeout(() => bringSpellElementIntoView(codeInput, { focus: true }), 50);
                });
            });
            break;
        }

        /* ── Tier 5: Grand Conjuration — banner + phantoms + grimoire + code ── */
        case 'conjuration': {
            let phase = 0; // 0=banner, 1=phantoms, 2=grimoire+code

            const mainModal = createModal({
                title: spell.title,
                body: `
                    <div class="spell-kicker">Spell Cast ${spell.castCount + 1} — ${spell.tierLabel}</div>
                    <p>${spell.prompt}</p>
                    <div class="spell-status-msg" id="spell-conj-status">First: accept the cursed pact at the bottom of the screen.</div>
                    <div id="spell-conj-grimoire" style="display:none;"></div>
                    <div id="spell-conj-code" style="display:none;"></div>
                `,
                actions: '',
                zIndex: 12628,
                top: '40px',
                left: 'calc(50% - 270px)',
                width: 540,
                closeable: false,
                decoyClose: true
            });

            const statusEl = mainModal.querySelector('#spell-conj-status');
            const grimoireEl = mainModal.querySelector('#spell-conj-grimoire');
            const codeEl = mainModal.querySelector('#spell-conj-code');

            // Phase 0: Cursed pact banner
            createCursedPactBanner(() => {
                phase = 1;
                statusEl.textContent = 'Pact accepted. Now banish the phantom seals blocking the grimoire.';
                statusEl.className = 'spell-status-msg';

                // Phase 1: Phantom popups
                const phantomCount = generator.randomInt(2, 3);
                createPhantomPopups(phantomCount, () => {
                    phase = 2;
                    showToast('Phantoms banished! Find the counterspell in the grimoire.', 'success', 3000);
                    statusEl.textContent = 'Scroll the grimoire to find the counterspell, then inscribe it.';
                    statusEl.className = 'spell-status-msg is-success';
                    grimoireEl.style.display = 'block';
                    codeEl.style.display = 'block';
                    createGrimoire(grimoireEl, 30);
                    createCodeEntry(codeEl);
                });
            });
            break;
        }

        default: {
            // Fallback: simple cantrip
            const modal = createModal({
                title: spell.title,
                body: `<p>${spell.prompt}</p><p>Counterspell: <strong style="color:#f4dd98;font-family:Cinzel,serif;letter-spacing:0.12em;">${spell.code}</strong></p>`,
                actions: `<button class="spell-btn spell-btn-primary" data-action="dispel">Dispel</button>`,
                zIndex: 12635,
                top: 'calc(50% - 100px)',
                left: 'calc(50% - 200px)',
                width: 400,
                closeable: true,
                onClose: () => dismissFantasySpell('faded')
            });
            const btn = modal.querySelector('[data-action="dispel"]');
            if (btn) {
                const handler = () => completeFantasySpell(spell, 'The spell dissolves.');
                btn.addEventListener('click', handler);
                addCleanup(() => btn.removeEventListener('click', handler));
            }
            break;
        }
    }

    // Register cleanup
    if (typeof window !== 'undefined' && window.__mazeRunner) {
        window.__mazeRunner.fantasySpellCleanup = () => {
            cleanupFns.forEach(fn => {
                try { fn(); } catch (e) { /* ignore */ }
            });
        };
    }
}

function applyFantasyAdversarialCopyShift() {
    if (!isAdversarialFantasyActive() || state.mode !== 'app') {
        restoreFantasyAdversarialCopy();
        return;
    }

    const generator = createInstanceScopedGenerator(state.currentInstance, `illusion-cycle-${state.fantasyIllusionCycle}`);
    state.fantasyIllusionCycle += 1;
    const selectorList = [
        '.page-title',
        '.component-title',
        '.section-eyebrow',
        '.app-header-kicker',
        '.challenge-next-kicker',
        '.challenge-summary-badge strong',
        '.challenge-panel-header h3'
    ];
    const targets = new Set();
    selectorList.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            targets.add(element);
        });
    });

    let changed = 0;
    for (const element of targets.values()) {
        if (changed >= 8) break;
        const original = String(element.textContent || '').trim();
        if (!original || /AI Maze Runner/i.test(original)) continue;
        if (changed >= 2 && generator.rng() < 0.38) continue;
        const shifted = shiftFantasyTerminology(original, generator);
        if (shifted === original) continue;
        element.setAttribute('data-fantasy-original-text', original);
        element.textContent = shifted;
        element.classList.add('fantasy-illusion-text');
        changed += 1;
    }

    const strip = document.getElementById('benchmark-strip') || document.querySelector('.fantasy-banner');
    if (strip) {
        const banner = document.createElement('div');
        banner.id = 'fantasy-illusion-banner';
        banner.className = 'fantasy-illusion-banner';
        banner.style.cssText = 'background-color:#1a0e06 !important;background-image:radial-gradient(circle at 18% 50%,rgba(255,138,76,0.2),transparent 28%),radial-gradient(circle at 50% 0%,rgba(255,120,54,0.18),transparent 38%),linear-gradient(135deg,#1a0e06,#221410,#1a0e06) !important;color:#f5e3c1 !important;border:none !important;border-radius:0 !important;margin:0 !important;';
        banner.textContent = generator.randomFromArray([
            'The veil shifts. Some chambers answer to older names for a few breaths.',
            'Lantern smoke curls through the registry. Labels may drift before settling.',
            'A rune echo ripples across the ledger. Trust the structure more than the title.'
        ]);
        strip.insertAdjacentElement('afterend', banner);
        if (typeof signalFantasyMechanicCue === 'function') {
            signalFantasyMechanicCue('illusion', banner.textContent, { force: true });
        }
    }

    if (state.fantasyIllusionRestoreTimer) clearTimeout(state.fantasyIllusionRestoreTimer);
    state.fantasyIllusionRestoreTimer = setTimeout(() => {
        restoreFantasyAdversarialCopy();
        state.fantasyIllusionRestoreTimer = null;
    }, 6800);
}

function queueFantasyAdversarialRefresh(delay = 260) {
    if (state.fantasyIllusionRefreshTimer) clearTimeout(state.fantasyIllusionRefreshTimer);
    if (!isAdversarialFantasyActive() || state.mode !== 'app') {
        restoreFantasyAdversarialCopy();
        return;
    }
    state.fantasyIllusionRefreshTimer = setTimeout(() => {
        applyFantasyAdversarialCopyShift();
        state.fantasyIllusionRefreshTimer = null;
    }, delay);
}

function startFantasyAdversarialEffects(instance = state.currentInstance) {
    if (!isFantasySpellcastingActive(instance) || state.mode !== 'app') return;
    const instanceId = instance?.id || null;
    const isContinuingSession = Boolean(
        state.fantasySpellSessionStartedAt
        && state.fantasySpellInstanceId
        && state.fantasySpellInstanceId === instanceId
    );

    if (!isContinuingSession) {
        stopFantasyAdversarialEffects();
        state.fantasyIllusionCycle = 0;
        state.fantasySpellSessionStartedAt = Date.now();
        state.fantasySpellInstanceId = instanceId;
        scheduleFantasySpellCast(15000);
        return;
    }

    if (state.fantasyActiveSpell) {
        renderFantasySpell(state.fantasyActiveSpell);
    }
}

function persistInstanceState(instance = state.currentInstance) {
    if (!instance || !state.instanceManager) return;
    state.instanceManager.save();
}

function buildOrganizationContext(instance, generator) {
    const regions = ['North America', 'EMEA', 'APAC', 'LATAM'];
    const businessUnits = {
        crm: ['Revenue Operations', 'Customer Growth', 'Partner Sales'],
        erp: ['Finance & Shared Services', 'Supply Chain Operations', 'Manufacturing Programs', 'Project Delivery'],
        hrms: ['People Operations', 'Workforce Planning', 'Payroll & Benefits', 'Talent Acquisition', 'People Systems & Compliance'],
        healthcare: ['Patient Access', 'Clinical Operations', 'Diagnostic Services', 'Pharmacy Services', 'Revenue Cycle', 'Clinical Informatics'],
        itsm: ['Service Operations', 'Platform Reliability', 'Workplace Technology', 'Identity & Access', 'Configuration & Asset Governance'],
        procurement: ['Guided Buying & Intake', 'Strategic Sourcing', 'Supplier Management', 'Procurement Operations', 'Accounts Payable Operations', 'Procurement Systems & Governance'],
        finance: ['Controllership', 'Treasury & Liquidity', 'Financial Planning & Analysis', 'Shared Services', 'Internal Audit'],
        legal: ['Contract Operations', 'Commercial Legal', 'Procurement Counsel', 'Revenue Contracts', 'Legal Operations & Systems', 'Compliance & Governance']
    };
    const serviceLines = {
        crm: ['Pipeline Governance', 'Account Coverage', 'Forecast Operations'],
        erp: ['Procure to Pay', 'Order to Cash', 'Plan to Produce', 'Project to Profit', 'Close Operations'],
        hrms: ['Core HR & Employee Lifecycle', 'Time & Attendance', 'Payroll & Compensation', 'Benefits & Leave', 'Talent Acquisition & Onboarding', 'Performance & Learning', 'People Analytics & Governance'],
        healthcare: ['Registration & Scheduling', 'Inpatient Care', 'Orders & Diagnostics', 'Medication Management', 'Revenue Cycle', 'Interoperability & Governance'],
        itsm: ['Incident & Major Incident Management', 'Service Request Fulfillment', 'Problem Management', 'Change & Release Management', 'Knowledge & Self-Service', 'CMDB & Asset Governance', 'Service Level & Reporting'],
        procurement: ['Guided Buying & Requisitioning', 'Catalog & Classification', 'RFx & Auctions', 'Contract Lifecycle', 'Supplier Onboarding & Risk', 'Ordering & Receiving', 'Invoice Matching & Payment Visibility', 'Spend Analytics & Administration'],
        finance: ['Record to Report', 'Accounts Payable', 'Accounts Receivable', 'Treasury Operations', 'Asset Accounting', 'Planning & Forecasting', 'Controls & Compliance'],
        legal: ['Contract Intake & Request Management', 'Template & Clause Authoring', 'Workflow Approval & E-Signature', 'Negotiation & Redlining', 'Obligation & Renewal Management', 'Repository & Document Governance', 'Legal Analytics & Risk Reporting', 'Integrations & Security Administration']
    };
    const legalEntities = ['Northwind Group', 'Summit Holdings', 'Cobalt River LLC', 'Meridian Enterprise'];
    return {
        region: generator.randomFromArray(regions),
        businessUnit: generator.randomFromArray(businessUnits[instance.domain] || businessUnits.crm),
        serviceLine: generator.randomFromArray(serviceLines[instance.domain] || serviceLines.crm),
        manager: generator.generateName(),
        executive: generator.generateName(),
        legalEntity: generator.randomFromArray(legalEntities),
        costCenter: `${generator.randomInt(100, 899)}-${generator.randomInt(10, 99)}`,
        workspaceCode: `${String(instance.domain || 'crm').toUpperCase()}-${generator.randomInt(100, 999)}`
    };
}

const PAGE_OPERATING_CONTEXT_OVERRIDES = {
    itsm: [
        { pathPrefix: '/incidents/', businessUnit: 'Service Operations', serviceLine: 'Incident & Major Incident Management' },
        { pathPrefix: '/requests/', businessUnit: 'Workplace Technology', serviceLine: 'Service Request Fulfillment' },
        { pathPrefix: '/problems/', businessUnit: 'Platform Reliability', serviceLine: 'Problem Management' },
        { pathPrefix: '/changes/', businessUnit: 'Platform Reliability', serviceLine: 'Change & Release Management' },
        { pathPrefix: '/knowledge/', businessUnit: 'Service Operations', serviceLine: 'Knowledge & Self-Service' },
        { pathPrefix: '/cmdb/', businessUnit: 'Configuration & Asset Governance', serviceLine: 'CMDB & Asset Governance' },
        { pathPrefix: '/sla/', businessUnit: 'Service Operations', serviceLine: 'Service Level & Reporting' },
        { path: '/analytics/operations', businessUnit: 'Service Operations', serviceLine: 'Incident & Major Incident Management' },
        { path: '/analytics/reports', businessUnit: 'Service Operations', serviceLine: 'Service Level & Reporting' },
        { path: '/analytics/performance', businessUnit: 'Platform Reliability', serviceLine: 'Change & Release Management' },
        { path: '/analytics/improvement', businessUnit: 'Platform Reliability', serviceLine: 'Service Level & Reporting' }
    ]
};

function resolvePageOperatingContext(instance, path, organization) {
    const rules = PAGE_OPERATING_CONTEXT_OVERRIDES[instance && instance.domain] || [];
    const match = rules.find(rule => rule.path === path || (rule.pathPrefix && path.startsWith(rule.pathPrefix)));
    return {
        businessUnit: (match && match.businessUnit) || organization.businessUnit,
        serviceLine: (match && match.serviceLine) || organization.serviceLine
    };
}

function buildPageOperationalState(instance, path, page, generator, organization) {
    const workflowStates = state.fantasyMode
        ? ['Awaiting Seal', 'Under Review', 'Bound to Queue', 'Stable Ward', 'Ready for Transit']
        : ['Pending Review', 'Assigned', 'Queued for Approval', 'In Progress', 'Ready for Close'];
    const healthStates = state.fantasyMode
        ? ['Lantern steady', 'Veil disturbed', 'Rune drift detected', 'Ward stable']
        : ['Healthy', 'Needs Review', 'Stale Inputs', 'Attention Required'];
    const pageContext = resolvePageOperatingContext(instance, path, organization);
    return {
        path,
        businessUnit: pageContext.businessUnit,
        serviceLine: pageContext.serviceLine,
        owner: generator.generateName(),
        queueDepth: generator.randomInt(4, 28),
        pendingItems: generator.randomInt(2, 18),
        reviewedToday: generator.randomInt(1, 12),
        workflowState: generator.randomFromArray(workflowStates),
        healthState: generator.randomFromArray(healthStates),
        lastActor: generator.generateName(),
        lastAction: state.fantasyMode ? 'Ledger provisioned' : 'Environment provisioned',
        lastUpdatedLabel: `${generator.randomInt(1, 9)}h ago`,
        saveCount: 0,
        deletedCount: 0,
        deniedCount: 0,
        fieldOverrides: {},
        recordUpdates: {},
        createdRecords: [],
        deletedRecordIds: [],
        approvalQueue: [],
        approvalHistory: [],
        resolvedApprovalIds: [],
        notes: [
            `${pageContext.businessUnit} routed this workspace to ${pageContext.serviceLine}.`,
            `${organization.manager} is the current owning manager for this area.`,
            `${organization.region} is the active operating region for this page.`
        ],
        aliases: state.fantasyMode
            ? [
                `Ward of ${page.title}`,
                `${page.title} Archive`,
                `${pageContext.serviceLine} Chamber`
            ]
            : [
                `${page.title} Workspace`,
                `${pageContext.serviceLine} Console`,
                `${pageContext.businessUnit} View`
            ]
    };
}

function ensurePageRuntimeCollections(pageState) {
    if (!pageState) return null;
    if (!pageState.fieldOverrides || typeof pageState.fieldOverrides !== 'object') pageState.fieldOverrides = {};
    if (!pageState.recordUpdates || typeof pageState.recordUpdates !== 'object') pageState.recordUpdates = {};
    if (!Array.isArray(pageState.createdRecords)) pageState.createdRecords = [];
    if (!Array.isArray(pageState.deletedRecordIds)) pageState.deletedRecordIds = [];
    if (!Array.isArray(pageState.approvalQueue)) pageState.approvalQueue = [];
    if (!Array.isArray(pageState.approvalHistory)) pageState.approvalHistory = [];
    if (!Array.isArray(pageState.resolvedApprovalIds)) pageState.resolvedApprovalIds = [];
    return pageState;
}

function cloneRuntimeValue(value) {
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(value);
        } catch (error) {
            // Fall back for legacy/non-cloneable values such as generator helpers on blueprint roots.
        }
    }
    return JSON.parse(JSON.stringify(value));
}

function cloneBlueprintForRuntime(blueprint) {
    if (!blueprint) return blueprint;
    const { generator, ...serializableBlueprint } = blueprint;
    const nextBlueprint = cloneRuntimeValue(serializableBlueprint);
    if (generator !== undefined) nextBlueprint.generator = generator;
    return nextBlueprint;
}

function cloneRuntimeRecord(record) {
    return cloneRuntimeValue(record);
}

function mergeRuntimeRecord(record, update = {}) {
    const nextRecord = cloneRuntimeRecord(record);
    const nextValues = {
        ...(nextRecord.values || {}),
        ...((update && update.values) || {})
    };
    return {
        ...nextRecord,
        ...update,
        values: nextValues
    };
}

function ensureInstanceSystemState(instance, blueprint = state.baseBlueprint || state.blueprint) {
    if (!instance) return null;

    if (instance.role == null) instance.role = 'analyst';
    if (instance.benchmarkProfile == null) instance.benchmarkProfile = getDefaultBenchmarkProfile(!!instance.isFantasy);
    if (instance.frictionMode == null) instance.frictionMode = getDefaultFrictionMode(instance.benchmarkProfile, !!instance.isFantasy);

    if (!instance.systemState || instance.systemState.version !== 5) {
        const generator = createInstanceScopedGenerator(instance, 'system-state');
        const organization = buildOrganizationContext(instance, generator);
        const pages = {};
        const sourcePages = blueprint && blueprint.pages ? blueprint.pages : {};
        Object.entries(sourcePages).forEach(([path, page]) => {
            pages[path] = buildPageOperationalState(instance, path, page, generator, organization);
        });

        instance.systemState = {
            version: 5,
            organization,
            globalMetrics: {
                workflowActions: 0,
                recordsTouched: 0,
                recordsDeleted: 0,
                deniedActions: 0,
                reviewCompletion: generator.randomInt(58, 92),
                backlogHealth: generator.randomInt(6, 21),
                coverageTarget: generator.randomInt(72, 96)
            },
            journal: [{
                at: new Date().toISOString(),
                type: 'system',
                title: state.fantasyMode ? 'Realm prepared' : 'Instance prepared',
                detail: `${organization.businessUnit} ${state.fantasyMode ? 'opened the gate for' : 'provisioned the workspace for'} ${getRoleDisplayName(instance.role, !!instance.isFantasy)}.`,
                page: Object.keys(sourcePages)[0] || null
            }],
            pages
        };
    } else if (blueprint && blueprint.pages) {
        Object.entries(blueprint.pages).forEach(([path, page]) => {
            if (!instance.systemState.pages[path]) {
                const generator = createInstanceScopedGenerator(instance, `system-state:${path}`);
                instance.systemState.pages[path] = buildPageOperationalState(instance, path, page, generator, instance.systemState.organization);
            }
            ensurePageRuntimeCollections(instance.systemState.pages[path]);
        });
    }

    return instance.systemState;
}

function getPageRuntimeState(path = state.currentPage) {
    if (!state.currentInstance || !state.currentInstance.systemState || !state.currentInstance.systemState.pages) {
        return null;
    }
    return state.currentInstance.systemState.pages[path] || null;
}

function appendSystemJournal(instance, entry) {
    if (!instance) return;
    const runtime = ensureInstanceSystemState(instance, state.baseBlueprint || state.blueprint);
    runtime.journal = Array.isArray(runtime.journal) ? runtime.journal : [];
    runtime.journal.unshift({
        at: new Date().toISOString(),
        type: entry.type || 'activity',
        title: entry.title || 'Runtime update',
        detail: entry.detail || '',
        page: entry.page || state.currentPage || null
    });
    runtime.journal = runtime.journal.slice(0, 40);
}

function applyInstanceSystemStateToBlueprint(instance, blueprint) {
    const runtime = ensureInstanceSystemState(instance, blueprint);
    if (!runtime || !blueprint || !blueprint.pages) return blueprint;

    const journal = Array.isArray(runtime.journal) ? runtime.journal : [];
    Object.entries(blueprint.pages).forEach(([path, page]) => {
        const pageState = ensurePageRuntimeCollections(runtime.pages[path] || null);
        if (!pageState) return;
        const deletedRecordIds = new Set((pageState.deletedRecordIds || []).map(id => String(id)));
        const recordUpdates = pageState.recordUpdates || {};
        const createdRecords = Array.isArray(pageState.createdRecords)
            ? pageState.createdRecords
                .map(record => mergeRuntimeRecord(record, recordUpdates[record.id] || {}))
                .filter(record => !deletedRecordIds.has(String(record.id)))
            : [];

        if (Array.isArray(page.fields) && pageState.fieldOverrides && typeof pageState.fieldOverrides === 'object') {
            page.fields = page.fields.map(field => (
                Object.prototype.hasOwnProperty.call(pageState.fieldOverrides, field.name)
                    ? { ...field, value: pageState.fieldOverrides[field.name] }
                    : field
            ));
        }

        if (Array.isArray(page.records)) {
            const baseRecords = page.records
                .filter(record => !deletedRecordIds.has(String(record.id)))
                .map(record => mergeRuntimeRecord(record, recordUpdates[record.id] || {}));
            const createdIds = new Set(createdRecords.map(record => String(record.id)));
            page.records = createdRecords.concat(baseRecords.filter(record => !createdIds.has(String(record.id))));
        }

        page.runtimeMeta = {
            ...pageState,
            role: instance.role,
            benchmarkProfile: instance.benchmarkProfile,
            frictionMode: instance.frictionMode,
            organization: runtime.organization
        };

        const operationalCards = [
            {
                title: page.intent === 'workflow' ? 'Workflow State' : 'Queue Owner',
                value: pageState.workflowState,
                detail: `${pageState.owner} | ${pageState.lastUpdatedLabel}`
            },
            {
                title: page.intent === 'board' ? 'Active Queue' : 'Pending Load',
                value: `${pageState.pendingItems}`,
                detail: `${pageState.queueDepth} total in scope`
            },
            {
                title: state.fantasyMode ? 'Ward Health' : 'Workspace Health',
                value: pageState.healthState,
                detail: pageState.lastAction
            }
        ];
        page.infoCards = operationalCards.concat(Array.isArray(page.infoCards) ? page.infoCards : []).slice(0, 5);

        const operationalStats = [
            { label: state.fantasyMode ? 'Archive Coverage' : 'Coverage', value: `${runtime.globalMetrics.reviewCompletion}%` },
            { label: state.fantasyMode ? 'Queue Burden' : 'Backlog', value: String(pageState.queueDepth) },
            { label: state.fantasyMode ? 'Reviewed Today' : 'Processed Today', value: String(pageState.reviewedToday + pageState.saveCount) }
        ];
        page.stats = operationalStats.concat(Array.isArray(page.stats) ? page.stats : []).slice(0, 5);

        const pageJournal = journal
            .filter(item => !item.page || item.page === path)
            .slice(0, 3)
            .map(item => ({
                title: item.title,
                detail: item.detail,
                meta: formatRunTimestamp(item.at)
            }));
        page.activities = pageJournal.concat(Array.isArray(page.activities) ? page.activities : []).slice(0, 6);

        const runtimeFields = [
            { name: state.fantasyMode ? 'Sigil Tier' : 'Access Role', value: getRoleDisplayName(instance.role, !!instance.isFantasy), type: 'text' },
            { name: state.fantasyMode ? 'Realm Profile' : 'Benchmark Profile', value: getBenchmarkProfileLabel(instance.benchmarkProfile, !!instance.isFantasy), type: 'text' },
            { name: 'Business Unit', value: pageState.businessUnit || runtime.organization.businessUnit, type: 'text' },
            { name: 'Service Line', value: pageState.serviceLine || runtime.organization.serviceLine, type: 'text' }
        ];
        page.detailGroups = Array.isArray(page.detailGroups) ? page.detailGroups : [];
        if (page.detailGroups.length) {
            page.detailGroups[0] = {
                ...page.detailGroups[0],
                fields: runtimeFields.concat(page.detailGroups[0].fields || []).slice(0, 8)
            };
        } else {
            page.detailGroups = [{ label: 'Operational Context', note: '', fields: runtimeFields }];
        }

        page.totalRecords = Math.max(
            Array.isArray(page.records) ? page.records.length : 0,
            (Number(page.totalRecords) || 0) + createdRecords.length - deletedRecordIds.size
        );
    });

    return blueprint;
}

function rebuildRuntimeBlueprint(instance = state.currentInstance) {
    if (!instance || !state.baseBlueprint) return;
    state.blueprint = cloneBlueprintForRuntime(state.baseBlueprint);
    applyInstanceSystemStateToBlueprint(instance, state.blueprint);
}

function refreshCurrentContentArea() {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    const isHubMode = state.currentInstance && state.currentInstance.nav_style === 'hubspoke';
    contentArea.innerHTML = isHubMode
        ? `<div class="hub-back-btn" onclick="backToHub()">&larr; Back to Home</div>${renderPageContent()}`
        : renderPageContent();
    syncNavigationState(state.currentPage);
    refreshMissionUi();
    queueFantasyAdversarialRefresh(220);
}

function pushRuntimeNote(pageState, note) {
    if (!pageState || !note) return;
    pageState.notes = Array.isArray(pageState.notes) ? pageState.notes : [];
    pageState.notes.unshift(note);
    pageState.notes = pageState.notes.slice(0, 5);
}

function scoreRelatedRuntimePage(sourcePage, targetPage, sourcePath, targetPath) {
    if (!sourcePage || !targetPage || sourcePath === targetPath) return -1;
    let score = 0;
    if ((sourcePage.sectionTitle || '') === (targetPage.sectionTitle || '')) score += 3;
    if ((sourcePage.intent || '') === (targetPage.intent || '')) score += 2;
    if (/(dashboard|overview|home)/i.test(`${targetPage.title || ''} ${targetPath}`)) score += 3;
    if (/(workflow|queue|board|task|approval)/i.test(`${targetPage.title || ''} ${targetPath} ${targetPage.intent || ''}`)) score += 2;
    if (/(detail|record|profile|case|matter|account|patient|invoice|candidate)/i.test(`${targetPage.title || ''} ${targetPath}`)) score += 1;
    return score;
}

function getRelatedRuntimeEntries(path, page) {
    const runtime = ensureInstanceSystemState(state.currentInstance, state.baseBlueprint || state.blueprint);
    const sourcePages = (state.baseBlueprint && state.baseBlueprint.pages) || (state.blueprint && state.blueprint.pages) || {};
    return Object.entries(runtime.pages || {})
        .filter(([candidatePath]) => candidatePath !== path)
        .map(([candidatePath, pageState]) => ({
            path: candidatePath,
            pageState,
            page: sourcePages[candidatePath] || null,
            score: scoreRelatedRuntimePage(page, sourcePages[candidatePath] || null, path, candidatePath)
        }))
        .filter(entry => entry.score >= 0)
        .sort((a, b) => b.score - a.score);
}

function propagateRuntimeImpact(actionType, payload = {}) {
    if (!state.currentInstance) return;
    const runtime = ensureInstanceSystemState(state.currentInstance, state.baseBlueprint || state.blueprint);
    const path = payload.path || state.currentPage;
    const sourcePages = (state.baseBlueprint && state.baseBlueprint.pages) || (state.blueprint && state.blueprint.pages) || {};
    const sourcePage = sourcePages[path] || null;
    const related = getRelatedRuntimeEntries(path, sourcePage);
    const dashboardEntry = related.find(entry => /(dashboard|overview|home)/i.test(`${entry.path} ${(entry.page && entry.page.title) || ''} ${(entry.page && entry.page.intent) || ''}`));
    const queueEntry = related.find(entry => /(workflow|queue|board|approval|task|work)/i.test(`${entry.path} ${(entry.page && entry.page.title) || ''} ${(entry.page && entry.page.intent) || ''}`));
    const detailEntry = related.find(entry => /(detail|record|profile|account|patient|invoice|candidate|matter|contract|vendor)/i.test(`${entry.path} ${(entry.page && entry.page.title) || ''}`));
    const sourceLabel = sourcePage ? sourcePage.title : path;
    const roleLabel = getRoleDisplayName(state.currentInstance.role, !!state.currentInstance.isFantasy);

    if (actionType === 'save') {
        if (dashboardEntry) {
            dashboardEntry.pageState.reviewedToday += 1;
            dashboardEntry.pageState.pendingItems = Math.max(0, dashboardEntry.pageState.pendingItems - 1);
            dashboardEntry.pageState.lastAction = state.fantasyMode ? 'Realm metrics refreshed' : 'Dashboard metrics refreshed';
            dashboardEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(dashboardEntry.pageState, `${sourceLabel} updated by ${roleLabel} is now reflected in the top-line metrics.`);
        }
        if (queueEntry) {
            queueEntry.pageState.queueDepth = Math.max(1, queueEntry.pageState.queueDepth - 1);
            queueEntry.pageState.pendingItems = Math.max(0, queueEntry.pageState.pendingItems - 1);
            queueEntry.pageState.workflowState = state.fantasyMode ? 'Awaiting downstream seal' : 'Queued for downstream review';
            queueEntry.pageState.lastAction = state.fantasyMode ? 'Downstream chamber alerted' : 'Downstream queue updated';
            pushRuntimeNote(queueEntry.pageState, `${sourceLabel} pushed a downstream update into ${((queueEntry.page && queueEntry.page.title) || queueEntry.path)}.`);
        }
        if (detailEntry) {
            detailEntry.pageState.reviewedToday += 1;
            detailEntry.pageState.lastUpdatedLabel = 'moments ago';
            detailEntry.pageState.healthState = state.fantasyMode ? 'Ward stable' : 'Healthy';
            pushRuntimeNote(detailEntry.pageState, `${roleLabel} committed a change that is now visible from ${sourceLabel}.`);
        }
    }

    if (actionType === 'delete') {
        if (dashboardEntry) {
            dashboardEntry.pageState.pendingItems = Math.max(0, dashboardEntry.pageState.pendingItems - 1);
            dashboardEntry.pageState.queueDepth = Math.max(1, dashboardEntry.pageState.queueDepth - 1);
            dashboardEntry.pageState.lastAction = state.fantasyMode ? 'Stale record purged from the realm' : 'Backlog totals reduced';
            pushRuntimeNote(dashboardEntry.pageState, `${sourceLabel} removed stale work and reduced the visible backlog.`);
        }
        if (queueEntry) {
            queueEntry.pageState.queueDepth = Math.max(1, queueEntry.pageState.queueDepth - 2);
            queueEntry.pageState.pendingItems = Math.max(0, queueEntry.pageState.pendingItems - 1);
            queueEntry.pageState.workflowState = state.fantasyMode ? 'Ashes cleared' : 'Queue pruned';
            pushRuntimeNote(queueEntry.pageState, `${roleLabel} cleared stale work originating from ${sourceLabel}.`);
        }
    }

    if (actionType === 'denied') {
        if (dashboardEntry) {
            dashboardEntry.pageState.healthState = state.fantasyMode ? 'Veil disturbed' : 'Attention Required';
            dashboardEntry.pageState.lastAction = state.fantasyMode ? 'Ward friction surfaced' : 'Permission friction surfaced';
            pushRuntimeNote(dashboardEntry.pageState, `${sourceLabel} triggered a blocked path and raised the friction signal.`);
        }
        if (queueEntry) {
            queueEntry.pageState.pendingItems += 1;
            queueEntry.pageState.workflowState = state.fantasyMode ? 'Awaiting higher sigil' : 'Awaiting elevated approval';
            queueEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(queueEntry.pageState, `${sourceLabel} now requires elevated review before work can continue.`);
        }
        if (detailEntry) {
            detailEntry.pageState.healthState = state.fantasyMode ? 'Rune drift detected' : 'Needs Review';
            pushRuntimeNote(detailEntry.pageState, `${roleLabel} was blocked in ${sourceLabel}; related detail views were marked for review.`);
        }
    }

    if (actionType === 'verification-request' || actionType === 'access-request') {
        if (dashboardEntry) {
            dashboardEntry.pageState.pendingItems += 1;
            dashboardEntry.pageState.lastAction = state.fantasyMode ? 'Review sigil queued' : 'Approval review queued';
            dashboardEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(dashboardEntry.pageState, `${sourceLabel} submitted a follow-up request that is now awaiting review.`);
        }
        if (queueEntry) {
            queueEntry.pageState.pendingItems += 1;
            queueEntry.pageState.workflowState = state.fantasyMode ? 'Awaiting higher seal' : 'Awaiting approval';
            queueEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(queueEntry.pageState, `${sourceLabel} generated a new review item for ${((queueEntry.page && queueEntry.page.title) || queueEntry.path)}.`);
        }
    }

    if (actionType === 'approval-resolved') {
        if (dashboardEntry) {
            dashboardEntry.pageState.reviewedToday += 1;
            dashboardEntry.pageState.pendingItems = Math.max(0, dashboardEntry.pageState.pendingItems - 1);
            dashboardEntry.pageState.lastAction = state.fantasyMode ? 'Seal decision recorded' : 'Approval decision recorded';
            dashboardEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(dashboardEntry.pageState, `${sourceLabel} completed a queued review and updated the shared operational picture.`);
        }
        if (queueEntry) {
            queueEntry.pageState.pendingItems = Math.max(0, queueEntry.pageState.pendingItems - 1);
            queueEntry.pageState.workflowState = state.fantasyMode ? 'Seal resolved' : 'Review complete';
            queueEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(queueEntry.pageState, `${roleLabel} resolved a pending review associated with ${sourceLabel}.`);
        }
        if (detailEntry) {
            detailEntry.pageState.reviewedToday += 1;
            detailEntry.pageState.lastUpdatedLabel = 'moments ago';
            pushRuntimeNote(detailEntry.pageState, `${sourceLabel} now reflects the latest review decision.`);
        }
    }
}

function getPermissionEnvelope(instance = state.currentInstance, path = state.currentPage) {
    const role = getRoleConfig(instance && instance.role);
    const page = state.blueprint && state.blueprint.pages ? state.blueprint.pages[path] : null;
    const sensitivePage = !!(page && (
        /salary|pay|ledger|invoice|bill|audit|contract|case|counsel|compliance|patient|medical|clinical/i.test(page.title || '')
        || /payroll|finance|legal|health|billing|compliance|records/i.test(path || '')
    ));
    const destructivePage = !!(page && /collection|board|workflow/i.test(page.intent || ''));
    const contractorRestricted = !!(instance && instance.role === 'contractor' && sensitivePage);
    const auditorRestricted = !!(instance && instance.role === 'auditor');
    return {
        canSave: !!(role.canSave && !contractorRestricted && !auditorRestricted),
        canDelete: !!(role.canDelete && destructivePage && !contractorRestricted),
        canReviewSensitive: !!(role.canReviewSensitive && !contractorRestricted),
        canApprove: !!role.canApprove,
        canAdminister: !!role.canAdminister,
        readOnly: !!role.readOnly
    };
}

function describePermissionBlock(actionType, instance = state.currentInstance, path = state.currentPage) {
    const roleLabel = getRoleDisplayName(instance && instance.role, !!(instance && instance.isFantasy));
    const page = state.blueprint && state.blueprint.pages ? state.blueprint.pages[path] : null;
    const pageLabel = page ? page.title : 'this workspace';
    const copy = {
        save: state.fantasyMode
            ? `${roleLabel} sigils cannot seal changes in ${pageLabel}.`
            : `${roleLabel} access does not allow saving changes in ${pageLabel}.`,
        delete: state.fantasyMode
            ? `${roleLabel} sigils cannot purge records in ${pageLabel}.`
            : `${roleLabel} access does not allow deleting records in ${pageLabel}.`,
        sensitive: state.fantasyMode
            ? `${roleLabel} rank cannot inspect the deeper archives in ${pageLabel}.`
            : `${roleLabel} access is limited from reviewing sensitive data in ${pageLabel}.`
    };
    return copy[actionType] || (state.fantasyMode ? 'A ward blocks that action.' : 'That action is restricted for the current role.');
}

function mutateInstanceRuntime(actionType, payload = {}) {
    if (!state.currentInstance) return;
    const runtime = ensureInstanceSystemState(state.currentInstance, state.baseBlueprint || state.blueprint);
    const path = payload.path || state.currentPage;
    const pageState = ensurePageRuntimeCollections(runtime.pages[path]);
    if (!pageState) return;

    const roleLabel = getRoleDisplayName(state.currentInstance.role, !!state.currentInstance.isFantasy);
    const page = state.baseBlueprint && state.baseBlueprint.pages ? state.baseBlueprint.pages[path] : (state.blueprint.pages[path] || null);
    const pageLabel = page ? page.title : path;
    const nowIso = new Date().toISOString();
    const addApprovalQueueItem = (item = {}) => {
        const normalized = {
            id: item.id || `${actionType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: item.kind || actionType,
            title: item.title || pageLabel,
            summary: item.summary || `${pageLabel} requires review.`,
            value: item.value || (state.fantasyMode ? 'Awaiting Seal' : 'Pending Review'),
            status: item.status || (state.fantasyMode ? 'Awaiting Seal' : 'Pending Review'),
            createdAt: item.createdAt || nowIso,
            createdBy: item.createdBy || roleLabel,
            page: item.page || path,
            targetRecordId: item.targetRecordId || null
        };
        pageState.approvalQueue = pageState.approvalQueue.filter(existing => String(existing.id) !== String(normalized.id));
        pageState.approvalQueue.unshift(normalized);
        pageState.approvalQueue = pageState.approvalQueue.slice(0, 25);
        return normalized;
    };
    const appendActionJournal = (fallbackType, fallbackTitle, fallbackDetail) => {
        const entry = payload.journalEntry || {};
        appendSystemJournal(state.currentInstance, {
            type: entry.type || fallbackType,
            title: entry.title || fallbackTitle,
            detail: entry.detail || fallbackDetail,
            page: entry.page || path
        });
    };

    if (actionType === 'save') {
        if (payload.fieldValues && typeof payload.fieldValues === 'object') {
            pageState.fieldOverrides = {
                ...pageState.fieldOverrides,
                ...payload.fieldValues
            };
        }
        if (payload.recordId && payload.recordUpdate && typeof payload.recordUpdate === 'object') {
            const existingUpdate = pageState.recordUpdates[payload.recordId] || { values: {} };
            pageState.recordUpdates[payload.recordId] = {
                ...existingUpdate,
                ...payload.recordUpdate,
                values: {
                    ...(existingUpdate.values || {}),
                    ...((payload.recordUpdate && payload.recordUpdate.values) || {})
                }
            };
        }
        if (payload.createdRecord && typeof payload.createdRecord === 'object') {
            const createdRecord = cloneRuntimeRecord(payload.createdRecord);
            pageState.createdRecords = pageState.createdRecords.filter(record => String(record.id) !== String(createdRecord.id));
            pageState.createdRecords.unshift(createdRecord);
            pageState.createdRecords = pageState.createdRecords.slice(0, 40);
            pageState.deletedRecordIds = pageState.deletedRecordIds.filter(id => String(id) !== String(createdRecord.id));
        }
        pageState.saveCount += 1;
        pageState.tablePageIndex = 0;
        pageState.pendingItems = Math.max(0, pageState.pendingItems - 1);
        pageState.reviewedToday += 1;
        pageState.workflowState = state.fantasyMode ? 'Seal applied' : 'Updated';
        pageState.lastAction = state.fantasyMode ? 'Record sealed' : 'Changes saved';
        pageState.lastActor = roleLabel;
        pageState.lastUpdatedLabel = 'moments ago';
        runtime.globalMetrics.workflowActions += 1;
        runtime.globalMetrics.recordsTouched += 1;
        runtime.globalMetrics.reviewCompletion = Math.min(100, runtime.globalMetrics.reviewCompletion + 2);
        appendActionJournal(
            'save',
            state.fantasyMode ? 'Ledger sealed' : 'Workflow updated',
            `${roleLabel} saved changes in ${pageLabel}.`
        );
    }

    if (actionType === 'delete') {
        if (payload.recordId) {
            pageState.createdRecords = pageState.createdRecords.filter(record => String(record.id) !== String(payload.recordId));
            if (!pageState.deletedRecordIds.some(id => String(id) === String(payload.recordId))) {
                pageState.deletedRecordIds.push(payload.recordId);
            }
            delete pageState.recordUpdates[payload.recordId];
        }
        pageState.deletedCount += 1;
        pageState.tablePageIndex = 0;
        pageState.pendingItems = Math.max(0, pageState.pendingItems - 1);
        pageState.queueDepth = Math.max(1, pageState.queueDepth - 1);
        pageState.lastAction = state.fantasyMode ? 'Record purged' : 'Record removed';
        pageState.lastActor = roleLabel;
        pageState.lastUpdatedLabel = 'moments ago';
        runtime.globalMetrics.recordsDeleted += 1;
        runtime.globalMetrics.workflowActions += 1;
        runtime.globalMetrics.backlogHealth = Math.max(0, runtime.globalMetrics.backlogHealth - 1);
        appendActionJournal(
            'delete',
            state.fantasyMode ? 'Stale parchment purged' : 'Backlog item deleted',
            `${roleLabel} removed a record from ${pageLabel}.`
        );
    }

    if (actionType === 'verification-request' || actionType === 'access-request') {
        addApprovalQueueItem(payload.item || {});
        pageState.pendingItems += 1;
        pageState.lastAction = actionType === 'verification-request'
            ? (state.fantasyMode ? 'Verification sigil queued' : 'Verification request queued')
            : (state.fantasyMode ? 'Higher sigil requested' : 'Access request queued');
        pageState.lastActor = roleLabel;
        pageState.lastUpdatedLabel = 'moments ago';
        runtime.globalMetrics.workflowActions += 1;
        appendActionJournal(
            actionType === 'verification-request' ? 'verification' : 'access',
            actionType === 'verification-request'
                ? (state.fantasyMode ? 'Verification sigil submitted' : 'Verification request submitted')
                : (state.fantasyMode ? 'Higher sigil requested' : 'Access request submitted'),
            actionType === 'verification-request'
                ? `${roleLabel} submitted a verification follow-up in ${pageLabel}.`
                : `${roleLabel} submitted an access escalation request in ${pageLabel}.`
        );
    }

    if (actionType === 'approval-resolved') {
        const approvalId = payload.approvalId ? String(payload.approvalId) : '';
        let resolvedItem = approvalId
            ? pageState.approvalQueue.find(item => String(item.id) === approvalId)
            : null;
        pageState.approvalQueue = pageState.approvalQueue.filter(item => String(item.id) !== approvalId);
        if (payload.isFallbackReview && approvalId && !pageState.resolvedApprovalIds.some(id => String(id) === approvalId)) {
            pageState.resolvedApprovalIds.unshift(approvalId);
            pageState.resolvedApprovalIds = pageState.resolvedApprovalIds.slice(0, 40);
        }
        resolvedItem = {
            ...(resolvedItem || payload.item || {}),
            id: approvalId || ((resolvedItem || payload.item || {}).id) || `resolved-${Date.now()}`,
            resolution: payload.resolution || 'approved',
            resolvedAt: nowIso,
            resolvedBy: roleLabel,
            status: (payload.resolution || 'approved') === 'approved'
                ? (state.fantasyMode ? 'Seal Granted' : 'Approved')
                : (state.fantasyMode ? 'Seal Denied' : 'Rejected')
        };
        pageState.approvalHistory.unshift(resolvedItem);
        pageState.approvalHistory = pageState.approvalHistory.slice(0, 30);
        pageState.pendingItems = Math.max(0, pageState.pendingItems - 1);
        pageState.reviewedToday += 1;
        pageState.workflowState = (payload.resolution || 'approved') === 'approved'
            ? (state.fantasyMode ? 'Seal granted' : 'Approved')
            : (state.fantasyMode ? 'Seal denied' : 'Rejected');
        pageState.lastAction = state.fantasyMode ? 'Seal decision recorded' : 'Approval decision recorded';
        pageState.lastActor = roleLabel;
        pageState.lastUpdatedLabel = 'moments ago';
        runtime.globalMetrics.workflowActions += 1;
        appendActionJournal(
            'review',
            (payload.resolution || 'approved') === 'approved'
                ? (state.fantasyMode ? 'Queued seal granted' : 'Queued review approved')
                : (state.fantasyMode ? 'Queued seal denied' : 'Queued review rejected'),
            `${roleLabel} ${(payload.resolution || 'approved') === 'approved' ? 'approved' : 'rejected'} a pending review in ${pageLabel}.`
        );
    }

    if (actionType === 'denied') {
        pageState.deniedCount += 1;
        pageState.lastAction = state.fantasyMode ? 'Ward triggered' : 'Restricted action attempted';
        pageState.lastActor = roleLabel;
        runtime.globalMetrics.deniedActions += 1;
        appendActionJournal(
            'denied',
            state.fantasyMode ? 'Ward triggered' : 'Permission block encountered',
            `${roleLabel} encountered a blocked action in ${pageLabel}.`
        );
    }

    propagateRuntimeImpact(actionType, payload);
}