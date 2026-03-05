# Contributing to ShipMobile

Thanks for your interest in contributing! 🚢

## Development Setup

```bash
git clone git@github.com:ACRLABSDEV/shipmobile.git
cd shipmobile
pnpm install
pnpm build
```

## Commands

- `pnpm build` — Build CLI + MCP server
- `pnpm test` — Run tests
- `pnpm lint` — Lint code
- `pnpm format` — Format code with Prettier
- `pnpm dev` — Watch mode

## Architecture

ShipMobile has two outputs from the same core:
- **CLI** (`src/index.ts`) — Terminal interface via Commander.js
- **MCP Server** (`src/mcp.ts`) — AI agent interface via Model Context Protocol

Core business logic lives in `src/core/` and returns `Result<T>` types. The CLI and MCP layers are thin wrappers that render results for their respective outputs.

## Pull Requests

1. Fork & create a feature branch
2. Make your changes
3. Ensure `pnpm lint && pnpm test && pnpm build` all pass
4. Submit a PR against `main`

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `pnpm format` before committing)
- Use `Result<T>` for all core function return types
- No `any` types (use `unknown` if needed)
