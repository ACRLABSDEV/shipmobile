<img width="1600" height="900" alt="ShipMobile" src="https://github.com/user-attachments/assets/aca924e8-f82a-49fe-958c-169302a82a56" />

<div align="center">

# ShipMobile 🦞

**The last mile for AI-built mobile apps.**

Your agent can build the app. ShipMobile ships it.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

> ⚠️ **Work in Progress** — ShipMobile is under active development. Expect breaking changes. We're building in public and shipping fast. Come along for the ride.

</div>

---

## What is ShipMobile?

Every day, thousands of people use AI tools — Cursor, Bolt, Lovable, Claude — to build mobile apps. The code gets written in minutes. Then they hit **the wall**: code signing, provisioning profiles, app store metadata, screenshot requirements, build pipelines, submission rules.

The entire shipping process is a nightmare that has nothing to do with building the product.

**ShipMobile eliminates that wall.** One CLI. One MCP server. From code to App Store.

```
$ shipmobile doctor

📱 ShipMobile — Project Health Check
─────────────────────────────────────

Running 24 checks...

✅ 20 passed
⚠️  3 warnings
❌ 1 critical

❌ CRITICAL
  App icon missing — need 1024x1024 PNG at ./assets/icon.png
  → Fix: add your app icon, then run `shipmobile assets`

Overall: 🟡 Fixable — address the critical issue above, then you're good
```

## Why ShipMobile?

| Problem | ShipMobile |
|---------|-----------|
| Code signing is confusing | `shipmobile login` handles it |
| "Is my app ready?" is unanswerable | `shipmobile doctor` runs 20+ health checks |
| Store rejections are a mystery | `shipmobile audit` catches issues before submission |
| Building takes 47 browser tabs | `shipmobile build` → `shipmobile status` in your terminal |
| "How do I get this on TestFlight?" | `shipmobile preview` generates QR codes |
| AI agents can't deploy apps | MCP server lets any agent ship to stores |

## Features

### 🔐 Authentication (`shipmobile login`)
Connect your Apple Developer, Expo/EAS, and Google Play accounts in one guided flow. Credentials stored locally, encrypted at rest.

### 🔍 Project Setup (`shipmobile init`)
Auto-detects your project type (Expo managed, Expo bare, React Native CLI), scaffolds configuration, and sets sensible defaults.

### 🩺 Health Checks (`shipmobile doctor`)
20+ checks covering project structure, configuration, assets, account status, build readiness, and dependency compatibility. Catches problems before they become build failures.

### 📊 Static Analysis (`shipmobile audit`)
Deep analysis across five categories:
- **Performance** — Bundle size, heavy dependencies, unused imports, image optimization
- **Memory** — useEffect cleanup, uncleared timers, event listener leaks
- **UX** — Touch target sizes, font readability, safe areas, dark mode, accessibility
- **Compliance** — Permissions, privacy manifests, console.logs, version sanity
- **Security** — Hardcoded API keys, exposed secrets

Produces a 0-100 score with actionable fix suggestions. `--fix` auto-remediates where possible.

### 🖼️ Asset Management (`shipmobile assets`)
Validates and processes app icons (generates all required sizes from a single 1024×1024 source), splash screens, and screenshots. Tells you exactly what's missing and what dimensions you need.

### 📝 Metadata Generation (`shipmobile prepare`)
Scans your project to generate app store metadata — descriptions, keywords, category suggestions, and privacy policy templates. Review, edit, submit.

### 🔨 Build (`shipmobile build`)
Triggers EAS builds with sensible defaults. Pre-validates your project, selects platforms and profiles, and returns build IDs.

### 📡 Live Status (`shipmobile status`)
Real-time build progress in your terminal. Queue position, progress bars, estimated time, multi-platform side-by-side. No more alt-tabbing to dashboards.

### 📱 Preview (`shipmobile preview`)
Generates TestFlight and APK download links with QR codes rendered right in your terminal. Share with anyone instantly.

### 🚀 Submit (`shipmobile submit`)
Uploads your build + metadata to App Store Connect and Google Play Console. Pre-flight checks ensure everything is complete before submission.

### 🤖 MCP Server (`shipmobile mcp`)
Full MCP (Model Context Protocol) integration. Every command is available as a structured tool for AI agents — Cursor, Claude, Windsurf, Cline, or any MCP-compatible client.

```json
{
  "mcpServers": {
    "shipmobile": {
      "command": "shipmobile",
      "args": ["mcp"]
    }
  }
}
```

### 🔄 OTA Updates (`shipmobile update`) *— coming soon*
Push over-the-air updates via Expo Updates. Skip app store review for JS/asset changes. Rollback instantly if something goes wrong.

## Installation

```bash
npm install -g shipmobile
```

> **Note:** ShipMobile requires Node.js 18+ and works with React Native / Expo projects.

## Quick Start

```bash
# 1. Authenticate
shipmobile login

# 2. Set up your project
shipmobile init

# 3. Check project health
shipmobile doctor

# 4. Audit for issues
shipmobile audit

# 5. Build
shipmobile build

# 6. Share preview
shipmobile preview

# 7. Ship it
shipmobile submit
```

## Agent Workflow

ShipMobile is **agent-first**. Here's what it looks like when an AI agent ships your app:

```
Agent: "Build me a habit tracker and put it on TestFlight"

1. Agent writes React Native code
2. shipmobile_init()     → detects project, sets config
3. shipmobile_doctor()   → finds missing icon
4. Agent fixes icon
5. shipmobile_audit()    → score 82/100, removes console.logs
6. shipmobile_build()    → triggers EAS build
7. shipmobile_status()   → polls until complete
8. shipmobile_preview()  → generates TestFlight link

Agent: "Your app is on TestFlight! Install it here: [link]"
```

## Roadmap

ShipMobile is being built in phases. Here's where we're at:

| Phase | Status | What |
|-------|--------|------|
| **0 — Foundation** | ✅ Done | Repo scaffold, architecture, CLI + MCP entry points |
| **1 — Auth & Setup** | 🔨 In Progress | `login`, `init`, `doctor` |
| **2 — Audit Engine** | ⏳ Next | 25+ static analysis rules, scoring |
| **3 — Assets & Metadata** | ⏳ Planned | Icon processing, metadata generation |
| **4 — Build Loop** | ⏳ Planned | Build, status, preview |
| **5 — Submit & Launch** | ⏳ Planned | Store submission, docs, public launch |
| **6 — OTA Updates** | ⏳ Future | `update`, `rollback`, AI-assisted fixes |

## Tech Stack

- **TypeScript** (strict mode) — type-safe from day one
- **Commander.js** — CLI framework
- **chalk** — terminal colors and styling
- **@modelcontextprotocol/sdk** — MCP server
- **tsup** — fast bundling
- **Vitest** — testing
- **Babel** — AST parsing for audit rules
- **sharp** — image processing

## Contributing

We welcome contributions! ShipMobile is open source and built by the community.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first contributions:**
- Writing new audit rules (plug-in architecture makes this easy)
- Improving doctor checks
- Documentation and examples
- Bug reports and feature requests

## Competitive Landscape

| Tool | Gap |
|------|-----|
| **EAS CLI** (Expo) | Powerful but complex. Not designed for beginners or agents. |
| **Fastlane** | Ruby-based, steep learning curve, no AI integration. |
| **PreReview** | Apple-only compliance checking. No build/deploy. Not launched. |
| **Codemagic / Bitrise** | Build infrastructure, not shipping assistance. |

**ShipMobile's edge:** Agent-first (MCP), full lifecycle, vibe-coder UX, open source, beautiful CLI.

## License

[MIT](LICENSE) — use it, fork it, ship with it.

---

<div align="center">

### 🦞 Tip the Captain

If ShipMobile saves you from App Store hell, consider buying the crew a coffee.

[![Tip the Captain](https://img.shields.io/badge/⚓_Tip_the_Captain-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white)](#)

<sub>BTC and other donation options coming soon.</sub>

---

Built with ⚡ by [ACR Labs](https://github.com/ACRLABSDEV)

*Your agent can build the app. ShipMobile ships it.*

</div>
