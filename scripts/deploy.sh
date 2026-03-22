#!/bin/bash
# Full deployment script for SocialYield
# Usage: ./scripts/deploy.sh [testnet|local]

set -e
TARGET=${1:-local}

echo "========================================"
echo "  SocialYield Deployment"
echo "  Target: $TARGET"
echo "========================================"

cd "$(dirname "$0")/../contracts"

# Load env
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "ERROR: contracts/.env not found. Copy .env.example and fill values."
  exit 1
fi

if [ "$TARGET" = "testnet" ]; then
  RPC_URL="https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz"
else
  RPC_URL="${RPC_URL:-http://localhost:8545}"
fi

echo ""
echo "1. Building contracts..."
forge build

echo ""
echo "2. Running tests..."
forge test -vv

echo ""
echo "3. Deploying to $TARGET ($RPC_URL)..."
forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -vvvv 2>&1 | tee deploy.log

echo ""
echo "========================================"
echo "  Deployment complete!"
echo "  Check deploy.log for contract addresses"
echo "  Update contracts/.env with deployed addresses"
echo "  Update frontend/.env.local with deployed addresses"
echo "========================================"
