/**
 * CLI Renderer — renders Result<T> for terminal output
 */

import type { Result } from '../utils/result.js';
import * as theme from './theme.js';

export function renderResult<T>(result: Result<T>, formatter?: (data: T) => string): void {
  if (result.ok) {
    if (formatter) {
      console.log(formatter(result.data));
    } else {
      console.log(theme.success(String(result.data)));
    }
  } else {
    console.error(theme.error(result.error.message));
    if (result.error.suggestion) {
      console.log(theme.info(result.error.suggestion));
    }
  }
}

export function renderComingSoon(command: string): void {
  console.log();
  console.log(theme.warning(`"${command}" is coming soon!`));
  console.log(theme.info('Follow progress at https://github.com/ACRLABSDEV/shipmobile'));
  console.log();
}
