# Workbench Redesign Tracker (Notion x VS Code)

Last updated: 2026-03-05  
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

- [x] **Phase 1 — Shell UX contract (completed)**
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
        - [x] Rail click is non-destructive (no implicit pane content replacement).
        - [x] Inner sidebar supports explicit open actions for active/other/tab destinations.
        - [x] Single-pane to split auto-promotion for `open in other pane` is defined and implemented.
        - [x] Active pane identity, pane-scoped tabs, and selected-note isolation remain stable.
        - [x] Deep links and direct route navigation remain backward compatible.
        - [x] Manual split workflow smoke checks pass across Notes + Tasks + at least one additional feature.
  - Checklist:
    - [x] Define target regions and composition contract
    - [x] Define interaction/resize/persistence model
    - [x] Sign off contract and decision record (retroactive approval)
  - **Phase 1 sign-off checklist (required before Phase 2+)**
    - [x] Region map is approved (top, left, center, right, bottom)
    - [x] App bar control set is approved (back/forward, search, layout toggles)
    - [x] Right sidebar AI behavior is approved (dock, collapse, resize)
    - [x] Bottom panel behavior is approved (dock, collapse, resize, panel tabs)
    - [x] Split/tile interaction model is approved for initial implementation
    - [x] Keyboard shortcut contract is approved
    - [x] Persistence keys and reset behavior are approved
    - [x] Mobile fallback behavior is approved (single-pane priority + toggle access)
  - **Phase 1 sign-off decisions (approved 2026-03-04)**
    - **Region map**: keep top app bar, left navigation sidebar, center workbench (single/split), right assistant sidebar, and docked bottom panel.
    - **App bar controls**: keep back/forward, centered search, split toggle, bottom/right region toggles, and theme toggle.
    - **Right sidebar behavior**: keep docked assistant host with collapse toggle and drag resize persistence.
    - **Bottom panel behavior**: keep docked in-flow panel with route timing/output/properties/dev tools tabs, collapse toggle, and drag resize persistence.
    - **Split/tile baseline**: keep dual-pane split with active-pane focus semantics and pane-scoped route/tab memory for initial implementation.
    - **Keyboard contract**: approve `Cmd/Ctrl+B`, `Cmd/Ctrl+Alt+B`, `Cmd/Ctrl+J`, and `Cmd/Ctrl+\\`.
    - **Persistence/reset**: approve existing v1 keys; reset behavior remains explicit local storage clear/manual dev reset for this phase (no additional UI in scope).
    - **Mobile fallback**: approve single-pane priority with existing sidebar/toggle access and no additional mobile-specific shell redesign in this phase.
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

- [x] **Phase 2 — Typography and contrast foundation**
  - Deliverables:
    - Typography scale/density tuned for readability
    - Contrast adjustments for professional workspace feel
    - Updated shell spacing rhythm
  - Focus files:
    - `src/index.css`
    - `src/App.css` (if needed)
  - Exit criteria:
    - Visual baseline approved in both light/dark themes
  - _Sign-off basis_: implementation complete for listed touchpoints plus repeated regression passes (`npm run lint && npm run test`), with reviewer approval recorded below.
  - **Phase 2 manual sign-off checklist (Light + Dark)**
    - [x] App bar title/search text and placeholders are readable at normal zoom.
    - [x] Left sidebar section labels and metadata (including destination hint) are readable without strain.
    - [x] Right assistant sidebar conversation text hierarchy is clear (title vs preview vs metadata).
    - [x] Bottom panel tab labels and hotkey hint are legible in both inactive and active states.
    - [x] Notes editor body text feels balanced (weight/size/line-height and paragraph block spacing).
    - [x] Notes page title and body maintain clear visual hierarchy without oversized jumps.
    - [x] Properties panel small text (`text-xs`) remains readable in both themes.
    - [x] Border/input contrast is sufficient to distinguish panel and card boundaries.
    - [x] Hover/active/focus states are visible for app bar, tabstrip, and bottom-panel controls.
    - [x] No obvious light/dark contrast regressions across core pages (Notes, Tasks, Projects).
  - **Phase 2 sign-off record**
    - Reviewer: James Hoffman
    - Date: 02-04-2026
    - Theme pass result: Light [x] / Dark [x]
    - Follow-up token nits (if any): None observed in current pass.

- [x] **Phase 3 — Workbench shell container**
  - Deliverables:
    - New shell layout host with both sidebars and bottom panel regions
    - Route outlet mounted inside center workbench host
  - Focus files:
    - `src/blocks/app-sidebar/layout.tsx`
    - `src/components/ui/sidebar.tsx` (reuse/adapt)
  - Exit criteria:
    - Stable layout with left/center/right + bottom structure

- [x] **Phase 4 — Full-width app bar redesign**
  - Deliverables:
    - Full-width app bar with navigation, search, layout controls
  - Focus files:
    - `src/components/app-bar.tsx`
  - Exit criteria:
    - App bar controls functional and aligned with shell regions

- [-] **Phase 5 — Integrated tabstrip and tiled editor groups**
  - Deliverables:
    - Clean window-integrated tabstrip
    - Editor group model that supports more than one split level
    - Saved workspace layout presets and switcher (restore tile layouts)
  - Focus files:
    - `src/blocks/app-sidebar/layout.tsx`
    - `src/components/workbench-tabstrip.tsx`
    - `src/components/app-bar.tsx`
    - `src/lib/*workbench*` state/persistence modules
  - Exit criteria:
    - Tabs feel part of window shell and split behavior is stable for 1/2/3+ panes
    - Workspace switcher can save, restore, rename, and delete tile layouts
    - Layout restore survives reload and missing-route fallback safely
  - Remaining Phase 5 checklist:
    - [x] Tabstrip baseline integrated into shell
    - [x] Two-pane split baseline with active-pane routing
    - [ ] Multi-split support beyond a single split (3+ pane topology)
    - [ ] Close/merge pane actions with deterministic focus handoff
    - [ ] Saved layout schema + migration guardrails
    - [ ] App bar workspace switcher (save/load layout presets)

- [-] **Phase 6 — Right assistant sidebar**
  - Deliverables:
    - Assistant/chat hosted in right sidebar region
    - Functional composer/send flow (not history-only)
    - Conversation selection that updates visible thread state
  - Focus files:
    - `src/blocks/app-sidebar/app-sidebar-assistant-section.tsx`
    - `src/lib/ai-client.ts`
    - `src/lib/assistant-storage.ts`
    - `src/features/assistant/*`
  - Exit criteria:
    - Sidebar assistant supports create/send/respond loop from the docked region
    - History row selection reliably opens the selected conversation
    - Loading/error/empty states are explicit and non-blocking

- [x] **Phase 7 — Bottom panel host**
  - Deliverables:
    - Docked bottom panel with tabbed views
    - Route timing moved from floating overlay to panel view
  - Focus files:
    - `src/components/dev-route-timing-panel.tsx`
    - shell/panel host components
  - Exit criteria:
    - Bottom panel open/close, resize, and view switching are stable

- [-] **Phase 8 — Page harmonization**
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

## Remaining Delivery Map (Execution Order)

1. **Finish Phase 5 core tiling**

- Expand editor groups from one split to recursive multi-split (3+ panes), including add/remove pane operations.
- Lock keyboard + app-bar split behavior against the new topology.

2. **Add workspace layout switcher and saved presets**

- Define persisted workspace layout schema (active preset + preset list + pane graph + per-pane route state).
- Add app-bar switcher UI to save/load/rename/delete presets.

3. **Re-complete Phase 6 assistant sidebar behavior**

- Replace history-only behavior with real message composer + send path and thread rendering.
- Ensure conversation history selection drives active thread content in the sidebar host.

4. **Close remaining Phase 8 polish deltas**

- Remove final shell/page mismatch items (spacing, borders, panel rhythm, route-edge visual quirks).

5. **Execute Phase 9 validation gate**

- Keyboard, persistence, resize, and responsive checks + lint/test + manual smoke across split/layout/assistant flows.

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
- 2026-03-04: Addressed `UI-01` horizontal overflow in workbench shell by adding shrink constraints to `SidebarInset` (`min-w-0`) and x-overflow guards in `src/blocks/app-sidebar/layout.tsx` so center content no longer runs off-screen beside sidebars; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-04` app bar width constraint by restructuring `src/blocks/app-sidebar/layout.tsx` so `AppBar` is rendered as a full-width top shell row and the sidebar/workbench region is rendered beneath it; updated `src/blocks/app-sidebar/app-sidebar.tsx` className merging to preserve base sidebar behavior while offsetting the sidebar container below the app bar; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-03` app-bar layout stability by moving the tile indicator into a fixed-width, truncated slot in `src/components/app-bar.tsx`, preventing search input horizontal shift when route/title labels vary in length; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-09` app-bar search placement by restructuring `src/components/app-bar.tsx` into left/center/right zones and constraining the search input to a centered max-width region so it no longer expands across all available horizontal space; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-10` app-bar ordering by moving Back/Forward controls into the centered search cluster and keeping the tile indicator anchored in the left-side slot in `src/components/app-bar.tsx` (VS Code-like control grouping); regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Closed `UI-05` as satisfied (Route Timing control is already absent from the app bar and remains available in the bottom panel), requiring no code change.
- 2026-03-04: Updated `docs/architecture/task-backlog.md` intake workflow so implemented `UI-*` items are removed from the active queue and tracked in a dedicated "Completed Intake Items" section to avoid ambiguity between pending vs completed tasks.
- 2026-03-04: Finalized `UI-05` by removing the floating Route Timing entry point rendered near the FAB (`<DevRouteTimingPanel />` in `src/blocks/app-sidebar/layout.tsx` when bottom panel was closed), leaving Route Timing available only in the docked bottom-panel tab; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-06` by removing the "Delete same title" button from `src/pages/notes-page.tsx` and moving it into a new bottom-panel `Dev Tools` view (`src/components/dev-notes-tools-panel.tsx`) wired through `src/blocks/app-sidebar/layout.tsx` as a DEV-only tab; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-07` by moving the Notes page delete action into the bottom properties area as `Delete Note` (`src/pages/notes-page.tsx`) and adding right-click note deletion (with confirmation) in the sidebar notes list (`src/blocks/app-sidebar/app-sidebar-notes-section.tsx` + `src/blocks/app-sidebar/app-sidebar.tsx`); regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Fixed shell scroll containment by constraining the authenticated workspace to viewport height (`src/components/firebase-auth-gate.tsx`) and enforcing overflow-hidden pane boundaries in `src/components/ui/sidebar.tsx`, `src/blocks/app-sidebar/layout.tsx`, `src/components/app-bar.tsx`, and `src/pages/notes-page.tsx`, so app bar/sidebars stay pinned while content and properties scroll inside the workbench window; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Marked `UI-08` as unblocked in `docs/architecture/task-backlog.md` (blocked by `none`) because the bottom-panel tab host is already in place.
- 2026-03-04: Reworked bottom-panel composition in `src/blocks/app-sidebar/layout.tsx` from absolute overlay to docked in-flow layout so opening the panel now reduces the editor/content region height (VS Code-style) instead of covering content; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Addressed `UI-08` by adding a persisted bottom-panel `Properties` tab in `src/blocks/app-sidebar/layout.tsx` and moving Notes properties rendering from the right-side column into the docked bottom-panel host via shared workbench context + portal wiring (`src/lib/workbench-bottom-panel.tsx`, `src/pages/notes-page.tsx`); regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Extended the shared bottom-panel `Properties` host across object pages by moving Meetings/Projects/Tasks/People/Companies property sidebars into the same docked properties space via workbench bottom-panel context + portal rendering (`src/pages/meetings-page.tsx`, `src/pages/projects-page.tsx`, `src/pages/tasks-page.tsx`, `src/pages/people-page.tsx`, `src/pages/companies-page.tsx`) and generalizing the host context in `src/lib/workbench-bottom-panel.tsx`; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Started Phase 8 page harmonization by replacing legacy viewport-minus-app-bar wrappers with shell-native containers (`h-full min-h-0 overflow-hidden`) across core routes (`src/pages/assistant-page.tsx`, `src/pages/browser-page.tsx`, `src/pages/drawings-page.tsx`, `src/pages/graph-page.tsx`, `src/pages/meetings-page.tsx`, `src/pages/objects-page.tsx`, `src/pages/object-types-page.tsx`, `src/pages/projects-page.tsx`, `src/pages/people-page.tsx`, `src/pages/companies-page.tsx`, `src/pages/tasks-page.tsx`); regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Started Phase 2 typography/contrast foundation by tuning shared light/dark theme tokens and sidebar contrast in `src/index.css`, introducing shell rhythm variables (`--workbench-app-bar-height`, `--workbench-page-padding`) and applying them through `src/components/app-bar.tsx`, `src/blocks/app-sidebar/layout.tsx`, and top-level page wrappers (`src/pages/*.tsx`) for consistent shell density and spacing.
- 2026-03-04: Applied a focused Phase 2 shell polish pass for high-traffic readability and density by refining sidebar header metadata typography (`src/blocks/app-sidebar/app-sidebar.tsx`), increasing bottom-panel tab-label legibility and control hit area (`src/blocks/app-sidebar/layout.tsx`), and tightening tabstrip spacing/close-button affordance (`src/components/workbench-tabstrip.tsx`); regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Completed a focused light/dark contrast sweep in `src/index.css` with final token tuning for shell surfaces, muted text, borders/inputs, ring visibility, and sidebar contrast balance across themes; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Corrected a post-pass typography regression in note editing feel by removing global text-thinning pressure in `src/index.css` (restored neutral body rendering/spacing and neutral shell letter spacing) and retuning note editor base body metrics in `src/components/tiptap-templates/simple/simple-editor.scss` (size/weight/leading/paragraph rhythm) to better match the prior baseline and Notion-like readability; regression validation passed (`npm run lint && npm run test`).
- 2026-03-04: Finalized Phase 1 sign-off by approving all shell contract checklist decisions (region map, app bar controls, right/bottom panel behavior, split baseline, keyboard contract, persistence/reset policy, and mobile fallback baseline) and marking Phase 1 complete.
- 2026-03-04: Completed `WB-07` acceptance checklist sign-off after implementation review and workflow verification (non-destructive rail intent, explicit open targets, single-pane auto-split, pane-scope stability, deep-link compatibility, and split workflow smoke coverage).
- 2026-03-04: Added a Phase 2 manual light/dark sign-off checklist to this tracker so typography/contrast approval can be completed consistently and captured with explicit reviewer notes.
- 2026-03-04: Pre-filled the Phase 2 checklist with today’s validated outcomes (implementation + regression checks) and left reviewer/date as the remaining final sign-off fields.
- 2026-03-04: Phase 2 sign-off recorded (Reviewer: James Hoffman; Light/Dark approved; no follow-up token nits) and Phase 2 marked complete.
- 2026-03-04: Reconciled phased-plan status markers to match delivered work by marking Phase 3 (shell container), Phase 4 (full-width app bar), Phase 6 (right assistant sidebar), and Phase 7 (bottom panel host) as completed based on implemented behavior and previously logged validations.
- 2026-03-04: Reopened remaining work scope based on functional feedback: Phase 5 now explicitly tracks multi-split (3+ panes) and saved workspace layout switcher deliverables, and Phase 6 is back in progress until the right sidebar assistant supports an end-to-end chat loop (composer/send/thread rendering) instead of history-only behavior.
- 2026-03-05: Implemented a functional right-sidebar assistant chat baseline (`UI-11`) by extending sidebar assistant state with send/stream/error lifecycle and rendering a chat-mode panel (conversation list + active thread + composer) in `src/blocks/app-sidebar/app-sidebar-assistant-state.ts`, `src/blocks/app-sidebar/app-sidebar-assistant-section.tsx`, and `src/blocks/app-sidebar/layout.tsx`; added shell-level RAG document wiring for sidebar sends and validated with `npm run lint && npm run test`.
- 2026-03-05: Implemented left-sidebar resize support (`UI-16`) by adding a draggable separator on the left sidebar host and persisting width in workbench layout state (`pkm.workbench.layout.v1`) with min/max constraints in `src/blocks/app-sidebar/app-sidebar.tsx` and `src/blocks/app-sidebar/layout.tsx`; validated with `npm run lint && npm run test`.
- 2026-03-05: Addressed tabstrip integration polish items `UI-12` and `UI-13` by refactoring `src/components/workbench-tabstrip.tsx` to feel shell-integrated (non-button tab surfaces) and adding a VS Code-style active top highlight indicator, plus aligning Notes usage in `src/pages/notes-page.tsx`; validated with `npm run lint && npm run test`.

## Immediate Next Actions

1. Complete Phase 5 multi-split implementation (3+ panes + deterministic merge/focus behavior).
2. Implement workspace layout switcher with saved tile presets in app bar.
3. Complete right sidebar assistant functional pass (composer/send/thread state + error/loading UX).
4. Finish remaining Phase 8 shell/page harmonization polish items.
5. Run Phase 9 validation gate after items 1-4 are closed.

## Cross-Tracker Task Register

- Consolidated active + deferred items are tracked in [task-backlog.md](task-backlog.md).
