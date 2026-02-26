# Clean Architecture (Current State)

This project follows a pragmatic Clean Architecture approach for fast iteration:

- **Domain layer**: pure policies/rules with no framework or storage dependencies.
- **Application layer**: use-case orchestration and interfaces (ports).
- **Infrastructure layer**: adapters for persistence/network/browser APIs.
- **Presentation layer**: React pages/components and Redux slices.

## Why this helps

- Reduces cross-file coupling and token-heavy edits for AI-assisted development.
- Keeps business rules testable without mounting React or mocking the DOM.
- Makes future backend/storage swaps easier through interface boundaries.

## Implemented feature boundaries

### Task Timeblocking

- Domain:
  - `src/features/task-timeblocking/domain/task-timeblock.ts`
  - `src/features/task-timeblocking/domain/task-timeblock-policy.ts`
- Application:
  - `src/features/task-timeblocking/application/task-timeblock-repository.ts`
  - `src/features/task-timeblocking/application/task-timeblock-service.ts`
- Infrastructure:
  - `src/features/task-timeblocking/infrastructure/local-storage-task-timeblock-repository.ts`
- Facade (for compatibility with existing pages):
  - `src/lib/task-timeblocks.ts`

### Calendar Backlog Grouping

- Application use case:
  - `src/features/calendar/application/build-backlog-task-groups.ts`

## Conventions for new work

1. Put business rules in `src/features/<feature>/domain` first.
2. Add use-case services in `src/features/<feature>/application` behind interfaces.
3. Keep browser, localStorage, Firebase, and API code in `infrastructure` adapters.
4. Keep pages/components thin: delegate non-UI logic to use cases.
5. Write unit tests for domain/application modules before wiring UI.

## Wiki generation guidance

When generating technical wiki pages, start from:

- `docs/architecture/clean-architecture.md`
- `src/features/*/domain/*.ts`
- `src/features/*/application/*.ts`

These files are intended to be the stable, high-signal source of architecture intent.
