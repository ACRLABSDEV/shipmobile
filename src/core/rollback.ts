/**
 * rollback — revert OTA updates on a channel
 */

import { ok, err, type Result } from '../utils/result.js';
import { getEASUpdateService, type UpdateChannel, type UpdatePlatform, type EASUpdateGroup, type EASUpdatePublishResult } from '../services/eas-update.js';

export interface RollbackOptions {
  projectPath?: string;
  channel?: UpdateChannel;
  group?: string;
  platform?: UpdatePlatform;
  nonInteractive?: boolean;
}

export interface RollbackResult {
  rolledBack: boolean;
  previousGroup?: EASUpdateGroup;
  update?: EASUpdatePublishResult;
  channel: string;
  availableGroups: EASUpdateGroup[];
}

export async function execute(options: RollbackOptions = {}): Promise<Result<RollbackResult>> {
  const projectDir = options.projectPath || process.cwd();
  const channel = options.channel || 'production';
  const platform = options.platform || 'all';

  const service = getEASUpdateService();

  // List recent update groups
  let groups: EASUpdateGroup[];
  try {
    groups = await service.listUpdateGroups(projectDir, { channel, limit: 10 });
  } catch (e: unknown) {
    const error = e as Error;
    return err(
      'ROLLBACK_LIST_FAILED',
      `Failed to list update groups: ${error.message}`,
      'critical',
      'Check your EAS configuration and try again.',
    );
  }

  if (groups.length === 0) {
    return err(
      'NO_UPDATES',
      `No updates found on channel "${channel}".`,
      'warning',
      `Publish an update first with \`shipmobile update --channel ${channel}\`.`,
    );
  }

  // Determine which group to roll back to
  let targetGroupId = options.group;

  if (!targetGroupId) {
    // Default: roll back to the previous (second most recent) group
    if (groups.length < 2) {
      return err(
        'NO_PREVIOUS_UPDATE',
        'Only one update exists on this channel. Nothing to roll back to.',
        'warning',
        'You need at least two updates to perform a rollback.',
      );
    }
    targetGroupId = groups[1].group;
  }

  // Find the target group for display
  const targetGroup = groups.find(g => g.group === targetGroupId || g.id === targetGroupId);

  try {
    const update = await service.rollbackToGroup(projectDir, targetGroupId, {
      channel,
      platform,
    });

    return ok({
      rolledBack: true,
      previousGroup: targetGroup,
      update,
      channel,
      availableGroups: groups,
    });
  } catch (e: unknown) {
    const error = e as Error;
    return err(
      'ROLLBACK_FAILED',
      `Rollback failed: ${error.message}`,
      'critical',
      'Check the update group ID and try again.',
    );
  }
}
