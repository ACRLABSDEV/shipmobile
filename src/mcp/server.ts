/**
 * MCP Server — Model Context Protocol server for ShipMobile
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleLogin, handleInit, handleDoctor } from './handlers.js';

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

  // Stub tools for future phases
  for (const [name, desc] of [
    ['shipmobile_audit', 'Static analysis for store readiness'],
    ['shipmobile_build', 'Trigger EAS build'],
    ['shipmobile_status', 'Check build progress'],
    ['shipmobile_submit', 'Submit to App Store / Play Store'],
  ] as const) {
    server.tool(name, desc, {}, async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Not implemented yet — coming in a future phase.' }) }],
    }));
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
