#!/usr/bin/env node
/**
 * ShipMobile MCP Server — entry point
 */

import { startMcpServer } from './mcp/server.js';

await startMcpServer();
