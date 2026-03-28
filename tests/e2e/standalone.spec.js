const { test, expect } = require('@playwright/test');

async function createInstance(page, config = {}) {
  if (config.domain) {
    await page.locator('#domain').selectOption(config.domain);
  }
  if (config.complexity) {
    await page.locator('#complexity').selectOption(config.complexity);
  }
  if (config.nav_style) {
    await page.locator('#nav_style').selectOption(config.nav_style);
  }
  if (config.benchmarkPreset) {
    await page.locator('#benchmark_preset').selectOption(config.benchmarkPreset);
  }
  if (config.role) {
    await page.locator('#role').selectOption(config.role);
  }
  if (config.difficulty) {
    await page.locator('#difficulty').selectOption(config.difficulty);
  }
  if (config.theme) {
    await page.locator('#theme').selectOption(config.theme);
  }
  if (config.benchmarkProfile) {
    await page.locator('#benchmark_profile').selectOption(config.benchmarkProfile);
  }
  if (config.frictionMode) {
    await page.locator('#friction_mode').selectOption(config.frictionMode);
  }
  if (typeof config.include_search === 'boolean') {
    const checkbox = page.locator('#include_search');
    if ((await checkbox.isChecked()) !== config.include_search) {
      await checkbox.click();
    }
  }
  if (typeof config.anti_patterns === 'boolean') {
    const checkbox = page.locator('#anti_patterns');
    if ((await checkbox.isChecked()) !== config.anti_patterns) {
      await checkbox.click();
    }
  }
  await page.getByRole('button', { name: 'Create Instance' }).click();
  await expect(page.locator('.instance-card')).toHaveCount(1);
}

async function enableFantasyMode(page) {
  const easterEggToggle = page.locator('.title-separator');
  for (let i = 0; i < 5; i += 1) {
    await easterEggToggle.click({ force: true });
  }
  await expect(page.locator('.fantasy-banner')).toBeVisible();
}

async function readInstanceCredentials(page) {
  const values = await page.locator('.instance-card .instance-credentials strong').allTextContents();
  return {
    username: values[0],
    password: values[1]
  };
}

async function readFirstInstanceId(page) {
  return page.evaluate(() => {
    const instances = JSON.parse(window.localStorage.getItem('mazeRunner_instances') || '[]');
    return instances[0] ? instances[0].id : null;
  });
}

async function openInstancePopup(page, actionButtonSelector = '.btn-enter') {
  const popupPromise = page.waitForEvent('popup');
  await page.locator(`.instance-card ${actionButtonSelector}`).click();
  return popupPromise;
}

async function signIntoInstance(appPage, credentials) {
  await expect(appPage.locator('.instance-login-page')).toBeVisible();
  await appPage.locator('#loginUsername').fill(credentials.username);
  await appPage.locator('#loginPassword').fill(credentials.password);
  await appPage.getByRole('button', { name: 'Sign In' }).click();
  await expect(appPage.locator('.app-container')).toBeVisible();
}

test.describe('MazeRunner standalone', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the dashboard and can create an instance', async ({ page }) => {
    await expect(page.locator('.dashboard-container')).toBeVisible();
    await expect(page.locator('.dashboard-header-badge')).toHaveText('AI Maze Runner');
    await expect(page.getByRole('heading', { name: 'Create New Instance' })).toBeVisible();
    await expect(page.locator('.responsive-mode-toggle')).toHaveCount(0);

    await createInstance(page);

    await expect(page.locator('.instance-card .instance-card-domain-badge')).toContainText(/crm/i);
    await expect(page.locator('.instance-card .instance-credentials')).not.toContainText('N/A');
    await expect(page.locator('.instance-card .btn-enter')).toBeVisible();
  });

  test('can open an instance, sign in, and reach the app shell', async ({ page }) => {
    await createInstance(page);
    const credentials = await readInstanceCredentials(page);
    const instanceId = await readFirstInstanceId(page);

    expect(instanceId).toBeTruthy();

    const appPage = await page.context().newPage();
    await appPage.goto(`/#instance=${instanceId}`);
    await expect(appPage.locator('.instance-login-page')).toBeVisible();
    await expect(appPage.locator('#loginAppName')).not.toHaveText('Application');

    await appPage.locator('#loginUsername').fill(credentials.username);
    await appPage.locator('#loginPassword').fill(credentials.password);
    await appPage.getByRole('button', { name: 'Sign In' }).click();

    await expect(appPage.locator('.app-container')).toBeVisible();
    await expect(appPage.locator('.app-header h1')).not.toHaveText('Application');
    await expect(appPage.locator('#content-area')).toBeVisible();
  });

  test('challenge launch opens the quest board after sign-in and skipping advances the run', async ({ page }) => {
    await createInstance(page, { domain: 'crm', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-challenge');
    await signIntoInstance(appPage, credentials);

    await expect(appPage.locator('#challenge-panel')).toHaveClass(/visible/);
    const completedBefore = await appPage.evaluate(() => state.activeMission.steps.filter(step => step.completedAt).length);

    const skipButton = appPage.getByRole('button', { name: /Skip/i }).first();
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    const completedAfter = await appPage.evaluate(() => state.activeMission.steps.filter(step => step.completedAt).length);
    expect(completedAfter).toBeGreaterThan(completedBefore);
  });

  test('quest board assists guide the user without directly completing in-page action steps', async ({ page }) => {
    await createInstance(page, { domain: 'crm', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-challenge');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const pageModel = state.blueprint.pages[state.currentPage];
      state.activeMission = {
        id: 'test-inspect',
        title: 'Guidance Check',
        summary: 'Verify the board only guides the operator.',
        archetypeLabel: 'Guidance Check',
        difficulty: 'moderate',
        parTimeMs: 90000,
        targetCount: 1,
        profile: { tierLabel: 'Moderate', profileLabel: 'Realistic' },
        modifiers: [],
        bonusesAwarded: [],
        steps: [
          {
            id: 'inspect-1',
            type: 'inspect',
            path: state.currentPage,
            pageTitle: pageModel.title,
            fieldName: pageModel.fields[0].name,
            label: `Inspect ${pageModel.fields[0].name}`,
            description: 'Open the field details from the page itself.',
            hint: 'Use a field details control on the page.',
            points: 50,
            assistLabel: 'Locate Field'
          }
        ]
      };
      refreshMissionUi();
    });

    await expect(appPage.getByRole('button', { name: 'Locate Field' }).first()).toBeVisible();
    await appPage.getByRole('button', { name: 'Locate Field' }).first().click();
    const inspectCompleted = await appPage.evaluate(() => !!state.activeMission.steps[0].completedAt);
    expect(inspectCompleted).toBe(false);

    await appPage.evaluate(() => {
      const pageModel = state.blueprint.pages[state.currentPage];
      state.activeMission = {
        id: 'test-save',
        title: 'Action Guardrail',
        summary: 'The board should not execute save flows.',
        archetypeLabel: 'Action Guardrail',
        difficulty: 'moderate',
        parTimeMs: 90000,
        targetCount: 1,
        profile: { tierLabel: 'Moderate', profileLabel: 'Realistic' },
        modifiers: [],
        bonusesAwarded: [],
        steps: [
          {
            id: 'save-1',
            type: 'save',
            path: state.currentPage,
            pageTitle: pageModel.title,
            label: `Save changes on ${pageModel.title}`,
            description: 'Use a real save action on the page.',
            hint: 'Use Save Changes or a row editor save on the page itself.',
            points: 75,
            assistLabel: 'Open Save Flow'
          }
        ]
      };
      refreshMissionUi();
    });

    await expect(appPage.getByRole('button', { name: 'Open Save Flow' })).toHaveCount(0);
  });

  test('fantasy capture challenges only target values surfaced by visible page sections', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'itsm', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-challenge');
    await signIntoInstance(appPage, credentials);

    const issues = await appPage.evaluate(() => {
      const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
      const add = (set, fieldName, value, contextLabel = '') => {
        const normalizedField = normalize(fieldName);
        const normalizedValue = normalize(value);
        if (!normalizedField || !normalizedValue) return;
        set.add(`${normalizedField}::${normalizedValue}::${normalize(contextLabel)}`);
      };

      const collectVisibleTargets = (pageModel) => {
        const visible = new Set();
        const sections = Array.isArray(pageModel.layoutSections) ? pageModel.layoutSections : [];

        if (sections.includes('kpiDashboard') && Array.isArray(pageModel.kpis)) {
          pageModel.kpis.slice(0, 4).forEach((card) => add(visible, card.label, card.value, card.label));
        }

        if (sections.includes('statsSummary') && Array.isArray(pageModel.stats)) {
          pageModel.stats.slice(0, 5).forEach((stat) => add(visible, stat.label, stat.value, stat.label));
        }

        if (sections.includes('infoCardsGrid') && Array.isArray(pageModel.infoCards)) {
          pageModel.infoCards.slice(0, 4).forEach((card) => add(visible, card.title, card.value, card.title));
        }

        if (sections.includes('accordionDetails') && Array.isArray(pageModel.detailGroups) && pageModel.detailGroups.length) {
          pageModel.detailGroups.slice(0, 1).forEach((group) => {
            (group.fields || []).slice(0, 4).forEach((field) => add(visible, field.name, field.value, group.label));
          });
        }

        if (sections.includes('dataTable') && Array.isArray(pageModel.records) && pageModel.records.length) {
          const visibleFields = Array.isArray(pageModel.fields) ? pageModel.fields.slice(0, 4) : [];
          const pageSize = Math.max(1, Number(pageModel.defaultVisibleRows) || Math.min(8, pageModel.records.length || 1));
          const pageIndex = Math.max(0, Number(pageModel.runtimeMeta && pageModel.runtimeMeta.tablePageIndex) || 0);
          const startIndex = pageIndex * pageSize;
          const visibleRows = pageModel.records.slice(startIndex, startIndex + pageSize).slice(0, 2);
          const anchorField = visibleFields[0];
          visibleRows.forEach((record) => {
            const contextLabel = anchorField ? (record.values[anchorField.name] || anchorField.value) : pageModel.title;
            visibleFields.forEach((field) => add(visible, field.name, record.values[field.name] || field.value, contextLabel || 'top row'));
          });
        }

        if (sections.includes('splitView') && Array.isArray(pageModel.splitItems) && pageModel.splitItems.length) {
          const activeItem = pageModel.splitItems[0];
          add(visible, activeItem.label || 'Selected Item', activeItem.detail || activeItem.subtitle || activeItem.value, activeItem.kicker || activeItem.status || activeItem.label || '');
          (activeItem.facts || []).slice(0, 4).forEach((fact) => add(visible, fact.label, fact.value, activeItem.label || ''));
          (activeItem.sections || []).slice(0, 2).forEach((section) => {
            (section.fields || []).slice(0, 3).forEach((field) => add(visible, field.name, field.value, activeItem.label || section.label || ''));
          });
        }

        if (sections.includes('tabPanel')) {
          const tabs = Array.isArray(pageModel.tabs) && pageModel.tabs.length
            ? pageModel.tabs
            : [{
              label: 'Overview',
              kind: 'summary',
              heading: pageModel.title,
              intro: pageModel.description || '',
              cards: Array.isArray(pageModel.fields) ? pageModel.fields.slice(0, 3).map((field) => ({ label: field.name, value: field.value })) : []
            }];
          const activeTab = tabs[0];
          if (activeTab) {
            if (activeTab.kind === 'summary') {
              (activeTab.cards || []).slice(0, 4).forEach((card) => add(visible, card.label, card.value, activeTab.label || 'Overview'));
            } else if (activeTab.kind === 'fields') {
              (activeTab.groups || []).slice(0, 2).forEach((group) => {
                (group.fields || []).slice(0, 4).forEach((field) => add(visible, field.name, field.value, group.label || activeTab.label || 'Fields'));
              });
            } else if (activeTab.kind === 'timeline') {
              (activeTab.items || []).slice(0, 3).forEach((item) => add(visible, item.title, item.meta || item.detail, activeTab.label || 'Timeline'));
            } else if (activeTab.kind === 'records') {
              (activeTab.items || []).slice(0, 3).forEach((item) => add(visible, item.meta || activeTab.label || 'Related Item', item.title, activeTab.label || 'Related Records'));
            }
          }
        }

        if (sections.includes('activityTimeline') && Array.isArray(pageModel.activities)) {
          pageModel.activities.slice(0, 3).forEach((activity) => add(visible, state.fantasyMode ? 'Chronicle Entry' : 'Activity Entry', activity.label, activity.time || ''));
        }

        if (sections.includes('kanbanBoard') && pageModel.kanban && Array.isArray(pageModel.kanban.columns)) {
          pageModel.kanban.columns.slice(0, 2).forEach((column) => {
            (column.cards || []).slice(0, 2).forEach((card) => add(visible, column.title || 'Board Column', card.title, card.assignee || column.title || ''));
          });
        }

        if (sections.includes('carousel') && Array.isArray(pageModel.featuredSlides) && pageModel.featuredSlides.length) {
          const firstSlide = pageModel.featuredSlides[0];
          add(visible, firstSlide.title || 'Featured Slide', firstSlide.body || firstSlide.meta || firstSlide.subtitle, firstSlide.subtitle || '');
        }

        if (sections.includes('inlineEditableList') && Array.isArray(pageModel.inlineItems)) {
          pageModel.inlineItems.slice(0, 5).forEach((item) => add(visible, item.label, item.value, item.label));
        }

        if (sections.includes('treeView') && Array.isArray(pageModel.treeNodes)) {
          pageModel.treeNodes.slice(0, 3).forEach((node) => add(visible, state.fantasyMode ? 'Realm Node' : 'Tree Node', node.label, node.meta || ''));
        }

        if (!visible.size && (sections.includes('editableForm') || sections.includes('wizard')) && Array.isArray(pageModel.fields)) {
          pageModel.fields.slice(0, 6).forEach((field) => add(visible, field.name, field.value));
        }

        if (!visible.size) {
          add(visible, state.fantasyMode ? 'Chamber Title' : 'Page Title', pageModel.title, '');
        }

        return visible;
      };

      const mismatches = [];
      Object.entries(state.blueprint.pages).forEach(([path, pageModel]) => {
        const visible = collectVisibleTargets(pageModel);
        collectMissionCaptureTargets(pageModel).forEach((target) => {
          const key = `${normalize(target.fieldName)}::${normalize(target.value)}::${normalize(target.contextLabel || '')}`;
          if (!visible.has(key)) {
            mismatches.push({
              path,
              pageTitle: pageModel.title,
              source: target.source,
              fieldName: target.fieldName,
              value: target.value,
              contextLabel: target.contextLabel || ''
            });
          }
        });
      });
      return mismatches.slice(0, 10);
    });

    expect(issues).toEqual([]);
  });

  test('tooltips stay visible and non-empty on the dashboard and in page forms', async ({ page }) => {
    const domainHelpBubble = page.locator('label[for="domain"] .help-bubble');
    await expect(domainHelpBubble).toBeVisible();
    await domainHelpBubble.hover();
    const dashboardTip = page.locator('label[for="domain"] .help-tip');
    await expect(dashboardTip).toBeVisible();
    await expect(dashboardTip).not.toHaveText(/^\s*$/);

    await createInstance(page, { domain: 'crm', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);
    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    const editablePath = await appPage.evaluate(() => {
      const entry = Object.entries(state.blueprint.pages).find(([, pageModel]) =>
        Array.isArray(pageModel.layoutSections) && pageModel.layoutSections.includes('editableForm')
      );
      return entry ? entry[0] : state.currentPage;
    });
    await appPage.evaluate((path) => navigateToPage(path), editablePath);

    const infoIcon = appPage.locator('#content-area .info-icon').first();
    await expect(infoIcon).toBeVisible();
    await infoIcon.hover();
    const formTooltip = appPage.locator('#content-area .info-icon .tooltip').first();
    await expect(formTooltip).toBeVisible();
    await expect(formTooltip).not.toHaveText(/^\s*$/);
  });

  test('leaderboard initials persist to the dashboard after editing a recorded run', async ({ page }) => {
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });

    await page.evaluate(() => {
      const instances = state.instanceManager.getInstances();
      const instanceId = instances[0].id;
      state.instanceManager.recordRunResult(instanceId, {
        status: 'completed',
        missionTitle: 'Closing Trial',
        archetypeLabel: 'Closing Trial',
        netScore: 321,
        rawScore: 360,
        penaltyPoints: 39,
        bonusScore: 0,
        elapsedMs: 91234,
        completedSteps: 5,
        totalSteps: 5,
        uniquePages: 3,
        rank: 'A'
      });
      renderDashboard();
    });

    await page.getByRole('button', { name: /Add Initials/i }).first().click();
    await page.locator('#scoreInitialsInput').fill('qz9');
    await page.getByRole('button', { name: 'Save Initials' }).click();

    await expect(page.locator('.results-title').first()).toContainText('QZ');
    const storedInitials = await page.evaluate(() => {
      const instances = JSON.parse(window.localStorage.getItem('mazeRunner_instances') || '[]');
      return instances[0].runHistory[0].initials;
    });
    expect(storedInitials).toBe('QZ');
  });

  test('hrms left-top navigation can switch into talent acquisition pages', async ({ page }) => {
    await createInstance(page, { domain: 'hrms', nav_style: 'lefttop' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.locator('.lefttop-sidebar-item', { hasText: 'Talent Acquisition & Onboarding' }).click();
    await appPage.locator('[id^="lefttop-tabs-"] .lefttop-tab', { hasText: 'Candidate Pipeline' }).click();

    await expect(appPage.locator('.page-title')).toHaveText(/Candidate Pipeline/i);
  });

  test('itsm sibling pages keep distinct content models and page-level operating context', async ({ page }) => {
    await createInstance(page, { domain: 'itsm', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    const pageModels = await appPage.evaluate(() => {
      const queue = state.blueprint.pages['/incidents/queue'];
      const serviceDesk = state.blueprint.pages['/incidents/service-desk'];
      const major = state.blueprint.pages['/incidents/major'];
      const approvals = state.blueprint.pages['/requests/approvals'];
      return {
        queue: {
          fields: queue.fields.slice(0, 6).map(field => field.name),
          titleMatchesIssue: queue.records[0].title === queue.records[0].values['Issue Summary'],
          serviceLine: queue.runtimeMeta.serviceLine
        },
        serviceDesk: {
          fields: serviceDesk.fields.slice(0, 6).map(field => field.name),
          businessUnit: serviceDesk.runtimeMeta.businessUnit
        },
        major: {
          fields: major.fields.slice(0, 6).map(field => field.name),
          subtitle: major.records[0].subtitle,
          serviceLine: major.runtimeMeta.serviceLine
        },
        approvals: {
          fields: approvals.fields.slice(0, 6).map(field => field.name),
          serviceLine: approvals.runtimeMeta.serviceLine
        }
      };
    });

    expect(pageModels.queue.titleMatchesIssue).toBe(true);
    expect(pageModels.queue.fields).toContain('Issue Summary');
    expect(pageModels.serviceDesk.fields).toContain('Service Desk Queue');
    expect(pageModels.serviceDesk.fields).toContain('Contact Channel');
    expect(pageModels.major.fields).toContain('Bridge Status');
    expect(pageModels.major.fields).toContain('Incident Commander');
    expect(pageModels.major.subtitle).toMatch(/Bridge Status|Incident Commander|Impact Level/);
    expect(pageModels.approvals.fields).toContain('Approval Queue');
    expect(pageModels.approvals.fields).toContain('Approval Route');
    expect(pageModels.queue.fields).not.toEqual(pageModels.serviceDesk.fields);
    expect(pageModels.queue.serviceLine).toBe('Incident & Major Incident Management');
    expect(pageModels.major.serviceLine).toBe('Incident & Major Incident Management');
    expect(pageModels.approvals.serviceLine).toBe('Service Request Fulfillment');
    expect(pageModels.serviceDesk.businessUnit).toBe('Service Operations');
  });

  test('ribbon section tabs navigate the main content instead of only swapping preview cards', async ({ page }) => {
    await createInstance(page, { domain: 'itsm', nav_style: 'ribbon' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await expect(appPage.locator('.page-title')).toHaveText(/Incident Queue/i);

    await appPage.locator('.ribbon-tab', { hasText: 'Request & Catalog' }).click();
    await expect(appPage.locator('.page-title')).toHaveText(/Service Catalog/i);
    await expect.poll(async () => appPage.evaluate(() => state.currentPage)).toBe('/requests/catalog');

    await appPage.locator('.ribbon-tab', { hasText: 'Problem Management' }).click();
    await expect(appPage.locator('.page-title')).toHaveText(/Problem Register/i);
    await expect.poll(async () => appPage.evaluate(() => state.currentPage)).toBe('/problems/register');
  });

  test('sampled domain blueprints stay varied and avoid weak primary titles', async ({ page }) => {
    const diagnostics = await page.evaluate(() => {
      const domains = ['crm', 'erp', 'hrms', 'healthcare', 'itsm', 'procurement', 'finance', 'legal'];
      const seeds = [1101, 2217, 3349];
      const duplicateSections = [];
      const weakTitles = [];
      const idFirstTitles = [];

      const looksWeak = (title) => /record data|entry #|item \d+|value \d+|updated|pending review|review required/i.test(String(title || ''));
      const semanticFieldPattern = /(name|title|summary|scenario|item description|contract title|patient name|employee name|contact name|opportunity name|catalog item|service offering|project name|procedure|bank account|cash pool|partner account|gl account)/i;
      const idFieldPattern = /\b(id|number)\b|ticket|invoice|journal|asset tag/i;

      domains.forEach(domain => {
        seeds.forEach(seed => {
          state.fantasyMode = false;
          const blueprint = new BlueprintGenerator(domain, 'moderate', seed).generateBlueprint();

          blueprint.navigation.sections.forEach(section => {
            const signatures = {};
            section.pages.forEach(navPage => {
              const pageModel = blueprint.pages[navPage.path];
              const signature = pageModel.fields.slice(0, 6).map(field => field.name).join(' | ');
              signatures[signature] = signatures[signature] || [];
              signatures[signature].push(navPage.path);
            });
            Object.values(signatures).forEach(paths => {
              if (paths.length > 1) {
                duplicateSections.push({ domain, seed, section: section.title, paths });
              }
            });
          });

          Object.values(blueprint.pages).forEach(pageModel => {
            const primaryRecord = pageModel.records && pageModel.records[0];
            if (!primaryRecord) return;

            if (looksWeak(primaryRecord.title)) {
              weakTitles.push({ domain, seed, path: pageModel.path, title: primaryRecord.title });
            }

            const semanticFields = pageModel.fields.filter(field => semanticFieldPattern.test(field.name) && !/resolution summary|internal summary/i.test(field.name));
            const idFields = pageModel.fields.filter(field => idFieldPattern.test(field.name));
            const titleMatchesIdField = idFields.some(field => primaryRecord.title === primaryRecord.values[field.name]);
            const titleMatchesSemanticField = semanticFields.some(field => primaryRecord.title === primaryRecord.values[field.name]);

            if (semanticFields.length && titleMatchesIdField && !titleMatchesSemanticField) {
              idFirstTitles.push({
                domain,
                seed,
                path: pageModel.path,
                title: primaryRecord.title,
                semanticFields: semanticFields.map(field => field.name),
                idFields: idFields.map(field => field.name)
              });
            }
          });
        });
      });

      return { duplicateSections, weakTitles, idFirstTitles };
    });

    expect(diagnostics.duplicateSections).toEqual([]);
    expect(diagnostics.weakTitles).toEqual([]);
    expect(diagnostics.idFirstTitles).toEqual([]);
  });

  test('standard instances keep their non-fantasy environment even if the dashboard toggle changes later', async ({ page }) => {
    await createInstance(page, { domain: 'crm' });
    const credentials = await readInstanceCredentials(page);
    const instanceId = await readFirstInstanceId(page);

    await enableFantasyMode(page);

    const appPage = await page.context().newPage();
    await appPage.goto(`/#instance=${instanceId}`);
    await signIntoInstance(appPage, credentials);

    const appState = await appPage.evaluate(() => ({
      fantasyMode: state.fantasyMode,
      instanceIsFantasy: state.currentInstance && state.currentInstance.isFantasy,
      bodyFantasy: document.body.classList.contains('fantasy-active'),
      kicker: document.querySelector('.app-header-kicker') && document.querySelector('.app-header-kicker').textContent
    }));

    expect(appState.instanceIsFantasy).toBe(false);
    expect(appState.fantasyMode).toBe(false);
    expect(appState.bodyFantasy).toBe(false);
    expect(appState.kicker).toMatch(/CRM/i);
  });

  test('density toggle works on the initial app render without needing a page navigation first', async ({ page }) => {
    await createInstance(page, { domain: 'finance' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.locator('#density-toggle').click();

    await expect
      .poll(async () => appPage.evaluate(() => document.querySelector('.app-container').classList.contains('density-compact')))
      .toBe(true);
  });

  test('button delay anti-pattern still allows opening and closing the challenge panel', async ({ page }) => {
    await createInstance(page, {
      domain: 'crm',
      difficulty: 'hard',
      anti_patterns: true
    });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      Object.keys(state.blueprint.pages).slice(1, 4).forEach(path => navigateToPage(path));
    });

    await appPage.locator('#challengeLaunchBtn').click();
    await expect(appPage.locator('#challenge-panel')).toHaveClass(/visible/);

    await appPage.locator('#challenge-panel button').filter({ hasText: /^Close$/ }).click();
    await expect(appPage.locator('#challenge-panel')).not.toHaveClass(/visible/);
  });

  test('access denied popup choices branch into acknowledgement or a real queued access request', async ({ page }) => {
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar', role: 'analyst' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      showAccessDeniedPopup('Deletion rights are restricted for this role.', 'delete');
    });

    await expect(appPage.locator('.modal-overlay.visible')).toContainText(/Deletion rights are restricted/i);
    await appPage.getByRole('button', { name: /Acknowledge|Stand Down/i }).click();
    await expect(appPage.locator('.modal-overlay.visible')).toHaveCount(0);
    await expect(appPage.locator('#pending-approval-overlay')).toHaveCount(0);

    await appPage.evaluate(() => {
      showAccessDeniedPopup('Deletion rights are restricted for this role.', 'delete');
    });

    await appPage.getByRole('button', { name: /Request Access|Request Sigil/i }).click();
    await expect(appPage.locator('.modal-overlay.visible')).toHaveCount(0);
    await expect(appPage.locator('#pending-approval-overlay')).toBeVisible();
    await expect(appPage.locator('#pending-approval-overlay')).toContainText(/delete exception|deletion exception|access request/i);
  });

  test('keeps fantasy mode locked to the dark dungeon theme during randomize and instance creation', async ({ page }) => {
    const easterEggToggle = page.locator('.title-separator');
    for (let i = 0; i < 5; i += 1) {
      await easterEggToggle.click({ force: true });
    }

    await expect(page.locator('.fantasy-banner')).toBeVisible();
    await expect(page.locator('#theme')).toHaveValue('fantasy');
    await expect(page.locator('#theme')).toBeDisabled();

    await page.getByRole('button', { name: 'Randomize' }).click();
    await expect(page.locator('#theme')).toHaveValue('fantasy');

    await createInstance(page);
    await expect(page.locator('.instance-card .instance-glance-pill').nth(2)).toContainText(/fantasy/i);

    const storedTheme = await page.evaluate(() => {
      const instances = JSON.parse(window.localStorage.getItem('mazeRunner_instances') || '[]');
      return instances[0] ? instances[0].theme : null;
    });

    expect(storedTheme).toBe('fantasy');
  });

  test('fantasy dashboard header fits inside a mobile viewport without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enableFantasyMode(page);

    const layout = await page.evaluate(() => {
      const readRect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width
        };
      };

      return {
        viewportWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        headerInner: readRect('.dashboard-header-inner'),
        title: readRect('.dashboard-title'),
        fantasyBanner: readRect('.fantasy-banner')
      };
    });

    expect(layout.docScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.headerInner.left).toBeGreaterThanOrEqual(-1);
    expect(layout.headerInner.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.title.left).toBeGreaterThanOrEqual(-1);
    expect(layout.title.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.fantasyBanner.left).toBeGreaterThanOrEqual(-1);
    expect(layout.fantasyBanner.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });

  test('fantasy instances keep a clipped banner backdrop while scrolling', async ({ page }) => {
    const easterEggToggle = page.locator('.title-separator');
    for (let i = 0; i < 5; i += 1) {
      await easterEggToggle.click({ force: true });
    }

    await createInstance(page);
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await expect(appPage.locator('.fantasy-scene-banner .fantasy-banner-bg')).toBeVisible();
    await expect(appPage.locator('.fantasy-illusion-banner')).toBeVisible();
    await expect(appPage.locator('.fantasy-header-ornament .fantasy-eyes-img')).toBeVisible();

    const illusionStyles = await appPage.evaluate(() => {
      const banner = document.querySelector('.fantasy-illusion-banner');
      if (!banner) return null;
      const style = getComputedStyle(banner);
      return {
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
        color: style.color
      };
    });

    const bannerState = await appPage.evaluate(async () => {
      const banner = document.querySelector('.fantasy-scene-banner');
      const bannerBg = banner ? banner.querySelector('.fantasy-banner-bg') : null;
      const content = document.querySelector('.content-area, .lefttop-content');
      if (!banner || !bannerBg || !content) {
        return null;
      }

      const filler = document.createElement('div');
      filler.style.height = '2000px';
      content.appendChild(filler);
      content.scrollTop = 320;
      content.dispatchEvent(new Event('scroll'));

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const state = {
        overflow: getComputedStyle(banner).overflow,
        transform: getComputedStyle(bannerBg).transform,
        backgroundImage: getComputedStyle(bannerBg).backgroundImage,
        coversTop: bannerBg.getBoundingClientRect().top <= banner.getBoundingClientRect().top + 1,
        coversBottom: bannerBg.getBoundingClientRect().bottom >= banner.getBoundingClientRect().bottom - 1
      };

      filler.remove();
      return state;
    });

    expect(bannerState).not.toBeNull();
    expect(illusionStyles).not.toBeNull();
    expect(illusionStyles.backgroundImage).not.toContain('255, 255, 255');
    expect(illusionStyles.boxShadow).not.toBe('none');
    expect(bannerState.overflow).toBe('hidden');
    expect(bannerState.backgroundImage).not.toBe('none');
    expect(bannerState.transform).not.toBe('none');
    expect(bannerState.coversTop).toBe(true);
    expect(bannerState.coversBottom).toBe(true);
  });

  test('clicking the fantasy quest ledger toggles the quest board and mechanic cues drive the goblin', async ({ page }) => {
    const easterEggToggle = page.locator('.title-separator');
    for (let i = 0; i < 5; i += 1) {
      await easterEggToggle.click({ force: true });
    }

    await createInstance(page);
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    const questLedger = appPage.locator('#benchmark-strip');
    const challengePanel = appPage.locator('#challenge-panel');

    await questLedger.click();
    await expect(challengePanel).toHaveClass(/visible/);
    await expect(questLedger).toHaveAttribute('aria-expanded', 'true');

    await questLedger.click();
    await expect(challengePanel).not.toHaveClass(/visible/);
    await expect(questLedger).toHaveAttribute('aria-expanded', 'false');

    await appPage.evaluate(() => {
      showAccessDeniedPopup('A ward flares against your sigil.', 'sensitive');
    });

    await expect(appPage.locator('.fantasy-goblin-popout.goblin-visible')).toBeVisible();
    await expect(appPage.locator('#goblin-bubble')).toContainText(/ward/i);

    await expect
      .poll(async () => appPage.evaluate(() => {
        const goblin = document.querySelector('.fantasy-goblin-popout');
        if (!goblin) return false;
        const rect = goblin.getBoundingClientRect();
        const opacity = Number(getComputedStyle(goblin).opacity);
        return (
          rect.width > 100
          && rect.left >= -24
          && rect.left < window.innerWidth - 20
          && rect.right <= window.innerWidth + 24
          && opacity > 0.5
        );
      }))
      .toBe(true);
  });

  test('fantasy sidebar pages still drive goblin scroll cues and banner parallax when the window is the active scroller', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    const scrollModel = await appPage.evaluate(() => {
      const content = document.querySelector('.content-area');
      return {
        contentScrollable: !!content && content.scrollHeight > content.clientHeight + 8,
        windowScrollable: document.documentElement.scrollHeight > window.innerHeight + 8
      };
    });

    expect(scrollModel.windowScrollable).toBe(true);
    expect(scrollModel.contentScrollable).toBe(false);

    const initialTransform = await appPage.locator('.fantasy-scene-banner .fantasy-banner-bg').evaluate(el => getComputedStyle(el).transform);
    await appPage.evaluate(() => window.scrollTo(0, 980));

    await expect
      .poll(async () => appPage.evaluate(() => {
        const goblin = document.querySelector('.fantasy-goblin-popout');
        const bannerBg = document.querySelector('.fantasy-scene-banner .fantasy-banner-bg');
        return {
          goblinVisible: goblin ? goblin.classList.contains('goblin-visible') : false,
          transform: bannerBg ? getComputedStyle(bannerBg).transform : 'none'
        };
      }))
      .toMatchObject({
        goblinVisible: true
      });

    const updatedTransform = await appPage.locator('.fantasy-scene-banner .fantasy-banner-bg').evaluate(el => getComputedStyle(el).transform);
    expect(updatedTransform).not.toBe(initialTransform);
  });

  test('fantasy ward spells keep the counterspell input reachable on a mobile viewport', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await appPage.setViewportSize({ width: 390, height: 844 });
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      state.fantasySpellCastCount = 2;
      castFantasySpell();
    });

    const spellPanel = appPage.locator('.fantasy-spell-panel');
    await expect(spellPanel).toBeVisible();
    await expect.poll(async () => appPage.locator('.spell-rune-option').count()).toBeGreaterThan(3);

    const runeCount = await appPage.locator('.spell-rune-option').count();
    let codeInputAppeared = false;
    for (let i = 0; i < runeCount; i += 1) {
      await appPage.locator('.spell-rune-option').nth(i).click();
      await appPage.getByRole('button', { name: 'Confirm Rune' }).click();
      if (await appPage.locator('.spell-code-input').count()) {
        codeInputAppeared = true;
        break;
      }
    }

    expect(codeInputAppeared).toBe(true);
    const codeInput = appPage.locator('.spell-code-input');
    await expect(codeInput).toBeVisible();
    await codeInput.fill('ABC123');

    const layoutState = await codeInput.evaluate((input) => {
      const rect = input.getBoundingClientRect();
      const modal = input.closest('.spell-modal');
      const body = input.closest('.spell-modal-body');
      const modalRect = modal ? modal.getBoundingClientRect() : rect;
      return {
        withinViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
        withinModal: rect.top >= modalRect.top && rect.bottom <= modalRect.bottom,
        bodyScrollable: !!body && body.scrollHeight > body.clientHeight
      };
    });

    expect(layoutState.withinViewport).toBe(true);
    expect(layoutState.withinModal).toBe(true);
  });

  test('failed fantasy spells can trigger an isolated floating-button backlash swarm', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'buttons',
        floatingButtonCount: 50
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'buttons');
    await expect(appPage.locator('.fantasy-backlash-float-btn')).toHaveCount(50);
    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(0);
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveCount(0);
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-backlash-screen'))).toBe(false);
    const buttonVariety = await appPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.fantasy-backlash-float-btn'));
      return {
        shapes: new Set(buttons.map((button) => button.getAttribute('data-shape'))).size,
        sizes: new Set(buttons.map((button) => button.getAttribute('data-size'))).size,
        motions: new Set(buttons.map((button) => button.getAttribute('data-motion'))).size
      };
    });
    expect(buttonVariety.shapes).toBeGreaterThanOrEqual(5);
    expect(buttonVariety.sizes).toBeGreaterThanOrEqual(3);
    expect(buttonVariety.motions).toBeGreaterThanOrEqual(6);
    await expect(appPage.locator('.fantasy-backlash-float-btn.is-dispel-target')).toHaveCount(1);
    await expect(appPage.locator('.fantasy-backlash-float-btn[data-dispel-target="true"]')).toHaveCount(1);

    await appPage.waitForTimeout(600);
    await expect(appPage.locator('.fantasy-backlash-float-btn')).toHaveCount(50);
    await appPage.locator('.fantasy-backlash-float-btn.is-dispel-target').click({ force: true });
    await expect(appPage.locator('.fantasy-backlash-float-btn')).toHaveCount(0, { timeout: 2500 });
    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(0);
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveCount(0);
  });

  test('failed fantasy spells can trigger varied popup backlash that only clears on the correct action', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'popups',
        popupCount: 6
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'popups');
    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(6);
    const popupVariety = await appPage.evaluate(() => {
      const popups = Array.from(document.querySelectorAll('.fantasy-backlash-popup'));
      return {
        shapes: new Set(popups.map((popup) => popup.getAttribute('data-shape'))).size,
        sizes: new Set(popups.map((popup) => popup.getAttribute('data-size'))).size,
        actions: new Set(popups.map((popup) => popup.getAttribute('data-correct-action'))).size
      };
    });
    expect(popupVariety.shapes).toBeGreaterThanOrEqual(4);
    expect(popupVariety.sizes).toBeGreaterThanOrEqual(3);
    expect(popupVariety.actions).toBeGreaterThanOrEqual(6);

    await appPage.locator('.fantasy-backlash-popup').first().locator('[data-popup-action="decoy"]').first().click();
    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(6);

    await appPage.evaluate(() => {
      Array.from(document.querySelectorAll('.fantasy-backlash-popup')).forEach((popup) => {
        const button = popup.querySelector('[data-popup-action="correct"]');
        if (button) button.click();
      });
    });

    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(0, { timeout: 2000 });
  });

  test('failed fantasy spells can trigger a living scroll that must be anchored separately', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);
    await appPage.evaluate(() => window.scrollTo(0, 0));

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'living-scroll'
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'living-scroll');
    await expect(appPage.locator('.fantasy-living-scroll-backlash')).toBeVisible();
    await expect(appPage.locator('.fantasy-living-scroll-anchor')).toBeVisible();
    await expect.poll(async () => appPage.evaluate(() => {
      const contentArea = document.querySelector('.content-area');
      return Math.round(window.scrollY) + Math.round(contentArea ? contentArea.scrollTop : 0);
    })).toBeGreaterThan(0);
    await appPage.locator('.fantasy-living-scroll-anchor').click();
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0, { timeout: 4000 });
  });

  test('failed fantasy spells can trigger a summoning circle that clears clockwise and grows each glyph', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'summoning-circle'
      });
    });

    const circle = appPage.locator('.fantasy-summoning-circle-backlash');
    const glyphs = appPage.locator('.fantasy-summoning-glyph');
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'summoning-circle');
    await expect(circle).toBeVisible();
    await expect(glyphs).toHaveCount(6);

    const glyphOne = appPage.locator('.fantasy-summoning-glyph[aria-label="Summoning glyph 1"]');
    await glyphOne.click();
    await expect(circle).toHaveAttribute('data-cleared-count', '1');
    await expect(glyphOne).toHaveClass(/is-activated/);
    await expect(appPage.locator('.fantasy-access-modal')).toHaveCount(0);

    for (let glyphNumber = 2; glyphNumber <= 6; glyphNumber += 1) {
      await appPage.locator(`.fantasy-summoning-glyph[aria-label="Summoning glyph ${glyphNumber}"]`).click();
    }

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0, { timeout: 2500 });
  });

  test('failed fantasy spells can trigger an ink spill that must be sealed with the stopper', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'ink-spill'
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'ink-spill');
    await expect(appPage.locator('.fantasy-ink-pot')).toBeVisible();
    await expect(appPage.locator('.fantasy-ink-stopper')).toBeVisible();
    await expect.poll(async () => appPage.locator('#fantasy-spell-penalty-host').getAttribute('data-ink-state')).toBe('spilled');
    await appPage.locator('.fantasy-ink-stopper').click();
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0, { timeout: 2500 });
  });

  test('failed fantasy spells can trigger a lantern blackout that ends when the gremlin is revealed', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'lantern-blackout'
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'lantern-blackout');
    await expect(appPage.locator('.fantasy-lantern-blackout')).toBeVisible();
    await expect(appPage.locator('.fantasy-lantern-gremlin')).toBeVisible();
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-lantern-blackout-active'))).toBe(true);
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-gremlin-revealed', 'false');

    await appPage.mouse.move(24, 24);
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-gremlin-revealed', 'false');

    const gremlinBox = await appPage.locator('.fantasy-lantern-gremlin').boundingBox();
    expect(gremlinBox).not.toBeNull();
    await appPage.mouse.move((gremlinBox?.x ?? 0) + ((gremlinBox?.width ?? 0) / 2), (gremlinBox?.y ?? 0) + ((gremlinBox?.height ?? 0) / 2));

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-gremlin-revealed', 'true');
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-lantern-blackout-active'))).toBe(false);
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0, { timeout: 2500 });
  });

  test('failed fantasy spells can trigger a dragon backlash that can be slain with the sword cursor', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'dragon',
        dragonRiseDurationMs: 120,
        dragonFrameIntervalMs: 260,
        dragonFadeDurationMs: 140
      });
    });

    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-effect', 'dragon');
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-dragon-outcome', 'pending');
    await expect(appPage.locator('.fantasy-backlash-popup')).toHaveCount(0);
    await expect(appPage.locator('.fantasy-backlash-float-btn')).toHaveCount(0);
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-backlash-screen'))).toBe(false);
    await expect(appPage.locator('.fantasy-dragon-warning')).toContainText('THE RED KING APPROACHES, SLAY THE DRAGON!');
    await expect(appPage.locator('.fantasy-backlash-dragon')).toBeVisible();
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveAttribute('data-frame', '2');
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-dragon-hunt-active'))).toBe(true);
    const dragonBox = await appPage.locator('.fantasy-backlash-dragon').boundingBox();
    const dragonViewport = appPage.viewportSize();
    expect(dragonBox).not.toBeNull();
    expect(dragonViewport).not.toBeNull();
    const dragonBounds = dragonBox || { y: -1, height: 0 };
    expect(dragonBounds.y).toBeGreaterThanOrEqual(-12);
    expect(dragonBounds.y + dragonBounds.height).toBeGreaterThan((dragonViewport?.height ?? 0) - 48);
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveAttribute('data-hit-count', '0');
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveAttribute('data-required-hits', '5');
    for (let hit = 1; hit <= 4; hit += 1) {
      await appPage.locator('body').click({ position: { x: 120, y: 120 } });
      await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveAttribute('data-hit-count', String(hit));
      await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-dragon-outcome', 'pending');
    }
    await expect(appPage.locator('.fantasy-dragon-warning')).toContainText('1 STRIKE REMAIN');
    await appPage.locator('body').click({ position: { x: 120, y: 120 } });
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveAttribute('data-hit-count', '5');
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveAttribute('data-dragon-outcome', 'slain');
    await expect(appPage.locator('.fantasy-dragon-warning')).toContainText('THE RED KING FALTERS BEFORE YOUR BLADE!');
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-dragon-hunt-active'))).toBe(false);
    await expect.poll(async () => appPage.locator('.fantasy-backlash-dragon').getAttribute('data-visited-frames')).toContain('3');
    await expect.poll(async () => appPage.locator('.fantasy-backlash-dragon').getAttribute('data-visited-frames')).toContain('6');
    await expect.poll(async () => appPage.locator('.fantasy-backlash-dragon').getAttribute('data-visited-frames')).toContain('7');
    await expect.poll(async () => appPage.locator('.fantasy-backlash-dragon').getAttribute('data-phase')).toBe('fading');
    await expect(appPage.locator('.fantasy-backlash-dragon')).toHaveCount(0, { timeout: 2000 });
    await expect(appPage.locator('#instanceLogin')).toBeHidden();
  });

  test('failed fantasy spells can trigger a dragon backlash that kills the user if not slain', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      const spell = buildFantasySpell(state.currentInstance, 5);
      triggerFantasySpellPenalty(spell, 'faded', {
        effectType: 'dragon',
        dragonRiseDurationMs: 120,
        dragonFrameIntervalMs: 260,
        dragonFadeDurationMs: 140
      });
    });

    await expect(appPage.locator('.fantasy-dragon-warning')).toContainText('THE RED KING APPROACHES, SLAY THE DRAGON!');
    await expect.poll(async () => appPage.evaluate(() => document.body.classList.contains('fantasy-dragon-hunt-active'))).toBe(true);
    await expect.poll(async () => appPage.locator('#fantasy-spell-penalty-host').getAttribute('data-dragon-outcome')).toBe('perished');
    await expect(appPage.locator('.fantasy-dragon-doom')).toHaveClass(/is-visible/);
    await expect(appPage.locator('.fantasy-dragon-doom-message')).toContainText('YOU HAVE PERISHED');
    await expect(appPage.locator('.instance-login-page')).toBeVisible({ timeout: 6500 });
    await expect(appPage.locator('#loginAppName')).not.toHaveText('Application');
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0, { timeout: 6500 });
  });

  test('returning to the fantasy login gate clears active spell and body-appended fantasy artifacts', async ({ page }) => {
    await enableFantasyMode(page);
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar' });
    const credentials = await readInstanceCredentials(page);
    const instanceId = await readFirstInstanceId(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      castFantasySpell();
      signalFantasyMechanicCue('bonus', 'A hidden boon stirs in the stone.', { force: true });
      triggerFantasySpellPenalty(buildFantasySpell(state.currentInstance, 6), 'faded', {
        effectType: 'popups'
      });
      let toast = document.querySelector('.fantasy-treasure-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'fantasy-treasure-toast toast-visible';
        toast.textContent = 'Testing cleanup';
        document.body.appendChild(toast);
      }
    });

    await expect(appPage.locator('.fantasy-spell-panel')).toBeVisible();
    await expect(appPage.locator('.fantasy-goblin-popout')).toHaveCount(1);
    await expect(appPage.locator('.fantasy-treasure-toast')).toHaveCount(1);
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(1);

    await appPage.evaluate((id) => {
      showInstanceLogin(id);
    }, instanceId);

    await expect(appPage.locator('.instance-login-page')).toBeVisible();
    await expect(appPage.locator('.fantasy-spell-panel')).toHaveCount(0);
    await expect(appPage.locator('.fantasy-goblin-popout')).toHaveCount(0);
    await expect(appPage.locator('.fantasy-treasure-toast')).toHaveCount(0);
    await expect(appPage.locator('#fantasy-spell-penalty-host')).toHaveCount(0);
  });

  test('persists role, benchmark profile, and friction settings on created instances', async ({ page }) => {
    await createInstance(page, {
      domain: 'finance',
      role: 'auditor',
      benchmarkProfile: 'permission_maze',
      frictionMode: 'adversarial'
    });

    await expect(page.locator('.instance-meta')).toContainText(/Auditor/i);
    await expect(page.locator('.instance-meta')).toContainText(/Permission Maze/i);
    await expect(page.locator('.instance-alert-row')).toContainText(/Adversarial/i);

    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('mazeRunner_instances') || '[]')[0]);
    expect(stored.role).toBe('auditor');
    expect(stored.benchmarkProfile).toBe('permission_maze');
    expect(stored.frictionMode).toBe('adversarial');
  });

  test('benchmark presets update the forge controls and persist on created instances', async ({ page }) => {
    await page.locator('#benchmark_preset').selectOption('permission_stress');

    await expect(page.locator('#nav_style')).toHaveValue('lefttop');
    await expect(page.locator('#role')).toHaveValue('contractor');
    await expect(page.locator('#benchmark_profile')).toHaveValue('permission_maze');
    await expect(page.locator('#friction_mode')).toHaveValue('adversarial');
    await expect(page.locator('#anti_patterns')).toBeChecked();

    await page.getByRole('button', { name: 'Create Instance' }).click();
    await expect(page.locator('.instance-card')).toHaveCount(1);

    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('mazeRunner_instances') || '[]')[0]);
    expect(stored.benchmarkPreset).toBe('permission_stress');
    expect(stored.nav_style).toBe('lefttop');
    expect(stored.role).toBe('contractor');
  });

  test('dashboard replay modal shows stored analytics for a recorded run', async ({ page }) => {
    await createInstance(page, { domain: 'itsm' });

    await page.evaluate(() => {
      const instances = state.instanceManager.getInstances();
      const instanceId = instances[0].id;
      state.instanceManager.recordRunResult(instanceId, {
        status: 'completed',
        missionTitle: 'Incident Recovery',
        archetypeLabel: 'Incident Recovery',
        scenarioLabel: 'Incident Recovery',
        netScore: 412,
        rawScore: 450,
        bonusScore: 30,
        elapsedMs: 84234,
        completedSteps: 6,
        totalSteps: 6,
        uniquePages: 4,
        rank: 'S',
        role: 'manager',
        benchmarkProfile: 'resilience_recovery',
        frictionMode: 'realistic',
        benchmarkPreset: 'recovery_drill',
        seed: 4721,
        navStyle: 'ribbon',
        skippedSteps: 1,
        coveragePct: 67,
        firstTryRate: 83,
        routeEfficiency: 58,
        wrongTurns: 3,
        pageVisitMap: {
          '/incidents/queue': 3,
          '/changes/calendar': 2
        },
        pageIssueMap: {
          '/changes/calendar': 2
        },
        eventCounts: {
          navigate: 4,
          false_lead: 1,
          step_complete: 2
        },
        eventTimeline: [
          { type: 'navigate', detail: 'Opened Incident Queue', page: '/incidents/queue', atMs: 1200 },
          { type: 'step_complete', detail: 'Recovered queue context', page: '/incidents/open', atMs: 5300 }
        ]
      });
      state.instanceManager.recordRunResult(instanceId, {
        status: 'completed',
        missionTitle: 'Incident Recovery',
        archetypeLabel: 'Incident Recovery',
        scenarioLabel: 'Incident Recovery',
        scenarioKey: 'incident-recovery',
        netScore: 398,
        rawScore: 420,
        bonusScore: 20,
        elapsedMs: 90234,
        completedSteps: 6,
        totalSteps: 6,
        uniquePages: 5,
        rank: 'A',
        role: 'manager',
        benchmarkProfile: 'resilience_recovery',
        frictionMode: 'realistic',
        benchmarkPreset: 'recovery_drill',
        seed: 4721,
        navStyle: 'ribbon',
        skippedSteps: 0,
        coveragePct: 72,
        firstTryRate: 80,
        routeEfficiency: 61,
        wrongTurns: 2,
        falseLeads: 1,
        pageVisitMap: {
          '/incidents/queue': 2,
          '/changes/calendar': 3
        },
        pageIssueMap: {
          '/changes/calendar': 1
        },
        eventCounts: {
          navigate: 5,
          false_lead: 1,
          step_complete: 3
        },
        eventTimeline: [
          { type: 'navigate', detail: 'Opened Change Calendar', page: '/changes/calendar', atMs: 1800 }
        ]
      });
      renderDashboard();
    });

    const analyticsDetails = page.locator('.dashboard-analytics-details');
    if (!(await analyticsDetails.evaluate((el) => el.hasAttribute('open')))) {
      await analyticsDetails.locator('summary').click();
    }

    await expect(page.getByRole('heading', { name: /Which roles and layouts are holding up best/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /How presets and failures are clustering/i })).toBeVisible();

    await page.getByRole('button', { name: /Replay/i }).first().click();
    await expect(page.locator('.modal')).toContainText(/Incident Recovery/i);
    await expect(page.locator('.modal')).toContainText(/67%/i);
    await expect(page.locator('.modal')).toContainText(/83%/i);
    await expect(page.locator('.modal')).toContainText(/resilience/i);
    await expect(page.locator('.modal')).toContainText(/Route Efficiency/i);
    await expect(page.locator('.modal')).toContainText(/False Leads/i);
    await expect(page.locator('.modal')).toContainText(/Recovery Drill/i);
    await expect(page.locator('.modal')).toContainText(/Seed 4721/i);
    await expect(page.locator('.modal')).toContainText(/Visit Heatmap/i);
    await expect(page.locator('.modal')).toContainText(/Confusion Points/i);
    await expect(page.locator('.modal')).toContainText(/Comparable Runs/i);
  });

  test('record edits and deletes persist after redraw on interactive queue pages', async ({ page }) => {
    await createInstance(page, { domain: 'itsm', nav_style: 'sidebar', role: 'admin' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await expect(appPage.locator('.page-title')).toHaveText(/Incident Queue/i);
    const updatedSummary = 'Mail routing outage review';

    await appPage.locator('.table-action-btn', { hasText: 'Edit' }).first().click();
    await appPage.locator('#edit-form [data-field="Issue Summary"]').fill(updatedSummary);
    await appPage.getByRole('button', { name: 'Save' }).click();

    await expect(appPage.locator('table tbody')).toContainText(updatedSummary);

    await appPage.locator('.nav-item[data-path="/incidents/service-desk"]').click();
    await expect(appPage.locator('.page-title')).toHaveText(/Service Desk/i);
    await appPage.locator('.nav-item[data-path="/incidents/queue"]').click();
    await expect(appPage.locator('.page-title')).toHaveText(/Incident Queue/i);
    await expect(appPage.locator('table tbody')).toContainText(updatedSummary);

    await appPage.locator('.table-action-btn.danger', { hasText: 'Delete' }).first().click();
    await appPage.locator('.confirmation-btn-confirm', { hasText: 'Delete' }).click();

    await expect(appPage.locator('table tbody')).not.toContainText(updatedSummary);
  });

  test('verification and access requests appear in approvals and can be resolved', async ({ page }) => {
    await createInstance(page, { domain: 'finance', nav_style: 'sidebar', role: 'admin' });
    const credentials = await readInstanceCredentials(page);

    const appPage = await openInstancePopup(page, '.btn-enter');
    await signIntoInstance(appPage, credentials);

    await appPage.evaluate(() => {
      submitVerificationRequest();
      submitAccessRequest('delete');
    });

    await appPage.evaluate(() => openPendingApprovals());
    await expect(appPage.locator('#pending-approval-overlay')).toBeVisible();
    await expect(appPage.locator('#pending-approval-overlay')).toContainText(/verification|access request/i);

    const beforeCount = await appPage.locator('#pending-approval-overlay .approval-row').count();
    await appPage.locator('#pending-approval-overlay .approval-row').first().getByRole('button', { name: /Approve|Grant Seal/i }).click();
    const afterCount = await appPage.locator('#pending-approval-overlay .approval-row').count();
    expect(afterCount).toBeLessThan(beforeCount);

    await appPage.evaluate(() => openHistoryDrawer());
    await expect(appPage.locator('.slide-panel-overlay').last()).toContainText(/verification follow-up|access escalation request|review item was approved/i);
  });
});
