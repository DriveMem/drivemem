import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './create-server.js';

const USER_ID = process.env.MCP_USER_ID;
if (!USER_ID) {
  console.error('MCP_USER_ID environment variable required');
  process.exit(1);
}

async function main() {
  const server = createMcpServer(USER_ID!);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] AI Drive MCP Server started (stdio)');
}

main().catch(console.error);
