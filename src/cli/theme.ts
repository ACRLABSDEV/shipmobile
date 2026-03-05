/**
 * CLI Theme — consistent styling for ShipMobile output
 */

import chalk from 'chalk';

export const colors = {
  primary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  highlight: chalk.magenta,
};

export const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  pending: '⏳',
  tip: '💡',
  ship: '🚢',
  phone: '📱',
  rocket: '🚀',
  check: '✓',
  cross: '✗',
  arrow: '→',
};

export function heading(text: string): string {
  return colors.bold(colors.primary(text));
}

export function success(text: string): string {
  return `${icons.success} ${colors.success(text)}`;
}

export function error(text: string): string {
  return `${icons.error} ${colors.error(text)}`;
}

export function warning(text: string): string {
  return `${icons.warning} ${colors.warning(text)}`;
}

export function info(text: string): string {
  return `${icons.tip} ${colors.info(text)}`;
}

export function divider(): string {
  return colors.dim('─'.repeat(50));
}
