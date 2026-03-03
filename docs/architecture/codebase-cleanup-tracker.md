# Codebase Cleanup Tracker

Last updated: 2026-03-03
Source of standards: `.github/copilot-instructions.md`

## Status Legend

- [ ] Not started
- [-] In progress
- [x] Completed

## Cleanup Actions

### State Management Track — Redux to Zustand (Phased)

- [ ] **Phase 0: Baseline and guardrails (no runtime changes)**
  - Scope:
    - Document current Redux responsibilities by slice (data, notesTabs, tasksView).
    - Define migration constraints: no behavior changes, no UI regressions, no cross-feature rewrites.
    - Add/expand tests around current reducer and selector behavior where coverage is thin.
  - Rollback point:
    - No production code path changes in this phase.
  - Exit criteria:
    - Baseline behavior documented and protected by tests.

- [ ] **Phase 1: Migrate UI-only state slices first**
  - Scope:
    - Migrate `notesTabs` and `tasksView` from Redux to feature-scoped Zustand stores.
    - Keep CRUD entity state (`projects`, `notes`, `tasks`, `meetings`, `companies`, `people`) on Redux.
    - Keep persistence behavior (localStorage keys and hydration semantics) unchanged.
  - Rollback point:
    - UI slices can be switched back to Redux by restoring old hooks/imports.
  - Exit criteria:
    - No use of Redux actions/selectors for `notesTabs`/`tasksView` in pages/components.
    - Existing behavior parity verified manually and with tests.

- [ ] **Phase 2: Create a data-access facade before any entity-store migration**
  - Scope:
    - Introduce stable feature-level hooks/selectors (facade) so pages no longer depend directly on Redux action creators or slice structure.
    - Route existing Redux reads/writes through that facade.
  - Rollback point:
    - Redux remains backend state engine; facade is additive.
  - Exit criteria:
    - Pages/components consume facade APIs rather than direct Redux slice internals.

- [ ] **Phase 3: Pilot one entity domain on Zustand**
  - Scope:
    - Pick one low-risk entity domain (recommended: `people` or `companies`) and migrate only that domain to Zustand through the facade.
    - Preserve async/error/status semantics currently provided by thunks.
  - Rollback point:
    - Feature flag or adapter switch can route domain back to Redux implementation.
  - Exit criteria:
    - Pilot domain stable through normal workflows, no regression in related screens.

- [ ] **Phase 4: Decide final direction (hybrid vs full migration)**
  - Scope:
    - Evaluate complexity, readability, defect rate, and velocity after pilot.
    - Choose one path:
      - Keep hybrid model (Zustand for UI/local state, Redux for relational entity graph), or
      - Continue gradual entity-domain migrations.
  - Rollback point:
    - Stop at hybrid model if full migration cost outweighs value.
  - Exit criteria:
    - Decision recorded in `DECISIONS.md` with rationale and tradeoffs.

- [ ] **Phase 5 (optional): Full entity migration and Redux removal**
  - Scope:
    - Migrate remaining entity domains one-by-one via facade.
    - Remove Redux provider, Redux dependencies, and unused store modules only after all consumers are migrated.
  - Rollback point:
    - Per-domain rollback remains available until final dependency removal.
  - Exit criteria:
    - No runtime Redux dependency paths remain.

- [ ] **Cross-phase validation requirements**
  - Preserve Clean Architecture boundaries during migration.
  - No mixed refactor+feature work in same PR unless required for safety.
  - Run `npm run test` and `npm run lint` on each migration phase.
  - Update architecture docs and progress log after each completed phase.

### P0 — Architecture Boundary Fixes

- [x] **Extract backend application layer for AI routes**
  - Scope: Move route orchestration from `backend/server.cjs` into use cases + ports, and wire adapters at bootstrap.
  - Implemented:
    - `backend/application/assistant-chat-use-cases.cjs`
    - `backend/infrastructure/ai/ai-gateway.cjs`
    - `backend/infrastructure/storage/firestore-assistant-chat-repository.cjs`
    - `backend/server.cjs` now delegates orchestration to use cases
  - Success criteria:
    - Routes only validate/map HTTP.
    - Core logic is in application layer modules.
    - Dependencies point inward (Interface -> Application -> Domain).

- [x] **Remove domain imports from `src/lib`**
  - Scope: Eliminate boundary leaks in domain modules.
  - Initial hotspots:
    - `src/features/assistant/domain/provider-defaults.ts`
    - `src/features/tasks/domain/task-tree.ts`
  - Implemented:
    - `src/features/assistant/domain/provider-defaults.ts` no longer imports from `@/lib/assistant-storage`
    - `src/features/tasks/domain/task-tree.ts` no longer imports from `@/lib/task-defaults`
  - Success criteria:
    - Domain modules import only domain-safe modules/types.
    - Shared logic moved to feature domain/application modules where appropriate.

### P1 — Required Documentation and Test Coverage

- [x] **Add architecture governance docs**
  - Scope: Create and maintain:
    - `ARCHITECTURE.md`
    - `DECISIONS.md`
    - Feature-level `CONTEXT.md` for cleaned-up features
  - Implemented:
    - `ARCHITECTURE.md`
    - `DECISIONS.md`
    - `backend/assistant-chat/CONTEXT.md`
  - Success criteria:
    - Docs exist and reflect current module boundaries and decisions.

- [x] **Add deterministic tests for backend/data hotspots**
  - Scope: Add tests for backend use cases and high-risk data modules.
  - Initial hotspots with no tests found:
    - `src/lib/object-types-store.ts`
    - `src/data/local/local-data-modules.ts`
    - `src/data/firestore/firestore-data-modules.ts`
    - `backend/*`
  - Implemented:
    - Added deterministic backend use-case tests:
      - `src/features/assistant/application/assistant-chat-use-cases-backend.test.ts`
    - Added deterministic tests for object type storage rules:
      - `src/lib/object-types-store.test.ts`
    - Added deterministic tests for local data module orchestration and relation cleanup:
      - `src/data/local/local-data-modules.test.ts`
    - Added deterministic tests for Firestore data module behavior with in-memory Firestore mocks:
      - `src/data/firestore/firestore-data-modules.test.ts`
  - Success criteria:
    - Unit tests cover key branching/business rules.
    - No real DB/network/clock usage in unit tests.

- [x] **Add JSDoc to public interfaces and domain rules**
  - Scope: Start with:
    - `src/data/interfaces.ts`
    - Domain policy modules under `src/features/**/domain/*.ts`
  - Implemented:
    - Added interface-level JSDoc baseline in `src/data/interfaces.ts`
    - Added/expanded domain JSDoc in:
      - `src/features/assistant/domain/provider-defaults.ts`
      - `src/features/assistant/domain/text-utils.ts`
      - `src/features/assistant/domain/citation-utils.ts`
      - `src/features/google-calendar/domain/google-calendar-policy.ts`
      - `src/features/google-calendar/domain/google-calendar.ts`
      - `src/features/task-timeblocking/domain/task-timeblock.ts`
      - `src/features/task-timeblocking/domain/task-timeblock-policy.ts`
      - `src/features/tasks/domain/task-text.ts`
      - `src/features/tasks/domain/task-tree.ts`
  - Success criteria:
    - Public interfaces/rules document invariants, constraints, and edge cases.

### P2 — File Responsibility & Size Refactors

- [x] **Split oversized files by responsibility**
  - Scope: Refactor large modules into focused units.
  - Initial hotspots:
    - `src/pages/objects-page.tsx`
    - `src/blocks/app-sidebar/app-sidebar.tsx`
    - `src/data/firestore/firestore-data-modules.ts`
    - `src/lib/object-types-store.ts`
  - Implemented:
    - Split `src/lib/object-types-store.ts` into focused modules:
      - `src/lib/object-types-store-model.ts`
      - `src/lib/object-types-store-defaults.ts`
      - `src/lib/object-types-store-storage.ts`
    - Reduced `src/lib/object-types-store.ts` to 239 lines while preserving API and tests.
    - Split shared Firestore relational base logic out of `src/data/firestore/firestore-data-modules.ts`:
      - `src/data/firestore/firestore-relational-data-module.ts`
    - Extracted Firestore feature module classes:
      - `src/data/firestore/firestore-feature-data-modules-a.ts`
      - `src/data/firestore/firestore-feature-data-modules-b.ts`
      - `src/data/firestore/firestore-feature-data-modules.ts` (barrel)
    - Extracted Firestore relation mutation orchestration:
      - `src/data/firestore/firestore-relational-mutations.ts`
    - Extracted Firestore relational utility helpers:
      - `src/data/firestore/firestore-relational-utils.ts`
    - Reduced `src/data/firestore/firestore-data-modules.ts` to 39 lines (thin composition module).
    - Reduced `src/data/firestore/firestore-relational-data-module.ts` to 229 lines.
    - Reduced feature class modules to 175 and 171 lines.
    - Started splitting `src/pages/objects-page.tsx` into focused helper modules:
      - `src/pages/objects-page-helpers.ts`
      - `src/pages/objects-page-records.ts`
      - `src/pages/objects-page-formatting.ts`
    - Extracted record-creation and field-update mutation orchestration into:
      - `src/pages/objects-page-mutations.ts`
    - Extracted connection resolution and bidirectional sync orchestration into:
      - `src/pages/objects-page-connections.ts`
    - Extracted navigation dispatch/route orchestration into:
      - `src/pages/objects-page-navigation.ts`
    - Extracted delete-record orchestration into:
      - `src/pages/objects-page-mutations.ts`
    - Extracted picture URL resolution and formatting helpers into:
      - `src/pages/objects-page-images.ts`
    - Extracted connection field input renderer into:
      - `src/pages/objects-page-connection-field.tsx`
    - Extracted picture field input renderer into:
      - `src/pages/objects-page-picture-field.tsx`
    - Extracted table/list/cards collection view rendering into:
      - `src/pages/objects-page-collection-views.tsx`
    - Extracted left sidebar (type/record selection + create action) into:
      - `src/pages/objects-page-sidebar.tsx`
    - Extracted main panel (toolbar + mode content + detail section) into:
      - `src/pages/objects-page-main-panel.tsx`
    - Extracted field draft state/commit scheduling hook into:
      - `src/pages/objects-page-field-drafts.ts`
    - Extracted readonly property-value rendering (including connection chips) into:
      - `src/pages/objects-page-readonly-property-value.tsx`
    - Extracted field-input rendering orchestration into:
      - `src/pages/objects-page-field-input.tsx`
    - Extracted URL sync and picture-resolution effects into:
      - `src/pages/objects-page-effects.ts`
    - Extracted data bootstrap and selected-type record-sync effects into:
      - `src/pages/objects-page-effects.ts`
    - Extracted callback/orchestration bundle into:
      - `src/pages/objects-page-callbacks.ts`
    - Reduced `src/pages/objects-page.tsx` from 2109 lines to 297 lines.
    - Started `app-sidebar` decomposition by extracting icon rail and assistant conversation section into:
      - `src/blocks/app-sidebar/app-sidebar-icon-rail.tsx`
      - `src/blocks/app-sidebar/app-sidebar-assistant-section.tsx`
    - Continued `app-sidebar` decomposition by extracting notes and tasks sections into:
      - `src/blocks/app-sidebar/app-sidebar-notes-section.tsx`
      - `src/blocks/app-sidebar/app-sidebar-tasks-section.tsx`
    - Continued `app-sidebar` decomposition by extracting meetings/companies/people sections into:
      - `src/blocks/app-sidebar/app-sidebar-entity-sections.tsx`
    - Continued `app-sidebar` decomposition by extracting PARA projects section into:
      - `src/blocks/app-sidebar/app-sidebar-projects-section.tsx`
    - Continued `app-sidebar` decomposition by extracting assistant state/persistence orchestration into:
      - `src/blocks/app-sidebar/app-sidebar-assistant-state.ts`
    - Continued `app-sidebar` decomposition by extracting entity create-actions into:
      - `src/blocks/app-sidebar/app-sidebar-create-actions.ts`
    - Applied readability pass to `app-sidebar` by extracting inline JSX callbacks to named handlers.
    - Applied readability pass to assistant-state hook by extracting shared auth/persistence helpers.
    - Applied readability pass by extracting route-driven data-loading effects into:
      - `src/blocks/app-sidebar/app-sidebar-route-data-effects.ts`
    - Applied naming consistency pass across sidebar helper modules:
      - standardized assistant conversation handler names in `app-sidebar-assistant-state.ts`
      - renamed create-actions factory to `buildAppSidebarCreateActions`
    - Applied naming consistency pass across `objects-page` helper modules:
      - renamed callback builder to `buildObjectsPageCallbacks`
      - standardized imported helper aliases from `...ForPage` to `...From...`
    - Applied optional UI composition trim by extracting sidebar derived-data computations into:
      - `src/blocks/app-sidebar/app-sidebar-derived-data.ts`
    - Reduced `src/blocks/app-sidebar/app-sidebar.tsx` from 1113 lines to 367 lines.
    - Reduced `src/blocks/app-sidebar/app-sidebar.tsx` further from 367 lines to 254 lines.
  - Remaining:
    - No mandatory decomposition remaining for initial hotspots.
    - Optional polish only: no additional cleanup items currently planned.
  - Success criteria:
    - Clear single responsibility per file.
    - Move toward soft cap (~250 lines), especially for business/data modules.

## Remaining Work Snapshot (2026-03-03)

- **Cleanup track (P0/P1/P2)**
  - Completed mandatory items: P0, P1, and hotspot decomposition in P2 are complete.
  - Remaining mandatory items: none.
  - Remaining optional polish:
    - [x] Final naming harmonization pass for objects-page helper APIs.
    - [x] Optional UI composition trim for `app-sidebar.tsx`.
    - [x] Optional UI composition trim for `objects-page-effects.ts`.
  - Effort estimate: complete for current cleanup scope.

- **Redux -> Zustand track**
  - Current state: not started by design (deferred until cleanup stabilized).
  - Remaining mandatory items if you choose to proceed: Phase 0 through Phase 4.
  - Effort estimate: multi-session project (roughly 4-8 sessions depending on scope and rollback checkpoints).

## Progress Log

- 2026-03-02: Initial audit completed and action plan captured.
- 2026-03-02: Added phased Redux-to-Zustand migration track with rollback points and decision gates.
- 2026-03-02: Completed P0 architecture tasks (backend use-case extraction + domain import boundary leak fixes).
- 2026-03-02: Completed P1 governance docs (`ARCHITECTURE.md`, `DECISIONS.md`, feature `CONTEXT.md`) and started JSDoc baseline in `src/data/interfaces.ts`.
- 2026-03-02: Completed P1 JSDoc pass for data interfaces and feature domain policy modules.
- 2026-03-02: Started P1 deterministic test expansion with backend use-case coverage for `assistant-chat-use-cases`.
- 2026-03-02: Expanded deterministic tests for `object-types-store` and `local-data-modules`; remaining hotspot is `firestore-data-modules`.
- 2026-03-02: Completed deterministic hotspot testing by adding `firestore-data-modules` tests.
- 2026-03-02: Started P2 with `object-types-store` module split; core file reduced below the 250-line soft cap.
- 2026-03-02: Continued P2 by extracting Firestore relational base module and reducing `firestore-data-modules.ts` significantly.
- 2026-03-02: Continued P2 by extracting Firestore feature module classes; `firestore-data-modules.ts` is now a thin composition entrypoint.
- 2026-03-02: Completed Firestore data-layer modularization with all related files now under the 250-line soft cap.
- 2026-03-02: Started `objects-page` decomposition by extracting pure helpers, formatting, and records-mapping logic.
- 2026-03-02: Continued `objects-page` decomposition by extracting mutation logic (`create/update` flows), reducing page size to 1549 lines.
- 2026-03-02: Continued `objects-page` decomposition by extracting connection resolution/sync logic, reducing page size to 1400 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting navigation and delete orchestration, reducing page size to 1339 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting image resolution helpers, reducing page size to 1283 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting connection field input rendering, reducing page size to 1119 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting picture field input rendering, reducing page size to 991 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting table/list/cards rendering, reducing page size to 857 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting sidebar rendering, reducing page size to 804 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting main panel rendering, reducing page size to 735 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting field-draft hook and readonly value renderer, reducing page size to 626 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting field-input rendering orchestration, reducing page size to 545 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting URL sync + picture-resolution effects, reducing page size to 492 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting data bootstrap + selected-type record-sync effects, reducing page size to 454 lines.
- 2026-03-03: Continued `objects-page` decomposition by extracting callback orchestration module, reducing page size to 297 lines.
- 2026-03-03: Started `app-sidebar` decomposition by extracting icon rail and assistant section, reducing sidebar size to 914 lines.
- 2026-03-03: Continued `app-sidebar` decomposition by extracting notes and tasks sections, reducing sidebar size to 846 lines.
- 2026-03-03: Continued `app-sidebar` decomposition by extracting meetings/companies/people sections, reducing sidebar size to 763 lines.
- 2026-03-03: Continued `app-sidebar` decomposition by extracting PARA projects section, reducing sidebar size to 688 lines.
- 2026-03-03: Continued `app-sidebar` decomposition by extracting assistant state orchestration and create-actions, reducing sidebar size to 372 lines.
- 2026-03-03: Applied `app-sidebar` readability pass (named handlers for route section callbacks), current sidebar size 391 lines.
- 2026-03-03: Applied `app-sidebar-assistant-state` readability pass (shared auth token and persistence helpers), current sidebar size 394 lines.
- 2026-03-03: Applied `app-sidebar` readability pass (extracted route-data effects hook), current sidebar size 367 lines.
- 2026-03-03: Applied naming consistency pass across app-sidebar helper modules; sidebar size remains 367 lines.
- 2026-03-03: Applied naming consistency pass across objects-page helper modules; objects-page size remains 297 lines.
- 2026-03-03: Applied naming consistency pass for objects-page effects hooks (`useObjectsPage...`), behavior unchanged and composition file size stable.
- 2026-03-03: Applied naming consistency pass for objects-page field input helpers (`updateField` naming), behavior unchanged.
- 2026-03-03: Completed final objects-page helper API naming harmonization (`updateField` across callbacks/connections/field-input integration), behavior unchanged.
- 2026-03-03: Completed optional UI composition trim for app-sidebar by extracting derived-data memo logic; app-sidebar size reduced to 254 lines.
- 2026-03-03: Completed optional UI composition trim for objects-page effects by extracting picture-url effect into `objects-page-picture-effects.ts`.

## Notes

- Priority order follows constitution conflict priorities: Correctness -> Architectural boundaries -> Tests -> Readability -> Token efficiency -> Style.
- Update this file whenever a cleanup item moves status or scope changes.
