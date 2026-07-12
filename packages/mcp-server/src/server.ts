import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerCartTools } from './tools/cart.js';
import { registerOrderTools } from './tools/orders.js';
import { registerAccountTools } from './tools/account.js';
import { registerHealthTools } from './tools/health.js';

export function createOrderFoodServer(): McpServer {
  const server = new McpServer({ name: 'orderfood', version: '0.1.0' });
  registerDiscoveryTools(server);
  registerCartTools(server);
  registerOrderTools(server);
  registerAccountTools(server);
  registerHealthTools(server);
  return server;
}
