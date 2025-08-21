// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FHE, euint128, euint64, euint32, euint16, externalEuint128, externalEuint64, externalEuint32, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted DCA Intents Contract
/// @author fhe-dca-bot
/// @notice A contract for storing encrypted DCA (Dollar Cost Averaging) intents using FHEVM
contract EncryptedDCAIntents is SepoliaConfig {
    struct Intent {
        euint128 remainingBudget;
        euint64  perBuy;
        euint32  freqSeconds;
        euint64  startTs;
        euint64  endTs;
        euint16  dipBps;      // 0..10000
        bool     active;
    }

    struct EncryptedIntentParams {
        externalEuint128 budget;
        externalEuint64 perBuy;
        externalEuint32 freq;
        externalEuint64 start;
        externalEuint64 end;
        externalEuint16 dipBps;
        bytes budgetProof;
        bytes perBuyProof;
        bytes freqProof;
        bytes startProof;
        bytes endProof;
        bytes dipBpsProof;
    }

    mapping(address => Intent) private intents;

    event IntentCreated(address indexed user);
    event IntentUpdated(address indexed user);
    event IntentCancelled(address indexed user);

    /// @notice Creates or updates a DCA intent with encrypted parameters
    /// @param params Struct containing all encrypted parameters and proofs
    function createOrUpdateIntent(EncryptedIntentParams calldata params) external {
        // Convert external euint types to euint types using FHE
        euint128 budget = FHE.fromExternal(params.budget, params.budgetProof);
        euint64 perBuy = FHE.fromExternal(params.perBuy, params.perBuyProof);
        euint32 freq = FHE.fromExternal(params.freq, params.freqProof);
        euint64 start = FHE.fromExternal(params.start, params.startProof);
        euint64 end = FHE.fromExternal(params.end, params.endProof);
        euint16 dipBps = FHE.fromExternal(params.dipBps, params.dipBpsProof);

        // Check if user already has an active intent
        bool wasActive = intents[msg.sender].active;

        // Store the intent
        intents[msg.sender] = Intent({
            remainingBudget: budget,
            perBuy: perBuy,
            freqSeconds: freq,
            startTs: start,
            endTs: end,
            dipBps: dipBps,
            active: true
        });

        // Emit appropriate event
        if (wasActive) {
            emit IntentUpdated(msg.sender);
        } else {
            emit IntentCreated(msg.sender);
        }
    }

    /// @notice Cancels the user's active DCA intent
    function cancelIntent() external {
        require(intents[msg.sender].active, "No active intent to cancel");
        
        intents[msg.sender].active = false;
        emit IntentCancelled(msg.sender);
    }

    /// @notice Returns whether a user has an active intent
    /// @param user The address to check
    /// @return True if the user has an active intent
    function getIntentActive(address user) external view returns (bool) {
        return intents[user].active;
    }

    /// @notice Returns the encrypted perBuy amount for a user
    /// @param user The address to check
    /// @return The encrypted perBuy amount
    function getPerBuyE(address user) external view returns (euint64) {
        return intents[user].perBuy;
    }
}
