/**
 * MCP Server — Model Context Protocol server for ShipMobile
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'shipmobile',
    version: '0.1.0',
  });

  // Register stub tools
  server.tool('doctor', 'Run project health checks', {}, async () => {
    return { content: [{ type: 'text' as const, text: 'Doctor: not implemented yet' }] };
  });

  server.tool(
    'init',
    'Initialize project for mobile deployment',
    { projectName: z.string().optional().describe('Project name') },
    async () => {
      return { content: [{ type: 'text' as const, text: 'Init: not implemented yet' }] };
    },
  );

  server.tool('audit', 'Static analysis for store readiness', {}, async () => {
    return { content: [{ type: 'text' as const, text: 'Audit: not implemented yet' }] };
  });

  server.tool('build', 'Trigger EAS build', {}, async () => {
    return { content: [{ type: 'text' as const, text: 'Build: not implemented yet' }] };
  });

  server.tool('status', 'Check build progress', {}, async () => {
    return { content: [{ type: 'text' as const, text: 'Status: not implemented yet' }] };
  });

  server.tool('submit', 'Submit to App Store / Play Store', {}, async () => {
    return { content: [{ type: 'text' as const, text: 'Submit: not implemented yet' }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
