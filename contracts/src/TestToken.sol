// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @notice Simple mintable ERC20 for local testnet use.
 *         Mints 1,000,000 tokens to deployer on construction.
 */
contract TestToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /// @notice Mint tokens to any address (no access control for testing)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
