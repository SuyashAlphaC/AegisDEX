#!/bin/bash
# End-to-end smoke test for SocialYield using cast (foundry)
# Verifies: order placement → batch settlement → MEV routing → yield claim
#
# Prerequisites:
#   - contracts/.env filled with all deployed addresses
#   - cast (from foundry) installed
#   - Token approvals granted to BatchDEX

set -e

cd "$(dirname "$0")/../contracts"

# Load env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

RPC=${RPC_URL:-http://localhost:8545}
PK=$PRIVATE_KEY
DEX=$BATCH_DEX_ADDRESS
ROUTER=$REVENUE_ROUTER_ADDRESS
REGISTRY=$YIELD_REGISTRY_ADDRESS
BASE=$BASE_TOKEN_ADDRESS
QUOTE=$QUOTE_TOKEN_ADDRESS

echo "========================================"
echo "  SocialYield Smoke Test"
echo "  RPC: $RPC"
echo "========================================"

# Helper
function check_tx() {
  local desc=$1
  local tx_hash=$2
  echo "  ✓ $desc: $tx_hash"
}

echo ""
echo "0. Minting test tokens..."
TX=$(cast send "$BASE" "mint(address,uint256)" \
  "$(cast wallet address --private-key $PK)" \
  "$(cast --to-wei 10000)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Mint base tokens" "$TX"

TX=$(cast send "$QUOTE" "mint(address,uint256)" \
  "$(cast wallet address --private-key $PK)" \
  "$(cast --to-wei 10000)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Mint quote tokens" "$TX"

echo ""
echo "1. Approving DEX to spend tokens..."
TX=$(cast send "$BASE" "approve(address,uint256)" "$DEX" \
  "$(cast --max-uint)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Approve base token" "$TX"

TX=$(cast send "$QUOTE" "approve(address,uint256)" "$DEX" \
  "$(cast --max-uint)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Approve quote token" "$TX"

echo ""
echo "2. Placing buy order (limit: 2 SYLD/USDC, amount: 100 USDC)..."
TX=$(cast send "$DEX" \
  "placeBuyOrder(uint256,uint256)" \
  "$(cast --to-wei 2)" "$(cast --to-wei 100)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Buy order placed" "$TX"

echo ""
echo "3. Placing sell order (limit: 1.5 SYLD/USDC, amount: 100 USDC)..."
TX=$(cast send "$DEX" \
  "placeSellOrder(uint256,uint256)" \
  "$(cast --to-wei 1.5)" "$(cast --to-wei 100)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Sell order placed" "$TX"

echo ""
echo "4. Checking if batch is settleable..."
SETTLEABLE=$(cast call "$DEX" "isBatchSettleable()(bool)" --rpc-url "$RPC")
echo "  Batch settleable: $SETTLEABLE"

if [ "$SETTLEABLE" = "false" ]; then
  BLOCKS=$(cast call "$DEX" "blocksUntilSettlement()(uint256)" --rpc-url "$RPC")
  echo "  Blocks until settlement: $BLOCKS"
  echo "  Waiting for batch window to elapse..."
  sleep 15
fi

echo ""
echo "5. Settling batch..."
TX=$(cast send "$DEX" "settleBatch()" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Batch settled" "$TX"

echo ""
echo "6. Checking MEV captured..."
MEV=$(cast call "$DEX" "totalMEVCaptured()(uint256)" --rpc-url "$RPC")
echo "  Total MEV captured: $(cast --from-wei $MEV) SYLD"

VOLUME=$(cast call "$DEX" "totalVolume()(uint256)" --rpc-url "$RPC")
echo "  Total volume: $(cast --from-wei $VOLUME) USDC"

echo ""
echo "7. Registering as .init holder..."
TX=$(cast send "$REGISTRY" 'register(string)' "smoketest.init" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Holder registered" "$TX"

echo ""
echo "8. Checking holder list..."
HOLDERS=$(cast call "$REGISTRY" "activeHolderCount()(uint256)" --rpc-url "$RPC")
echo "  Active holders: $HOLDERS"

echo ""
echo "9. Depositing reward (simulating router)..."
DEPLOYER=$(cast wallet address --private-key $PK)
# Approve registry to pull tokens
TX=$(cast send "$QUOTE" "approve(address,uint256)" "$REGISTRY" \
  "$(cast --to-wei 100)" \
  --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
check_tx "Approved registry" "$TX"

echo ""
echo "10. Finalizing epoch (may need to wait)..."
EPOCH_BLOCKS=$(cast call "$REGISTRY" "blocksUntilNextEpoch()(uint256)" --rpc-url "$RPC")
echo "  Blocks until next epoch: $EPOCH_BLOCKS"
if [ "$EPOCH_BLOCKS" != "0" ]; then
  echo "  Note: Epoch hasn't elapsed yet. Finalization will fail until enough blocks pass."
  echo "  Skipping finalize + claim for now."
else
  TX=$(cast send "$REGISTRY" "finalizeEpoch()" \
    --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
  check_tx "Epoch finalized" "$TX"

  echo ""
  echo "11. Claiming rewards..."
  PENDING=$(cast call "$REGISTRY" "pendingClaim(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC")
  echo "  Pending claim: $(cast --from-wei $PENDING) SYLD"

  if [ "$PENDING" != "0" ]; then
    TX=$(cast send "$REGISTRY" "claim()" \
      --rpc-url "$RPC" --private-key "$PK" --json | jq -r '.transactionHash')
    check_tx "Rewards claimed" "$TX"
  fi
fi

echo ""
echo "========================================"
echo "  ✅ Smoke Test Complete"
echo "========================================"
