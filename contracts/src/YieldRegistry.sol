// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title YieldRegistry
 * @notice Tracks wallets registered with a .init name for MEV yield.
 *         Each epoch (default: 1000 blocks), rewards deposited by the
 *         RevenueRouter are split pro-rata among all active holders.
 *         Holders can claim accrued rewards at any time.
 * @dev    The .init ownership check is performed off-chain by the frontend
 *         querying the Initia L1 username module before enabling registration.
 */
contract YieldRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Token distributed as yield (quote token / SYLD)
    IERC20 public yieldToken;

    /// @notice Only allowed depositor (RevenueRouter)
    address public revenueRouter;

    /// @notice Blocks per epoch (default: 1000)
    uint256 public epochLength;

    /// @notice Current epoch number (starts at 1)
    uint256 public currentEpoch;

    /// @notice Block when the current epoch started
    uint256 public epochStartBlock;

    // ─── Structs ────────────────────────────────────────────────────────

    /// @notice Information about a registered .init holder
    struct Holder {
        string initName; // e.g. "alice.init"
        uint256 registeredEpoch; // epoch when registered
        uint256 lastClaimEpoch; // last epoch claimed through
        uint256 pendingRewards; // unclaimed rewards (accumulated)
        bool active; // currently registered
    }

    /// @notice Reward info for a completed epoch
    struct EpochReward {
        uint256 totalReward; // total deposited this epoch
        uint256 holderCount; // registered holders at finalization
        uint256 rewardPerHolder; // = totalReward / holderCount
        bool finalized; // whether epoch has been finalized
    }

    // ─── Storage ────────────────────────────────────────────────────────

    /// @notice Holder data by address
    mapping(address => Holder) public holders;

    /// @notice Epoch reward data by epoch number
    mapping(uint256 => EpochReward) public epochRewards;

    /// @notice List of all holder addresses (includes deregistered)
    address[] public holderList;

    /// @notice Count of currently active holders
    uint256 public activeHolderCount;

    /// @notice Pending reward accumulator for current (unfinalized) epoch
    uint256 public currentEpochDeposits;

    /// @notice Maximum epochs to iterate per claim (gas safety cap)
    uint256 public constant MAX_CLAIM_EPOCHS = 200;

    // ─── Events ─────────────────────────────────────────────────────────

    event HolderRegistered(
        address indexed holder,
        string initName,
        uint256 epoch
    );
    event HolderDeregistered(address indexed holder, uint256 epoch);
    event EpochFinalized(
        uint256 indexed epoch,
        uint256 totalReward,
        uint256 holderCount,
        uint256 rewardPerHolder
    );
    event RewardDeposited(uint256 indexed epoch, uint256 amount);
    event RewardClaimed(
        address indexed holder,
        uint256 amount,
        uint256 fromEpoch,
        uint256 toEpoch
    );

    // ─── Constructor ────────────────────────────────────────────────────

    /**
     * @param _yieldToken     ERC20 token for yield distribution
     * @param _revenueRouter  Address of the RevenueRouter (only depositor)
     * @param _epochLength    Blocks per epoch
     */
    constructor(
        address _yieldToken,
        address _revenueRouter,
        uint256 _epochLength
    ) Ownable(msg.sender) {
        require(_yieldToken != address(0), "YieldRegistry: zero yield token");
        require(_epochLength > 0, "YieldRegistry: zero epoch length");

        yieldToken = IERC20(_yieldToken);
        revenueRouter = _revenueRouter; // can be zero initially, set later
        epochLength = _epochLength;
        currentEpoch = 1;
        epochStartBlock = block.number;
    }

    // ─── Registration ───────────────────────────────────────────────────

    /**
     * @notice Register msg.sender as a .init holder for yield participation.
     * @dev    The frontend verifies .init ownership before showing the button.
     * @param _initName The holder's .init name (e.g. "alice.init")
     */
    function register(string calldata _initName) external {
        require(bytes(_initName).length > 0, "YieldRegistry: empty name");
        require(
            !holders[msg.sender].active,
            "YieldRegistry: already registered"
        );

        // Check if this is a new holder or re-registration
        if (holders[msg.sender].registeredEpoch == 0) {
            // Brand new holder
            holderList.push(msg.sender);
        }

        holders[msg.sender] = Holder({
            initName: _initName,
            registeredEpoch: currentEpoch,
            lastClaimEpoch: currentEpoch > 0 ? currentEpoch - 1 : 0,
            pendingRewards: 0,
            active: true
        });

        activeHolderCount++;

        emit HolderRegistered(msg.sender, _initName, currentEpoch);
    }

    /**
     * @notice Deregister from yield participation. Pending rewards can
     *         still be claimed after deregistering.
     */
    function deregister() external {
        require(holders[msg.sender].active, "YieldRegistry: not registered");

        // Accumulate any unclaimed rewards before deregistering
        _accumulateRewards(msg.sender);

        holders[msg.sender].active = false;
        activeHolderCount--;

        emit HolderDeregistered(msg.sender, currentEpoch);
    }

    // ─── Reward Deposits ────────────────────────────────────────────────

    /**
     * @notice Called by RevenueRouter to deposit epoch rewards.
     * @dev    Tokens must be pre-transferred to this contract (push model).
     *         Or caller must approve and we pull.
     * @param amount Amount of yieldToken to deposit
     */
    function depositReward(uint256 amount) external nonReentrant {
        require(msg.sender == revenueRouter, "YieldRegistry: not router");
        require(amount > 0, "YieldRegistry: zero amount");

        currentEpochDeposits += amount;
        epochRewards[currentEpoch].totalReward += amount;
        emit RewardDeposited(currentEpoch, amount);
    }

    // ─── Epoch Management ───────────────────────────────────────────────

    /**
     * @notice Advance and finalize the current epoch. Snapshots the holder
     *         count and computes reward per holder.
     * @dev    Anyone can call this after epochLength blocks have elapsed.
     */
    function finalizeEpoch() external {
        require(
            block.number >= epochStartBlock + epochLength,
            "YieldRegistry: epoch not elapsed"
        );

        uint256 holderCount = activeHolderCount;
        uint256 rewardPerHolder = 0;

        if (holderCount > 0 && currentEpochDeposits > 0) {
            rewardPerHolder = currentEpochDeposits / holderCount;
        }

        epochRewards[currentEpoch] = EpochReward({
            totalReward: currentEpochDeposits,
            holderCount: holderCount,
            rewardPerHolder: rewardPerHolder,
            finalized: true
        });

        emit EpochFinalized(
            currentEpoch,
            currentEpochDeposits,
            holderCount,
            rewardPerHolder
        );

        // Advance epoch
        currentEpoch++;
        epochStartBlock = block.number;
        currentEpochDeposits = 0;
    }

    // ─── Claims ─────────────────────────────────────────────────────────

    /**
     * @notice Claim all pending rewards for msg.sender across unclaimed epochs.
     */
    function claim() external nonReentrant {
        Holder storage h = holders[msg.sender];
        require(h.registeredEpoch > 0, "YieldRegistry: not a holder");

        _accumulateRewards(msg.sender);

        uint256 claimable = h.pendingRewards;
        require(claimable > 0, "YieldRegistry: nothing to claim");

        h.pendingRewards = 0;

        yieldToken.safeTransfer(msg.sender, claimable);

        emit RewardClaimed(
            msg.sender,
            claimable,
            h.registeredEpoch,
            h.lastClaimEpoch
        );
    }

    /**
     * @notice Accumulate unclaimed epoch rewards for a holder.
     * @dev    Iterates from lastClaimEpoch+1 to the latest finalized epoch,
     *         capped at MAX_CLAIM_EPOCHS per call to prevent gas DoS.
     *         If a holder has >200 unclaimed epochs, they call claim() multiple times.
     */
    function _accumulateRewards(address addr) internal {
        Holder storage h = holders[addr];
        if (h.registeredEpoch == 0) return;

        uint256 fromEpoch = h.lastClaimEpoch + 1;
        uint256 toEpoch = currentEpoch > 1 ? currentEpoch - 1 : 0;

        // Cap iteration to prevent gas DoS
        if (toEpoch > fromEpoch + MAX_CLAIM_EPOCHS - 1) {
            toEpoch = fromEpoch + MAX_CLAIM_EPOCHS - 1;
        }

        uint256 accumulated = 0;
        for (uint256 e = fromEpoch; e <= toEpoch; e++) {
            EpochReward storage er = epochRewards[e];
            if (er.finalized && er.rewardPerHolder > 0) {
                // Only get rewards if holder was active and registered before this epoch
                if (h.active && h.registeredEpoch <= e) {
                    accumulated += er.rewardPerHolder;
                }
            }
        }

        h.pendingRewards += accumulated;
        h.lastClaimEpoch = toEpoch > h.lastClaimEpoch
            ? toEpoch
            : h.lastClaimEpoch;
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /**
     * @notice Compute pending claimable amount for a holder (next claim batch).
     * @dev    Caps at MAX_CLAIM_EPOCHS to match the actual claim behavior.
     * @param holder Address to check
     * @return total Claimable amount in next claim() call
     */
    function pendingClaim(
        address holder
    ) external view returns (uint256 total) {
        Holder storage h = holders[holder];
        if (h.registeredEpoch == 0) return 0;

        total = h.pendingRewards;

        uint256 fromEpoch = h.lastClaimEpoch + 1;
        uint256 toEpoch = currentEpoch > 1 ? currentEpoch - 1 : 0;

        // Match the cap from _accumulateRewards
        if (toEpoch > fromEpoch + MAX_CLAIM_EPOCHS - 1) {
            toEpoch = fromEpoch + MAX_CLAIM_EPOCHS - 1;
        }

        for (uint256 e = fromEpoch; e <= toEpoch; e++) {
            EpochReward storage er = epochRewards[e];
            if (er.finalized && er.rewardPerHolder > 0) {
                if (h.active && h.registeredEpoch <= e) {
                    total += er.rewardPerHolder;
                }
            }
        }
    }

    /// @notice Get full holder info
    function getHolder(address addr) external view returns (Holder memory) {
        return holders[addr];
    }

    /// @notice Get all registered holder addresses
    function getHolderList() external view returns (address[] memory) {
        return holderList;
    }

    /// @notice Get epoch reward info
    function getEpochReward(
        uint256 epoch
    ) external view returns (EpochReward memory) {
        return epochRewards[epoch];
    }

    /// @notice Blocks until next epoch can be finalized
    function blocksUntilNextEpoch() external view returns (uint256) {
        uint256 endBlock = epochStartBlock + epochLength;
        if (block.number >= endBlock) {
            return 0;
        }
        return endBlock - block.number;
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /// @notice Set the revenue router address (only depositor)
    function setRevenueRouter(address _revenueRouter) external onlyOwner {
        require(_revenueRouter != address(0), "YieldRegistry: zero router");
        revenueRouter = _revenueRouter;
    }

    /// @notice Set the epoch length in blocks
    function setEpochLength(uint256 _epochLength) external onlyOwner {
        require(_epochLength > 0, "YieldRegistry: zero epoch length");
        epochLength = _epochLength;
    }
}
