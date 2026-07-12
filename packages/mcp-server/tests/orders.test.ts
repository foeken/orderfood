import { describe, expect, it } from 'vitest';
import { registerOrderTools } from '../src/tools/orders.js';

describe('order tool registration', () => {
  it('does not expose cancel_order', () => {
    const names: string[] = [];
    const server = {
      tool: (name: string) => { names.push(name); },
    };

    registerOrderTools(server as never);

    expect(names).toEqual(['place_order', 'track_order', 'get_order_history']);
    expect(names).not.toContain('cancel_order');
  });
});
