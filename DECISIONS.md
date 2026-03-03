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
