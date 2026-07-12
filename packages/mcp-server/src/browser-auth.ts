import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHROME_APP = '/Applications/Google Chrome.app';
const DEBUG_PORT = 9387;

type JsonObject = Record<string, unknown>;

class CdpClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: JsonObject) => void; reject: (error: Error) => void }>();
  private listeners = new Map<string, Array<(params: JsonObject) => void>>();

  constructor(private socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        method?: string;
        params?: JsonObject;
        result?: JsonObject;
        error?: { message?: string };
      };
      if (message.id) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(message.error.message ?? 'CDP command failed'));
        else waiter.resolve(message.result ?? {});
        return;
      }
      if (message.method) {
        for (const listener of this.listeners.get(message.method) ?? []) {
          listener(message.params ?? {});
        }
      }
    });
  }

  send(method: string, params: JsonObject = {}): Promise<JsonObject> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method: string, listener: (params: JsonObject) => void): void {
    const current = this.listeners.get(method) ?? [];
    current.push(listener);
    this.listeners.set(method, current);
  }
}

export async function captureAuthorizationCode(
  authorizationUrl: string,
  expectedState: string,
  redirectUri: string,
  email: string,
  requestOtp: () => Promise<string>,
): Promise<string> {
  const profileDir = join(homedir(), '.orderfood', 'oauth-browser-profile');
  await mkdir(profileDir, { recursive: true, mode: 0o700 });
  const chrome = spawn('/usr/bin/open', [
    '-na',
    CHROME_APP,
    '--args',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const target = await waitForPageTarget(chrome);
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
    });
    const cdp = new CdpClient(socket);
    await cdp.send('Page.enable');
    await cdp.send('Fetch.enable', {
      patterns: [{ urlPattern: '*thuisbezorgd.nl/en/signin-oidc*', requestStage: 'Request' }],
    });

    const codePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for Thuisbezorgd login')), 10 * 60 * 1000);
      cdp.on('Fetch.requestPaused', (params) => {
        const request = params.request as { url?: string } | undefined;
        const requestId = params.requestId as string;
        if (!request?.url?.startsWith(redirectUri)) {
          void cdp.send('Fetch.continueRequest', { requestId });
          return;
        }
        const callback = new URL(request.url);
        const code = callback.searchParams.get('code');
        const state = callback.searchParams.get('state');
        void cdp.send('Fetch.failRequest', { requestId, errorReason: 'Aborted' });
        if (!code) return;
        clearTimeout(timeout);
        if (state !== expectedState) reject(new Error('OAuth state mismatch'));
        else resolve(code);
      });
    });

    await cdp.send('Page.navigate', { url: authorizationUrl });
    const windowResult = await cdp.send('Browser.getWindowForTarget', { targetId: target.id });
    if (typeof windowResult.windowId === 'number') {
      await cdp.send('Browser.setWindowBounds', {
        windowId: windowResult.windowId,
        bounds: { left: 120, top: 80, width: 1100, height: 850, windowState: 'normal' },
      });
    }
    await cdp.send('Page.bringToFront');
    await waitForExpression(cdp, 'document.querySelector("input[name=email]") !== null');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('input[name=email]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(email)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`,
    });
    await waitForExpression(
      cdp,
      'Boolean(document.querySelector("input[name=cf-turnstile-response]")?.value)',
      120_000,
    );
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const button = document.querySelector('button[type=submit]');
        if (!button || button.disabled) throw new Error('Email submit button unavailable');
        button.click();
      })()`,
    });
    await waitForExpression(cdp, 'location.pathname === "/account/mfa"');
    console.log(`Verification code sent to ${email}.`);
    const otp = await requestOtp();
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('input');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(otp)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const button = document.querySelector('button[type=submit]');
        if (!button || button.disabled) throw new Error('OTP submit button unavailable');
        button.click();
      })()`,
    });
    const code = await codePromise;
    await cdp.send('Browser.close');
    socket.close();
    return code;
  } finally {
    stopChrome(chrome);
  }
}

async function waitForExpression(
  cdp: CdpClient,
  expression: string,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    const remote = result.result as { value?: unknown } | undefined;
    if (remote?.value === true) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for browser state: ${expression}`);
}

async function waitForPageTarget(chrome: ChildProcess): Promise<{ id: string; webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = (await response.json()) as Array<{ id: string; type: string; webSocketDebuggerUrl?: string }>;
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page?.webSocketDebuggerUrl) return { id: page.id, webSocketDebuggerUrl: page.webSocketDebuggerUrl };
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out connecting to Chrome');
}

function stopChrome(chrome: ChildProcess): void {
  if (chrome.exitCode === null) chrome.kill('SIGTERM');
}
