# PRD: Audit Auto-Fix Transparency + Honest Fixable Counts

## Owner
ShipMobile core

## Status
Draft (internal)

## Problem
Users running `shipmobile audit --fix` only see a total count (`Auto-fixed X issues`) and cannot tell:
1. **What was changed** (rule/files)
2. **What remains fixable right now** vs theoretically auto-fixable in future

This creates trust issues and confusion when output says `auto-fix N issues` but reruns still show unresolved findings.

## Goals
- Show clear, compact summary of what `--fix` actually changed.
- Show only **implementable** remaining auto-fixes in CLI hint text.
- Preserve fast/default CLI UX (no giant noisy output).

## Non-Goals
- Full patch/diff output (future `--verbose` enhancement).
- LLM-based remediation (tracked separately).

## User Stories
- As a user, after `audit --fix`, I can see which rules/files were changed.
- As a user, the “auto-fix remaining” hint matches real current capabilities.

## Functional Requirements
1. `audit --fix` returns fix report entries:
   - `ruleId`, `ruleName`, `fixedCount`, `resolvedCount`, `files[]`
2. Renderer prints a compact **Fixed** section after `Auto-fixed X issues`.
3. Remaining auto-fix count uses rule implementation availability (`rule.fix`) + finding `autoFixable`.
4. Add tests for:
   - fix report presence when fixes run
   - implementable auto-fix count never exceeds declared auto-fixable findings

## UX/Output (example)
- `✔ Auto-fixed 57 issues`
- `Fixed`
  - `no-console-log (57)`
  - `src/screens/ChatScreen.tsx, src/lib/alchemy-progress.ts +3`
- `Run shipmobile audit --fix to auto-fix 11 issues`

## Risks
- File/line matching for “resolved” may be imperfect if line numbers shift significantly.

## Mitigations
- Use conservative matching key: `ruleId + file + line + message`.
- Keep report as directional transparency, not legal diff proof.

## Future Enhancements
- `shipmobile audit --fix --verbose` with before/after snippets.
- `shipmobile audit --fix --json` machine-readable full change report.
- Optional AI remediation flow (`--ai-fix`) with guarded patch approval.
