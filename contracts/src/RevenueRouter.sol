// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IYieldRegistry {
    function depositReward(uint256 amount) external;
}

/**
 * @title RevenueRouter
 * @notice Receives MEV surplus from BatchDEX and splits it according to
 *         governance-set ratios: 60% to YieldRegistry (holders), 30% to
 *         DAO treasury, 10% to dev fund.
 */
contract RevenueRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Token used for reward distribution (quote token / SYLD)
    IERC20 public rewardToken;

    /// @notice YieldRegistry contract that receives holder rewards
    address public yieldRegistry;

    /// @notice DAO treasury address
    address public daoTreasury;

    /// @notice Developer fund address
    address public devFund;

    /// @notice Holder share in basis points (default: 6000 = 60%)
    uint256 public holderShare;

    /// @notice DAO share in basis points (default: 3000 = 30%)
    uint256 public daoShare;

    /// @notice Dev share in basis points (default: 1000 = 10%)
    uint256 public devShare;

    /// @notice Total amount routed through this contract
    uint256 public totalRouted;

    /// @notice Total amount sent to holders via YieldRegistry
    uint256 public totalToHolders;

    /// @notice Total amount sent to DAO treasury
    uint256 public totalToDAO;

    /// @notice Total amount sent to dev fund
    uint256 public totalToDev;

    // ─── Events ─────────────────────────────────────────────────────────

    event RevenueReceived(
        address indexed from,
        uint256 amount,
        uint256 toHolders,
        uint256 toDAO,
        uint256 toDev
    );

    event SharesUpdated(
        uint256 holderShare,
        uint256 daoShare,
        uint256 devShare
    );

    event AddressesUpdated(
        address yieldRegistry,
        address daoTreasury,
        address devFund
    );

    // ─── Constructor ────────────────────────────────────────────────────

    /**
     * @param _rewardToken    ERC20 token used for distributions
     * @param _yieldRegistry  Address of the YieldRegistry contract
     * @param _daoTreasury    Address of the DAO treasury
     * @param _devFund        Address of the dev fund
     */
    constructor(
        address _rewardToken,
        address _yieldRegistry,
        address _daoTreasury,
        address _devFund
    ) Ownable(msg.sender) {
        require(_rewardToken != address(0), "RevenueRouter: zero reward token");
        require(_yieldRegistry != address(0), "RevenueRouter: zero registry");
        require(_daoTreasury != address(0), "RevenueRouter: zero treasury");
        require(_devFund != address(0), "RevenueRouter: zero dev fund");

        rewardToken = IERC20(_rewardToken);
        yieldRegistry = _yieldRegistry;
        daoTreasury = _daoTreasury;
        devFund = _devFund;

        // Default split: 60/30/10
        holderShare = 6000;
        daoShare = 3000;
        devShare = 1000;
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @notice Route revenue from caller (typically BatchDEX).
     *         Pulls rewardToken from caller and splits per ratios.
     * @dev    Caller must approve this contract to spend `amount` of rewardToken.
     * @param amount Amount of rewardToken to route
     */
    function routeRevenue(uint256 amount) external nonReentrant {
        require(amount > 0, "RevenueRouter: zero amount");

        // Pull tokens from caller
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        // Compute splits
        uint256 toHolders = (amount * holderShare) / 10000;
        uint256 toDAO = (amount * daoShare) / 10000;
        uint256 toDev = amount - toHolders - toDAO; // remainder to dev to avoid dust

        // Distribute
        if (toHolders > 0) {
            rewardToken.safeTransfer(yieldRegistry, toHolders);
            IYieldRegistry(yieldRegistry).depositReward(toHolders);
        }
        if (toDAO > 0) {
            rewardToken.safeTransfer(daoTreasury, toDAO);
        }
        if (toDev > 0) {
            rewardToken.safeTransfer(devFund, toDev);
        }

        // Update accounting
        totalRouted += amount;
        totalToHolders += toHolders;
        totalToDAO += toDAO;
        totalToDev += toDev;

        emit RevenueReceived(msg.sender, amount, toHolders, toDAO, toDev);
    }

    /**
     * @notice Accept native token (ETH/GAS) and split it.
     * @dev    Fallback for cases where MEV is in native token.
     */
    receive() external payable {
        require(msg.value > 0, "RevenueRouter: zero value");

        uint256 amount = msg.value;
        uint256 toHolders = (amount * holderShare) / 10000;
        uint256 toDAO = (amount * daoShare) / 10000;
        uint256 toDev = amount - toHolders - toDAO;

        if (toHolders > 0) {
            (bool s1, ) = yieldRegistry.call{value: toHolders}("");
            require(s1, "RevenueRouter: holder transfer failed");
        }
        if (toDAO > 0) {
            (bool s2, ) = daoTreasury.call{value: toDAO}("");
            require(s2, "RevenueRouter: DAO transfer failed");
        }
        if (toDev > 0) {
            (bool s3, ) = devFund.call{value: toDev}("");
            require(s3, "RevenueRouter: dev transfer failed");
        }

        totalRouted += amount;
        totalToHolders += toHolders;
        totalToDAO += toDAO;
        totalToDev += toDev;

        emit RevenueReceived(msg.sender, amount, toHolders, toDAO, toDev);
    }

    // ─── Admin Functions ────────────────────────────────────────────────

    /**
     * @notice Update split ratios. Must sum to exactly 10000 basis points.
     * @param _holderShare  Holder share in basis points
     * @param _daoShare     DAO share in basis points
     * @param _devShare     Dev share in basis points
     */
    function updateShares(
        uint256 _holderShare,
        uint256 _daoShare,
        uint256 _devShare
    ) external onlyOwner {
        require(
            _holderShare + _daoShare + _devShare == 10000,
            "RevenueRouter: shares must sum to 10000"
        );

        holderShare = _holderShare;
        daoShare = _daoShare;
        devShare = _devShare;

        emit SharesUpdated(_holderShare, _daoShare, _devShare);
    }

    /**
     * @notice Update destination addresses.
     * @param _yieldRegistry  New YieldRegistry address
     * @param _daoTreasury    New DAO treasury address
     * @param _devFund        New dev fund address
     */
    function updateAddresses(
        address _yieldRegistry,
        address _daoTreasury,
        address _devFund
    ) external onlyOwner {
        require(_yieldRegistry != address(0), "RevenueRouter: zero registry");
        require(_daoTreasury != address(0), "RevenueRouter: zero treasury");
        require(_devFund != address(0), "RevenueRouter: zero dev fund");

        yieldRegistry = _yieldRegistry;
        daoTreasury = _daoTreasury;
        devFund = _devFund;

        emit AddressesUpdated(_yieldRegistry, _daoTreasury, _devFund);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Returns the current split ratios
    function getShares() external view returns (uint256, uint256, uint256) {
        return (holderShare, daoShare, devShare);
    }

    /// @notice Returns the destination addresses
    function getAddresses() external view returns (address, address, address) {
        return (yieldRegistry, daoTreasury, devFund);
    }
}
