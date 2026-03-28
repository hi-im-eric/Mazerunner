# MazeRunner Session Progress and Architecture

Date: 2026-03-23

## Purpose

This document captures two things:

1. The progress made during this session.
2. A practical explanation of how the MazeRunner standalone app works and how it is architected today.

The intent is to provide a durable handoff/reference document for future design, research, and implementation passes.

## High-Level Product Summary

MazeRunner is a standalone browser app for generating seeded, domain-specific enterprise systems that can be used to test agentic AI. Each generated instance is meant to feel like a plausible but unfamiliar enterprise application so an agent has to navigate, interpret, search, inspect, and execute tasks rather than rely on memorized flows.

The app also contains a fantasy-mode easter egg. In fantasy mode, the same underlying enterprise structure is preserved, but labels, atmosphere, assets, and copy are transformed into a dungeon/fantasy presentation.

## Session Outcomes

### 1. Spec review and alignment

- Reviewed the project files and the specification.
- Updated `MazeRunner_Spec.docx` so the spec reflects the actual standalone app scope rather than an earlier, more future-facing platform concept.
- Reframed the product as a shipped standalone benchmark harness with local persistence, generated instances, benchmark runs, analytics, and fantasy-mode overlays.

### 2. Domain research incorporated across the app

During this session, deep-research findings were incorporated into all current enterprise domains:

- CRM
- ERP
- Financial Management
- Healthcare
- HRMS
- IT Service Management
- Legal & Contracts
- Procurement

For each incorporated domain, the work generally included:

- Expanding the navigation model to better match real enterprise workflows.
- Updating page semantics and page profiles.
- Broadening domain field inventories and generated record values.
- Improving KPI/stat/activity generation so dashboards read like the target domain.
- Expanding challenge and mission types so the benchmark matches domain-specific tasks.
- Updating organization metadata and business-unit or service-line language where appropriate.

### 3. Fantasy mode aligned to researched domain structure

Fantasy mode was updated so the research-backed enterprise designs also flow through the fantasy presentation layer.

That included:

- mapping fantasy sections and labels back to the correct enterprise semantics
- ensuring fantasy pages resolve to the right researched module families
- keeping fantasy-generated records, fields, and page behaviors aligned with the underlying domain research

This work now applies across CRM, ERP, Financial Management, Healthcare, HRMS, ITSM, Legal & Contracts, and Procurement.

### 4. Timed fantasy spell challenge system added

Fantasy mode now includes a timed spell-casting challenge layer inspired by browser-automation challenge patterns, but tuned to remain solvable by humans.

Implemented behavior:

- first spell appears after 15 seconds
- additional spells appear every 60 seconds
- difficulty ramps up as the session continues
- challenge patterns include visible decoys, click reveal, scroll reveal, delayed reveal, hover, drag and drop, key cadence, memory flash, timing windows, split fragments, sequence challenges, simple puzzle logic, and canvas glyph presentation

Patterns considered too hostile for normal human play were intentionally not added as recurring fantasy spells.

### 5. Fantasy-mode QA and regression fixes completed

Fantasy mode was live-tested end to end and two regressions were fixed during validation:

- goblin scroll cues and banner parallax were corrected for layouts that scroll on the browser window instead of the inner content pane
- fantasy body-appended artifacts were cleaned up when returning to the login gate

Regression coverage was added for fantasy-specific flows and effects.

### 6. Mobile-friendliness improved

The standalone dashboard and fantasy dashboard were updated to behave better on narrow screens.

Notable result:

- the Maze Runner dashboard banner/header no longer clips on a phone-sized portrait viewport

Additional responsive work included:

- earlier stacking of dashboard panels
- tighter control spacing
- safer tooltip positioning in narrow layouts
- regression coverage for the mobile fantasy dashboard header

### 7. Standalone portability optimization completed

The standalone build was optimized while preserving the single-file delivery model.

Key results:

- `mazerunner.html` was reduced from `15,195,759` bytes to `2,639,851` bytes
- total reduction was about `82.6%`
- the main savings came from optimizing already-embedded fantasy image payloads during the build step

This was achieved by:

- scanning large inline `data:image/...` assets in the template
- converting them to smaller embedded WebP payloads during build time
- caching optimized results in `.cache/standalone-embedded-image-cache.json`
- keeping the final output as a single portable `mazerunner.html`

### 8. Session documentation updated

This progress and architecture document was created and then updated to reflect:

- the spec-alignment work
- all domain research incorporation completed during the session
- fantasy-mode expansion
- QA and mobile work
- standalone optimization work
- the audit of changes outside the project folder

## Current Research Incorporation Status

Completed in this session:

- `CRM-deep-research-report.md`
- `ERP-deep-research-report.md`
- `financial-system-deep-research-report.md`
- `healthcare-deep-research-report.md`
- `HRMS-deep-research-report.md`
- `ITSM-deep-research-report.md`
- `legal-and-contracts-deep-research-report.md`
- `procurement-deep-research-report.md`

## Current Product Scope

The standalone app currently supports:

- 8 domains
- 8 navigation styles
- seeded instance generation
- role-based login and generated credentials
- local persistence of instances and run history
- challenge generation with multi-step benchmark missions
- in-app scoring, penalties, coverage, route efficiency, and telemetry
- dashboard analytics and replay summaries
- fantasy-mode visual and terminology transformation
- timed fantasy spell challenges
- mobile-friendly dashboard behavior
- single-file portable standalone distribution

The app is currently a self-contained standalone prototype rather than a backend-backed SaaS platform. Persistence and state are browser-local.

## Project Structure

Core files and folders:

- `mazerunner.html`
- `src/standalone/template.html`
- `src/standalone/modules/benchmark-scenarios.js`
- `src/standalone/modules/challenge-engine.js`
- `src/standalone/modules/analytics-replay.js`
- `scripts/build-standalone.js`
- `scripts/serve-standalone.js`
- `tests/e2e/standalone.spec.js`
- `System Research/`
- `Fantasy Visual Assets/`
- `Design Input/`
- `.cache/standalone-embedded-image-cache.json`

## Architecture Overview

### 1. Delivery model

MazeRunner is built as a standalone HTML app.

Source-of-truth authoring happens in:

- `src/standalone/template.html`
- the JS modules under `src/standalone/modules/`

The build step inlines the module files into the template and writes the output to:

- `mazerunner.html`

This keeps the editable code split into maintainable source files while preserving a single-file artifact for portability.

### 2. Build pipeline

`scripts/build-standalone.js`:

- reads `src/standalone/template.html`
- inlines:
  - `benchmark-scenarios.js`
  - `analytics-replay.js`
  - `challenge-engine.js`
- scans large embedded image data URIs already present in the template
- optimizes those large embedded images into smaller embedded WebP payloads at build time
- caches optimized payloads in `.cache/standalone-embedded-image-cache.json`
- emits `mazerunner.html`

`scripts/serve-standalone.js`:

- awaits the standalone build before serving
- hosts the app locally on `127.0.0.1:4173` by default
- serves the built app as the main entry
- safely resolves file paths inside the project root

### 3. Runtime model

The app is primarily client-side.

At runtime, the browser app manages:

- dashboard state
- fantasy-mode state
- generated instances
- current page and app-shell state
- mission and challenge state
- run history and analytics data
- timed fantasy spell state

The main state object is initialized in `src/standalone/template.html`, and instance persistence is handled through browser storage wrappers rather than a remote backend.

### 4. Persistence model

Persistence is local-browser based.

Important stored keys include:

- `mazeRunner_instances`
- `mazeRunner_fantasyMode`

Each stored instance includes generated configuration and runtime-related data such as:

- domain
- seed
- complexity
- nav style
- role
- benchmark profile
- friction mode
- credentials
- run history

There is no required server database for normal standalone operation.

### 5. Instance lifecycle

The user flow is:

1. Open the dashboard.
2. Configure a domain, seed, role, nav style, and related options.
3. Create an instance.
4. The app stores the instance locally and generates credentials.
5. Opening the instance routes to `#instance=<id>`.
6. The user signs in through the generated login screen.
7. The app rebuilds the runtime blueprint for that instance and renders the app shell.
8. In fantasy mode, timed spell challenges can begin appearing during the session.

### 6. Generation architecture

MazeRunner uses seeded generation so systems are reproducible.

Important generator layers include:

- `DataGenerator`
- `FantasyDataGenerator`
- `BlueprintGenerator`

Responsibilities:

- `DataGenerator` creates enterprise-flavored values in normal mode.
- `FantasyDataGenerator` creates fantasy-flavored equivalents while preserving the same structural roles.
- `BlueprintGenerator` turns a config plus domain rules into the full runtime blueprint:
  - navigation
  - pages
  - fields
  - records
  - KPIs
  - activity feeds
  - layout sections
  - hierarchy views
  - supporting UI content

The blueprint is effectively the generated application model that the UI renders.

### 7. Page model architecture

Pages are not static hand-authored screens. They are generated page models.

For each page, the system derives:

- intent
- semantic profile
- relevant field set
- status pools
- seeded records
- KPI cards
- stats
- activity feed
- detail groups
- tabs
- split-view content
- wizard, kanban, tree, and other layout components as applicable

This is what allows the same app shell to render many different enterprise-feeling systems.

### 8. Benchmark architecture

The benchmark system is driven primarily by `src/standalone/modules/challenge-engine.js`.

This module is responsible for:

- scenario pools by domain
- role, nav, and friction defaults
- mission creation
- step generation
- scoring
- penalties
- progress tracking
- event logging and telemetry
- grade and standing calculation

Mission steps can involve actions like:

- navigation
- inspection
- capture or transcription
- permission or blocked-action handling
- save or commit actions

This is the core agent-evaluation layer of the product.

### 9. Analytics and replay architecture

`src/standalone/modules/analytics-replay.js` aggregates stored runs and powers the dashboard's results and replay views.

It handles concepts such as:

- best run per instance
- latest run per instance
- completion ratios
- score rollups
- domain comparison
- role comparison
- navigation comparison
- preset comparison
- failure clustering
- page heatmaps
- issue hotspots
- comparable-run analysis
- replay summaries and event timelines

This gives MazeRunner a second layer beyond generation: it is not only a generator, but also a lightweight in-browser benchmarking lab.

### 10. Fantasy mode architecture

Fantasy mode is an overlay on top of the enterprise structure, not a separate app.

When enabled:

- labels and copy shift into fantasy terminology
- visuals and atmosphere change
- theme, profile, and friction selections are locked to the fantasy experience
- domain modules still map back to the same underlying enterprise semantics
- timed spell challenges are layered into the session as additional distractions and interaction tests

This lets the app test whether an agent can generalize across presentation changes while still working against the same structural problem.

## How the App Works in Practice

From a product behavior perspective, MazeRunner works like this:

1. A user creates a seeded enterprise instance.
2. The app generates a full system blueprint for that instance.
3. The user or an agent signs into the generated app.
4. The app renders a realistic but synthetic enterprise environment.
5. A challenge mission can be launched against that environment.
6. In fantasy mode, timed spell challenges may also appear during the run.
7. The run is scored based on navigation, correctness, completeness, penalties, and route efficiency.
8. Results are written to local run history.
9. The dashboard rolls runs up into analytics and replay views.

## Testing and Verification Approach Used During This Session

Validation during this session relied on:

- `node --check` against edited JS modules and build scripts
- `node scripts/build-standalone.js`
- browser smoke tests against fresh generated instances
- targeted Playwright regression tests for the standalone dashboard, fantasy mode, and mobile layout

The smoke-test pattern used during the domain passes was:

1. Build the standalone artifact.
2. Launch or reload the local app.
3. Create a fresh instance for the edited domain.
4. Sign in to the instance.
5. Verify navigation, page count, and domain flavor.
6. Confirm benchmark scenario coverage.
7. Inspect generated records and page semantics.
8. Check browser console errors.

Later in the session, targeted Playwright checks were also used to verify:

- fantasy dashboard rendering
- fantasy mode locking behavior
- mobile-width dashboard layout
- fantasy spell timing behavior
- no regressions after the single-file build optimization

## Changes Outside the Project Folder

No intentional project files were created or edited outside `C:\Users\ericw\Documents\Python Projects\Maze Runner`.

The only observed outside-folder changes attributable to the session were Codex desktop's own automatically managed state and log files under:

- `C:\Users\ericw\.codex\`

These are tool-managed metadata files rather than MazeRunner project assets or source files.

## Notable Architectural Characteristics

- The app is intentionally backend-light and fast to iterate on.
- Most domain intelligence currently lives in generation logic inside `template.html` and the scenario modules.
- The system is heavily data-driven even though the source currently sits in a single large template file plus three inlined JS modules.
- The benchmark layer and the generation layer are tightly integrated.
- Fantasy mode is implemented as a semantic and visual overlay rather than a forked code path.
- The final deliverable remains a single portable HTML file even after the asset-optimization pass.

## Current Strengths

- Strong standalone usability.
- Repeatable seeded generation.
- Broad mission and scoring system.
- Good support for comparative analytics without external infrastructure.
- Increasing domain realism from research incorporation.
- Effective fantasy-mode transformation while keeping enterprise structure intact.
- Human-playable fantasy challenge layer.
- Much smaller portable build artifact after optimization.

## Current Constraints

- The main app source is still concentrated in a very large `template.html`, which makes some changes harder to isolate.
- Persistence is local only.
- There is no external evaluation API or remote orchestration layer yet.
- Runtime behavior is still closely coupled to the generation layer.
- Mobile behavior has improved, but broader device coverage and more screens should still be reviewed.

## Recommended Next Steps

- Continue tightening each domain one module or workstream at a time after the broad structural pass.
- Expand mobile verification beyond the dashboard to deeper in-instance screens.
- Consider incrementally extracting more generation logic from `template.html` into focused modules if maintainability becomes a bottleneck.
- Consider documenting a formal blueprint schema if the hidden/generated app model is intended to become a stable artifact.
- Profile runtime-heavy areas separately from build size now that the single-file optimization pass is in place.

## Quick Reference Commands

Install dependencies:

```bash
npm.cmd install
```

Run the standalone app:

```bash
npm.cmd start
```

Build only:

```bash
npm.cmd run build:standalone
```

Run Playwright tests:

```bash
npm.cmd run test:e2e
```
