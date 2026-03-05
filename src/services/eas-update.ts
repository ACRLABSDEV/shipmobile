/**
 * EAS Update Service — abstraction layer for EAS Update (OTA) interactions
 * Shells out to eas-cli. Fully mockable for testing.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type UpdatePlatform = 'ios' | 'android' | 'all';
export type UpdateChannel = 'production' | 'staging' | 'preview' | string;

export interface EASUpdateRequest {
  projectDir: string;
  channel?: UpdateChannel;
  message?: string;
  platform?: UpdatePlatform;
  branch?: string;
  nonInteractive?: boolean;
}

export interface EASUpdateGroup {
  id: string;
  group: string;
  message?: string;
  runtimeVersion: string;
  platform: string;
  createdAt: string;
  channel?: string;
  isRollback?: boolean;
}

export interface EASChannelInfo {
  name: string;
  branchMapping: string;
  createdAt: string;
  updatedAt: string;
}

export interface EASUpdatePublishResult {
  id: string;
  group: string;
  message?: string;
  runtimeVersion: string;
  platforms: string[];
  channel: string;
  createdAt: string;
}

export interface EASUpdateService {
  publishUpdate(request: EASUpdateRequest): Promise<EASUpdatePublishResult>;
  listUpdateGroups(projectDir: string, options?: { channel?: string; limit?: number }): Promise<EASUpdateGroup[]>;
  listChannels(projectDir: string): Promise<EASChannelInfo[]>;
  rollbackToGroup(projectDir: string, groupId: string, options?: { channel?: string; platform?: UpdatePlatform }): Promise<EASUpdatePublishResult>;
}

/**
 * Real EAS Update service implementation that shells out to eas-cli
 */
export class RealEASUpdateService implements EASUpdateService {
  async publishUpdate(request: EASUpdateRequest): Promise<EASUpdatePublishResult> {
    const args = ['update', '--json', '--non-interactive'];

    if (request.channel) args.push('--channel', request.channel);
    if (request.message) args.push('--message', request.message);
    if (request.platform && request.platform !== 'all') args.push('--platform', request.platform);
    if (request.branch) args.push('--branch', request.branch);

    try {
      const { stdout } = await execFileAsync('eas', args, {
        cwd: request.projectDir,
        timeout: 120_000,
      });
      const data = JSON.parse(stdout);
      const update = Array.isArray(data) ? data[0] : data;
      return {
        id: update.id || 'unknown',
        group: update.group || update.updateGroup || 'unknown',
        message: update.message || request.message,
        runtimeVersion: update.runtimeVersion || 'unknown',
        platforms: update.platforms || [request.platform || 'all'],
        channel: request.channel || 'production',
        createdAt: update.createdAt || new Date().toISOString(),
      };
    } catch (e: unknown) {
      const error = e as { stderr?: string; message?: string };
      if (error.stderr?.includes('Not logged in') || error.stderr?.includes('UNAUTHORIZED')) {
        throw new Error('EAS authentication failed. Run `shipmobile login --expo` first.');
      }
      throw new Error(`EAS update failed: ${error.stderr || error.message}`);
    }
  }

  async listUpdateGroups(projectDir: string, options?: { channel?: string; limit?: number }): Promise<EASUpdateGroup[]> {
    const args = ['update:list', '--json', '--non-interactive'];
    if (options?.channel) args.push('--channel', options.channel);
    if (options?.limit) args.push('--limit', String(options.limit));

    try {
      const { stdout } = await execFileAsync('eas', args, {
        cwd: projectDir,
        timeout: 30_000,
      });
      const data = JSON.parse(stdout);
      const groups = Array.isArray(data) ? data : data.updates || data.updateGroups || [];
      return groups.map((g: Record<string, unknown>) => ({
        id: g.id as string,
        group: (g.group || g.updateGroup || g.id) as string,
        message: g.message as string | undefined,
        runtimeVersion: (g.runtimeVersion || 'unknown') as string,
        platform: (g.platform || 'all') as string,
        createdAt: (g.createdAt || new Date().toISOString()) as string,
        channel: g.channel as string | undefined,
        isRollback: g.isRollback as boolean | undefined,
      }));
    } catch {
      return [];
    }
  }

  async listChannels(projectDir: string): Promise<EASChannelInfo[]> {
    try {
      const { stdout } = await execFileAsync('eas', ['channel:list', '--json', '--non-interactive'], {
        cwd: projectDir,
        timeout: 30_000,
      });
      const data = JSON.parse(stdout);
      const channels = Array.isArray(data) ? data : data.channels || [];
      return channels.map((c: Record<string, unknown>) => ({
        name: c.name as string,
        branchMapping: (c.branchMapping || '') as string,
        createdAt: (c.createdAt || '') as string,
        updatedAt: (c.updatedAt || '') as string,
      }));
    } catch {
      return [];
    }
  }

  async rollbackToGroup(projectDir: string, groupId: string, options?: { channel?: string; platform?: UpdatePlatform }): Promise<EASUpdatePublishResult> {
    const args = ['update:republish', '--group', groupId, '--json', '--non-interactive'];
    if (options?.channel) args.push('--channel', options.channel);
    if (options?.platform && options.platform !== 'all') args.push('--platform', options.platform);

    try {
      const { stdout } = await execFileAsync('eas', args, {
        cwd: projectDir,
        timeout: 60_000,
      });
      const data = JSON.parse(stdout);
      const update = Array.isArray(data) ? data[0] : data;
      return {
        id: update.id || 'unknown',
        group: update.group || update.updateGroup || groupId,
        message: update.message,
        runtimeVersion: update.runtimeVersion || 'unknown',
        platforms: update.platforms || ['all'],
        channel: options?.channel || 'production',
        createdAt: update.createdAt || new Date().toISOString(),
      };
    } catch (e: unknown) {
      const error = e as { stderr?: string; message?: string };
      throw new Error(`EAS rollback failed: ${error.stderr || error.message}`);
    }
  }
}

let _easUpdateService: EASUpdateService = new RealEASUpdateService();

export function getEASUpdateService(): EASUpdateService {
  return _easUpdateService;
}

export function setEASUpdateService(service: EASUpdateService): void {
  _easUpdateService = service;
}

export function resetEASUpdateService(): void {
  _easUpdateService = new RealEASUpdateService();
}
