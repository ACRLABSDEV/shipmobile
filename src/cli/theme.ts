/**
 * CLI Theme — Claude Code-aligned styling for ShipMobile
 *
 * Design principles (from Claude Code analysis):
 * 1. Semantic color tokens — never raw hex in components
 * 2. dimColor everywhere for secondary text (visual hierarchy)
 * 3. Minimal decoration — meaning over aesthetics
 * 4. Consistent symbols from Unicode standard set
 */

import chalk, { type ChalkInstance } from 'chalk';

// ─── Semantic Color Tokens ───────────────────────────────────────────
// Named for PURPOSE, not appearance. Mirrors Claude Code's approach.

export const colors = {
  // Brand
  brand: chalk.hex('#00b4d8'),         // ShipMobile brand (ocean blue)

  // Semantic
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  suggestion: chalk.cyan,              // actionable hints
  subtle: chalk.gray,                  // de-emphasized, non-essential

  // Text modifiers
  bold: chalk.bold,
  dim: chalk.dim,                      // THE key hierarchy tool
  italic: chalk.italic,
  inverse: chalk.inverse,

  // Compound helpers
  brandBold: chalk.hex('#00b4d8').bold,
  errorBold: chalk.red.bold,
  successBold: chalk.green.bold,
  warningBold: chalk.yellow.bold,
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

  // Progress
  squareFull: '█',
  squareLight: '░',

  // Spinner frames (braille dots — Claude Code standard)
  spinnerFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  spinnerInterval: 80,
};

// ─── Convenience Functions ───────────────────────────────────────────

/** Dim separator line */
export function divider(width = 50): string {
  return colors.dim(figures.line.repeat(width));
}

/** Section heading — bold brand color */
export function heading(text: string): string {
  return colors.brandBold(text);
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

/** Progress bar using block characters */
export function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return colors.brand(figures.squareFull.repeat(filled)) + colors.dim(figures.squareLight.repeat(empty));
}

/** Format duration from ms */
export function duration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
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
  ship: '⛵',
  phone: '📱',
  rocket: '🚀',
};
