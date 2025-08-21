// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock ERC20 Token
/// @notice Simple ERC20 token with mint functionality for testing
contract MockERC20 is ERC20 {
    /// @notice Constructor
    /// @param name The token name
    /// @param symbol The token symbol
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /// @notice Mint tokens to an address
    /// @param to The address to mint tokens to
    /// @param amount The amount of tokens to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
