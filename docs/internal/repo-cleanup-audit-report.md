# ShipMobile Cleanup Audit Report (Phase 0)

Date: 2026-03-18
Owner: ShipMobile core
Baseline commit: `221baef020a7bf410998f05baf7385402b37c169`

## Executive Summary
Repo is functional and moving fast, but not yet “release-trustworthy by default” due to one known failing test, partial architecture drift, and npm-vs-main release skew risk.

Current snapshot:
- Source files: 68
- Test files: 49
- Tests: 269 passing / 1 failing (`init` workflow detection)
- One explicit security TODO remains in crypto key derivation

## Ranked Findings (Highest Impact First)

### P0 — Reliability
1. **Known failing test in init workflow detection**
   - `tests/core/init.test.ts` expects `expo-bare` but gets `expo-managed`.
   - Impact: CI confidence gap; likely real detection bug.

2. **Release skew between `main` and npm consumers**
   - Several critical fixes are on `main` but may not be in npm package currently used by users.
   - Impact: users keep seeing already-fixed issues.

### P1 — Behavioral Consistency
3. **Build/status/preview now improved but needs full regression matrix**
   - Recent fixes exist for queue/no-wait + cache fallback.
   - Need explicit smoke tests against real EAS states: queued/new/building/finished.

4. **Credential/bootstrap UX still mixed between EAS and manual Apple key flows**
   - Users can still enter the wrong path (`--apple`) and hit avoidable confusion.
   - Need clearer flow guardrails + warnings.

### P1 — Security
5. **Local encryption is convenience-grade, not user-passphrase-grade**
   - `src/utils/crypto.ts` includes TODO for passphrase-based hardening.
   - Good enough for local masking, not strong against local compromise.

6. **Sensitive path/credential metadata still persisted by design**
   - Acceptable for CLI, but should be clearly documented with operational guidance.

### P2 — Architecture/Maintainability
7. **Core command modules own too much orchestration logic**
   - Build/status/preview each re-handle related concerns.
   - Opportunity: centralize build lifecycle state store + shared orchestration utilities.

8. **Error taxonomy consistency can be tightened**
   - Similar user situations can surface with inconsistent error framing/suggestions.

## Architecture Snapshot (Current)
- CLI: command wiring + rendering (`src/index.ts`, `src/cli/*`)
- Core: per-command orchestration (`src/core/*`)
- Services: EAS/AppStore/PlayStore integrations (`src/services/*`)
- Providers: auth identity checks (`src/providers/*`)
- Utils: config/crypto/result primitives (`src/utils/*`)

Boundary quality: **moderate** (clear folder intent, but cross-command orchestration duplication exists).

## Approved Execution Slices (Proposed)

### Slice 1 (P0): CI Reliability + Init Detection Fix
- Fix `detectWorkflow` logic for Expo bare projects.
- Add fixture-driven tests for `expo-managed`, `expo-bare`, RN CLI edge cases.
- Goal: 270/270 tests passing.

### Slice 2 (P0): Release Discipline + User Trust
- Add internal release checklist + version gate doc.
- Add “main contains fixes not yet released” note in contributor docs.
- Goal: prevent recurrence of npm/main mismatch confusion.

### Slice 3 (P1): Build Lifecycle Consistency Hardening
- Expand tests for `build/status/preview` with cache-miss + EAS remote fallback states.
- Normalize build state transitions and user messages.

### Slice 4 (P1): Security Hardening Docs + Optional Passphrase Design
- Document current security model clearly (what is protected, what is not).
- Draft implementation design for optional passphrase/keychain support.

### Slice 5 (P2): Modular Refactor
- Extract shared build lifecycle orchestrator.
- Reduce command-level duplication and standardize error contracts.

## Immediate Next Actions
1. Land Slice 1 first (unblock 100% test pass baseline).
2. Land release checklist docs.
3. Proceed with lifecycle refactor in small reviewable PRs.

## Risks
- Refactor churn can reintroduce CLI regressions.
- Mitigation: small commits, contract tests, and manual smoke matrix per slice.
