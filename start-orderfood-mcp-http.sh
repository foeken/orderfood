#!/bin/zsh
set -euo pipefail

export HOME="/Users/andre.foeken"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin"
export ORDERFOOD_MCP_HOST="127.0.0.1"
export ORDERFOOD_MCP_PORT="23378"
export ORDERFOOD_MCP_PUBLIC_URL="https://orderfood-mcp-donut.ngrok.app/mcp"
export ORDERFOOD_MCP_TOKEN="$(security find-generic-password -a andre.foeken -s orderfood-mcp-token -w)"

exec /opt/homebrew/bin/node /Users/andre.foeken/projects/orderfood/packages/mcp-server/dist/http.js
