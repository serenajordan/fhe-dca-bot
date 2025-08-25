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
    bool public immutable useDemoSwap;
    uint256 public immutable demoPriceBps; // Price in basis points (10000 = 1:1)

    event SwapAggregateExecuted(uint256 amountIn, uint256 amountOut);

    /// @notice Constructor
    /// @param _router The DEX router address
    /// @param _tokenIn The input token address
    /// @param _tokenOut The output token address
    /// @param _useDemoSwap Whether to use demo swap instead of real router
    /// @param _demoPriceBps Demo price in basis points (10000 = 1:1)
    constructor(
        address _router, 
        address _tokenIn, 
        address _tokenOut,
        bool _useDemoSwap,
        uint256 _demoPriceBps
    ) {
        router = IDexRouter(_router);
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
        useDemoSwap = _useDemoSwap;
        demoPriceBps = _demoPriceBps;
    }

    /// @notice Execute a token swap
    /// @param amountIn The amount of input tokens
    /// @param minOut The minimum amount of output tokens
    /// @param to The recipient of the output tokens
    /// @return amountOut The amount of output tokens received
    function swapAggregate(uint256 amountIn, uint256 minOut, address to) external returns (uint256 amountOut) {
        // Check if we should use demo swap
        if (useDemoSwap || address(router) == address(0)) {
            // Demo swap logic - skip token transfers for ZeroAddress tokens
            amountOut = (amountIn * demoPriceBps) / 10000;
            require(amountOut >= minOut, "DexAdapter: INSUFFICIENT_OUTPUT_AMOUNT");
            
            // For demo with ZeroAddress tokens, we just calculate the swap
            // In a real implementation, you might want to transfer from a treasury
            // For now, we'll just emit the event and return the calculated amount
            // The actual token transfer would need to be handled by the calling contract
            
            emit SwapAggregateExecuted(amountIn, amountOut);
            return amountOut;
        } else {
            // Real router swap logic - transfer input tokens from caller to this contract
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
}
