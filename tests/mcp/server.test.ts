/**
 * Tests for MCP server — tool registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the MCP SDK
const mockTool = vi.fn();
const mockConnect = vi.fn();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: mockTool,
    connect: mockConnect,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

// Mock handlers to avoid importing real core modules
vi.mock('../../src/mcp/handlers.js', () => ({
  handleLogin: vi.fn(),
  handleInit: vi.fn(),
  handleDoctor: vi.fn(),
  handleAudit: vi.fn(),
  handleAssets: vi.fn(),
  handlePrepare: vi.fn(),
  handleBuild: vi.fn(),
  handleStatus: vi.fn(),
  handlePreview: vi.fn(),
  handleSubmit: vi.fn(),
  handleReset: vi.fn(),
  handleUpdate: vi.fn(),
  handleRollback: vi.fn(),
}));

import { startMcpServer } from '../../src/mcp/server.js';

describe('MCP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all 13 tools', async () => {
    await startMcpServer();
    expect(mockTool).toHaveBeenCalledTimes(13);
  });

  it('registers tools with correct names', async () => {
    await startMcpServer();
    const toolNames = mockTool.mock.calls.map((c: unknown[]) => c[0]);
    expect(toolNames).toContain('shipmobile_login');
    expect(toolNames).toContain('shipmobile_init');
    expect(toolNames).toContain('shipmobile_doctor');
    expect(toolNames).toContain('shipmobile_audit');
    expect(toolNames).toContain('shipmobile_assets');
    expect(toolNames).toContain('shipmobile_prepare');
    expect(toolNames).toContain('shipmobile_build');
    expect(toolNames).toContain('shipmobile_status');
    expect(toolNames).toContain('shipmobile_preview');
    expect(toolNames).toContain('shipmobile_submit');
    expect(toolNames).toContain('shipmobile_reset');
    expect(toolNames).toContain('shipmobile_update');
    expect(toolNames).toContain('shipmobile_rollback');
  });

  it('each tool has a description string', async () => {
    await startMcpServer();
    for (const call of mockTool.mock.calls) {
      expect(typeof call[1]).toBe('string');
      expect((call[1] as string).length).toBeGreaterThan(10);
    }
  });

  it('each tool has a schema object', async () => {
    await startMcpServer();
    for (const call of mockTool.mock.calls) {
      expect(typeof call[2]).toBe('object');
    }
  });

  it('each tool has a handler function', async () => {
    await startMcpServer();
    for (const call of mockTool.mock.calls) {
      expect(typeof call[3]).toBe('function');
    }
  });

  it('connects to transport', async () => {
    await startMcpServer();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});
