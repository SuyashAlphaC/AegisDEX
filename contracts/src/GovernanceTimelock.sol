// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceTimelock
 * @notice A minimal timelock that wraps admin calls to BatchDEX and
 *         RevenueRouter. Parameter changes must be queued and can only
 *         execute after the configured delay (default: 48 hours).
 *         Controlled by a designated multisig address.
 */
contract GovernanceTimelock is Ownable {
    /// @notice Minimum delay (1 hour)
    uint256 public constant MINIMUM_DELAY = 1 hours;

    /// @notice Maximum delay (30 days)
    uint256 public constant MAXIMUM_DELAY = 30 days;

    /// @notice Current timelock delay
    uint256 public delay;

    /// @notice Multisig address authorized to queue/execute/cancel
    address public multisig;

    /// @notice Queued transaction struct
    struct Transaction {
        address target;
        uint256 value;
        bytes data;
        uint256 eta;       // earliest execution timestamp
        bool executed;
        bool cancelled;
    }

    /// @notice Queued transactions by ID
    mapping(bytes32 => Transaction) public queue;

    /// @notice List of all queued transaction IDs
    bytes32[] public queuedTxIds;

    // ─── Events ─────────────────────────────────────────────────────────

    event TransactionQueued(
        bytes32 indexed txId,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 eta
    );

    event TransactionExecuted(
        bytes32 indexed txId,
        address indexed target
    );

    event TransactionCancelled(bytes32 indexed txId);

    event DelayUpdated(uint256 oldDelay, uint256 newDelay);

    // ─── Modifiers ──────────────────────────────────────────────────────

    modifier onlyMultisig() {
        require(msg.sender == multisig, "GovernanceTimelock: not multisig");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────

    /**
     * @param _multisig  Address authorized to manage transactions
     * @param _delay     Initial timelock delay in seconds
     */
    constructor(address _multisig, uint256 _delay) Ownable(msg.sender) {
        require(_multisig != address(0), "GovernanceTimelock: zero multisig");
        require(
            _delay >= MINIMUM_DELAY && _delay <= MAXIMUM_DELAY,
            "GovernanceTimelock: delay out of range"
        );

        multisig = _multisig;
        delay = _delay;
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @notice Queue a transaction for future execution.
     * @param target  Target contract address
     * @param value   ETH/native token value to send
     * @param data    Calldata for the target function
     * @return txId   Unique transaction identifier
     */
    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyMultisig returns (bytes32 txId) {
        uint256 eta = block.timestamp + delay;

        txId = keccak256(abi.encode(target, value, data, eta));
        require(queue[txId].eta == 0, "GovernanceTimelock: tx already queued");

        queue[txId] = Transaction({
            target: target,
            value: value,
            data: data,
            eta: eta,
            executed: false,
            cancelled: false
        });

        queuedTxIds.push(txId);

        emit TransactionQueued(txId, target, value, data, eta);
    }

    /**
     * @notice Execute a queued transaction after the delay has passed.
     * @param txId  Transaction identifier
     * @return result  Return data from the executed call
     */
    function executeTransaction(
        bytes32 txId
    ) external payable onlyMultisig returns (bytes memory result) {
        Transaction storage txn = queue[txId];
        require(txn.eta > 0, "GovernanceTimelock: tx not queued");
        require(!txn.executed, "GovernanceTimelock: tx already executed");
        require(!txn.cancelled, "GovernanceTimelock: tx cancelled");
        require(
            block.timestamp >= txn.eta,
            "GovernanceTimelock: delay not elapsed"
        );
        require(
            block.timestamp <= txn.eta + 14 days,
            "GovernanceTimelock: tx expired (grace period)"
        );

        txn.executed = true;

        (bool success, bytes memory data) = txn.target.call{value: txn.value}(txn.data);
        require(success, "GovernanceTimelock: tx execution failed");

        emit TransactionExecuted(txId, txn.target);
        return data;
    }

    /**
     * @notice Cancel a queued transaction.
     * @param txId  Transaction identifier
     */
    function cancelTransaction(bytes32 txId) external onlyMultisig {
        Transaction storage txn = queue[txId];
        require(txn.eta > 0, "GovernanceTimelock: tx not queued");
        require(!txn.executed, "GovernanceTimelock: tx already executed");
        require(!txn.cancelled, "GovernanceTimelock: tx already cancelled");

        txn.cancelled = true;

        emit TransactionCancelled(txId);
    }

    /**
     * @notice Update the timelock delay. Can only be called by the
     *         timelock itself (queued through this contract).
     * @param newDelay  New delay in seconds
     */
    function updateDelay(uint256 newDelay) external {
        require(
            msg.sender == address(this),
            "GovernanceTimelock: must call through timelock"
        );
        require(
            newDelay >= MINIMUM_DELAY && newDelay <= MAXIMUM_DELAY,
            "GovernanceTimelock: delay out of range"
        );

        uint256 oldDelay = delay;
        delay = newDelay;

        emit DelayUpdated(oldDelay, newDelay);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Get full transaction details
    function getTransaction(bytes32 txId) external view returns (Transaction memory) {
        return queue[txId];
    }

    /// @notice Check if a transaction is queued and pending
    function isQueued(bytes32 txId) external view returns (bool) {
        Transaction storage txn = queue[txId];
        return txn.eta > 0 && !txn.executed && !txn.cancelled;
    }

    /// @notice Get all queued transaction IDs
    function getQueuedTransactions() external view returns (bytes32[] memory) {
        return queuedTxIds;
    }
}
