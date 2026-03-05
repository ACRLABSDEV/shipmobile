# Claude Code CLI — Style & Architecture Analysis

> Findings from analyzing `@anthropic-ai/claude-code@2.1.69` source code and engineering interviews.
> Reference for ShipMobile CLI styling decisions.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | TypeScript | "On distribution" — the model knows it well |
| UI Framework | **React + Ink** | React components rendered to the terminal |
| Layout | **Yoga** (Meta) | Constraint-based layout, adapts to any terminal size |
| Build | **Bun** | Speed over Webpack/Vite |
| Distribution | npm | Single `cli.js` bundle (~12MB, obfuscated) |
| CLI Framework | Commander.js | For argument parsing |
| Validation | Zod | Schema validation and type inference |
| File Search | ripgrep (bundled) | Vendored as binary in `vendor/ripgrep` |
| SVG Rendering | `resvg.wasm` | For screenshot-to-clipboard feature |
| Tree Parsing | `tree-sitter.wasm` + `tree-sitter-bash.wasm` | Syntax awareness |

---

## Theme System

Claude Code has a **6-theme system** with semantic color tokens:

### Available Themes
1. **Dark mode** (default)
2. **Light mode**
3. **Dark mode (colorblind-friendly)** — "dark-daltonized"
4. **Light mode (colorblind-friendly)** — "light-daltonized"
5. **Dark mode (ANSI colors only)** — "dark-ansi"
6. **Light mode (ANSI colors only)** — "light-ansi"

### Semantic Color Tokens
Instead of raw colors, Claude Code uses **semantic tokens** throughout:

```
color="claude"        — brand color (orange-ish)
color="permission"    — permission/approval prompts
color="warning"       — warnings
color="error"         — errors
color="suggestion"    — suggestions/tips
color="subtle"        — de-emphasized text
color="remember"      — important callouts
color="clawd_body"    — mascot body color
color="clawd_background" — mascot background
```

### Text Styling Patterns
- `<Text bold>` for emphasis
- `<Text dimColor>` for secondary/muted text (used extensively)
- `<Text italic>` for hints/instructions
- `<Text color="claude">` for brand highlights
- `<Text wrap="truncate">` to prevent overflow

---

## Component Architecture

### Core Ink Components Used

```jsx
import { Box, Text } from 'ink'  // Fundamental building blocks

// Box = flexbox container (flexDirection, gap, padding, margin, width, etc.)
// Text = styled text output
```

### Key Custom Components

| Component | Purpose |
|-----------|---------|
| `<Spinner>` (Zq) | Braille dot spinner (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏) in yellow |
| `<SelectList>` (E8) | Scrollable option picker with keyboard nav |
| `<Dialog>` (d8) | Bordered dialog box with title, content, cancel handler |
| `<OrderedList>` (KI1) | Numbered list with auto-padding |
| `<HyperLink>` (n7) | Clickable terminal links |
| `<SearchInput>` (NF) | Bordered search box with cursor |
| `<TextInput>` (dK) | Text input with cursor, placeholder, submit |
| `<ShortcutHint>` (J8/a8) | Keyboard shortcut display |
| `<TabView>` (tS) | Tabbed content panels |
| `<BorderBox>` (R9) | Colored border wrapper |
| `<RichText>` (KK) | Markdown/ANSI rich text rendering |
| `<ProgressBar>` | Terminal progress indicator |

### Dialog Pattern
```jsx
<Dialog
  title="Allow external CLAUDE.md file imports?"
  color="warning"           // semantic border color
  onCancel={handleCancel}
  hideBorder={false}
  hideInputGuide={false}
>
  <Text>Description text</Text>
  <SelectList options={options} onChange={handler} />
</Dialog>
```

### SelectList Pattern
```jsx
<SelectList
  options={[
    { label: "Option 1", value: "opt1", description: "Details" },
    { label: "Option 2", value: "opt2" }
  ]}
  onChange={handleSelect}
  onCancel={handleCancel}
  visibleOptionCount={6}
  defaultValue="opt1"
  defaultFocusValue="opt1"
/>
```

---

## Spinner System

### Default Spinner
- **Frames:** `["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]` (braille dots)
- **Interval:** 80ms
- **Color:** Yellow

### Spinner Tips
Claude Code shows **contextual tips** while the model is thinking:

```
⠹ Thinking...
  Tip: Use /memory to view and manage Claude memory
```

Tips are:
- Rotating based on session count + cooldown
- Context-aware (checks what features you've used)
- Configurable via `spinnerTipsEnabled` setting
- Can be overridden via `spinnerTipsOverride` in settings

### Spinner Verbs
The spinner text rotates through different "verb" labels to feel alive.

---

## Welcome Screen / ASCII Art

Claude Code renders a **full ASCII art welcome screen** with:
- Mascot ("Clawd") using Unicode block characters
- Theme-aware (different art for light vs dark mode)
- Apple Terminal gets a simplified version
- Fixed width of **58 characters**
- Brand color for title: `color="claude"`
- Version shown dimmed: `<Text dimColor>v2.1.69</Text>`
- Uses background colors for mascot: `backgroundColor="clawd_body"`

### Structure
```
Welcome to Claude Code v2.1.69
…………………………………………………………………………………………  (dot separator line)
                                (whitespace/stars)
     *                          █████▓▓░  (galaxy/stars)
                    *         ███▓░       (gradient blocks)
        ░░░░░░              ███▓░
  ░░░  ░░░░░░░░░░          ███▓░
 ░░░░░░░░░░░░░░░░░░░  *     ██▓░░  ▓
                              ░▓▓███▓▓░
 *                  ░░░░
                  ░░░░░░░░
                ░░░░░░░░░░░░░░░░
      █████████                      *
      ██▄█████▄██              *
       █████████      *
…………… █ █   █ █ ……………………………………………………  (feet + separator)
```

---

## Settings Panel

The settings/config panel (`/config`) is the most complex UI. Key patterns:

### Settings Types
- **boolean** — toggle on/off
- **enum** — select from options list
- **managedEnum** — opens sub-dialog (theme picker, model picker, etc.)

### Settings Include
- Auto-compact, Show tips, Reduce motion, Thinking mode
- Fast mode, Prompt suggestions, Verbose output
- Terminal progress bar, Default permission mode
- Git ignore, Copy behavior, Auto-updates
- Theme, Notifications, Output style, Language
- Editor mode (normal/vim), Model selection
- And many more...

### Search in Settings
Settings panel has a **search/filter** at the top — type to filter settings by name.

---

## Layout Patterns

### Flexbox Everywhere
```jsx
// Horizontal layout with gap
<Box flexDirection="row" gap={4}>
  <Box width={28}>...</Box>
  <Box width={28}>...</Box>
</Box>

// Vertical stack with spacing
<Box flexDirection="column" gap={1} marginBottom={1}>
  ...
</Box>

// Full-width sections
<Box width="100%">...</Box>
```

### Border Patterns
```jsx
// Dashed horizontal borders (for code preview)
<Box
  borderTop={true}
  borderBottom={true}
  borderLeft={false}
  borderRight={false}
  borderStyle="dashed"
  borderColor="subtle"
/>

// Round borders for search
<Box borderStyle="round" borderColor="suggestion" paddingX={1} />

// Color-coded dialog borders
<BorderBox color="permission">...</BorderBox>  // approval
<BorderBox color="warning">...</BorderBox>      // warning
<BorderBox color="claude">...</BorderBox>       // brand
```

---

## Key UX Patterns

### 1. Minimal Shell, Maximum Model
> "We try to put as little code as possible around the model."
> "Every time there's a new model release, we delete a bunch of code."

The UI is intentionally thin. No heavy business logic in the client.

### 2. Semantic Over Decorative
Colors serve meaning, not decoration. Every color token maps to a semantic purpose.

### 3. Keyboard-First
- Every dialog has `onCancel` (usually Esc)
- `<ShortcutHint>` components show available keys
- Tab to cycle through views
- Arrow keys for navigation
- Double-Esc for undo/rewind

### 4. Progressive Disclosure
- Settings panel is searchable (not a wall of options)
- Tips shown contextually during spinner wait
- Build history scrollable with indicator ("1-4 of 10 models ↑↓")

### 5. Status Density
Stats screens pack info densely using two-column layouts at fixed widths:
```
Favorite model: Claude Sonnet    Total tokens: 1.2M
Sessions: 42                     Longest session: 3h 12m
Active days: 28/30               Longest streak: 15 days
```

### 6. Dimmed Secondary Info
Aggressive use of `dimColor` for anything non-primary. Creates clear visual hierarchy without extra colors.

---

## Symbols & Unicode

From `@figures` (the symbols library):

```
✔  tick (green for success)
✘  cross (red for error)
ℹ  info
⚠  warning
❯  pointer (for selections)
●  bullet
…  ellipsis
›  pointerSmall
▲▼ triangleUp/Down
◉◯ radioOn/Off
☒☐ checkboxOn/Off
─│┌┐└┘ box-drawing characters
█▓▒░ block elements (for charts/art)
```

---

## Activity Charts

The stats view renders **ASCII sparkline charts** for daily activity:
- Uses block characters: `█▓▒░` for different intensities
- Width adapts to terminal size
- Color-coded per model in multi-model view
- X-axis labels with dates
- Legend with colored bullets

---

## What ShipMobile Should Adopt

### Must-Have
1. **Ink + React** for any live/interactive UI (status tracking, build progress)
2. **Semantic color tokens** (not raw hex/RGB in components)
3. **Braille dot spinner** (⠋⠙⠹⠸⠼) — it's the standard now
4. **dimColor everywhere** for secondary text
5. **Keyboard shortcuts** with visible hints
6. **`Box` flexbox layout** for responsive terminal sizing

### Nice-to-Have
1. **Contextual tips** during long operations (build waiting, upload)
2. **Themed ASCII art** for welcome screen (we have Larry!)
3. **Search/filter** in any list > 10 items
4. **Activity sparklines** for build history
5. **Dialog component** for confirmations/selections

### Skip
1. The 6-theme system (overkill for us — dark + light is fine)
2. wasm-based SVG rendering (we don't need screenshot-to-clipboard)
3. tree-sitter (we use Babel for AST)
4. Vim mode (nice but not priority)

---

*Generated by Arc 🦞 — March 2026*
