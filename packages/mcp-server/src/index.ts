import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOrderFoodServer } from './server.js';

const server = createOrderFoodServer();
const transport = new StdioServerTransport();
await server.connect(transport);
