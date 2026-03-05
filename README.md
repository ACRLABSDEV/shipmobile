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

### Built for the Agentic Era

ShipMobile isn't just a CLI with an MCP bolted on. It's **agent-native from the ground up.** Every command returns structured, machine-readable output. Every error is typed and actionable. Every flow is designed so an AI agent can drive it end-to-end without human intervention.

Today, your agent writes the code but hands you the shipping. Tomorrow, your agent writes the code *and* ships it — while you sleep. That's the future we're building for.

**Who this is for:**
- 🎨 **Vibe coders** who prompted an app into existence but have no idea how provisioning profiles work
- 🤖 **AI agents** (Cursor, Claude, OpenClaw, Windsurf, Cline) that need to complete the deployment lifecycle
- 🛠️ **Indie devs** who've done this 100 times and still hate every second of it

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

### 🔄 Reset (`shipmobile reset`)
Clear all local ShipMobile configuration and start fresh. Removes the `.shipmobile/` directory so you can re-initialize your project.

### 🤖 MCP Server (`shipmobile mcp`)
Full [MCP (Model Context Protocol)](https://modelcontextprotocol.io) integration. Every command is available as a structured tool for AI agents. Drop this into any MCP-compatible client and your agent can ship apps autonomously:

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

Works with **Cursor, Claude Desktop, Windsurf, Cline, OpenClaw**, and any other MCP client. Your agent gets the same power as the CLI — structured JSON responses, typed errors, and full state awareness.

### 🧠 Agentic Intelligence *— coming soon*
We're building toward a world where ShipMobile doesn't just execute commands — it *thinks*:
- **Context-aware suggestions** — learns from your project history and past rejections
- **LLM-powered audit fixes** — `shipmobile fix` feeds audit findings to AI and generates patches
- **Memory across sessions** — remembers your store preferences, past submissions, and common issues
- **Proactive alerts** — notifies you (or your agent) when certificates expire, new SDK versions drop, or store policies change

### 🔄 OTA Updates (`shipmobile update`) *— coming soon*
Push over-the-air updates via Expo Updates. Skip app store review for JS/asset changes. Rollback instantly if something goes wrong.

## Installation

```bash
# Run directly with npx
npx shipmobile

# Or install globally
npm install -g shipmobile
# or
pnpm add -g shipmobile
```

> **Note:** ShipMobile requires Node.js 18+ and works with React Native / Expo projects.
> For MCP server usage, run `shipmobile-mcp` or `npx shipmobile mcp`.

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

ShipMobile is **agent-first**. This is what fully autonomous mobile deployment looks like:

```
You: "Build me a habit tracker and put it on TestFlight"

Agent writes React Native code...

Agent → shipmobile_init()     → detects project, sets config
Agent → shipmobile_doctor()   → finds missing icon → fixes it
Agent → shipmobile_audit()    → score 82/100 → removes console.logs → 94/100
Agent → shipmobile_prepare()  → generates metadata + privacy policy
Agent → shipmobile_build()    → triggers EAS build
Agent → shipmobile_status()   → polls until complete
Agent → shipmobile_preview()  → generates TestFlight link

Agent: "Your app is on TestFlight! Scan this QR code to install. 
        Store listing is ready — say 'submit' when you want to go live."
```

**Zero human steps between "I have an idea" and "it's on TestFlight."** That's the vision. The agent handles everything — code, config, assets, compliance, build, deploy. You just approve the final submission.

### Why MCP Matters

MCP is the bridge between AI agents and real-world tools. Without it, agents can write code but can't *do* anything with it. ShipMobile's MCP server gives any agent — regardless of platform — the ability to:

- Authenticate with app stores
- Validate projects against 25+ health checks
- Run deep static analysis
- Trigger cloud builds
- Generate preview links
- Submit to stores

No custom integrations. No platform lock-in. Just tools that any agent can call.

## Roadmap

ShipMobile is being built in phases. Here's where we're at:

| Phase | Status | What |
|-------|--------|------|
| **0 — Foundation** | ✅ Done | Repo scaffold, architecture, CLI + MCP entry points |
| **1 — Auth & Setup** | 🔨 In Progress | `login`, `init`, `doctor` |
| **2 — Audit Engine** | ⏳ Next | 25+ static analysis rules, scoring, `--fix` |
| **3 — Assets & Metadata** | ⏳ Planned | Icon processing, metadata generation, privacy policies |
| **4 — Build Loop** | ⏳ Planned | Build, status, preview with QR codes |
| **5 — Submit & Launch** | ✅ Complete | Store submission, reset command, docs, npm prep |
| **6 — OTA Updates** | ⏳ Future | `update`, `rollback`, AI-assisted fixes |
| **7 — Agentic Intelligence** | 🔮 Vision | LLM memory, proactive alerts, context-aware suggestions |
| **8 — Ecosystem** | 🔮 Vision | Flutter/Swift/Kotlin support, plugin marketplace, CI/CD generation |

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
