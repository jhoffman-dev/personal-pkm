# Unified Task Backlog

Last updated: 2026-03-04  
Source trackers: [workbench-redesign-tracker.md](workbench-redesign-tracker.md), [codebase-cleanup-tracker.md](codebase-cleanup-tracker.md)

## Purpose

Keep a single, durable list of open and deferred tasks so work does not get lost between sessions.

## Current Priority Rule

1. Workbench layout delivery remains the active priority.
2. Non-layout improvements are tracked here as deferred until layout milestones are locked.

## Active Priority Tasks (Layout)

| ID    | Task                                                                                                                                                                                                    | Source                                                                                               | Status      | Priority | Suggested GitHub issue title                            | GitHub issue |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- | -------- | ------------------------------------------------------- | ------------ |
| WB-01 | Complete Phase 1 sign-off decisions (region map, app bar controls, right sidebar behavior, bottom panel behavior, split/tile model, keyboard contract, persistence reset behavior, mobile fallback).    | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 1 sign-off checklist)          | In progress | P0       | Workbench: complete Phase 1 shell sign-off decisions    | TBD          |
| WB-07 | Define and implement sidebar interaction contract for tiled workbench flow (rail intent, contextual inner sidebar, and explicit open-in-pane/tab actions) to replace implicit route-overwrite behavior. | User workflow feedback (2026-03-04) + [workbench-redesign-tracker.md](workbench-redesign-tracker.md) | In progress | P0       | Workbench: redesign sidebar-to-editor interaction model | TBD          |
| WB-02 | Execute Phase 2 typography and contrast token pass for shell readability.                                                                                                                               | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 2)                             | Not started | P0       | Workbench: apply typography and contrast foundation     | TBD          |
| WB-03 | Implement integrated window tabstrip spike (initial component and placement in center workbench).                                                                                                       | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 5 prep)                        | In progress | P1       | Workbench: add integrated tabstrip baseline             | TBD          |
| WB-04 | Implement initial tiled editor group support.                                                                                                                                                           | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 5)                             | In progress | P1       | Workbench: add initial tiled editor groups              | TBD          |
| WB-05 | Harmonize core pages with shell spacing/container rules.                                                                                                                                                | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 8)                             | Not started | P1       | Workbench: harmonize page layouts with shell            | TBD          |
| WB-06 | Run full UX and regression validation pass (keyboard, persistence, responsive behavior, lint/test/manual smoke).                                                                                        | [workbench-redesign-tracker.md](workbench-redesign-tracker.md) (Phase 9)                             | Not started | P1       | Workbench: run final UX and regression validation       | TBD          |

## Deferred Follow-ups (Not Current Priority)

| ID    | Task                                                                                                                                                                     | Source                                                                                                     | Why deferred now                                                                       | Resume trigger                                                   | Suggested GitHub issue title                                          | GitHub issue |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | ------------ |
| DF-01 | Bridge Electron main-process and backend/server logs into the bottom `Output` panel via `preload` + IPC, then merge into the renderer runtime stream.                    | Session note (2026-03-04)                                                                                  | Layout work is higher priority right now.                                              | Start after layout milestones stabilize.                         | Output panel: ingest Electron main/backend logs via IPC               | TBD          |
| DF-02 | Add notes image-ingest workflow for remote `http/https` image URLs, upload to Firebase Storage, and rewrite note HTML `img[src]` to first-party URLs.                    | [codebase-cleanup-tracker.md](codebase-cleanup-tracker.md) (Notes section, deferred product follow-up)     | Outside the completed Redux migration scope.                                           | Resume after layout MVP stabilization.                           | Notes: import and rewrite remote image URLs                           | TBD          |
| DF-03 | Refactor `objects-page-field-drafts` to remove targeted `react-hooks/set-state-in-effect` suppression with an effect-free draft hydration pattern.                       | [codebase-cleanup-tracker.md](codebase-cleanup-tracker.md) (Notes section, deferred code-health follow-up) | Deferred until after migration and shell stabilization.                                | Resume after layout MVP stabilization.                           | Objects: remove effect-based draft hydration suppression              | TBD          |
| DF-04 | Integrate object-type-specific custom sidebars into the unified workbench inner-sidebar model so those object workflows remain accessible under rail-context navigation. | User workflow note (2026-03-04)                                                                            | Requires broader sidebar architecture rework; deferred to protect WB-07 stabilization. | Resume after WB-07 behavior stabilizes and sign-off is complete. | Workbench: unify object-type custom sidebars with inner sidebar model | TBD          |

## GitHub Issue Sync Plan

When GitHub issue automation/integration is available:

1. Create one issue per row where status is not complete.
2. Prefix issue titles with the backlog ID (`WB-*`, `DF-*`).
3. Copy source context and acceptance criteria from the referenced tracker.
4. Fill the `GitHub issue` column with the issue URL.
5. Keep this file as the source of truth for cross-tracker triage history.

## Ready-to-Copy GitHub Issue Drafts

Target repository: `jhoffman-dev/personal-pkm`

### WB-01 — Workbench: complete Phase 1 shell sign-off decisions

Suggested labels: `workbench`, `planning`, `priority:P0`

```md
## Summary

Complete and document Phase 1 shell sign-off decisions for the workbench redesign.

## Source

- Backlog ID: WB-01
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Approve workspace region map (top/left/center/right/bottom)
- [ ] Approve app bar control set
- [ ] Approve right sidebar behavior (dock/collapse/resize)
- [ ] Approve bottom panel behavior (dock/collapse/resize/panel tabs)
- [ ] Approve split/tile interaction model for initial implementation
- [ ] Approve keyboard shortcut contract
- [ ] Approve persistence keys + reset behavior
- [ ] Approve mobile fallback behavior

## Acceptance Criteria

- [ ] All Phase 1 sign-off checklist items are explicitly marked approved or adjusted in tracker.
- [ ] Any scope changes are reflected in docs/architecture/workbench-redesign-tracker.md.
```

### WB-07 — Workbench: redesign sidebar-to-editor interaction model

Suggested labels: `workbench`, `ux`, `planning`, `priority:P0`

```md
## Summary

Redesign left-rail/sidebar interactions so split-workbench behavior matches editor-style workflows (VS Code/Obsidian-like): rail selects context, inner sidebar offers targets, and user chooses explicit open destination.

## Source

- Backlog ID: WB-07
- Source note: user workflow feedback on 2026-03-04
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Finalize shell state model (`activeRailModeId`, per-mode inner sidebar state memory, `activeOpenTarget`)
- [ ] Define left rail intent semantics (context switch vs immediate editor navigation)
- [ ] Define contextual inner sidebar responsibilities for each rail mode
- [ ] Define explicit open actions (`replace in active pane`, `open in other pane`, `open as tab in active pane`)
- [ ] Define single-pane auto-split behavior for `open in other pane`
- [ ] Define split-pane route memory behavior for cross-feature switches
- [ ] Define migration path from current route-click behavior with minimal regressions

## Acceptance Criteria

- [ ] Navigation intent model is documented and signed off before implementation.
- [ ] Rail click is non-destructive (no implicit pane content replacement).
- [ ] Inner sidebar supports explicit open actions for active/other/tab destinations.
- [ ] Existing split foundations (pane scope/tab isolation) remain stable through rollout.
- [ ] Deep links and direct route navigation remain backward compatible.
- [ ] Manual split workflow smoke checks pass across Notes + Tasks + at least one additional feature.
```

### WB-02 — Workbench: apply typography and contrast foundation

Suggested labels: `workbench`, `ui`, `priority:P0`

```md
## Summary

Implement Phase 2 typography and contrast baseline for the workbench shell.

## Source

- Backlog ID: WB-02
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Tune typography scale/density for shell readability
- [ ] Adjust shell contrast using existing theme tokens
- [ ] Harmonize shell spacing rhythm

## Constraints

- Use existing design tokens and theme primitives only.
- No net-new color system.

## Acceptance Criteria

- [ ] Light and dark themes both reviewed and acceptable.
- [ ] Changes are confined to typography/contrast baseline work.
```

### WB-03 — Workbench: add integrated tabstrip baseline

Suggested labels: `workbench`, `ui`, `priority:P1`

```md
## Summary

Add an initial integrated tabstrip component in the center workbench region.

## Source

- Backlog ID: WB-03
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Define tabstrip component structure
- [ ] Mount tabstrip in center workbench shell area
- [ ] Keep existing route behavior stable

## Out of Scope

- Full tiled editor implementation
- Final visual polish pass

## Acceptance Criteria

- [ ] Tabstrip is integrated into shell (not floating-card style).
- [ ] Existing navigation and editing workflows remain functional.
```

### WB-04 — Workbench: add initial tiled editor groups

Suggested labels: `workbench`, `ui`, `priority:P1`

```md
## Summary

Implement the first version of tiled editor groups in the center workbench.

## Source

- Backlog ID: WB-04
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Add baseline group model for split layout
- [ ] Render at least one non-single-pane arrangement
- [ ] Preserve active route content rendering in active pane

## Acceptance Criteria

- [ ] Basic split layout works reliably.
- [ ] No regressions in core page rendering.
```

### WB-05 — Workbench: harmonize page layouts with shell

Suggested labels: `workbench`, `ui`, `priority:P1`

```md
## Summary

Align core pages with shell spacing/container rules so they feel cohesive with the new workbench.

## Source

- Backlog ID: WB-05
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Audit core pages for shell alignment issues
- [ ] Apply targeted spacing/container updates per page
- [ ] Remove obvious disjoint card framing against shell

## Acceptance Criteria

- [ ] Core pages visually align with shell rhythm and layout boundaries.
- [ ] No feature behavior regressions introduced.
```

### WB-06 — Workbench: run final UX and regression validation

Suggested labels: `workbench`, `qa`, `priority:P1`

```md
## Summary

Execute final validation pass for workbench shell behavior and regressions.

## Source

- Backlog ID: WB-06
- Tracker: docs/architecture/workbench-redesign-tracker.md

## Scope

- [ ] Keyboard behavior validation
- [ ] Persistence behavior validation
- [ ] Responsive behavior validation
- [ ] Automated checks (lint + tests)
- [ ] Manual smoke checks (navigation + assistant + notes)

## Acceptance Criteria

- [ ] Validation checklist completed and logged in tracker.
- [ ] No major regressions remain open.
```

### DF-01 — Output panel: ingest Electron main/backend logs via IPC

Suggested labels: `deferred`, `workbench`, `electron`, `priority:P2`

```md
## Summary

Bridge Electron main-process and backend/server logs into the bottom Output panel via preload + IPC.

## Source

- Backlog ID: DF-01
- Source note: docs/architecture/task-backlog.md

## Why Deferred

Layout delivery is currently the higher priority track.

## Scope (when resumed)

- [ ] Add preload IPC bridge for log events
- [ ] Stream Electron main/backend logs to renderer
- [ ] Merge IPC stream into existing runtime output stream
- [ ] Surface combined logs in Output panel

## Acceptance Criteria

- [ ] Output panel includes renderer + main + backend logs with source attribution.
- [ ] No security regressions in preload exposure model.
```

### DF-02 — Notes: import and rewrite remote image URLs

Suggested labels: `deferred`, `notes`, `storage`, `priority:P2`

```md
## Summary

Add a user-triggered notes image-ingest workflow for remote URLs and rewrite note HTML to first-party storage URLs.

## Source

- Backlog ID: DF-02
- Tracker: docs/architecture/codebase-cleanup-tracker.md

## Why Deferred

Outside current layout-priority scope.

## Scope (when resumed)

- [ ] Detect remote image URLs (`http/https`) in note content
- [ ] Upload selected images to Firebase Storage under user/note path
- [ ] Rewrite note HTML `img[src]` to stored download URLs
- [ ] Preserve current editing flow and note integrity

## Acceptance Criteria

- [ ] Imported notes stop depending on external hotlinked images.
- [ ] Rewritten image URLs load from first-party storage.
```

### DF-03 — Objects: remove effect-based draft hydration suppression

Suggested labels: `deferred`, `code-health`, `objects`, `priority:P2`

```md
## Summary

Refactor draft hydration in objects page fields to remove targeted `react-hooks/set-state-in-effect` suppression.

## Source

- Backlog ID: DF-03
- Tracker: docs/architecture/codebase-cleanup-tracker.md

## Why Deferred

Deferred until post-migration and shell stabilization.

## Scope (when resumed)

- [ ] Replace effect-driven draft reset path with effect-free hydration approach
- [ ] Remove targeted lint suppression in objects-page-field-drafts
- [ ] Keep existing draft UX behavior unchanged

## Acceptance Criteria

- [ ] Suppression is removed without introducing render-loop or draft-regression bugs.
- [ ] Lint remains clean for related files.
```

## Quick Add Template

- ID:
- Task:
- Source:
- Status:
- Priority:
- Why deferred now (if deferred):
- Resume trigger:
- Suggested GitHub issue title:
- GitHub issue:

## User Intake Queue (Relevance-Aware)

Use this section for items you want remembered and surfaced when they are contextually relevant during active development.

### Quick Capture (User-Friendly)

When you want to add an item quickly, add a plain bullet under **Raw User Capture**.

- No ID needed
- No tags needed
- No candidate track needed
- No blocker/state fields needed

Copilot will normalize those bullets into the table, assign unique `UI-*` IDs, and fill the other fields.

### Raw User Capture (Add Here)

- _(Add new items as plain bullets; Copilot will convert them to structured rows.)_

### Copilot Relevance Protocol

When a new implementation request comes in, Copilot should:

1. Read items from **Raw User Capture**, **Active Queue**, and **Completed Intake Items**.
2. Assign new IDs by incrementing from the current highest `UI-*` value (avoid collisions).
3. Normalize raw bullets into structured rows (tags, timing, candidate track, blockers, state) in **Active Queue**.
4. Identify active work-area tags (for example: `sidebar`, `app-bar`, `notes`, `bottom-panel`, `wb-07`).
5. Propose only matching items from **Active Queue** with `Suggest when` = `now` or `soon` and state `queued`.
6. After implementation, remove the item from **Active Queue** and append it to **Completed Intake Items** with completion date and validation notes.
7. On approval, promote qualifying items into active backlog rows (`WB-*`/`DF-*`) when needed.

### Active Queue (Not Yet Implemented)

Only items in this table are pending implementation.

| ID  | Item | Tags (for relevance matching) | Suggest when | Candidate track | Blocked by | State |
| --- | ---- | ----------------------------- | ------------ | --------------- | ---------- | ----- |

### Completed Intake Items (Implemented)

Implemented items are moved here immediately so the active queue only shows pending work.

| ID    | Item                                                                                                                 | Completed on | Validation                            | Verification status    | Notes                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| UI-01 | Window next to the left sidebar runs off the screen and needs horizontal scroll to view content.                     | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Added shell shrink/overflow guards.                                                                    |
| UI-02 | `Ctrl/Cmd+Click` on entity rows in left sidebar should open in a new tab (for example People).                       | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Implemented explicit open-target behavior in sidebar flows.                                            |
| UI-03 | Selected tile indicator causes search bar to shift based on label length.                                            | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Tile indicator moved to fixed-width truncated slot.                                                    |
| UI-04 | App bar is not full width; appears constrained beside side rail/inner sidebar.                                       | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | App bar moved to full-width top shell row.                                                             |
| UI-05 | Remove Route Timing button from app bar (already available in bottom bar).                                           | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Removed floating Route Timing trigger from `layout`; bottom-panel tab remains.                         |
| UI-06 | "Delete same title" should not ship in production UX; move to dev tools area in bottom bar.                          | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Moved from Notes page to bottom-panel `Dev Tools` tab (DEV-only).                                      |
| UI-07 | Move "Delete note" action to bottom properties area as "Delete Note" and add right-click delete option in note list. | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Moved `Delete Note` to properties bottom and added right-click delete in sidebar notes list (confirm). |
| UI-08 | Move properties panel into a bottom bar tab instead of per-tile screen area.                                         | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Added bottom-panel `Properties` tab host and moved Notes properties rendering into that tab.           |
| UI-09 | Search area should float more centrally (VS Code-like) and not consume all available horizontal space.               | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Search constrained to centered max-width region.                                                       |
| UI-10 | Move Back/Forward controls next to search and keep tile indicator pinned to the left side (VS Code-like ordering).   | 2026-03-04   | `npm run lint && npm run test` (pass) | needs manual UX verify | Back/Forward grouped with search; title remains left anchored.                                         |

### Quick Add Templates

- User quick-add bullet: `- <item>`
- Copilot structured row: `| UI-XX | <item> | <tag1>, <tag2>, <tag3> | now/soon/later | <WB-## or DF> | <blocker or none> | queued |`
