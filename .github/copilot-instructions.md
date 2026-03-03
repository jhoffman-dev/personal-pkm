# AI Coding Agent Constitution

This repository follows strict architectural and development rules.
All AI coding agents (Copilot, Codex, etc.) must adhere to these rules.

---

# 1. Clean Architecture (Non-Negotiable)

Follow Clean Architecture principles strictly.

## Layers

- Domain  
  - Entities, value objects, domain services  
  - Pure business logic  
  - No framework imports  
  - No IO or side effects  

- Application  
  - Use cases / interactors  
  - Ports (interfaces)  
  - DTOs  
  - Orchestration only  

- Infrastructure  
  - Implementations of ports  
  - Database, network, filesystem, external APIs  

- Interface / Delivery  
  - Express routes / controllers  
  - Input parsing and validation  
  - Mapping results to HTTP responses  

## Dependency Rule

Dependencies must point inward only:

Interface → Application → Domain  
Infrastructure → Application/Domain  

Domain must not depend on anything external.

---

# 2. Express / Node / TypeScript Conventions

- Express is an outer delivery layer only.
- Route handlers must:
  1. Validate input
  2. Call a use case
  3. Map result to HTTP response
- No business logic in routes.
- No database logic in routes.
- No cross-layer leakage.

Use dependency injection at bootstrap.

Avoid global mutable state.

---

# 3. Testing Discipline

All meaningful logic requires unit tests.

Focus on:
- Business rules
- Branching logic
- Edge cases
- Regressions

Tests must be:
- Deterministic
- No real DB
- No real network
- No real clock (inject time)

If tests are hard to write, refactor the design.

---

# 4. Functional-First Hybrid Design

Prefer:
- Pure functions
- Immutable data
- Explicit inputs/outputs

Use OOP only for:
- Ports
- Adapters
- Dependency injection
- Structural organization

Avoid:
- Ceremony-heavy abstractions
- Single-method wrapper classes
- Over-engineering

Side effects live at the boundaries.

---

# 5. Readability Over Cleverness

Code must be easy to skim.

Avoid:
- Dense one-liners
- Code golf
- Magic abstractions
- Metaprogramming tricks

Prefer:
- Clear naming
- Small functions
- Explicit control flow
- Declarative structure

Code should read like a narrative.

---

# 6. Documentation Rules

Comments explain WHY, not WHAT.

All public interfaces and important domain rules must use JSDoc-style doc blocks suitable for extraction into documentation.

Document:
- Invariants
- Constraints
- Tradeoffs
- Edge cases

---

# 7. File & Module Structure

- Organize primarily by feature/domain.
- Avoid large files.
- Soft cap: ~250 lines
- Refactor before ~400 lines

Each file must have one clear responsibility.

---

# 8. Styling (Frontend)

- No inline styles except trivial one-offs.
- Use consistent styling system.
- Use design tokens for color, spacing, typography.

---

# 9. Token-Efficient Architecture

Design modules so future work requires minimal context.

Maintain:

- ARCHITECTURE.md — high-level overview
- DECISIONS.md — architectural decision log
- CONTEXT.md (per feature) — responsibilities, key files, constraints

Keep module boundaries stable.

---

# 10. Working Protocol

Before coding:
- State plan
- Identify affected files
- Identify layer of change

During coding:
- Do not mix refactors with features unless necessary

After coding:
- Summarize changes
- Provide test/build commands
- List risks or follow-ups

If requirements are ambiguous:
- Make reasonable assumptions
- State them clearly

---

# Conflict Priority Order

Correctness  
> Architectural boundaries  
> Tests  
> Readability  
> Token efficiency  
> Style preferences

