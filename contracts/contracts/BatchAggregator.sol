// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FHE, euint128, euint64, euint32, euint16, externalEuint128, externalEuint64, externalEuint32, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./EncryptedDCAIntents.sol";

/// @title Batch Aggregator Contract
/// @author fhe-dca-bot
/// @notice A contract for aggregating encrypted DCA intents with k-anonymity protection
contract BatchAggregator is SepoliaConfig {
    EncryptedDCAIntents public intents;
    uint256 public kMin;
    uint256 public timeWindowSecs;

    struct Batch {
        euint128 sum;          // encrypted sum of perBuy
        uint40   firstTs;      // when the batch opened
        uint16   count;        // participants
        bool     open;
    }

    // pair key = keccak256(abi.encode(tokenIn, tokenOut))
    mapping(bytes32 => Batch) public openBatch;
    mapping(bytes32 => mapping(address => bool)) public included; // pairKey => user included in current open batch
    mapping(bytes32 => address[]) public batchUsers; // pairKey => array of users in the batch

    event BatchUpdated(bytes32 indexed pairKey, uint16 count, bool byK, bool byTime);
    event BatchConsumed(bytes32 indexed pairKey, uint16 count);

    /// @notice Constructor
    /// @param intents_ The EncryptedDCAIntents contract address
    /// @param kMin_ The minimum number of participants for k-anonymity
    /// @param timeWindowSecs_ The fallback time window in seconds
    constructor(
        address intents_,
        uint256 kMin_,
        uint256 timeWindowSecs_
    ) {
        intents = EncryptedDCAIntents(intents_);
        kMin = kMin_;
        timeWindowSecs = timeWindowSecs_;
    }

    /// @notice Generate a unique key for a token pair
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address
    /// @return The unique pair key
    function pairKey(address tokenIn, address tokenOut) public pure returns (bytes32) {
        return keccak256(abi.encode(tokenIn, tokenOut));
    }

    /// @notice Enqueue a user's intent into a batch for a token pair
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address
    /// @param encPerBuy The encrypted perBuy amount
    function enqueue(address tokenIn, address tokenOut, externalEuint64 encPerBuy, bytes calldata proof) external {
        require(intents.getIntentActive(msg.sender), "intent inactive");
        bytes32 key = pairKey(tokenIn, tokenOut);
        Batch storage b = openBatch[key];

        if (!b.open) { 
            b.open = true; 
            b.firstTs = uint40(block.timestamp); 
        }

        require(!included[key][msg.sender], "already in batch");
        
        // Convert external euint64 to euint64 and accumulate
        euint64 perBuy = FHE.fromExternal(encPerBuy, proof);
        // Allow the aggregator to use the perBuy value
        FHE.allow(perBuy, address(this));
        // widen to euint128 and add
        euint128 addend = FHE.asEuint128(perBuy);
        b.sum = FHE.add(b.sum, addend);
        
        // Allow the aggregator to use the encrypted values
        FHE.allowThis(b.sum);

        unchecked { b.count += 1; }
        included[key][msg.sender] = true;
        batchUsers[key].push(msg.sender);

        emit BatchUpdated(key, b.count, readyByK(key), readyByTime(key));
    }

    /// @notice Check if a batch is ready by k-anonymity threshold
    /// @param key The pair key
    /// @return True if the batch has enough participants
    function readyByK(bytes32 key) public view returns (bool) {
        Batch storage b = openBatch[key];
        return b.open && b.count >= kMin;
    }

    /// @notice Check if a batch is ready by time window
    /// @param key The pair key
    /// @return True if the time window has elapsed
    function readyByTime(bytes32 key) public view returns (bool) {
        Batch storage b = openBatch[key];
        return b.open && b.firstTs != 0 && block.timestamp >= (uint256(b.firstTs) + timeWindowSecs);
    }

    /// @notice Check if a batch is ready to execute
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address
    /// @return byK True if ready by k-anonymity
    /// @return byTime True if ready by time window
    function readyToExecute(address tokenIn, address tokenOut) external view returns (bool byK, bool byTime) {
        bytes32 key = pairKey(tokenIn, tokenOut);
        return (readyByK(key), readyByTime(key));
    }

    /// @notice Consume an open batch and return the aggregate data
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address
    /// @return key The pair key
    /// @return aggregate The encrypted aggregate sum
    /// @return count The number of participants
    function consumeOpenBatch(address tokenIn, address tokenOut)
        external
        returns (bytes32 key, euint128 aggregate, uint16 count)
    {
        key = pairKey(tokenIn, tokenOut);
        Batch storage b = openBatch[key];
        require(b.open, "no open batch");
        aggregate = b.sum;
        count = b.count;

        // reset included mapping for all users in this batch
        address[] storage users = batchUsers[key];
        for (uint i = 0; i < users.length; i++) {
            included[key][users[i]] = false;
        }
        
        // reset
        delete openBatch[key];
        delete batchUsers[key];
        emit BatchConsumed(key, count);
    }
}
