#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('@playwright/test');

function parseArgs(argv) {
    const options = {
        file: path.resolve(process.cwd(), 'mazerunner.html'),
        domains: ['crm', 'erp', 'hrms', 'healthcare', 'itsm', 'procurement', 'finance', 'legal'],
        seeds: [1101, 2217, 3349, 4471, 5583],
        json: ''
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--file' && argv[i + 1]) {
            options.file = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
            continue;
        }
        if (arg === '--domains' && argv[i + 1]) {
            options.domains = argv[i + 1].split(',').map(value => value.trim()).filter(Boolean);
            i += 1;
            continue;
        }
        if (arg === '--seeds' && argv[i + 1]) {
            options.seeds = argv[i + 1]
                .split(',')
                .map(value => Number(value.trim()))
                .filter(value => Number.isFinite(value));
            i += 1;
            continue;
        }
        if (arg === '--json' && argv[i + 1]) {
            options.json = path.resolve(process.cwd(), argv[i + 1]);
            i += 1;
        }
    }

    return options;
}

function printSummary(report) {
    const totalIssues = report.summary.totalIssues;
    console.log(`Generator audit complete for ${report.summary.sampleCount} blueprints.`);
    console.log(`Domains: ${report.domains.join(', ')}`);
    console.log(`Seeds: ${report.seeds.join(', ')}`);
    console.log(`Issues found: ${totalIssues}`);
    console.log('');
    console.log(`Duplicate sibling models: ${report.summary.duplicateSections}`);
    console.log(`Weak titles: ${report.summary.weakTitles}`);
    console.log(`ID-first titles: ${report.summary.idFirstTitles}`);
    console.log(`Repeated sibling descriptions: ${report.summary.repeatedDescriptions}`);
    console.log(`Missing archetypes: ${report.summary.missingArchetypes}`);
    console.log(`Empty layout plans: ${report.summary.emptyLayoutPlans}`);
    console.log('');
    console.log('Archetype coverage:');
    Object.entries(report.archetypes)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, count]) => {
            console.log(`- ${name}: ${count}`);
        });

    if (!totalIssues) return;

    console.log('');
    console.log('Sample findings:');
    report.issues.slice(0, 20).forEach(issue => {
        console.log(`- [${issue.kind}] ${issue.domain} seed ${issue.seed} :: ${issue.path} :: ${issue.detail}`);
    });
}

async function run() {
    const options = parseArgs(process.argv.slice(2));
    if (!fs.existsSync(options.file)) {
        throw new Error(`Standalone file not found: ${options.file}`);
    }

    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(pathToFileURL(options.file).href);
        await page.waitForSelector('.dashboard-container', { timeout: 15000 });

        const report = await page.evaluate(({ domains, seeds }) => {
            const issues = [];
            const archetypes = {};

            const weakTitlePattern = /record data|entry #|item \d+|value \d+|updated|pending review|review required/i;
            const semanticFieldPattern = /(name|title|summary|scenario|item description|contract title|patient name|employee name|contact name|opportunity name|catalog item|service offering|project name|procedure|bank account|cash pool|partner account|gl account)/i;
            const idFieldPattern = /\b(id|number)\b|ticket|invoice|journal|asset tag/i;

            domains.forEach(domain => {
                seeds.forEach(seed => {
                    state.fantasyMode = false;
                    const blueprint = new BlueprintGenerator(domain, 'moderate', seed).generateBlueprint();

                    Object.values(blueprint.pages).forEach(pageModel => {
                        archetypes[pageModel.archetype || 'unassigned'] = (archetypes[pageModel.archetype || 'unassigned'] || 0) + 1;

                        if (!pageModel.archetype) {
                            issues.push({
                                kind: 'missing-archetype',
                                domain,
                                seed,
                                path: pageModel.path,
                                detail: 'Page rendered without an archetype assignment.'
                            });
                        }

                        if (!Array.isArray(pageModel.layoutSections) || !pageModel.layoutSections.length) {
                            issues.push({
                                kind: 'empty-layout',
                                domain,
                                seed,
                                path: pageModel.path,
                                detail: 'Page rendered without a layout section plan.'
                            });
                        }

                        const record = Array.isArray(pageModel.records) ? pageModel.records[0] : null;
                        if (record && weakTitlePattern.test(String(record.title || ''))) {
                            issues.push({
                                kind: 'weak-title',
                                domain,
                                seed,
                                path: pageModel.path,
                                detail: `Weak generated title "${record.title}".`
                            });
                        }

                        if (record) {
                            const titleField = Object.entries(record.values || {}).find(([, value]) => String(value || '') === String(record.title || ''));
                            if (titleField) {
                                const betterSemanticField = Object.keys(record.values || {}).find(fieldName => semanticFieldPattern.test(fieldName) && String(record.values[fieldName] || '').trim());
                                if (betterSemanticField && idFieldPattern.test(titleField[0]) && !idFieldPattern.test(betterSemanticField)) {
                                    issues.push({
                                        kind: 'id-first-title',
                                        domain,
                                        seed,
                                        path: pageModel.path,
                                        detail: `Primary title used "${titleField[0]}" even though "${betterSemanticField}" was available.`
                                    });
                                }
                            }
                        }
                    });

                    blueprint.navigation.sections.forEach(section => {
                        const signatures = {};
                        const descriptionCounts = {};
                        section.pages.forEach(navPage => {
                            const pageModel = blueprint.pages[navPage.path];
                            const signature = pageModel.fields.slice(0, 6).map(field => field.name).join(' | ');
                            const description = String(pageModel.description || '').trim();

                            if (!signatures[signature]) signatures[signature] = [];
                            signatures[signature].push(pageModel.path);

                            if (description) {
                                if (!descriptionCounts[description]) descriptionCounts[description] = [];
                                descriptionCounts[description].push(pageModel.path);
                            }
                        });

                        Object.entries(signatures).forEach(([signature, paths]) => {
                            if (paths.length > 1) {
                                issues.push({
                                    kind: 'duplicate-section-model',
                                    domain,
                                    seed,
                                    path: paths.join(', '),
                                    detail: `Sibling pages share the same leading field signature: ${signature}.`
                                });
                            }
                        });

                        Object.entries(descriptionCounts).forEach(([description, paths]) => {
                            if (paths.length > 1) {
                                issues.push({
                                    kind: 'repeated-description',
                                    domain,
                                    seed,
                                    path: paths.join(', '),
                                    detail: `Sibling pages reuse the same description: ${description}`
                                });
                            }
                        });
                    });
                });
            });

            const summary = {
                sampleCount: domains.length * seeds.length,
                duplicateSections: issues.filter(issue => issue.kind === 'duplicate-section-model').length,
                weakTitles: issues.filter(issue => issue.kind === 'weak-title').length,
                idFirstTitles: issues.filter(issue => issue.kind === 'id-first-title').length,
                repeatedDescriptions: issues.filter(issue => issue.kind === 'repeated-description').length,
                missingArchetypes: issues.filter(issue => issue.kind === 'missing-archetype').length,
                emptyLayoutPlans: issues.filter(issue => issue.kind === 'empty-layout').length,
                totalIssues: issues.length
            };

            return { domains, seeds, summary, archetypes, issues };
        }, { domains: options.domains, seeds: options.seeds });

        if (options.json) {
            fs.mkdirSync(path.dirname(options.json), { recursive: true });
            fs.writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        }

        printSummary(report);
        if (report.summary.totalIssues > 0) {
            process.exitCode = 1;
        }
    } finally {
        await browser.close();
    }
}

run().catch(error => {
    console.error(error.stack || String(error));
    process.exitCode = 1;
});
