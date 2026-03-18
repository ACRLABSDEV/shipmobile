# PRD: ShipMobile Repository Cleanup + Architecture Modernization

## Status
Proposed (awaiting approval)

## Owner
ShipMobile core

## Requested by
Coopes

## Objective
Refactor and harden the ShipMobile repository to senior-level production standards:
- clean architecture
- DRY, reusable modules
- clear boundaries and ownership
- secure handling of sensitive data
- predictable command behavior
- test reliability and release confidence

This PRD is approval-gated. **No broad refactor will start until approved.**

---

## Problem Statement
Current repository velocity is high, but quality and consistency are drifting:
- command behavior inconsistencies (`build/status/preview` mismatch cases)
- duplicated logic across command/core layers
- mixed style patterns (functional + ad-hoc orchestration)
- under-specified security posture for secrets lifecycle
- partial test fragility / known failing test (`init` bare workflow)
- release mismatch risk (main branch vs npm package behavior)

---

## Goals
1. Establish a clean, modular architecture with clear service/core/cli boundaries.
2. Remove duplication and centralize shared orchestration logic.
3. Enforce secure secret handling standards for CLI auth flows.
4. Make all user-facing commands behaviorally consistent and reliable.
5. Improve test rigor and make CI signal trustworthy.
6. Produce maintainable internal docs for future contributors.

## Non-Goals
- Full rewrite from scratch.
- New product features unrelated to reliability/security/maintainability.
- Introducing unnecessary abstractions without measurable benefit.

---

## Success Criteria (Acceptance)
- ✅ All command happy-paths validated: login/init/doctor/audit/build/status/preview/submit/update/rollback.
- ✅ No known critical behavioral mismatch between `build` and `status/preview`.
- ✅ Secrets never echoed in prompts/logs; credentials file permissions hardened.
- ✅ Security checklist completed (storage, redaction, local perms, .gitignore, error output hygiene).
- ✅ Test suite stable with documented exceptions removed (fix current known failures).
- ✅ Lint + typecheck + tests pass in CI baseline.
- ✅ Internal architecture doc + security doc + release checklist added.

---

## Scope of Work

### A) Architecture + Code Quality Audit
- Map current layering:
  - `src/cli/*`
  - `src/core/*`
  - `src/services/*`
  - `src/providers/*`
  - `src/utils/*`
- Identify coupling, duplication, and leaked concerns.
- Produce target architecture map with module responsibilities.

### B) Refactor Plan (Incremental, Safe)
- Introduce clear orchestration pattern for command execution:
  - input validation
  - service calls
  - domain result objects
  - renderer-friendly output
- Centralize repeated EAS flow logic (build trigger, fallback, status fetch, cache sync).
- Normalize error taxonomy and user-facing suggestions.
- Reduce one-off branching by consolidating policy checks.

### C) Security Hardening Pass
- Secrets handling review:
  - prompt masking
  - no accidental console leak
  - encrypted-at-rest behavior documentation + caveats
  - restrictive file permissions (`700/600`) where applicable
- Ensure auth data and key paths are safely handled and redacted in logs.
- Add explicit security notes in docs.

### D) Reliability + Behavioral Consistency
- Ensure `build` writes durable metadata and remains compatible with EAS queue behavior.
- Ensure `status` and `preview` can recover from local cache misses via EAS source of truth.
- Validate interactive fallback behavior for first-time iOS credential setup.

### E) Test/CI Hardening
- Fix known failing tests (including workflow detection issue).
- Add regression tests for recent bug classes:
  - queued build misclassified as error
  - cache-miss fallback in status/preview
  - token parsing / username mapping edge cases
- Ensure deterministic tests and remove flaky patterns.

### F) Documentation + Release Discipline
- Add/update internal docs:
  - architecture overview
  - security model and operational caveats
  - release checklist (main vs npm publish gate)
- Add concise contributor guidance for safe future changes.

---

## Deliverables
1. **Internal Audit Report** (`docs/internal/repo-cleanup-audit-report.md`)
2. **Refactor Implementation PR(s)** (stacked, reviewable)
3. **Security Hardening Notes** (`docs/internal/security-hardening-notes.md`)
4. **Reliability Test Matrix** (`docs/internal/reliability-test-matrix.md`)
5. **Release Checklist** (`docs/internal/release-checklist.md`)

---

## Execution Strategy

### Phase 0 — Baseline (No behavior changes)
- Capture current architecture, risks, and test baseline.
- Document known defects and reproduction steps.

### Phase 1 — Reliability + Security Hotfixes
- Land high-impact fixes first (build/status/preview consistency, secret masking/perms).
- Add targeted regression tests.

### Phase 2 — Structural Refactor
- Modularize orchestration paths and shared services.
- DRY repeated logic and normalize errors.

### Phase 3 — Test + Docs + Release Prep
- Complete test hardening.
- Finalize docs and create release readiness report.

---

## Risks & Mitigations
- **Risk:** Refactor regressions in CLI flows.
  - **Mitigation:** small stacked PRs + regression test expansion + manual smoke matrix.
- **Risk:** Over-engineering (class-driven where not warranted).
  - **Mitigation:** apply class abstractions only where state/lifecycle complexity justifies it.
- **Risk:** npm users lagging behind `main` fixes.
  - **Mitigation:** add explicit release checklist and changelog discipline.

---

## Design Principles (Enforced)
- KISS first, then abstraction.
- DRY via shared modules, not giant god classes.
- Prefer explicit contracts over implicit behavior.
- Strong boundaries: provider/service/core/cli.
- Security-by-default in all secret-handling paths.
- Small composable units with test coverage.

---

## Approval Required
If approved, next step is to generate and submit:
1. `repo-cleanup-audit-report.md` (deep findings + prioritized backlog)
2. implementation plan with PR slices and estimated sequence

Reply with one of:
- **APPROVE PRD** (start full audit + execution)
- **REVISE PRD** (tell me what to change first)
