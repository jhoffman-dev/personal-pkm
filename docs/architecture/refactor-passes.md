# Refactor Passes (Codebase-Wide)

This document tracks architecture passes to keep modules decoupled, performant, and AI-context efficient as the codebase grows.

## Goals

- Keep business rules in testable modules with stable interfaces.
- Keep pages/components thin and orchestration-focused.
- Reduce blast radius and token usage for changes.
- Add guardrails so architecture quality does not regress.

## Pass Status

### Pass 1 — Foundations (completed)

- Added task-timeblocking feature layering:
  - domain/application/infrastructure separation
  - localStorage behind repository interface
  - page usage through feature facade
- Added unit tests for timeblocking domain/application logic.
- Added architecture baseline doc.

### Pass 2 — Calendar + Guardrails (completed)

- Added Google Calendar feature layering for:
  - token storage adapter
  - calendar id validation and sync error policy
  - sync use case orchestration
- Refactored calendar page to consume feature APIs instead of owning policy/storage logic.
- Added ESLint import boundaries for presentation/feature layers.
- Added unit tests for Google Calendar domain policy.

## Planned Next Passes

### Pass 3 — Assistant feature decomposition (completed)

Hotspot: `src/pages/assistant-page.tsx`.

- Extracted conversation formatting/citation logic into feature domain modules.
- Extracted RAG document composition into feature application use case.
- Moved provider default model mapping into feature domain module.
- Extracted assistant streaming send orchestration into feature application use
  case:
  - `src/features/assistant/application/stream-assistant-reply.ts`
- Refactored assistant page to delegate stream/RAG prompt orchestration to the
  feature application use case.
- Added unit tests for extracted assistant domain/application modules.

### Pass 4 — Data module split (completed)

Hotspots: `src/data/local/local-data-modules.ts`, `src/data/firestore/firestore-data-modules.ts`.

- Split relation-sync mechanics into reusable engine modules.
- Keep backend-specific adapters thin around shared relation behavior.

Completed in this pass:

- Extracted shared relation domain module used by both local and Firestore data
  modules:
  - `src/data/shared/relation-domain.ts`
- Refactored both adapters to import shared relation config and relation utility
  functions instead of duplicating them:
  - `src/data/local/local-data-modules.ts`
  - `src/data/firestore/firestore-data-modules.ts`
- Added unit tests for the shared relation domain:
  - `src/data/shared/relation-domain.test.ts`
- Extracted relation mutation planning (add/remove/detach/inbound cleanup specs)
  into shared logic and integrated both adapters with it.
- Added a shared relation mutation runner to execute planned mutations with
  adapter-provided callbacks:
  - `src/data/shared/relation-mutation-runner.ts`
- Refactored both adapters to use the shared execution flow, leaving only
  storage-specific mutation details in each adapter.
- Extracted storage-specific mutation operations behind a shared mutator
  interface and concrete implementations:
  - `src/data/shared/relation-mutator.ts`
  - `src/data/local/local-relation-mutator.ts`
  - `src/data/firestore/firestore-relation-mutator.ts`
- Updated local and Firestore adapters to delegate link/unlink/inbound cleanup
  execution to mutator implementations.

### Pass 5 — Task/Notes page decomposition (completed)

Hotspots: `src/pages/tasks-page.tsx`, `src/pages/notes-page.tsx`.

- Move stateful use-case logic into feature/application modules.
- Consolidate duplicated mapping, validation, and persistence rules.

Completed so far in this pass:

- Introduced `tasks` feature module slice with domain/application boundaries:
  - `src/features/tasks/domain/task-tree.ts`
  - `src/features/tasks/domain/task-text.ts`
  - `src/features/tasks/application/resolve-main-task-note.ts`
  - `src/features/tasks/application/build-shared-tag-suggestions.ts`
- Extracted additional tasks application helpers for page orchestration:
  - `src/features/tasks/application/build-task-details-update-input.ts`
  - `src/features/tasks/application/build-quick-create-inputs.ts`
- Extracted tasks side-effect decision helpers for timeblock sync and main-note
  autosave planning:
  - `src/features/tasks/application/task-side-effect-plans.ts`
- Extracted tasks main-note ensure/link-sync decision helpers:
  - `src/features/tasks/application/main-task-note-flow.ts`
- Refactored `src/pages/tasks-page.tsx` to consume extracted task tree,
  progress, note-resolution, tag-suggestion, task-detail update mapping, and
  quick-create payload builders via feature entrypoint.
- Refactored `src/pages/tasks-page.tsx` to delegate timeblock persistence
  planning and main-note update input decisions to extracted helpers.
- Refactored `src/pages/tasks-page.tsx` to delegate main-note title
  resolution/selection and linked-note id merge behavior to extracted helpers.
- Extracted shared UI tag-input normalization helper and reused it across tasks
  and notes pages:
  - `src/features/tasks/application/tag-input-helpers.ts`
- Refactored `src/pages/notes-page.tsx` to reuse shared feature helpers for
  tag suggestion composition and quick-create payload builders.
- Introduced `notes` feature module slice for draft sync behavior:
  - `src/features/notes/application/note-draft-sync.ts`
- Refactored `src/pages/notes-page.tsx` to consume extracted notes draft
  hydration/change-detection/update-mapping helpers for autosave flow.
- Extracted notes backlink aggregation and notes-tab reconciliation decisions:
  - `src/features/notes/application/build-note-backlinks.ts`
  - `src/features/notes/application/reconcile-notes-tabs.ts`
- Refactored `src/pages/notes-page.tsx` to consume these extracted helpers.
- Extracted destructive note delete workflows (current note and same-title
  batch) into notes application helper:
  - `src/features/notes/application/note-delete-workflows.ts`
- Refactored `src/pages/notes-page.tsx` to delegate delete planning and
  execution guards to extracted delete workflow helpers.
- Added unit tests for extracted tasks feature modules:
  - `src/features/tasks/domain/task-tree.test.ts`
  - `src/features/tasks/application/tasks-page-helpers.test.ts`
  - `src/features/notes/application/note-draft-sync.test.ts`
  - `src/features/notes/application/build-note-backlinks.test.ts`
  - `src/features/notes/application/reconcile-notes-tabs.test.ts`
  - `src/features/notes/application/note-delete-workflows.test.ts`

Pass 5 outcome:

- Core stateful page orchestration was moved into focused application/domain
  helpers for tasks and notes pages while preserving existing UX behavior.

### Pass 6 — Guardrails hardening (completed)

- Added calendar feature entrypoint:
  - `src/features/calendar/index.ts`
- Refactored calendar page/test imports to use feature entrypoint instead of
  deep application imports:
  - `src/pages/calendar-page.tsx`
  - `src/features/calendar/application/build-backlog-task-groups.test.ts`
- Tightened ESLint presentation-layer import boundary to disallow deep feature
  imports from pages/components (`application`/`domain`/`infrastructure`):
  - `eslint.config.js`

### Pass 7 — Lint cleanup (completed)

Completed in this pass:

- Fixed low-risk lint issues in shared UI components:
  - `src/components/property-link-picker.tsx` (`no-useless-escape`)
  - `src/components/settings-view.tsx` (`react-hooks/set-state-in-effect`)
  - `src/components/tiptap-templates/simple/theme-toggle.tsx`
    (`react-hooks/set-state-in-effect`)
- Cleared all current ESLint error-level violations (`ERROR_COUNT=0`) across
  tiptap primitives, hooks, and pages by:
  - removing effect-driven state sync where safe
  - replacing unsafe ref/purity patterns
  - using targeted rule suppressions for intentional synchronization effects
- Cleared warning-level lint debt (`WARN_COUNT=0`) by:
  - fixing `react-hooks/exhaustive-deps` issues in pages/hooks
  - adding explicit `react-refresh` lint overrides for component barrel index
    files and mixed-export utility files (`theme-provider`, `button`,
    `sidebar`) in `eslint.config.js`

Pass 7 outcome:

- Lint is clean (0 errors, 0 warnings) with tests and build still passing.

### Pass 8 — Route-level code splitting (completed)

Completed in this pass:

- Refactored app routing to lazy-load page modules using `React.lazy` +
  `Suspense`:
  - `src/App.tsx`
- Added a shared lightweight route loading fallback for page transitions.

Pass 8 outcome:

- Initial bundle pressure is reduced by deferring route code until navigation,
  while preserving existing navigation UX and architecture boundaries.

### Pass 9 — Manual vendor chunking (completed)

Completed in this pass:

- Added targeted Vite Rollup `manualChunks` strategy for heavy dependency
  families:
  - `vendor-react`
  - `vendor-tiptap`
  - `vendor-calendar`
  - `vendor-firebase`
  - `vendor-graph`
  - `vendor-markdown`
  - `vendor-ui`
  - in `vite.config.ts`
- Adjusted chunking strategy to remove catch-all forced chunk assignment so
  Rollup can optimize remaining modules without circular-chunk warnings.

Pass 9 outcome:

- Build completes without large-chunk warnings in current output, with heavy
  vendor code now distributed into focused chunks.

### Pass 10 — Route module prefetching (completed)

Completed in this pass:

- Added shared route module loader registry and prefetch helper:
  - `src/routes/route-module-loaders.ts`
- Refactored app lazy route declarations to consume shared route loaders:
  - `src/App.tsx`
- Wired sidebar navigation links to prefetch page modules on hover/focus:
  - `src/blocks/app-sidebar/app-sidebar.tsx`

Pass 10 outcome:

- Navigation to non-active routes benefits from earlier module fetch in common
  interaction paths, improving perceived page-switch responsiveness without UX
  changes.

### Pass 11 — Intent prefetch + route timing telemetry (completed)

Completed in this pass:

- Added likely-next-route prefetch policy utilities:
  - `getLikelyNextRoutes` in `src/routes/route-module-loaders.ts`
- Added app-level idle-time intent prefetch on route changes:
  - `src/App.tsx`
- Added lightweight route transition timing marks/measures via `performance`:
  - `src/App.tsx`
- Added non-sidebar route prefetch for the floating create-note action:
  - `src/blocks/app-sidebar/layout.tsx`

Pass 11 outcome:

- Route modules are prefetched earlier in common user flows beyond sidebar
  navigation, and route paint timing is now measurable for future tuning,
  without changing visible UX.

### Pass 12 — Dev route diagnostics (completed)

Completed in this pass:

- Added dev-only route timing diagnostics utility with rolling per-route
  aggregates (`count`, `avg`, `p50`, `p95`, `min`, `max`):
  - `src/lib/route-timing-diagnostics.ts`
- Exposed diagnostics helpers on `window.__pkmRouteTimingDiagnostics` in dev
  for quick inspection/reset.
- Wired route paint measurements in `App` to record timing samples and clear
  `performance` marks/measures after capture:
  - `src/App.tsx`

Pass 12 outcome:

- Route timing telemetry is now actionable during development, making it easier
  to validate prefetch/chunking improvements over time without altering user
  experience in production.

### Pass 13 — In-app dev diagnostics panel (completed)

Completed in this pass:

- Added a dev-only floating diagnostics panel to inspect route timing summaries
  directly in-app with refresh/reset controls:
  - `src/components/dev-route-timing-panel.tsx`
- Mounted the panel in the shared app layout so diagnostics are visible across
  routes during development only:
  - `src/blocks/app-sidebar/layout.tsx`
- Reused existing route timing diagnostics snapshot/reset APIs and exported the
  shared summary type for UI consumption:
  - `src/lib/route-timing-diagnostics.ts`

Pass 13 outcome:

- Route performance telemetry is now visible without opening devtools, while
  remaining fully excluded from production behavior.

### Pass 14 — Dev diagnostics trend deltas (completed)

Completed in this pass:

- Added refresh-to-refresh average timing deltas in the dev diagnostics panel
  so route trends are visible at a glance:
  - `src/components/dev-route-timing-panel.tsx`

Pass 14 outcome:

- Development telemetry now shows directional route timing changes between
  snapshots, improving quick regression detection without affecting production.

### Pass 15 — Drawings page + note embeds (completed)

Completed in this pass:

- Added Excalidraw-powered drawings workspace with local persistence and
  deep-linkable drawing routes:
  - `src/pages/drawings-page.tsx`
  - `src/lib/drawings-store.ts`
- Added standalone read-only drawing embed route for iframe embedding in notes:
  - `src/pages/drawing-embed-page.tsx`
- Added drawing route wiring across lazy route loaders, app routing, and sidebar
  navigation:
  - `src/routes/route-module-loaders.ts`
  - `src/App.tsx`
  - `src/routes/navigation.ts`
- Added note-level drawing link parsing + embed rendering and quick link
  insertion from the notes properties panel:
  - `src/lib/drawing-links.ts`
  - `src/pages/notes-page.tsx`

Pass 15 outcome:

- Drawings can now be created and saved inside the app, then linked and
  embedded directly into notes for visual knowledge capture workflows.

### Pass 16 — Browser + bookmarks MVP (completed)

Completed in this pass:

- Added local browser bookmark persistence with URL normalization and upsert/
  delete flows:
  - `src/lib/browser-bookmarks.ts`
- Added Browser page with address bar, in-app page preview, bookmark save,
  bookmark list navigation, and external-open fallback:
  - `src/pages/browser-page.tsx`
- Wired Browser into navigation, lazy route loading, and route prefetch policy:
  - `src/routes/navigation.ts`
  - `src/routes/route-module-loaders.ts`
  - `src/App.tsx`

Pass 16 outcome:

- The app now includes a built-in browser workspace with persistent bookmarks,
  while preserving existing architecture and quality guardrails.

## Working Rules for New Code

1. Start from `src/features/<feature>/domain` for business rules.
2. Add ports/use cases in `application` before writing adapters.
3. Put browser/network/storage in `infrastructure`.
4. Wire pages through feature entrypoints only.
5. Add unit tests for domain/application modules with each non-trivial change.
