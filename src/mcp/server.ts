/**
 * MCP Server — Model Context Protocol server for ShipMobile
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleLogin, handleInit, handleDoctor, handleAudit, handleAssets, handlePrepare, handleBuild, handleStatus, handlePreview, handleSubmit, handleReset, handleUpdate, handleRollback } from './handlers.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'shipmobile',
    version: '0.1.0',
  });

  server.tool(
    'shipmobile_login',
    'Authenticate with Apple Developer, Expo/EAS, and Google Play accounts',
    {
      provider: z.enum(['expo', 'apple', 'google']).describe('Which provider to authenticate with'),
      expo_token: z.string().optional().describe('Expo access token'),
      apple_key_id: z.string().optional().describe('App Store Connect API Key ID'),
      apple_issuer_id: z.string().optional().describe('App Store Connect Issuer ID'),
      apple_key_path: z.string().optional().describe('Path to .p8 key file'),
      google_service_account: z.string().optional().describe('Path to Google Play service account JSON'),
      project_path: z.string().optional().describe('Project path for credential storage'),
      status: z.boolean().optional().describe('Just return connection status'),
    },
    handleLogin,
  );

  server.tool(
    'shipmobile_init',
    'Initialize or detect project configuration for mobile deployment',
    {
      project_path: z.string().optional().describe('Project path'),
      bundle_id: z.string().optional().describe('Bundle ID override'),
      platforms: z.array(z.enum(['ios', 'android'])).optional().describe('Target platforms'),
    },
    handleInit,
  );

  server.tool(
    'shipmobile_doctor',
    'Run comprehensive project health checks for mobile deployment readiness',
    {
      project_path: z.string().optional().describe('Project path'),
      fix: z.boolean().optional().describe('Auto-fix issues where possible'),
    },
    handleDoctor,
  );

  server.tool(
    'shipmobile_audit',
    'Run static analysis audit for store readiness — returns score, findings, and metrics',
    {
      project_path: z.string().optional().describe('Project path to audit'),
      category: z.string().optional().describe('Filter by category: performance, memory, ux, compliance, security'),
      fix: z.boolean().optional().describe('Auto-fix issues where possible'),
      diff: z.boolean().optional().describe('Compare with previous audit'),
    },
    handleAudit,
  );

  server.tool(
    'shipmobile_assets',
    'Validate and process app assets (icons, splash screens, screenshots)',
    {
      project_path: z.string().optional().describe('Project path'),
      icon_path: z.string().optional().describe('Path to source icon (≥1024×1024)'),
      splash_path: z.string().optional().describe('Path to splash screen image'),
      screenshots_dir: z.string().optional().describe('Path to screenshots directory'),
      foreground_path: z.string().optional().describe('Android adaptive icon foreground layer'),
      background_path: z.string().optional().describe('Android adaptive icon background layer'),
    },
    handleAssets,
  );

  server.tool(
    'shipmobile_prepare',
    'Generate and validate app store metadata (description, keywords, privacy policy)',
    {
      project_path: z.string().optional().describe('Project path'),
      app_name: z.string().optional().describe('App name override'),
      description: z.string().optional().describe('App description override'),
      keywords: z.array(z.string()).optional().describe('Keywords override'),
      category: z.string().optional().describe('App category override'),
    },
    handlePrepare,
  );

  server.tool(
    'shipmobile_build',
    'Trigger EAS build for iOS and/or Android',
    {
      project_path: z.string().optional().describe('Project path'),
      platforms: z.array(z.enum(['ios', 'android'])).optional().describe('Target platforms (default: both)'),
      profile: z.enum(['development', 'preview', 'production']).optional().describe('Build profile (default: production)'),
      wait: z.boolean().optional().describe('Wait for build to complete before returning'),
    },
    handleBuild,
  );

  server.tool(
    'shipmobile_status',
    'Check build status, queue position, and progress',
    {
      build_id: z.string().optional().describe('Specific build ID, or omit for latest'),
      project_path: z.string().optional().describe('Project path'),
      logs: z.boolean().optional().describe('Include build logs'),
      history: z.boolean().optional().describe('Show build history'),
      platform: z.enum(['ios', 'android']).optional().describe('Filter by platform'),
    },
    handleStatus,
  );

  server.tool(
    'shipmobile_preview',
    'Generate shareable preview links and QR codes for completed builds',
    {
      build_id: z.string().optional().describe('Specific build ID'),
      project_path: z.string().optional().describe('Project path'),
      platform: z.enum(['ios', 'android']).optional().describe('Filter by platform'),
    },
    handlePreview,
  );

  server.tool(
    'shipmobile_submit',
    'Submit builds to App Store Connect and Google Play Store',
    {
      project_path: z.string().optional().describe('Project path'),
      platform: z.enum(['ios', 'android']).optional().describe('Target platform'),
      track: z.enum(['internal', 'alpha', 'beta', 'production']).optional().describe('Google Play track'),
      skip_preflight: z.boolean().optional().describe('Skip pre-flight checks'),
    },
    handleSubmit,
  );

  server.tool(
    'shipmobile_reset',
    'Clear all local ShipMobile config (.shipmobile/) and start fresh',
    {
      project_path: z.string().optional().describe('Project path'),
      force: z.boolean().optional().describe('Skip confirmation'),
    },
    handleReset,
  );

  server.tool(
    'shipmobile_update',
    'Publish an OTA update via EAS Update — push JS/asset changes without a full rebuild',
    {
      project_path: z.string().optional().describe('Project path'),
      channel: z.string().optional().describe('Update channel (production, staging, preview)'),
      message: z.string().optional().describe('Update message/description'),
      platform: z.enum(['ios', 'android', 'all']).optional().describe('Target platform (default: all)'),
      branch: z.string().optional().describe('EAS branch name'),
      non_interactive: z.boolean().optional().describe('Skip interactive prompts'),
    },
    handleUpdate,
  );

  server.tool(
    'shipmobile_rollback',
    'Roll back an OTA update to a previous version on a channel',
    {
      project_path: z.string().optional().describe('Project path'),
      channel: z.string().optional().describe('Update channel (default: production)'),
      group: z.string().optional().describe('Specific update group ID to roll back to'),
      platform: z.enum(['ios', 'android', 'all']).optional().describe('Target platform'),
      non_interactive: z.boolean().optional().describe('Skip interactive prompts'),
    },
    handleRollback,
  );

  // Let users know this is working (stderr so it doesn't interfere with stdio protocol)
  if (process.stderr.isTTY) {
    process.stderr.write('🤖 ShipMobile MCP server running on stdio...\n');
    process.stderr.write('   Connect via an MCP client (Cursor, Claude, etc.)\n');
    process.stderr.write('   Press Ctrl+C to stop.\n\n');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
