import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getClient } from '../config.js';

const platformSchema = z.enum(['ubereats', 'thuisbezorgd']);
function errorResponse(e: unknown) {
  const err = e as { message?: string; code?: string };
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message ?? String(e), code: err.code ?? 'UNKNOWN' }) }], isError: true };
}

export function registerAccountTools(server: McpServer): void {
  server.tool(
    'get_saved_addresses',
    'List saved delivery addresses for the authenticated account on the specified platform.',
    { platform: platformSchema },
    async ({ platform }) => {
      try {
        const result = await getClient(platform).getSavedAddresses();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e: unknown) { return errorResponse(e); }
    },
  );

  const addressFields = {
    label: z.string().optional(),
    street: z.string(),
    street_number: z.string(),
    postcode: z.string(),
    city: z.string(),
    floor: z.string().optional(),
    apartment: z.string().optional(),
    access_code: z.string().optional(),
    notes: z.string().optional(),
  };

  server.tool('add_address', 'Add a saved delivery address.', {
    platform: platformSchema,
    ...addressFields,
  }, async ({ platform, ...address }) => {
    try {
      const method = getClient(platform).addAddress;
      if (!method) throw new Error(`${platform} does not support adding addresses`);
      const result = await method.call(getClient(platform), address);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (e: unknown) { return errorResponse(e); }
  });

  server.tool('update_address', 'Update an existing saved delivery address.', {
    platform: platformSchema,
    address_id: z.string(),
    ...addressFields,
  }, async ({ platform, address_id, ...address }) => {
    try {
      const method = getClient(platform).updateAddress;
      if (!method) throw new Error(`${platform} does not support updating addresses`);
      const result = await method.call(getClient(platform), address_id, address);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (e: unknown) { return errorResponse(e); }
  });

  server.tool('delete_address', 'Permanently delete a saved delivery address.', {
    platform: platformSchema,
    address_id: z.string(),
  }, async ({ platform, address_id }) => {
    try {
      const method = getClient(platform).deleteAddress;
      if (!method) throw new Error(`${platform} does not support deleting addresses`);
      await method.call(getClient(platform), address_id);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
    } catch (e: unknown) { return errorResponse(e); }
  });

  server.tool(
    'get_payment_methods',
    'List saved payment methods for the authenticated account. Use the returned id values when calling place_order.',
    { platform: platformSchema },
    async ({ platform }) => {
      try {
        const result = await getClient(platform).getPaymentMethods();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e: unknown) { return errorResponse(e); }
    },
  );
}
