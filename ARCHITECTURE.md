# ARCHITECTURE

## Purpose

This document defines the stable architectural boundaries for the PKM application and backend AI service.

## Layer Model

### Domain

- Contains pure business rules and policy logic.
- No framework imports.
- No persistence, network, browser APIs, or side effects.

Examples:

- `src/features/task-timeblocking/domain/*`
- `src/features/tasks/domain/*`
- `src/features/assistant/domain/*`

### Application

- Coordinates use cases and orchestrates domain + ports.
- Defines dependency boundaries through interfaces/ports.
- No direct framework delivery concerns.

Examples:

- `src/features/*/application/*`
- `backend/application/assistant-chat-use-cases.cjs`

### Infrastructure

- Implements persistence/network/external adapters.
- May depend on application/domain contracts.

Examples:

- `src/data/firestore/*`
- `src/data/local/*`
- `backend/infrastructure/ai/ai-gateway.cjs`
- `backend/infrastructure/storage/firestore-assistant-chat-repository.cjs`

### Interface / Delivery

- Handles transport and boundary validation.
- Maps requests to use cases and use-case results to transport responses.

Examples:

- React pages/components in `src/pages/*`, `src/components/*`
- Express routes in `backend/server.cjs`

## Dependency Direction

- `Interface -> Application -> Domain`
- `Infrastructure -> Application/Domain`
- Domain must not import from `lib`, delivery, or framework-specific modules.

## Current Feature Boundaries

### Data Modules

- Contracts: `src/data/interfaces.ts`
- Implementations: `src/data/local/*`, `src/data/firestore/*`
- Consumption: store/application helpers

### Assistant Backend (P0 refactor)

- Delivery: `backend/server.cjs`
- Application orchestration: `backend/application/assistant-chat-use-cases.cjs`
- Infrastructure adapters:
  - `backend/infrastructure/ai/ai-gateway.cjs`
  - `backend/infrastructure/storage/firestore-assistant-chat-repository.cjs`

## Architectural Guardrails

- Keep routes/controllers thin: validate input, call use case, map response.
- Keep business rules deterministic and testable.
- Inject side-effect dependencies at composition/bootstrap boundaries.
- Prefer small modules with one responsibility.

## Operational Checks

- Required checks per cleanup phase:
  - `npm run test`
  - `npm run lint`
- Track architectural work in `docs/architecture/codebase-cleanup-tracker.md`.
