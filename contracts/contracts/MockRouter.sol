// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IDexRouter.sol";

/// @title Mock DEX Router
/// @notice Mock router with configurable fixed price for testing
contract MockRouter is IDexRouter {
    uint256 public priceBps; // Price in basis points (10000 = 1:1)

    event SwapAggregateExecuted(uint256 amountIn, uint256 amountOut);

    /// @notice Constructor
    /// @param _priceBps The price in basis points (default 10000 = 1:1)
    constructor(uint256 _priceBps) {
        priceBps = _priceBps;
    }

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
    ) external returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "MockRouter: EXPIRED");
        require(path.length == 2, "MockRouter: INVALID_PATH");
        
        address tokenIn = path[0];
        address tokenOut = path[1];
        
        // Calculate output amount based on fixed price
        uint256 amountOut = (amountIn * priceBps) / 10000;
        require(amountOut >= amountOutMin, "MockRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer input tokens from caller to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Transfer output tokens to recipient (router must have enough tokens)
        IERC20(tokenOut).transfer(to, amountOut);
        
        // Emit event
        emit SwapAggregateExecuted(amountIn, amountOut);
        
        // Return amounts array
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        return amounts;
    }
}
