# CONTEXT: Assistant Chat Backend

## Scope

This context describes the backend assistant chat feature exposed through Express routes under `/api/ai/*`.

## Responsibilities

- Delivery layer (`backend/server.cjs`)
  - Parse and validate HTTP input.
  - Map use case results/errors to HTTP responses.
- Application layer (`backend/application/assistant-chat-use-cases.cjs`)
  - Orchestrate chat generation and persistence workflows.
  - Coordinate AI gateway and chat repository ports.
- Infrastructure layer
  - AI provider adapter: `backend/infrastructure/ai/ai-gateway.cjs`
  - Firestore repository adapter: `backend/infrastructure/storage/firestore-assistant-chat-repository.cjs`

## Invariants

- Route handlers must not contain orchestration business logic.
- Use cases must not depend on Express request/response objects.
- Persistence failures after successful AI reply must not fail the main reply response path.

## Key Constraints

- Keep streaming API semantics (`application/x-ndjson`) unchanged.
- Preserve existing endpoint contracts and payload shape.
- Keep dependency direction inward from delivery to application.

## Change Guidance

- Add new assistant workflows in `backend/application` first.
- Extend adapters in `backend/infrastructure` for side effects.
- Keep route edits focused on validation/mapping only.
