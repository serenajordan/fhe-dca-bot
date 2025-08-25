import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

async function main() {
  console.log("🧪 Testing executeIfReady function...");
  
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

  // Create executor contract instance
  const executor = await ethers.getContractAt("DcaExecutor", executorAddress);
  
  // Check if batch is ready
  console.log(`\n🔍 Checking if batch is ready...`);
  try {
    const result = await executor.isReady();
    const byK = result[0];
    const byTime = result[1];
    console.log(`  Ready by K: ${byK}`);
    console.log(`  Ready by Time: ${byTime}`);
    
    if (!byK && !byTime) {
      console.log(`❌ Batch is not ready for execution`);
      return;
    }
  } catch (error: any) {
    console.error(`❌ Error checking batch readiness:`, error.message);
    return;
  }

  // Check executor's token balance
  const tokenIn = await ethers.getContractAt("MockERC20", process.env.TOKEN_IN!);
  const executorBalance = await tokenIn.balanceOf(executorAddress);
  console.log(`\n💰 Executor Token Balance: ${ethers.formatEther(executorBalance)} tokens`);
  
  if (executorBalance < decryptedAmount) {
    console.log(`❌ Executor has insufficient tokens. Need ${ethers.formatEther(decryptedAmount)}, have ${ethers.formatEther(executorBalance)}`);
    return;
  }

  // Execute the batch
  console.log(`\n🚀 Executing batch...`);
  try {
    const tx = await executor.executeIfReady(decryptedAmount, minOut, { gasLimit: 500000 });
    console.log(`📝 Transaction sent: ${tx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed})`);
    
    // Check for events
    const events = receipt.logs;
    console.log(`📊 Events emitted: ${events.length}`);
    
    for (let i = 0; i < events.length; i++) {
      try {
        const parsed = executor.interface.parseLog(events[i]);
        console.log(`  Event ${i}: ${parsed.name}`, parsed.args);
      } catch (e) {
        console.log(`  Event ${i}: Raw log`);
      }
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

  console.log(`\n🎉 Test completed!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
