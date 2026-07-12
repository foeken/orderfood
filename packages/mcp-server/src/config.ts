import { UberEatsClient } from '@orderfood/ubereats-client';
import { ThuisbezorgdClient } from '@orderfood/thuisbezorgd-client';
import type { PlatformClient } from '@orderfood/shared';

const clients = new Map<'ubereats' | 'thuisbezorgd', PlatformClient>();

export function getClient(platform: 'ubereats' | 'thuisbezorgd'): PlatformClient {
  const existing = clients.get(platform);
  if (existing) return existing;

  const client = platform === 'ubereats'
    ? new UberEatsClient()
    : new ThuisbezorgdClient();
  clients.set(platform, client);
  return client;
}
