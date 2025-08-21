// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FHE, euint128, euint64, euint32, euint16, externalEuint128, externalEuint64, externalEuint32, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EncryptedDCAIntents.sol";
import "./BatchAggregator.sol";
import "./DexAdapter.sol";

/// @title DCA Executor
/// @author fhe-dca-bot
/// @notice Executor for DCA operations that integrates intents, aggregation, and DEX swaps
contract DcaExecutor is SepoliaConfig, ReentrancyGuard {
    EncryptedDCAIntents public immutable intents;
    BatchAggregator public immutable aggregator;
    DexAdapter public immutable adapter;
    address public immutable tokenIn;
    address public immutable tokenOut;
    uint16 public immutable keeperFeeBps; // e.g., 10 = 0.10%

    event BatchExecuted(bytes32 indexed pairKey, uint16 count, uint256 amountIn, uint256 amountOut, uint256 fee);

    /// @notice Constructor
    /// @param _intents The EncryptedDCAIntents contract address
    /// @param _aggregator The BatchAggregator contract address
    /// @param _adapter The DexAdapter contract address
    /// @param _tokenIn The input token address
    /// @param _tokenOut The output token address
    /// @param _keeperFeeBps The keeper fee in basis points
    constructor(
        address _intents,
        address _aggregator,
        address _adapter,
        address _tokenIn,
        address _tokenOut,
        uint16 _keeperFeeBps
    ) {
        intents = EncryptedDCAIntents(_intents);
        aggregator = BatchAggregator(_aggregator);
        adapter = DexAdapter(_adapter);
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
        keeperFeeBps = _keeperFeeBps;
    }

    /// @notice Check if the batch is ready for execution
    /// @return byK True if ready by k-anonymity threshold
    /// @return byTime True if ready by time window
    function isReady() external view returns (bool byK, bool byTime) {
        return aggregator.readyToExecute(tokenIn, tokenOut);
    }

    /// @notice Execute the batch if ready with provided decrypted amount
    /// @param decryptedAmount The decrypted aggregate amount (verified off-chain)
    /// @param minOut The minimum amount of output tokens
    /// @return amountIn The amount of input tokens swapped
    /// @return amountOut The amount of output tokens received
    function executeIfReady(uint256 decryptedAmount, uint256 minOut) external nonReentrant returns (uint256 amountIn, uint256 amountOut) {
        // Check if batch is ready
        (bool byK, bool byTime) = aggregator.readyToExecute(tokenIn, tokenOut);
        require(byK || byTime, "not ready");

        // Consume the open batch
        (bytes32 key, , uint16 count) = aggregator.consumeOpenBatch(tokenIn, tokenOut);

        // Use the provided decrypted amount
        // Note: In a production system, this would be verified against the encrypted sum
        // using zero-knowledge proofs or threshold decryption
        amountIn = decryptedAmount;

        // Approve the adapter to spend tokenIn
        IERC20(tokenIn).approve(address(adapter), amountIn);

        // Execute the swap
        amountOut = adapter.swapAggregate(amountIn, minOut, address(this));

        // Compute and transfer keeper fee
        uint256 fee = (amountOut * keeperFeeBps) / 10000;
        if (fee > 0) {
            IERC20(tokenOut).transfer(msg.sender, fee);
        }

        // Emit event with aggregate data only
        emit BatchExecuted(key, count, amountIn, amountOut, fee);

        return (amountIn, amountOut);
    }
}
