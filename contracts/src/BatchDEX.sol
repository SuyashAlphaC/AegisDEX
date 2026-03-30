// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal interface for calling RevenueRouter.routeRevenue()
interface IRevenueRouter {
    function routeRevenue(uint256 amount) external;
}

/**
 * @title BatchDEX
 * @notice A uniform-price batch auction DEX that collects orders over a
 *         configurable block window, then settles all trades at a single
 *         clearing price. Any surplus between limit prices and the clearing
 *         price is captured as MEV and forwarded to the RevenueRouter.
 * @dev    All prices use 18-decimal fixed-point arithmetic.
 *         No floating point — only integer math throughout.
 */
contract BatchDEX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── State Variables ────────────────────────────────────────────────

    /// @notice The base token (e.g. USDC) — the asset being traded
    IERC20 public baseToken;

    /// @notice The quote token (e.g. INIT/SYLD) — the pricing currency
    IERC20 public quoteToken;

    /// @notice Address of the RevenueRouter that receives MEV surplus
    address public revenueRouter;

    /// @notice Number of blocks per batch window (default: 10)
    uint256 public batchWindow;

    /// @notice Maximum number of orders allowed per batch (gas safety cap)
    uint256 public maxOrdersPerBatch;

    /// @notice Current batch identifier (auto-increments on settlement)
    uint256 public currentBatchId;

    /// @notice Block number when the current batch started
    uint256 public batchStartBlock;

    /// @notice Cumulative volume of base tokens traded across all batches
    uint256 public totalVolume;

    /// @notice Cumulative MEV surplus captured across all batches
    uint256 public totalMEVCaptured;

    // ─── Structs ────────────────────────────────────────────────────────

    /// @notice Represents a single limit order in a batch
    struct Order {
        address trader;       // address that placed the order
        bool isBuy;           // true = buying baseToken with quoteToken
        uint256 limitPrice;   // price in quoteToken per baseToken (18 decimals)
        uint256 amount;       // amount of baseToken desired
        uint256 batchId;      // batch this order belongs to
        bool filled;          // whether the order was filled at settlement
        uint256 filledAmount; // actual baseToken amount filled
        uint256 refundAmount; // tokens returned if partially/unfilled
    }

    /// @notice Represents a completed or pending batch
    struct Batch {
        uint256 id;
        uint256 startBlock;
        uint256 endBlock;
        uint256 clearingPrice;  // uniform clearing price (18 decimals)
        bool settled;
        uint256 buyOrderCount;
        uint256 sellOrderCount;
        uint256 mevCaptured;    // surplus forwarded to RevenueRouter
    }

    // ─── Storage ────────────────────────────────────────────────────────

    /// @notice All orders ever placed, indexed globally
    Order[] public allOrders;

    /// @notice Batch metadata by batch ID
    mapping(uint256 => Batch) public batches;

    /// @notice Mapping from batch ID to array of global order indices
    mapping(uint256 => uint256[]) internal _batchOrderIndices;

    /// @notice Mapping from trader address to array of global order indices
    mapping(address => uint256[]) public traderOrderIds;

    // ─── Events ─────────────────────────────────────────────────────────

    event OrderPlaced(
        uint256 indexed batchId,
        uint256 indexed orderId,
        address indexed trader,
        bool isBuy,
        uint256 limitPrice,
        uint256 amount
    );

    event BatchSettled(
        uint256 indexed batchId,
        uint256 clearingPrice,
        uint256 buysFilled,
        uint256 sellsFilled,
        uint256 mevCaptured
    );

    event OrderFilled(
        uint256 indexed batchId,
        uint256 indexed orderId,
        address indexed trader,
        uint256 filledAmount,
        uint256 clearingPrice
    );

    event OrderRefunded(
        uint256 indexed orderId,
        address indexed trader,
        uint256 refundAmount
    );

    event BatchWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event MaxOrdersUpdated(uint256 oldMax, uint256 newMax);

    // ─── Constructor ────────────────────────────────────────────────────

    /**
     * @param _baseToken      Address of the base ERC20 token (e.g. USDC)
     * @param _quoteToken     Address of the quote ERC20 token (e.g. INIT)
     * @param _revenueRouter  Address of the RevenueRouter contract
     * @param _batchWindow    Number of blocks per batch auction window
     */
    constructor(
        address _baseToken,
        address _quoteToken,
        address _revenueRouter,
        uint256 _batchWindow
    ) Ownable(msg.sender) {
        require(_baseToken != address(0), "BatchDEX: zero base token");
        require(_quoteToken != address(0), "BatchDEX: zero quote token");
        require(_revenueRouter != address(0), "BatchDEX: zero router");
        require(_batchWindow > 0, "BatchDEX: zero batch window");

        baseToken = IERC20(_baseToken);
        quoteToken = IERC20(_quoteToken);
        revenueRouter = _revenueRouter;
        batchWindow = _batchWindow;
        maxOrdersPerBatch = 100;
        currentBatchId = 1;
        batchStartBlock = block.number;

        batches[1] = Batch({
            id: 1,
            startBlock: block.number,
            endBlock: block.number + _batchWindow,
            clearingPrice: 0,
            settled: false,
            buyOrderCount: 0,
            sellOrderCount: 0,
            mevCaptured: 0
        });
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @notice Place a buy order: lock quoteToken, add to current batch.
     * @param limitPrice  Maximum price willing to pay (quoteToken per baseToken, 18 dec)
     * @param amount      Desired baseToken amount (18 dec)
     * @return orderId    Global index of the placed order
     */
    function placeBuyOrder(
        uint256 limitPrice,
        uint256 amount
    ) external nonReentrant returns (uint256 orderId) {
        require(limitPrice > 0, "BatchDEX: zero limit price");
        require(amount > 0, "BatchDEX: zero amount");
        require(!batches[currentBatchId].settled, "BatchDEX: batch already settled");
        require(
            _batchOrderIndices[currentBatchId].length < maxOrdersPerBatch,
            "BatchDEX: batch full"
        );

        // Calculate the quoteToken cost: (limitPrice * amount) / 1e18
        uint256 quoteCost = (limitPrice * amount) / 1e18;
        require(quoteCost > 0, "BatchDEX: cost underflow");

        // Lock quoteToken from buyer
        quoteToken.safeTransferFrom(msg.sender, address(this), quoteCost);

        // Create order
        orderId = allOrders.length;
        allOrders.push(Order({
            trader: msg.sender,
            isBuy: true,
            limitPrice: limitPrice,
            amount: amount,
            batchId: currentBatchId,
            filled: false,
            filledAmount: 0,
            refundAmount: 0
        }));

        _batchOrderIndices[currentBatchId].push(orderId);
        traderOrderIds[msg.sender].push(orderId);
        batches[currentBatchId].buyOrderCount++;

        emit OrderPlaced(currentBatchId, orderId, msg.sender, true, limitPrice, amount);
    }

    /**
     * @notice Place a sell order: lock baseToken, add to current batch.
     * @param limitPrice  Minimum price willing to accept (quoteToken per baseToken, 18 dec)
     * @param amount      Amount of baseToken to sell (18 dec)
     * @return orderId    Global index of the placed order
     */
    function placeSellOrder(
        uint256 limitPrice,
        uint256 amount
    ) external nonReentrant returns (uint256 orderId) {
        require(limitPrice > 0, "BatchDEX: zero limit price");
        require(amount > 0, "BatchDEX: zero amount");
        require(!batches[currentBatchId].settled, "BatchDEX: batch already settled");
        require(
            _batchOrderIndices[currentBatchId].length < maxOrdersPerBatch,
            "BatchDEX: batch full"
        );

        // Lock baseToken from seller
        baseToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create order
        orderId = allOrders.length;
        allOrders.push(Order({
            trader: msg.sender,
            isBuy: false,
            limitPrice: limitPrice,
            amount: amount,
            batchId: currentBatchId,
            filled: false,
            filledAmount: 0,
            refundAmount: 0
        }));

        _batchOrderIndices[currentBatchId].push(orderId);
        traderOrderIds[msg.sender].push(orderId);
        batches[currentBatchId].sellOrderCount++;

        emit OrderPlaced(currentBatchId, orderId, msg.sender, false, limitPrice, amount);
    }

    /**
     * @notice Settle the current batch after the batch window has elapsed.
     *         Computes a uniform clearing price, fills qualifying orders,
     *         captures MEV surplus and forwards it to RevenueRouter,
     *         and refunds unfilled/partially filled orders.
     * @dev    Anyone can call this once the batch window has passed.
     */
    /// @dev Result struct to pass data between settlement helpers (avoids stack-too-deep)
    struct SettleResult {
        uint256 buysFilled;
        uint256 sellsFilled;
        uint256 totalQuoteCollected;
        uint256 totalQuotePaidToSellers;
        uint256 totalQuoteRefunded;
    }

    function settleBatch() external nonReentrant {
        Batch storage batch = batches[currentBatchId];
        require(!batch.settled, "BatchDEX: already settled");
        require(
            block.number >= batchStartBlock + batchWindow,
            "BatchDEX: batch window not elapsed"
        );

        uint256[] storage orderIndices = _batchOrderIndices[currentBatchId];
        uint256 orderCount = orderIndices.length;

        // If no orders, just advance the batch
        if (orderCount == 0) {
            batch.settled = true;
            batch.endBlock = block.number;
            _advanceBatch();
            emit BatchSettled(currentBatchId - 1, 0, 0, 0, 0);
            return;
        }

        // Separate buys and sells
        (
            Order[] memory buys,
            Order[] memory sells,
            uint256[] memory buyIndices,
            uint256[] memory sellIndices
        ) = _separateOrders(orderIndices, batch.buyOrderCount, batch.sellOrderCount);

        // Co-sort orders with their indices (single pass each)
        _sortBuyIndicesDescending(buys, buyIndices);
        _sortSellIndicesAscending(sells, sellIndices);

        // Compute clearing price on pre-sorted arrays
        (uint256 clearingPrice, uint256 filledVolume) = _computeClearingPrice(buys, sells);

        batch.clearingPrice = clearingPrice;
        batch.endBlock = block.number;
        batch.settled = true;

        if (clearingPrice > 0 && filledVolume > 0) {
            SettleResult memory r;

            _fillBuys(buys, buyIndices, clearingPrice, filledVolume, batch.id, r);
            _fillSells(sells, sellIndices, clearingPrice, filledVolume, batch.id, r);

            // MEV surplus = totalCollected - totalRefunded - totalPaidToSellers
            uint256 mevSurplus = r.totalQuoteCollected - r.totalQuoteRefunded - r.totalQuotePaidToSellers;

            if (mevSurplus > 0) {
                // Approve the RevenueRouter to pull MEV surplus, then trigger distribution
                quoteToken.approve(revenueRouter, mevSurplus);
                IRevenueRouter(revenueRouter).routeRevenue(mevSurplus);
            }

            totalVolume += filledVolume;
            totalMEVCaptured += mevSurplus;
            batch.mevCaptured = mevSurplus;

            emit BatchSettled(batch.id, clearingPrice, r.buysFilled, r.sellsFilled, mevSurplus);
        } else {
            // No clearing price found — refund everyone
            _refundAll(buys, sells, buyIndices, sellIndices);
            emit BatchSettled(batch.id, 0, 0, 0, 0);
        }

        _advanceBatch();
    }

    /// @dev Separate orders into buy and sell arrays
    function _separateOrders(
        uint256[] storage orderIndices,
        uint256 buyCount,
        uint256 sellCount
    ) internal view returns (
        Order[] memory buys,
        Order[] memory sells,
        uint256[] memory buyIdx,
        uint256[] memory sellIdx
    ) {
        buys = new Order[](buyCount);
        sells = new Order[](sellCount);
        buyIdx = new uint256[](buyCount);
        sellIdx = new uint256[](sellCount);
        uint256 bI;
        uint256 sI;

        for (uint256 i = 0; i < orderIndices.length; i++) {
            uint256 gIdx = orderIndices[i];
            Order storage o = allOrders[gIdx];
            if (o.isBuy) {
                buys[bI] = o;
                buyIdx[bI] = gIdx;
                bI++;
            } else {
                sells[sI] = o;
                sellIdx[sI] = gIdx;
                sI++;
            }
        }
    }

    /// @dev Fill buy orders sorted desc by price, refund unfilled ones.
    ///      Filled buyers do NOT get refunded the (limitPrice - clearingPrice) surplus;
    ///      that surplus is captured as MEV. Only unfilled portion is refunded.
    function _fillBuys(
        Order[] memory buys,
        uint256[] memory buyIndices,
        uint256 clearingPrice,
        uint256 filledVolume,
        uint256 batchId,
        SettleResult memory r
    ) internal {
        uint256 remaining = filledVolume;

        for (uint256 i = 0; i < buys.length; i++) {
            uint256 gIdx = buyIndices[i];
            uint256 paidQuote = (buys[i].limitPrice * buys[i].amount) / 1e18;
            r.totalQuoteCollected += paidQuote;

            if (buys[i].limitPrice >= clearingPrice && remaining > 0) {
                uint256 fillAmt = buys[i].amount;
                if (fillAmt > remaining) fillAmt = remaining;
                remaining -= fillAmt;

                allOrders[gIdx].filled = true;
                allOrders[gIdx].filledAmount = fillAmt;

                // Transfer baseToken to buyer
                baseToken.safeTransfer(buys[i].trader, fillAmt);

                // Only refund quoteToken for the UNFILLED portion (partial fill)
                // The surplus (limitPrice - clearingPrice) * fillAmt is MEV, not refunded
                if (fillAmt < buys[i].amount) {
                    uint256 unfilledRefund = (buys[i].limitPrice * (buys[i].amount - fillAmt)) / 1e18;
                    if (unfilledRefund > 0) {
                        quoteToken.safeTransfer(buys[i].trader, unfilledRefund);
                        allOrders[gIdx].refundAmount = unfilledRefund;
                        r.totalQuoteRefunded += unfilledRefund;
                        emit OrderRefunded(gIdx, buys[i].trader, unfilledRefund);
                    }
                }

                r.buysFilled++;
                emit OrderFilled(batchId, gIdx, buys[i].trader, fillAmt, clearingPrice);
            } else {
                // Unfilled buy → full refund of locked quoteToken
                if (paidQuote > 0) {
                    quoteToken.safeTransfer(buys[i].trader, paidQuote);
                    allOrders[gIdx].refundAmount = paidQuote;
                    r.totalQuoteRefunded += paidQuote;
                    emit OrderRefunded(gIdx, buys[i].trader, paidQuote);
                }
            }
        }
    }

    /// @dev Fill sell orders sorted asc by price, refund unfilled ones
    function _fillSells(
        Order[] memory sells,
        uint256[] memory sellIndices,
        uint256 clearingPrice,
        uint256 filledVolume,
        uint256 batchId,
        SettleResult memory r
    ) internal {
        uint256 remaining = filledVolume;

        for (uint256 i = 0; i < sells.length; i++) {
            uint256 gIdx = sellIndices[i];

            if (sells[i].limitPrice <= clearingPrice && remaining > 0) {
                uint256 fillAmt = sells[i].amount;
                if (fillAmt > remaining) fillAmt = remaining;
                remaining -= fillAmt;

                allOrders[gIdx].filled = true;
                allOrders[gIdx].filledAmount = fillAmt;

                uint256 sellerReceives = (clearingPrice * fillAmt) / 1e18;
                quoteToken.safeTransfer(sells[i].trader, sellerReceives);
                r.totalQuotePaidToSellers += sellerReceives;

                if (fillAmt < sells[i].amount) {
                    uint256 refundBase = sells[i].amount - fillAmt;
                    baseToken.safeTransfer(sells[i].trader, refundBase);
                    allOrders[gIdx].refundAmount = refundBase;
                    emit OrderRefunded(gIdx, sells[i].trader, refundBase);
                }

                r.sellsFilled++;
                emit OrderFilled(batchId, gIdx, sells[i].trader, fillAmt, clearingPrice);
            } else {
                if (sells[i].amount > 0) {
                    baseToken.safeTransfer(sells[i].trader, sells[i].amount);
                    allOrders[gIdx].refundAmount = sells[i].amount;
                    emit OrderRefunded(gIdx, sells[i].trader, sells[i].amount);
                }
            }
        }
    }

    /// @dev Refund all orders when no clearing price is found
    function _refundAll(
        Order[] memory buys,
        Order[] memory sells,
        uint256[] memory buyIndices,
        uint256[] memory sellIndices
    ) internal {
        for (uint256 i = 0; i < buys.length; i++) {
            uint256 gIdx = buyIndices[i];
            uint256 refund = (buys[i].limitPrice * buys[i].amount) / 1e18;
            if (refund > 0) {
                quoteToken.safeTransfer(buys[i].trader, refund);
                allOrders[gIdx].refundAmount = refund;
                emit OrderRefunded(gIdx, buys[i].trader, refund);
            }
        }
        for (uint256 i = 0; i < sells.length; i++) {
            uint256 gIdx = sellIndices[i];
            if (sells[i].amount > 0) {
                baseToken.safeTransfer(sells[i].trader, sells[i].amount);
                allOrders[gIdx].refundAmount = sells[i].amount;
                emit OrderRefunded(gIdx, sells[i].trader, sells[i].amount);
            }
        }
    }

    // ─── Internal Functions ─────────────────────────────────────────────

    /**
     * @notice Sort buyIndices array to match the sorted buys array (descending by price).
     * @dev    Must be called after _sortBuysDescending sorts the buys array.
     */
    function _sortBuyIndicesDescending(
        Order[] memory buys,
        uint256[] memory indices
    ) internal pure {
        uint256 n = buys.length;
        // By this point, buys is already sorted; we just need to co-sort indices.
        // We actually need to sort both together. Since _computeClearingPrice already sorted
        // buys in-memory, we need to re-sort with indices tracking.
        // Quick fix: re-sort buys AND indices together.
        for (uint256 i = 1; i < n; i++) {
            Order memory keyOrd = buys[i];
            uint256 keyIdx = indices[i];
            uint256 j = i;
            while (j > 0 && buys[j - 1].limitPrice < keyOrd.limitPrice) {
                buys[j] = buys[j - 1];
                indices[j] = indices[j - 1];
                j--;
            }
            buys[j] = keyOrd;
            indices[j] = keyIdx;
        }
    }

    /**
     * @notice Sort sellIndices array to match the sorted sells array (ascending by price).
     * @dev    Must be called after _sortSellsAscending sorts the sells array.
     */
    function _sortSellIndicesAscending(
        Order[] memory sells,
        uint256[] memory indices
    ) internal pure {
        uint256 n = sells.length;
        for (uint256 i = 1; i < n; i++) {
            Order memory keyOrd = sells[i];
            uint256 keyIdx = indices[i];
            uint256 j = i;
            while (j > 0 && sells[j - 1].limitPrice > keyOrd.limitPrice) {
                sells[j] = sells[j - 1];
                indices[j] = indices[j - 1];
                j--;
            }
            sells[j] = keyOrd;
            indices[j] = keyIdx;
        }
    }

    /**
     * @notice Computes the uniform clearing price using sorted demand/supply
     *         curve intersection.
     * @dev    Algorithm:
     *         1. Expects buys pre-sorted descending by limitPrice (demand curve)
     *         2. Expects sells pre-sorted ascending by limitPrice (supply curve)
     *         3. Walk both curves: accumulate demand and supply quantities
     *         4. Clearing price = the price where cumulative supply meets demand
     * @param buys   Array of buy orders (must be pre-sorted descending by limitPrice)
     * @param sells  Array of sell orders (must be pre-sorted ascending by limitPrice)
     * @return clearingPrice  The uniform clearing price (18 decimals)
     * @return filledVolume   Total base token volume that can be filled
     */
    function _computeClearingPrice(
        Order[] memory buys,
        Order[] memory sells
    ) internal pure returns (uint256 clearingPrice, uint256 filledVolume) {
        if (buys.length == 0 || sells.length == 0) {
            return (0, 0);
        }

        // Arrays are pre-sorted by caller (_sortBuyIndicesDescending / _sortSellIndicesAscending)

        // Check if any crossing is possible:
        // Highest buy must be >= lowest sell for a trade to occur
        if (buys[0].limitPrice < sells[0].limitPrice) {
            return (0, 0);
        }

        // Walk sell prices ascending. At each sell price P, recompute
        // cumDemand = sum of buy amounts where limitPrice >= P.
        // Since buys are sorted desc, we can scan from the start and break.
        uint256 cumSupply = 0;

        clearingPrice = 0;
        filledVolume = 0;

        for (uint256 sIdx = 0; sIdx < sells.length; sIdx++) {
            uint256 sellPrice = sells[sIdx].limitPrice;
            cumSupply += sells[sIdx].amount;

            // Recompute cumDemand at this price level
            uint256 cumDemand = 0;
            for (uint256 b = 0; b < buys.length; b++) {
                if (buys[b].limitPrice >= sellPrice) {
                    cumDemand += buys[b].amount;
                } else {
                    break; // sorted desc, no more qualifying buys
                }
            }

            if (cumDemand >= cumSupply) {
                clearingPrice = sellPrice;
                filledVolume = cumSupply;
            } else {
                // Supply exceeds demand — use demand as bottleneck
                if (clearingPrice == 0 && cumDemand > 0) {
                    clearingPrice = sellPrice;
                    filledVolume = cumDemand;
                }
                break;
            }
        }
    }

    /**
     * @notice Advances to the next batch after settlement.
     */
    function _advanceBatch() internal {
        currentBatchId++;
        batchStartBlock = block.number;
        batches[currentBatchId] = Batch({
            id: currentBatchId,
            startBlock: block.number,
            endBlock: block.number + batchWindow,
            clearingPrice: 0,
            settled: false,
            buyOrderCount: 0,
            sellOrderCount: 0,
            mevCaptured: 0
        });
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Returns the current batch ID
    function getCurrentBatchId() external view returns (uint256) {
        return currentBatchId;
    }

    /// @notice Returns all orders for a given batch
    function getBatchOrders(uint256 batchId) external view returns (Order[] memory) {
        uint256[] storage indices = _batchOrderIndices[batchId];
        Order[] memory orders = new Order[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            orders[i] = allOrders[indices[i]];
        }
        return orders;
    }

    /// @notice Returns all global order IDs for a given trader
    function getTraderOrders(address trader) external view returns (uint256[] memory) {
        return traderOrderIds[trader];
    }

    /// @notice Returns blocks remaining until the current batch can be settled
    function blocksUntilSettlement() external view returns (uint256) {
        uint256 endBlock = batchStartBlock + batchWindow;
        if (block.number >= endBlock) {
            return 0;
        }
        return endBlock - block.number;
    }

    /// @notice Returns true if the current batch can be settled
    function isBatchSettleable() external view returns (bool) {
        return !batches[currentBatchId].settled
            && block.number >= batchStartBlock + batchWindow;
    }

    /// @notice Returns total number of orders placed across all batches
    function totalOrders() external view returns (uint256) {
        return allOrders.length;
    }

    // ─── Admin Functions ────────────────────────────────────────────────

    /**
     * @notice Update the batch window (blocks per batch).
     * @param newWindow New batch window in blocks (must be > 0)
     */
    function setBatchWindow(uint256 newWindow) external onlyOwner {
        require(newWindow > 0, "BatchDEX: zero window");
        uint256 oldWindow = batchWindow;
        batchWindow = newWindow;
        emit BatchWindowUpdated(oldWindow, newWindow);
    }

    /**
     * @notice Update the maximum orders per batch.
     * @param newMax New maximum (must be > 0, capped at 500)
     */
    function setMaxOrdersPerBatch(uint256 newMax) external onlyOwner {
        require(newMax > 0 && newMax <= 500, "BatchDEX: invalid max orders");
        uint256 oldMax = maxOrdersPerBatch;
        maxOrdersPerBatch = newMax;
        emit MaxOrdersUpdated(oldMax, newMax);
    }

    /**
     * @notice Update the revenue router address.
     * @param newRouter New RevenueRouter contract address
     */
    function setRevenueRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "BatchDEX: zero router");
        revenueRouter = newRouter;
    }
}
