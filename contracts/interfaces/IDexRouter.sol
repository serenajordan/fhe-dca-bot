// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DEX Router Interface
/// @notice Minimal interface for DEX router operations
interface IDexRouter {
    /// @notice Swap exact tokens for tokens
    /// @param amountIn The amount of input tokens
    /// @param amountOutMin The minimum amount of output tokens
    /// @param path The token path for the swap
    /// @param to The recipient of the output tokens
    /// @param deadline The deadline for the swap
    /// @return amounts The amounts of tokens swapped
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}
