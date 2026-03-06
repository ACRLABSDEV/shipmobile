/**
 * CLI Theme — Claude Code-aligned styling for ShipMobile
 *
 * Design principles (from Claude Code analysis):
 * 1. Semantic color tokens — never raw hex in components
 * 2. dimColor everywhere for secondary text (visual hierarchy)
 * 3. Minimal decoration — meaning over aesthetics
 * 4. Consistent symbols from Unicode standard set
 * 5. Terminal-width-aware output
 */

import chalk, { type ChalkInstance } from 'chalk';

// ─── Terminal Awareness ──────────────────────────────────────────────

/** Get usable terminal width, capped for readability */
export function termWidth(): number {
  const cols = process.stdout.columns || 80;
  return Math.min(cols, 100);
}

// ─── Semantic Color Tokens ───────────────────────────────────────────
// Named for PURPOSE, not appearance. Mirrors Claude Code's approach.

export const colors = {
  // Ocean palette — matches the design mockup
  brand: chalk.hex('#38bdf8'),         // sky blue (primary)
  cyan: chalk.hex('#22d3ee'),          // cyan (commands, accents)
  teal: chalk.hex('#2dd4bf'),          // teal (status, highlights)
  green: chalk.hex('#34d399'),         // green (action commands)
  yellow: chalk.hex('#fbbf24'),        // yellow (warnings, audit)
  purple: chalk.hex('#a78bfa'),        // purple (mcp, args)
  muted: chalk.hex('#3d5a6e'),         // section labels
  textDim: chalk.hex('#4e7080'),       // descriptions
  text: chalk.hex('#cce4f0'),          // primary text

  // Semantic (aliased from ocean palette)
  success: chalk.hex('#34d399'),
  warning: chalk.hex('#fbbf24'),
  error: chalk.red,
  info: chalk.hex('#38bdf8'),
  suggestion: chalk.hex('#22d3ee'),
  subtle: chalk.hex('#3d5a6e'),

  // Text modifiers
  bold: chalk.bold,
  dim: chalk.hex('#7a9bb0'),             // brighter secondary text (was chalk.dim)
  italic: chalk.italic,
  inverse: chalk.inverse,

  // Compound helpers
  brandBold: chalk.hex('#38bdf8').bold,
  errorBold: chalk.red.bold,
  successBold: chalk.hex('#34d399').bold,
  warningBold: chalk.hex('#fbbf24').bold,
};

// ─── Symbols ─────────────────────────────────────────────────────────
// Unicode figures — same set Claude Code uses. No emoji for status.

export const figures = {
  // Status
  tick: '✔',
  cross: '✘',
  warning: '⚠',
  info: 'ℹ',
  bullet: '●',
  circle: '◯',

  // Navigation
  pointer: '❯',
  pointerSmall: '›',
  arrowRight: '→',
  arrowDown: '↓',
  arrowUp: '↑',

  // Decorative
  line: '─',
  ellipsis: '…',
  dot: '·',

  // Box drawing (thin single-line — Claude Code style)
  boxTopLeft: '╭',
  boxTopRight: '╮',
  boxBottomLeft: '╰',
  boxBottomRight: '╯',
  boxVertical: '│',
  boxHorizontal: '─',

  // Progress
  squareFull: '█',
  squareLight: '░',

  // Separator
  dotSeparator: '·',

  // Spinner frames (braille dots — Claude Code standard)
  spinnerFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  spinnerInterval: 80,
};

// ─── Box Drawing ─────────────────────────────────────────────────────
// Thin single-line boxes like Claude Code, not heavy boxen borders.

export function thinBox(content: string, options?: { title?: string; width?: number; borderColor?: ChalkInstance }): string {
  const borderFn = options?.borderColor ?? colors.dim;
  const lines = content.split('\n');
  const width = options?.width ?? Math.max(...lines.map(l => stripAnsi(l).length), (options?.title?.length ?? 0) + 4) + 4;

  const pad = (text: string, w: number) => {
    const visible = stripAnsi(text).length;
    return text + ' '.repeat(Math.max(0, w - visible));
  };

  const innerWidth = width - 2;
  const result: string[] = [];

  // Top border
  if (options?.title) {
    const title = ` ${options.title} `;
    const remaining = innerWidth - title.length;
    result.push(borderFn(figures.boxTopLeft + figures.boxHorizontal) + colors.bold(title) + borderFn(figures.boxHorizontal.repeat(Math.max(0, remaining)) + figures.boxTopRight));
  } else {
    result.push(borderFn(figures.boxTopLeft + figures.boxHorizontal.repeat(innerWidth) + figures.boxTopRight));
  }

  // Content
  for (const line of lines) {
    result.push(borderFn(figures.boxVertical) + ' ' + pad(line, innerWidth - 2) + ' ' + borderFn(figures.boxVertical));
  }

  // Bottom border
  result.push(borderFn(figures.boxBottomLeft + figures.boxHorizontal.repeat(innerWidth) + figures.boxBottomRight));

  return result.join('\n');
}

/** Strip ANSI escape codes for width calculation */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '');
}

// ─── Dot Separator Line ─────────────────────────────────────────────
// Claude Code uses these between major sections

export function dotLine(width?: number): string {
  const w = width ?? Math.min(termWidth() - 4, 60);
  return colors.dim('·'.repeat(w));
}

// ─── Convenience Functions ───────────────────────────────────────────

/** Dim separator line */
export function divider(width = 50): string {
  return colors.dim(figures.line.repeat(width));
}

/** Section heading — bold brand color */
export function heading(text: string): string {
  return colors.brandBold(text);
}

/** Category heading — bold white with count */
export function categoryHeading(name: string, count?: number): string {
  const label = colors.bold(name);
  if (count !== undefined) {
    return `${label} ${colors.dim(`(${count})`)}`;
  }
  return label;
}

/** Status line with colored icon */
export function status(type: 'pass' | 'fail' | 'warn' | 'info', message: string): string {
  const map: Record<string, [string, ChalkInstance]> = {
    pass: [figures.tick, colors.success],
    fail: [figures.cross, colors.error],
    warn: [figures.warning, colors.warning],
    info: [figures.info, colors.info],
  };
  const [icon, color] = map[type] ?? [figures.bullet, colors.dim];
  return `${color(icon)} ${message}`;
}

/** Dim pass — for checks that passed (don't shout about what's fine) */
export function statusDim(type: 'pass' | 'fail' | 'warn' | 'info', message: string): string {
  if (type === 'pass') {
    return colors.dim(`${figures.tick} ${message}`);
  }
  return status(type, message);
}

/** Dim hint/suggestion text */
export function hint(text: string): string {
  return colors.dim(`${figures.pointerSmall} ${text}`);
}

/** Next-step suggestion */
export function nextStep(text: string): string {
  return colors.dim(`${figures.arrowRight} ${text}`);
}

/** Format a command reference */
export function cmd(command: string): string {
  return colors.suggestion(command);
}

/** Hyperlink — clickable in supported terminals, plain URL fallback */
export function hyperlink(text: string, url: string): string {
  // OSC 8 hyperlinks — supported by iTerm2, WezTerm, many modern terminals
  if (process.env.TERM_PROGRAM === 'iTerm.app' || process.env.TERM_PROGRAM === 'WezTerm' || process.env.VTE_VERSION) {
    return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
  }
  return `${text} ${colors.dim(`(${url})`)}`;
}

/** Progress bar using block characters */
export function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = colors.brand(figures.squareFull.repeat(filled)) + colors.dim(figures.squareLight.repeat(empty));
  return `${bar} ${colors.dim(`${percent}%`)}`;
}

/** Format duration from ms */
export function duration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Indent helper */
export function indent(text: string, level = 1): string {
  const pad = '  '.repeat(level);
  return text.split('\n').map(l => pad + l).join('\n');
}

// ─── Legacy Compat (for existing renderer imports) ────────────────────
// These map old emoji icons to new Unicode figures for anything still using them.

export const icons = {
  success: colors.success(figures.tick),
  error: colors.error(figures.cross),
  warning: colors.warning(figures.warning),
  info: colors.info(figures.info),
  tip: colors.dim(figures.info),
  check: figures.tick,
  cross: figures.cross,
  arrow: figures.arrowRight,
  pending: colors.warning('⠹'),
  ship: figures.arrowRight,
  phone: figures.bullet,
  rocket: figures.arrowRight,
};
