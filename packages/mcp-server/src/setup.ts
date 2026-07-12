#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { saveCredentials } from '@orderfood/ubereats-client/auth';
import {
  createBrowserAuthorization,
  exchangeAuthorizationCode,
  saveCredentials as saveThuisbezorgdCredentials,
} from '@orderfood/thuisbezorgd-client/auth';
import { captureAuthorizationCode } from './browser-auth.js';

const args = process.argv.slice(2);
const platformIdx = args.indexOf('--platform');
const platform = platformIdx >= 0 ? args[platformIdx + 1] : null;

if (!platform || !['ubereats', 'thuisbezorgd'].includes(platform)) {
  console.error('Usage: npx orderfood setup --platform ubereats|thuisbezorgd');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`\nOrderFood Setup — ${platform}\n`);
if (platform === 'thuisbezorgd') {
  const emailIdx = args.indexOf('--email');
  const email = emailIdx >= 0
    ? args[emailIdx + 1]
    : await new Promise<string>((resolve) => rl.question('Thuisbezorgd email: ', resolve));
  const authorization = createBrowserAuthorization();
  const code = await captureAuthorizationCode(
    authorization.authorization_url,
    authorization.state,
    authorization.redirect_uri,
    email,
    () => new Promise((resolve) => rl.question('Enter the verification code: ', resolve)),
  );
  rl.close();
  const credentials = await exchangeAuthorizationCode(code, authorization.code_verifier);
  await saveThuisbezorgdCredentials(credentials);
  console.log('\n✓ Credentials saved to ~/.orderfood/thuisbezorgd.json');
  process.exit(0);
}

console.log('1. Open https://www.ubereats.com (or thuisbezorgd.nl) in your browser');
console.log('2. Log in to your account');
console.log('3. Open DevTools → Application → Cookies');
console.log('4. Copy the following cookies as a JSON object: jwt-session, uev2.id.session, uev2.id.session_v2, uev2.ts.session, uev2.ts.session_v2, _ua, dId, uev2.id.xp');
console.log('\nPaste the cookies JSON and press Enter (format: {"jwt-session": "...", ...}):');

rl.on('line', async (line) => {
  rl.close();
  try {
    const cookies = JSON.parse(line.trim());
    if (platform === 'ubereats') {
      await saveCredentials({
        access_token: '',
        refresh_token: '',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        cookies,
      });
    }
    console.log(`\n✓ Credentials saved to ~/.orderfood/${platform}.json`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to parse cookies JSON:', e);
    process.exit(1);
  }
});
