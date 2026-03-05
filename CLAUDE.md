# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ShipMobile ships React Native/Expo apps to App Store & Play Store. It has two entry points from the same core logic:
- **CLI** (`src/index.ts`) — Terminal interface via Commander.js
- **MCP Server** (`src/mcp.ts`) — AI agent interface via Model Context Protocol

## Commands

```bash
pnpm build          # Build via tsup (outputs dist/index.js + dist/mcp.js), copies assets
pnpm dev            # Watch mode
pnpm test           # Vitest (run once)
pnpm test:watch     # Vitest (watch mode)
pnpm lint           # ESLint on src/ and tests/
pnpm lint:fix       # ESLint with auto-fix
pnpm format         # Prettier write
pnpm format:check   # Prettier check
pnpm typecheck      # tsc --noEmit (strict mode)
```

Run a single test file: `pnpm vitest run tests/core/audit.test.ts`

CI runs: `pnpm lint && pnpm test && pnpm build` across Node 18/20/22.

## Architecture

### Layered Design

```
CLI (src/index.ts)          MCP Server (src/mcp.ts)
        \                       /
         → Core Logic (src/core/*.ts) → returns Result<T>
                    |
         ┌─────────┼──────────┐
    Providers    Services    Analyzers
   (src/providers/) (src/services/) (src/analyzers/)
```

**Core** (`src/core/`) — All business logic. Every function returns `Result<T>`, never throws.

**CLI** (`src/cli/`) — Thin rendering layer. `renderer.ts` formats `Result<T>` for terminal output. `theme.ts` defines semantic color tokens and Unicode symbols.

**MCP** (`src/mcp/`) — `server.ts` registers tools with Zod input schemas. `handlers.ts` delegates to core logic and returns JSON.

**Providers** (`src/providers/`) — External service abstractions (Expo, Apple App Store Connect, Google Play).

**Services** (`src/services/`) — Low-level API clients (EAS Build, App Store Connect REST, Google Play Publishing).

**Analyzers** (`src/analyzers/`) — Audit rule engine with plugin architecture. AST parsing via Babel. Rules live in `rules/{category}/` subdirectories.

### Result<T> Pattern

The central error handling pattern — used in all core functions:

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: ShipMobileError }
```

Use `ok(data)` and `err(code, message, severity, suggestion?)` helpers from `src/utils/result.ts`. ShipMobileError includes a machine-readable `code`, `severity`, and optional `suggestion`.

### Audit Rule Interface

Rules implement `AuditRule` from `src/analyzers/types.ts`:
- `id`: kebab-case identifier
- `category`: performance | memory | ux | compliance | security
- `severity`: critical | warning | info
- `check(context)`: returns `AuditFinding[]`
- `fix?(context)`: optional auto-fix, returns count of fixes applied

Rules are registered in `src/analyzers/rules/index.ts`.

### Configuration

`.shipmobile/` directory (git-ignored) stores `config.json` and `credentials.json`. Credentials are encrypted with AES-256-GCM using machine-scoped key derivation (`src/utils/crypto.ts`).

## Code Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `noUnusedLocals`/`noUnusedParameters`
- **No `any`** — use `unknown` if needed (eslint warns on `@typescript-eslint/no-explicit-any`)
- **ESM only** — `"type": "module"` in package.json, tsup outputs ESM
- **Prettier**: single quotes, trailing commas, 100 char line width, 2-space indent
- **Unused args**: prefix with underscore (`_arg`) to satisfy eslint
- **CLI styling**: semantic color tokens from `cli/theme.ts`, Unicode figures (not emoji), `chalk.dim()` for secondary text
- **Naming**: functions camelCase, interfaces PascalCase, rule IDs kebab-case

## Testing

Vitest with tests in `tests/` mirroring `src/` structure. Fixture projects in `tests/fixtures/`. Mock external services; test both success and error paths of `Result<T>`.
