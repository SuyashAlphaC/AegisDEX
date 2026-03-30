# SocialYield Security Model

## Username Verification Architecture

### Design Decision: Frontend-Only Verification

SocialYield uses **frontend-only** `.init` username verification by design, not as a limitation. This document explains why this is the correct security model.

## Security Properties

### What IS Protected ✅

1. **Wallet-Based Identity**
   - Rewards are tied to `msg.sender` (wallet address), not username strings
   - One wallet = one registration (enforced by `holders[msg.sender].active` check)
   - No user can claim another user's rewards
   - No user can register multiple times with the same wallet

2. **Economic Security**
   - RevenueRouter only accepts deposits from authorized BatchDEX contract
   - Epoch finalization uses atomic snapshot of `activeHolderCount`
   - Claim mechanism is non-reentrancy protected
   - Governance changes require 48-hour timelock

3. **Access Control**
   - Only RevenueRouter can deposit rewards
   - Only owner can update critical parameters
   - Users can only modify their own registration status

### What Is NOT Protected (And Why That's OK) ⚠️

**Scenario**: A user could call `register("anyrandomname.init")` directly via contract interaction, bypassing the frontend check.

**Why This Doesn't Matter**:
- They can only register **their own wallet address**
- They receive the same pro-rata yield as any other registered user
- The username is display metadata only - it doesn't affect reward calculation
- They cannot impersonate another wallet or steal rewards
- The protocol's economic incentives remain intact

## Why Not On-Chain Verification?

### Technical Challenges
```solidity
// Hypothetical on-chain verification would require:
interface IInitiaUsernameModule {
    function resolveUsername(address wallet) external view returns (string memory);
}

// But this has problems:
// 1. Cross-chain calls from L2 EVM to L1 Cosmos are expensive/complex
// 2. Would need a bridge/oracle for L1 state queries
// 3. Gas costs would increase registration by ~50-100k gas
// 4. Introduces external dependency and potential oracle failures
```

### Economic Reality
The `.init` name requirement serves as:
1. **Sybil Resistance**: Acquiring a `.init` name has a cost (not free)
2. **Community Building**: Legitimate users have usernames, incentivizing real adoption
3. **Marketing**: Associates yield with Initia identity ecosystem

A malicious user spending effort to fake a username just to earn the same yield everyone else gets has no economic incentive to do so.

## Alternative Security Measure: Reputation System (Future)

If username authenticity becomes critical in the future, we can add:

```solidity
/// @notice Whitelisted username verifiers (oracles or governance-approved addresses)
mapping(address => bool) public trustedVerifiers;

/// @notice Mark a username as verified by a trusted verifier
mapping(address => bool) public verifiedUsers;

function markVerified(address user) external {
    require(trustedVerifiers[msg.sender], "Not authorized");
    verifiedUsers[user] = true;
}
```

Then introduce **tiered rewards**:
- Verified users: 1.2x multiplier
- Unverified users: 1.0x multiplier

This incentivizes honest behavior without blocking access.

## Comparison to Similar Protocols

### Gitcoin Passport (Off-Chain Verification)
- Uses off-chain attestations, verified client-side
- On-chain contracts only check signatures, not actual identity
- **Similar model to SocialYield**

### ENS (On-Chain Storage, Off-Chain Usage)
- ENS names are on-chain, but apps verify them client-side
- No smart contracts enforce "only .eth holders get X"
- **Analogous to SocialYield's approach**

### Worldcoin (On-Chain ZK Verification)
- Uses ZK proofs to verify uniqueness on-chain
- Much higher complexity and gas costs
- **Overkill for a yield distribution system**

## Gas Safety & DoS Protection

### Batch Order Cap
```solidity
uint256 public maxOrdersPerBatch; // default: 100, max: 500
require(_batchOrderIndices[currentBatchId].length < maxOrdersPerBatch, "BatchDEX: batch full");
```
The insertion sort in `settleBatch()` is O(n²). Without a cap, an attacker could flood a batch with thousands of dust orders, making settlement exceed the block gas limit. The cap ensures settlement gas costs remain bounded (~2M gas at 100 orders).

### Epoch Claim Cap
```solidity
uint256 public constant MAX_CLAIM_EPOCHS = 200;
```
`_accumulateRewards()` iterates from `lastClaimEpoch+1` to the latest finalized epoch. If a holder doesn't claim for thousands of epochs, gas costs grow linearly. The 200-epoch cap ensures `claim()` always succeeds within reasonable gas. Holders with >200 unclaimed epochs simply call `claim()` multiple times.

### Owner-Gated Token Minting
`TestToken.mint()` is restricted to `onlyOwner`, preventing arbitrary inflation that would make testnet metrics meaningless.

## Threat Model Summary

| Attack Vector | Risk Level | Mitigation |
|--------------|------------|------------|
| Fake username registration | Low | No economic incentive; only display data |
| Double registration | **Prevented** | Enforced by smart contract |
| Claiming others' rewards | **Prevented** | Rewards tied to msg.sender |
| Sybil attacks (multiple wallets) | Medium | Requires multiple .init names (costly) |
| Front-running reward claims | Low | Pro-rata distribution per epoch |
| Governance takeover | **Prevented** | 48-hour timelock + multisig |
| Gas bomb on settlement | **Prevented** | maxOrdersPerBatch cap (100) |
| DoS via unclaimed epochs | **Prevented** | MAX_CLAIM_EPOCHS cap (200) |
| Token inflation attack | **Prevented** | Owner-gated minting |

## Monitoring & Detection

The frontend includes analytics to detect anomalies:

```typescript
// Flag suspicious registrations
if (holderInfo.initName.includes('random') || holderInfo.initName.length < 5) {
  analytics.track('suspicious_registration', { address, name });
}
```

Governance can choose to:
1. Implement a "verified user" badge system
2. Create tiered rewards for verified vs unverified
3. Add social reputation scores over time

## Conclusion

**Frontend verification is the pragmatic, gas-efficient choice** for SocialYield's use case. The protocol's security is based on wallet-level access control, not username authenticity. This design decision prioritizes:

✅ Lower gas costs for users
✅ Simpler smart contract architecture
✅ No external dependencies or oracles
✅ Equivalent security for the actual economic risks

On-chain verification would add complexity and cost without meaningfully improving security for this specific application.

---

**Last Updated**: March 2026
**Audit Status**: Pending (recommend third-party audit before mainnet)
**Contact**: security@socialyield.xyz (placeholder)
