import { McpServer } from '../../../packages/core/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import { StdioServerTransport } from '../../../packages/core/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';

const server = new McpServer({
  name: 'tastekit-mock-mcp',
  version: '1.0.0',
});

server.registerTool(
  'echo',
  {
    description: 'Echo back text',
    annotations: {
      risk: 'low',
      destructive: false,
    },
  },
  async () => ({
    content: [{ type: 'text', text: 'ok' }],
  }),
);

server.registerResource(
  'fixture-readme',
  'file://fixture/README.md',
  {
    description: 'Fixture README resource',
    mimeType: 'text/markdown',
  },
  async () => ({
    contents: [{
      uri: 'file://fixture/README.md',
      mimeType: 'text/markdown',
      text: '# Fixture',
    }],
  }),
);

server.registerPrompt(
  'fixture-prompt',
  {
    description: 'Fixture prompt',
  },
  async () => ({
    messages: [{ role: 'user', content: { type: 'text', text: 'hello from fixture' } }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
