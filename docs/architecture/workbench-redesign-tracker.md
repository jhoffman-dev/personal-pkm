# Workbench Redesign Tracker (Notion x VS Code)

Last updated: 2026-03-04  
Source of standards: `.github/copilot-instructions.md`

## Status Legend

- [ ] Not started
- [-] In progress
- [x] Completed

## Objective

Create a cohesive workbench shell that combines:

- Notion-like readability (clean typography, calm contrast, low visual noise)
- VS Code-like structure (full-width app bar, integrated tabs, tiled editor regions, sidebars on both sides, bottom panel)

## Guardrails

- Keep architecture boundaries intact (Interface/Delivery layer for shell composition).
- Use existing theme tokens and UI primitives; do not hard-code new color systems.
- Preserve existing feature behavior while changing shell composition.
- Keep AI chat in the right sidebar as a first-class workspace region.

## Phased Plan

- [-] **Phase 1 — Shell UX contract (started)**
  - Deliverables:
    - Canonical workspace region map
    - Interaction and resize model
    - State persistence contract
    - Acceptance criteria for visual cohesion
  - **Phase 1 contract (v0.1)**
    - **Workspace regions**
      - `Top App Bar`: full-width, persistent
      - `Left Sidebar`: navigation + route-context list (existing app sidebar retained)
      - `Center Workbench`: tabstrip + active editor group host
      - `Right Sidebar`: assistant/chat panel host
      - `Bottom Panel`: diagnostics/tool views host
    - **Top App Bar composition**
      - Back/forward controls
      - Global search/quick-find input
      - Layout controls (split/tile presets)
      - Region toggles (left, right, bottom)
      - Theme toggle remains in bar
    - **Center Workbench composition**
      - Window-integrated tabstrip (no floating-card feel)
      - Editor group host for single and tiled layouts
      - Route content mounted inside active group/pane container
    - **Sidebar model**
      - Left: existing icon rail + contextual list behavior retained
      - Right: assistant conversations/chat, collapsible and width-resizable
    - **Bottom panel model**
      - Docked host (collapsed/expanded)
      - Tabbed panel views (Route Timing first)
      - Height-resizable when expanded
    - **Resize and layout rules**
      - Vertical splitters between left/center/right regions
      - Horizontal splitter between center workbench and bottom panel
      - Min-size constraints to prevent unusable panes
      - Persisted user-adjusted widths/heights
    - **Persistence contract (v1 keys)**
      - `pkm.workbench.layout.v1`
      - `pkm.workbench.right-sidebar.v1`
      - `pkm.workbench.bottom-panel.v1`
      - `pkm.workbench.bottom-panel-view.v1`
      - Existing sidebar cookie/state remains compatible
    - **Keyboard contract (target)**
      - `Cmd/Ctrl+B`: toggle left sidebar
      - `Cmd/Ctrl+Alt+B`: toggle right sidebar
      - `Cmd/Ctrl+J`: toggle bottom panel
      - `Cmd/Ctrl+\\`: split active editor group (phase 5)
    - **Sidebar interaction contract v1 (WB-07 draft)**
      - **Intent model**
        - Left rail click selects a `rail mode` (domain context), not an editor route.
        - Inner sidebar item click executes an explicit `open action`.
        - Open actions are: `replace in active pane`, `open in other pane`, `open as tab in active pane`.
      - **State model (shell-level)**
        - `activeRailModeId: string` — currently selected left-rail mode.
        - `railModeStateById: Record<string, { selectedItemId: string | null; query: string; expandedGroups: string[] }>` — per-mode inner sidebar state memory.
        - `activeOpenTarget: "active-pane" | "other-pane" | "active-pane-new-tab"` — default action for click/enter interactions.
        - Existing `editorGroupsState` remains source of truth for split and active pane identity.
        - Existing per-pane hidden route/tab memory remains source of truth for route restoration.
      - **Interaction rules (v1)**
        - Rail click updates `activeRailModeId` and shows contextual inner sidebar content; it must not rewrite center pane route by itself.
        - Inner sidebar primary action uses `activeOpenTarget` and always resolves an explicit destination pane.
        - `open in other pane` in single-pane mode auto-enables split and opens destination in secondary pane.
        - `open as tab in active pane` appends to active pane tab memory and focuses new tab content.
        - Pane focus and open-target defaults remain independent of rail mode switches.
        - Back/forward navigation applies to the active pane history only; it must not mutate inactive pane content.
      - **Fallback and compatibility rules**
        - If an item type has no dedicated editor route yet, inner sidebar action no-ops with user feedback rather than mutating pane state.
        - Existing route deep links remain valid and still hydrate active pane route on direct navigation.
      - **WB-07 contract acceptance checklist (implementation gate)**
        - [ ] Rail click is non-destructive (no implicit pane content replacement).
        - [ ] Inner sidebar supports explicit open actions for active/other/tab destinations.
        - [ ] Single-pane to split auto-promotion for `open in other pane` is defined and implemented.
        - [ ] Active pane identity, pane-scoped tabs, and selected-note isolation remain stable.
        - [ ] Deep links and direct route navigation remain backward compatible.
        - [ ] Manual split workflow smoke checks pass across Notes + Tasks + at least one additional feature.
  - Checklist:
    - [x] Define target regions and composition contract
    - [x] Define interaction/resize/persistence model
    - [ ] Sign off contract before visual implementation
  - **Phase 1 sign-off checklist (required before Phase 2+)**
    - [ ] Region map is approved (top, left, center, right, bottom)
    - [ ] App bar control set is approved (back/forward, search, layout toggles)
    - [ ] Right sidebar AI behavior is approved (dock, collapse, resize)
    - [ ] Bottom panel behavior is approved (dock, collapse, resize, panel tabs)
    - [ ] Split/tile interaction model is approved for initial implementation
    - [ ] Keyboard shortcut contract is approved
    - [ ] Persistence keys and reset behavior are approved
    - [ ] Mobile fallback behavior is approved (single-pane priority + toggle access)
  - **First PR implementation order (Phase 1a shell bootstrap)**
    - Scope:
      - Establish shell scaffolding and region hosts without changing feature logic
      - Keep visuals close to current baseline while creating structure for later phases
    - Ordered tasks:
      1. Add workbench shell container and region slots in `src/blocks/app-sidebar/layout.tsx`
      2. Introduce right-sidebar host (assistant placeholder mount) with collapse state
      3. Introduce bottom-panel host (route timing placeholder mount) with collapse state
      4. Expand `src/components/app-bar.tsx` with region toggles and placeholder search field
      5. Add persisted shell state model (`layout/right/bottom`) via localStorage keys
      6. Keep current route outlet behavior intact inside center workbench slot
    - Out of scope for this first PR:
      - Final typography/contrast pass
      - Full tabstrip redesign
      - Full tiled editor groups
      - Page-specific visual harmonization
    - PR acceptance criteria:
      - All five regions render and can be toggled
      - Existing navigation and page behavior remain unchanged
      - Lint/test remain green
      - No hard-coded new color system introduced
  - Affected files (when implementing):
    - `src/blocks/app-sidebar/layout.tsx`
    - `src/components/app-bar.tsx`
    - `src/components/ui/sidebar.tsx`
    - `src/components/dev-route-timing-panel.tsx`
    - `src/index.css`

- [ ] **Phase 2 — Typography and contrast foundation**
  - Deliverables:
    - Typography scale/density tuned for readability
    - Contrast adjustments for professional workspace feel
    - Updated shell spacing rhythm
  - Focus files:
    - `src/index.css`
    - `src/App.css` (if needed)
  - Exit criteria:
    - Visual baseline approved in both light/dark themes

- [ ] **Phase 3 — Workbench shell container**
  - Deliverables:
    - New shell layout host with both sidebars and bottom panel regions
    - Route outlet mounted inside center workbench host
  - Focus files:
    - `src/blocks/app-sidebar/layout.tsx`
    - `src/components/ui/sidebar.tsx` (reuse/adapt)
  - Exit criteria:
    - Stable layout with left/center/right + bottom structure

- [ ] **Phase 4 — Full-width app bar redesign**
  - Deliverables:
    - Full-width app bar with navigation, search, layout controls
  - Focus files:
    - `src/components/app-bar.tsx`
  - Exit criteria:
    - App bar controls functional and aligned with shell regions

- [-] **Phase 5 — Integrated tabstrip and tiled editor groups**
  - Deliverables:
    - Clean window-integrated tabstrip
    - Initial tiled editor group support
  - Focus files:
    - New workbench components under `src/components/` or `src/blocks/`
    - `src/pages/notes-page.tsx` (baseline behavior alignment)
  - Exit criteria:
    - Tabs feel part of window shell; basic split layouts work

- [ ] **Phase 6 — Right assistant sidebar**
  - Deliverables:
    - Assistant/chat hosted in right sidebar region
  - Focus files:
    - `src/blocks/app-sidebar/app-sidebar-assistant-section.tsx`
    - shell composition files
  - Exit criteria:
    - Chat workflow preserved and docked on right

- [ ] **Phase 7 — Bottom panel host**
  - Deliverables:
    - Docked bottom panel with tabbed views
    - Route timing moved from floating overlay to panel view
  - Focus files:
    - `src/components/dev-route-timing-panel.tsx`
    - shell/panel host components
  - Exit criteria:
    - Bottom panel open/close, resize, and view switching are stable

- [ ] **Phase 8 — Page harmonization**
  - Deliverables:
    - Main feature pages aligned with shell spacing and container rules
  - Focus files:
    - `src/pages/*.tsx` (targeted passes)
  - Exit criteria:
    - No disjoint card-like framing against the new shell

- [ ] **Phase 9 — Validation and polish**
  - Deliverables:
    - Keyboard pass, persistence pass, responsive behavior pass
    - Regression validation (`lint`, `test`, manual smoke)
  - Exit criteria:
    - No major regressions, shell behavior stable

## Progress Log

- 2026-03-03: Created this tracker and started Phase 1 by defining the shell UX contract (regions, interaction model, persistence keys, and acceptance boundaries).
- 2026-03-03: Expanded Phase 1 with a sign-off checklist and a first-PR implementation order (Phase 1a shell bootstrap) to begin execution with clear scope boundaries.
- 2026-03-03: Started Phase 1a implementation in code by adding shell region toggles and persisted right/bottom panel state in `src/blocks/app-sidebar/layout.tsx`, and expanding the full-width app bar controls in `src/components/app-bar.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Continued Phase 1a implementation by adding right-sidebar and bottom-panel resize handles plus keyboard toggles (`Cmd/Ctrl+Alt+B`, `Cmd/Ctrl+J`) in `src/blocks/app-sidebar/layout.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Docked Route Timing diagnostics into the bottom panel host by rendering `DevRouteTimingPanel` in docked mode and disabling the floating overlay while the bottom panel is open; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Added bottom-panel view switching scaffolding with persisted active tab state (`route-timing`/`output`) in `src/blocks/app-sidebar/layout.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Implemented a real `Output` bottom-panel view by adding renderer runtime log capture (`console`, `window error`, `unhandled rejection`) and wiring `Output` tab content to `DevOutputPanel`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Started integrated tabstrip baseline by adding reusable `WorkbenchTabstrip` and migrating notes tab rendering in `src/pages/notes-page.tsx` to the shared component for cleaner shell-consistent tabs.
- 2026-03-04: Continued integrated tabstrip rollout by removing Notes page floating card framing and switching `src/pages/notes-page.tsx` to a full-height shell-aligned container using `WorkbenchTabstrip` as the top workbench row.
- 2026-03-04: Started tiled-group scaffold in `src/blocks/app-sidebar/layout.tsx` by adding persisted two-group split state, draggable center splitter, active-group routing host behavior, and `Cmd/Ctrl+\\` / app-bar layout toggle wiring.
- 2026-03-04: Expanded tiled-group behavior in `src/blocks/app-sidebar/layout.tsx` with per-group route/title memory, focus actions that restore the group's last route, and split-pane header affordances using `WorkbenchTabstrip`.
- 2026-03-04: Added per-group tab-history semantics in `src/blocks/app-sidebar/layout.tsx` by persisting route-tab lists per pane and making split-pane tab headers route-selectable for each group.
- 2026-03-04: Simplified split-pane UX in `src/blocks/app-sidebar/layout.tsx` by removing per-pane tab-history headers and restoring low-overhead click-to-focus pane activation with retained per-pane route memory; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Reintroduced hidden per-pane tab memory in `src/blocks/app-sidebar/layout.tsx` (persisted/hydrated route-tab lists per split group with no visible tab chrome) so pane focus can restore routes based on each group's underlying open-tab history; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Implemented true dual-pane route hosting by rendering real route content in both split panes via a shared workbench route catalog (`src/routes/workbench-route-config.ts`, `src/routes/workbench-route-definitions.tsx`) and wiring `src/App.tsx` + `src/blocks/app-sidebar/layout.tsx` to the same route definitions; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Fixed split-pane Notes tab mirroring by introducing pane-scoped notes tab state (primary/secondary scope maps in `src/features/notes/state/notes-tabs-store.ts`), binding Notes page tab facade usage to pane scope context, and syncing active pane scope in `src/blocks/app-sidebar/layout.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Fixed Notes runtime loop in split mode (black-screen/maximum update depth) by making global selected-note synchronization run only from the active pane scope in `src/pages/notes-page.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Captured split-navigation workflow gap: left-rail route clicks currently replace active pane content directly, which conflicts with the target VS Code/Obsidian-style model (rail selects context, inner sidebar drives explicit open-in-pane/tab actions). Added as a high-priority backlog task to avoid destabilizing current split-host foundations while the interaction contract is redesigned.
- 2026-03-04: Drafted `WB-07` sidebar interaction contract v1 in this tracker (intent model, shell state model, interaction/fallback rules, and implementation gate checklist) so upcoming changes can proceed via explicit acceptance criteria instead of ad-hoc behavior tweaks.
- 2026-03-04: Implemented first `WB-07` interaction slice: left rail clicks are now context-only (no implicit route navigation), and Notes/Tasks inner sidebar clicks now support explicit open targets (`replace active pane`, `open in other pane` via Alt/Option, `open as tab in active pane` via Cmd/Ctrl). Wiring added from sidebar into layout pane-routing logic with auto-split on `open in other pane`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Implemented second `WB-07` interaction slice by extending explicit open-target actions to Meetings, Projects, Companies, and People sidebar item clicks (same modifier contract as Notes/Tasks) while preserving rail context-only behavior and layout-level pane routing; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Added lightweight open-target visibility in sidebar header (`Destination: Active/Other/New tab`) with live modifier-key awareness in `src/blocks/app-sidebar/app-sidebar.tsx` to improve discoverability of WB-07 click behavior; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Logged object-type custom-sidebar accessibility gap as deferred follow-up (`DF-04`) to be addressed after WB-07 stabilization, avoiding high-risk sidebar architecture churn during current interaction-model rollout.

## Immediate Next Actions

1. Confirm Phase 1 sign-off checklist items and lock remaining scope boundaries.
2. Review and sign off `WB-07` sidebar interaction contract v1 (rail intent, inner sidebar responsibilities, explicit open targets, and split-pane routing semantics).
3. Start Phase 2 typography/contrast pass once interaction and shell sign-off boundaries are locked.
4. Continue tiled-group maturation with pane-identity polish and manual UX validation on dual-host navigation behavior.

## Cross-Tracker Task Register

- Consolidated active + deferred items are tracked in [task-backlog.md](task-backlog.md).
