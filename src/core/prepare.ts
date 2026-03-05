/**
 * prepare — coming soon
 */

import { ok, type Result } from '../utils/result.js';

export interface CommandResult {
  message: string;
}

export async function execute(): Promise<Result<CommandResult>> {
  return ok({ message: 'Not implemented yet' });
}
