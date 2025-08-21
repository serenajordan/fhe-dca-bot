// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IDexRouter.sol";

/// @title DEX Adapter
/// @notice Adapter for executing token swaps through DEX routers
contract DexAdapter {
    IDexRouter public immutable router;
    address public immutable tokenIn;
    address public immutable tokenOut;

    event SwapAggregateExecuted(uint256 amountIn, uint256 amountOut);

    /// @notice Constructor
    /// @param _router The DEX router address
    /// @param _tokenIn The input token address
    /// @param _tokenOut The output token address
    constructor(address _router, address _tokenIn, address _tokenOut) {
        router = IDexRouter(_router);
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    /// @notice Execute a token swap
    /// @param amountIn The amount of input tokens
    /// @param minOut The minimum amount of output tokens
    /// @param to The recipient of the output tokens
    /// @return amountOut The amount of output tokens received
    function swapAggregate(uint256 amountIn, uint256 minOut, address to) external returns (uint256 amountOut) {
        // Transfer input tokens from caller to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router to spend input tokens
        IERC20(tokenIn).approve(address(router), amountIn);
        
        // Build path [tokenIn, tokenOut]
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Execute swap with 20 minute deadline
        uint[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            to,
            block.timestamp + 1200
        );
        
        amountOut = amounts[1];
        
        // Emit event
        emit SwapAggregateExecuted(amountIn, amountOut);
        
        return amountOut;
    }
}
