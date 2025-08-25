import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Manual ABI for executeIfReady
const EXECUTE_ABI = [
  "function executeIfReady(uint256 decryptedAmount, uint256 minOut) external returns (uint256 amountIn, uint256 amountOut)"
];

async function main() {
  console.log("🧪 Testing manual executeIfReady function...");
  
  const executorAddress = deployment.contracts.executor;
  const decryptedAmount = ethers.parseEther("100000"); // 100,000 tokens
  const minOut = ethers.parseEther("0");
  
  console.log(`📋 Executor Address: ${executorAddress}`);
  console.log(`💰 Decrypted Amount: ${ethers.formatEther(decryptedAmount)} tokens`);
  console.log(`📉 Min Out: ${ethers.formatEther(minOut)} tokens`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create contract interface
  const executorInterface = new ethers.Interface(EXECUTE_ABI);
  
  // Encode the function call
  const encodedData = executorInterface.encodeFunctionData("executeIfReady", [decryptedAmount, minOut]);
  console.log(`📝 Encoded function data: ${encodedData}`);

  // Create transaction
  const tx = {
    to: executorAddress,
    data: encodedData,
    gasLimit: 500000
  };

  console.log(`\n🚀 Sending transaction...`);
  console.log(`  To: ${tx.to}`);
  console.log(`  Data: ${tx.data}`);
  console.log(`  Gas Limit: ${tx.gasLimit}`);

  try {
    const response = await deployer.sendTransaction(tx);
    console.log(`📝 Transaction sent: ${response.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await response.wait();
    console.log(`✅ Transaction confirmed: ${response.hash} (gas: ${receipt.gasUsed})`);
    
    // Check for events
    const events = receipt.logs;
    console.log(`📊 Events emitted: ${events.length}`);
    
    for (let i = 0; i < events.length; i++) {
      console.log(`  Event ${i}: ${events[i].data}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Execution failed:`, error.message);
    
    // Try to decode revert reason
    if (error.data) {
      try {
        const reason = ethers.AbiCoder.defaultAbiCoder().decode(
          ['string'],
          '0x' + error.data.slice(10)
        )[0];
        console.error(`📋 Revert reason: ${reason}`);
      } catch (decodeError) {
        console.error(`📋 Raw error data: ${error.data}`);
      }
    }
    
    throw error;
  }

  console.log(`\n🎉 Manual test completed!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Manual test failed:", error);
    process.exit(1);
  });
