#!/bin/bash
# Fund a wallet from the Gas Station for testing
# Usage: ./scripts/fund-wallet.sh <WALLET_ADDRESS> [AMOUNT]
#
# Requires initiad to be installed and the gas-station key available.

set -e

WALLET_ADDRESS=$1
AMOUNT=${2:-1000000uinit}

if [ -z "$WALLET_ADDRESS" ]; then
  echo "Usage: ./scripts/fund-wallet.sh <WALLET_ADDRESS> [AMOUNT]"
  echo "  WALLET_ADDRESS: bech32 address (init1...) to fund"
  echo "  AMOUNT: token amount with denom (default: 1000000uinit)"
  exit 1
fi

echo "Funding $WALLET_ADDRESS with $AMOUNT..."

# Fund on rollup (using local node)
echo "Sending tokens on rollup..."
minitiad tx bank send gas-station "$WALLET_ADDRESS" "$AMOUNT" \
  --chain-id socialyield-1 \
  --node http://localhost:26657 \
  --keyring-backend test \
  --fees 20000GAS \
  --yes

echo ""
echo "✓ Funded $WALLET_ADDRESS with $AMOUNT"
echo ""
echo "Check balance:"
echo "  minitiad query bank balances $WALLET_ADDRESS --node http://localhost:26657"
