# DECISIONS

## ADR-0001: Adopt pragmatic Clean Architecture boundaries

- Date: 2026-03-02
- Status: Accepted
- Context: The codebase needs stable boundaries to reduce coupling and enable focused refactors.
- Decision: Organize work by Domain/Application/Infrastructure/Interface layers with inward dependency flow.
- Consequences:
  - Better testability of business logic.
  - More up-front structure for new feature work.

## ADR-0002: Backend AI routes delegate to application use cases

- Date: 2026-03-02
- Status: Accepted
- Context: `backend/server.cjs` previously mixed transport mapping with orchestration and persistence side effects.
- Decision: Introduce `backend/application/assistant-chat-use-cases.cjs` and adapter composition in `backend/infrastructure/*`.
- Consequences:
  - Route handlers remain transport-focused.
  - Orchestration logic is centralized and easier to unit test.

## ADR-0003: Prevent domain imports from `src/lib`

- Date: 2026-03-02
- Status: Accepted
- Context: Domain modules imported from `src/lib`, violating dependency direction.
- Decision: Remove domain-level dependencies on `src/lib` in identified hotspots and keep domain modules self-contained.
- Consequences:
  - Cleaner dependency graph.
  - Reduced cross-layer leakage risk.

## ADR-0004: State management migration is deferred until architecture stabilization

- Date: 2026-03-02
- Status: Accepted
- Context: Zustand migration is desired, but broad page/store coupling increases migration risk.
- Decision: Complete architecture stabilization (P0/P1 and selected P2) before Zustand migration phases.
- Consequences:
  - Lower migration risk.
  - State migration work happens with clearer module boundaries.

## ADR-0005: Continue incremental entity-domain migration behind feature facades

- Date: 2026-03-03
- Status: Accepted
- Context:
  - Phase 3 pilot moved `people` selection state behind a Zustand-backed adapter while preserving existing facade signatures.
  - Automated validation remained stable (`25/25` test files, `78/78` tests).
  - Manual smoke flows were confirmed for people selection/create/navigation.
  - Existing lint failure remained unchanged and unrelated to the pilot (`src/pages/objects-page-field-drafts.ts`).
- Decision:
  - Continue migration domain-by-domain behind existing feature facades (starting with `companies`, then `projects`, `meetings`, `notes`, `tasks` as planned).
  - Keep per-domain adapter rollback capability until that domain is verified stable.
  - Keep migration scope constrained to state-container swaps only (no UX or async contract changes).
- Consequences:
  - Migration can proceed with bounded blast radius and clear rollback points.
  - Temporary dual-path complexity (adapter indirection) remains until later cleanup.
  - Phase 5 stays optional and can be paused if regression or maintenance cost exceeds value.

## ADR-0006: Finalize post-Redux runtime state architecture

- Date: 2026-03-03
- Status: Accepted
- Context:
  - Phase 5.6 completed runtime teardown for entity domains (`projects`, `notes`, `tasks`, `meetings`, `companies`, `people`).
  - Domain data runtimes now perform CRUD through `getDataModules()` and synchronize feature-scoped Zustand runtime state.
  - Store integration has been reduced to a lightweight runtime-event dispatch bridge in [src/store/store.ts](src/store/store.ts) that triggers relation refresh on mutation-fulfilled events.
  - `react-redux` and `@reduxjs/toolkit` were removed from dependencies.
- Decision:
  - Adopt feature-scoped Zustand stores as the runtime source of truth for entity collections, status, error, and selection state.
  - Keep domain data operations inside feature application runtimes and route persistence through DataModules abstractions.
  - Retain a minimal dispatch contract (`store.dispatch`) only for runtime mutation-event fanout and relation-sync refresh behavior.
  - Keep UI and route layers consuming feature facades/runtime APIs; do not reintroduce direct global store entity reads.
- Consequences:
  - Runtime state management is simpler and aligned with feature boundaries and Clean Architecture direction.
  - Redux-specific bootstrapping, reducers, selectors, and provider wiring are no longer part of the runtime path.
  - Relation-sync behavior now depends on stable mutation fulfilled event naming; future mutation emitters must preserve that contract.
  - Future global orchestration changes should extend the lightweight event bridge intentionally rather than reintroducing broad Redux coupling.
