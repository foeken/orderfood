import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createOrderFoodServer } from './server.js';

const host = process.env.ORDERFOOD_MCP_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.ORDERFOOD_MCP_PORT ?? '23378', 10);
const bearerToken = process.env.ORDERFOOD_MCP_TOKEN;
const publicUrl = process.env.ORDERFOOD_MCP_PUBLIC_URL ?? `http://${host}:${port}/mcp`;

if (!bearerToken) throw new Error('ORDERFOOD_MCP_TOKEN is required');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid ORDERFOOD_MCP_PORT: ${process.env.ORDERFOOD_MCP_PORT}`);
}

function readJsonBody(request: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function writeJson(
  response: import('node:http').ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

const transports = new Map<string, StreamableHTTPServerTransport>();

const httpServer = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);
    if (url.pathname === '/health') {
      writeJson(response, 200, { ok: true, service: 'orderfood-mcp' });
      return;
    }
    if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
      writeJson(response, 200, {
        resource: publicUrl,
        bearer_methods_supported: ['header'],
      });
      return;
    }
    if (url.pathname !== '/mcp') {
      writeJson(response, 404, { error: 'not_found' });
      return;
    }
    if (request.headers.authorization !== `Bearer ${bearerToken}`) {
      writeJson(response, 401, {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Authentication required' },
        id: null,
      }, {
        'www-authenticate': `Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource/mcp', publicUrl)}"`,
      });
      return;
    }

    let body: unknown;
    if (request.method === 'POST') {
      try {
        body = await readJsonBody(request);
      } catch {
        writeJson(response, 400, {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null,
        });
        return;
      }
    }

    const header = request.headers['mcp-session-id'];
    const sessionId = Array.isArray(header) ? header[0] : header;
    let transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport && !sessionId && request.method === 'POST' && isInitializeRequest(body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) transports.delete(transport.sessionId);
      };
      await createOrderFoodServer().connect(transport);
    }
    if (!transport) {
      writeJson(response, 400, {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Initialize a session or provide mcp-session-id' },
        id: null,
      });
      return;
    }
    await transport.handleRequest(request, response, body);
  } catch (error) {
    process.stderr.write(`[orderfood-http] ${error instanceof Error ? error.stack : String(error)}\n`);
    if (!response.headersSent) writeJson(response, 500, { error: 'internal_error' });
    else response.end();
  }
});

await new Promise<void>((resolve, reject) => {
  httpServer.listen(port, host, resolve);
  httpServer.once('error', reject);
});
process.stderr.write(`orderfood MCP listening at http://${host}:${port}/mcp\n`);

async function shutdown(): Promise<void> {
  await Promise.all([...transports.values()].map((transport) => transport.close().catch(() => {})));
  httpServer.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
