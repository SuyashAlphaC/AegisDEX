## 📱 User Testing Guide (For Judges)

### Prerequisites
1. **Keplr or Leap Wallet** installed (browser extension)
2. **Testnet Initia account** with gas tokens
3. **`.init` name** registered (optional for trading, required for yield)

### Step-by-Step Test Flow

---

### Part 1: Connect & Setup (5 min)

**1. Visit the Testnet App**
```
URL:  https://social-yield-sand.vercel.app/
or
Run locally: cd frontend && npm run dev
```

**2. Connect Wallet**
- Click "Connect Wallet" in top-right
- Select Keplr/Leap
- Approve connection to `minievm-2` testnet
- Verify your address shows in navbar

**3. Get Testnet Tokens**
- Click "Faucet" button in the Quick Start banner
- Select "BOTH" (USDC + SYLD)
- Click "Claim Testnet Tokens"
- Wait 10-15 seconds for transaction confirmation
- Check your balance: Should see 100 USDC + 100 SYLD

**Expected Result**: ✅ Wallet connected, tokens in balance

---

### Part 2: Place Orders (10 min)

**4. Navigate to Trade Page**
- Click "Trade" in navbar
- Observe batch status card showing:
  - Current batch number
  - Blocks until settlement
  - Progress bar

**5. Place a Buy Order**
- Toggle to "Buy" tab (should be default)
- Enter Limit Price: `1.5` (SYLD per USDC)
- Enter Amount: `10` (USDC)
- You should see: "You pay 15 SYLD" calculated
- Click "Place Buy Order"
- Approve token spending in wallet (first time only)
- Wait for transaction confirmation
- Order should appear in "Buy Orders" section

**6. Place a Sell Order** (optional, for testing CoW)
- Toggle to "Sell" tab
- Enter Limit Price: `1.4` (SYLD per USDC)
- Enter Amount: `10` (USDC)
- Click "Place Sell Order"
- Approve and confirm
- Order appears in "Sell Orders" section

**Expected Result**: ✅ Orders visible in order book

---

### Part 3: Batch Settlement (5 min)

**7. Wait for Batch Window**
- Watch the progress bar fill up
- Blocks remaining counts down from 10 → 0
- Badge changes from "Collecting Orders" to "Ready to Settle"

**8. Settle the Batch**
- Click "Settle Batch" button
- Confirm transaction in wallet
- Wait for settlement (~5-10 seconds)
- Observe:
  - New batch starts (batch number increments)
  - Orders disappear from order book (filled)
  - "MEV Captured" metric increases
  - "Total Volume" metric increases

**9. Verify Order Execution**
- Check your wallet balance
- If you placed a buy order: Should have received USDC (baseToken)
- Any surplus between limit price and clearing price = MEV captured

**Expected Result**: ✅ Batch settled, MEV captured, balances updated

---

### Part 4: Register for Yield (10 min)

**10. Navigate to Earn Page**
- Click "Earn" in navbar
- Observe hero stats:
  - Current Epoch
  - Epoch Rewards (MEV redistributed)
  - Active Holders count

**11. Register Your .init Name**
- If you have a `.init` name:
  - Frontend auto-detects it
  - Click "Register for Yield"
  - Confirm transaction
  - You're now listed in "Registered Holders" table

- If you DON'T have a `.init` name:
  - Click "Get .init Name" button
  - Opens Initia testnet app
  - Register a name (costs testnet INIT)
  - Return to SocialYield
  - Refresh page, then register

**12. Wait for Epoch Finalization**
- Epochs finalize every 1,000 blocks (~8 minutes)
- Watch "Blocks until next epoch" countdown
- When it hits 0, anyone can call "Finalize Epoch"
- Click "Finalize Epoch" button
- Rewards snapshot is taken

**13. Claim Your Yield**
- After epoch finalizes, "Your Pending" should update
- Click "Claim Rewards"
- Receive SYLD tokens directly to your wallet

**Expected Result**: ✅ Registered as holder, earned and claimed yield

---

### Part 5: Advanced Testing (Optional, 15 min)

**14. Test Multiple Orders in Same Batch**
- Place 3-5 buy orders at different prices
- Wait for settlement
- Verify only orders at or above clearing price filled
- Others refunded automatically

**15. Test Orderbook Depth**
- Place orders with large size (e.g., 50-100 USDC)
- Observe how clearing price shifts based on supply/demand

**16. Test Cross-Batch Behavior**
- Place order in batch N
- Don't wait for settlement
- Try to place another order in same batch
- Both should be accepted

**17. Stress Test Settlement**
- Get 2-3 friends to place orders simultaneously
- Settle batch with 10+ orders
- Verify no failed transactions
- Check gas costs (should be reasonable)

**Expected Result**: ✅ System handles complex scenarios correctly

---

## 🐛 Known Issues & Troubleshooting

### Issue 1: "Insufficient Allowance" Error
**Cause**: ERC20 tokens not approved for BatchDEX contract
**Fix**:
- First order automatically triggers approval
- If it fails, manually approve via wallet
- Or refresh page and try again

### Issue 2: "Batch Already Settled" Error
**Cause**: You tried to place order after batch window closed
**Fix**:
- Wait 5-10 seconds for new batch to start
- Retry order placement

### Issue 3: Faucet Returns 429 Error
**Cause**: You already claimed in last 24 hours
**Fix**:
- Wait for cooldown period
- Or ask in Discord for manual refill

### Issue 4: Username Not Detected
**Cause**: Frontend can't query .init name from L1
**Fix**:
- Check you have a registered .init name
- Refresh page
- Clear cache and retry
- Manually enter your username (current workaround)

### Issue 5: Transaction Stuck "Pending"
**Cause**: Testnet congestion or RPC issues
**Fix**:
- Wait 1-2 minutes
- Check Initia testnet explorer for tx status
- If truly stuck, increase gas and retry

---

## 📊 Metrics to Observe During Testing

### User-Level Metrics:
- [ ] Wallet connection success rate: ___%
- [ ] Faucet claim success rate: ___%
- [ ] Order placement success rate: ___%
- [ ] Average time to place order: ___s
- [ ] Batch settlement success rate: ___%
- [ ] Yield registration success rate: ___%

### Protocol-Level Metrics:
- [ ] Total orders placed: ___
- [ ] Total batches settled: ___
- [ ] Total MEV captured: $___
- [ ] Average MEV per batch: $___
- [ ] Registered .init holders: ___
- [ ] Yield claimed: $___

### UX Feedback:
- [ ] Is the batch auction concept clear?
- [ ] Are error messages helpful?
- [ ] Is the order book visualization useful?
- [ ] Would you use this on mainnet?

---

## 🎯 Success Criteria for Demo

**For Hackathon Judges**:
- [ ] Contract addresses verified on testnet
- [ ] Frontend successfully connects to wallet
- [ ] At least 1 complete batch auction executed
- [ ] MEV captured and distributed to .init holders
- [ ] No critical errors during 30-minute test session

**For Public Launch**:
- [ ] 100+ registered .init holders
- [ ] $10K+ total trading volume
- [ ] $500+ MEV redistributed
- [ ] <1% transaction failure rate
- [ ] Average user completes full flow in <10 minutes

---

## 📹 Recording Tips for Judges

If you want to record your testing session:

### Tools:
- **Screen Recording**: OBS Studio (free), Loom, or built-in screen recorder
- **Webcam**: Optional but adds personal touch
- **Audio**: Built-in mic is fine, speak clearly

### What to Show:
1. **Wallet Connection** (30s)
   - Show the connect flow
   - Verify address appears

2. **Order Placement** (2 min)
   - Fill out form fields
   - Show approval + confirmation
   - Point out order in orderbook

3. **Batch Settlement** (1 min)
   - Show batch status
   - Click settle button
   - Highlight MEV captured

4. **Yield Registration** (1 min)
   - Show .init name detection
   - Register transaction
   - Appear in holders list

5. **Your Thoughts** (1 min)
   - What did you like?
   - What was confusing?
   - Would you use this?

**Total Duration**: 5-7 minutes is perfect

---

## 🚀 Next Steps After Testing

### For Users:
1. Join our [Discord](https://discord.gg/socialyield) (placeholder)
2. Follow [@SocialYieldDEX](https://twitter.com/socialyield) on Twitter
3. Report bugs: [GitHub Issues](https://github.com/socialyield/socialyield/issues)
4. Refer friends: Share testnet link for bonus yield

### For Judges:
1. Verify contract deployment on [Initia Testnet Explorer](https://scan.testnet.initia.xyz)
2. Review [SECURITY.md](./SECURITY.md) for threat model analysis
3. Check [GTM_STRATEGY.md](./GTM_STRATEGY.md) for go-to-market plans
4. Read smart contract source code in `/contracts/src/`

---

**Thank you for testing SocialYield!** 🎉

Your feedback shapes the future of fair DeFi.

