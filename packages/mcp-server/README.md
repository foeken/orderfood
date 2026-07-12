# @henkas/orderfood

[![CI](https://github.com/henkas/orderfood/actions/workflows/ci.yml/badge.svg)](https://github.com/henkas/orderfood/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/henkas/orderfood/blob/main/LICENSE)

MCP server that lets AI agents search restaurants and manage food delivery orders on **Uber Eats** and **Thuisbezorgd**.

> **Legal:** Reverse engineering for interoperability is explicitly permitted under EU Directive 2009/24/EC Article 6. Personal use and open-source research — not commercial, not affiliated with Uber Eats or Just Eat Takeaway.

## Setup

```bash
npx @henkas/orderfood setup --platform ubereats
npx @henkas/orderfood setup --platform thuisbezorgd
```

Credentials are stored encrypted at `~/.orderfood/` (AES-256-GCM).

## Usage with Claude Code

```bash
claude mcp add orderfood -- npx @henkas/orderfood
```

## Usage with Codex

```bash
codex mcp add orderfood -- npx @henkas/orderfood
```

Then talk to your agent:

```
Find Italian restaurants near Amsterdam Centraal on Thuisbezorgd
Add a Margherita pizza from [restaurant] to my Uber Eats cart
What's in my Thuisbezorgd cart?
Show my Uber Eats payment methods
```

## Tools

| Tool | Description |
|------|-------------|
| `search_restaurants` | Find restaurants by location, cuisine, query, delivery/collection service and current open state |
| `get_restaurant` | Get menu, availability, service options, fee bands, deals and full source metadata |
| `get_cart` | View current cart |
| `add_to_cart` | Add an item with options |
| `clear_cart` | Empty the cart |
| `get_saved_addresses` | List saved delivery addresses |
| `add_address` | Add a saved Thuisbezorgd address |
| `update_address` | Update a saved Thuisbezorgd address |
| `delete_address` | Permanently delete a saved Thuisbezorgd address |
| `get_payment_methods` | List payment methods |
| `place_order` | Place the current cart as an order |
| `track_order` | Get detailed status, ETA, delays, history and courier capability flags |
| `get_order_history` | List past orders |

All tools accept `platform: "ubereats" | "thuisbezorgd"`.

## Platform support

| Capability | Uber Eats | Thuisbezorgd |
|---|---|---|
| Search restaurants | ✅ | ✅ |
| Open-now + delivery/collection search | — | ✅ |
| Full discovery metadata | — | ✅ |
| Get restaurant + menu | ✅ | ✅ |
| Cart management | ✅ | ✅ |
| Saved addresses | — | ✅ (list/add/update/delete) |
| Payment methods | ✅ | ✅ |
| Place order | ⚠️ | ⚠️ |
| Detailed order tracking | ✅ | ✅ |
| Order history | 🚧 | ✅ |

⚠️ = blocked by browser-based payment flow &nbsp; 🚧 = stub, coming soon

`cancel_order` is intentionally not registered or advertised as an MCP tool.

## Requirements

Node.js 20+. Thuisbezorgd setup currently requires Google Chrome on macOS for its
browser-assisted OAuth flow.

## Full docs

[github.com/henkas/orderfood](https://github.com/henkas/orderfood)
