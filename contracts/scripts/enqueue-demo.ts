import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Enqueuing demo users to Sepolia BatchAggregator...");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  const aggregatorAddress = deployment.contracts.aggregator;
  console.log(`📋 Using BatchAggregator: ${aggregatorAddress}`);

  // Get signers
  const signers = await ethers.getSigners();
  const owner = signers[0];
  
  // Use the first 3 signers as users, or create demo addresses if not enough
  const users = [];
  const perBuyValues = [1, 2, 3]; // Use smaller values to avoid uint64 overflow
  
  if (signers.length >= 4) {
    // Use signers 1, 2, 3 as users
    users.push(signers[1].address, signers[2].address, signers[3].address);
  } else {
    // Create demo addresses (owner will enqueue these addresses)
    users.push(
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222", 
      "0x3333333333333333333333333333333333333333"
    );
  }
  
  console.log(`👤 Owner: ${owner.address}`);
  console.log(`👤 User 1: ${users[0]}`);
  console.log(`👤 User 2: ${users[1]}`);
  console.log(`👤 User 3: ${users[2]}`);

  // Get BatchAggregator contract
  const BatchAggregator = await ethers.getContractFactory("BatchAggregator");
  const aggregator = BatchAggregator.attach(aggregatorAddress).connect(owner);

  // Demo configuration - use mock tokens from deployment
  const tokenIn = deployment.mocks.tokenIn;
  const tokenOut = deployment.mocks.tokenOut;

  console.log(`\n📦 Demo Configuration:`);
  console.log(`  Token In: ${tokenIn}`);
  console.log(`  Token Out: ${tokenOut}`);
  console.log(`  PerBuy Values: ${perBuyValues.join(", ")}`);

  // Check initial state
  const [initialByK, initialByTime] = await aggregator.readyToExecute(tokenIn, tokenOut);
  console.log(`\n📊 Initial State:`);
  console.log(`  Ready by K: ${initialByK}`);
  console.log(`  Ready by Time: ${initialByTime}`);

  // Enqueue users
  console.log(`\n🔄 Enqueuing users...`);
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const perBuy = perBuyValues[i];
    
    console.log(`  Enqueuing user ${i + 1}: ${user} with perBuy: ${perBuy}`);
    
    try {
      console.log(`    📝 Sending transaction...`);
      const tx = await aggregator.devEnqueue(tokenIn, tokenOut, user, perBuy);
      console.log(`    ⏳ Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`    ✅ Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed})`);
    } catch (error: any) {
      console.error(`    ❌ Failed to enqueue user ${i + 1}:`, error.message);
      if (error.data) {
        console.error(`    📋 Error data:`, error.data);
      }
      continue;
    }

    // Check state after each enqueue
    const [byK, byTime] = await aggregator.readyToExecute(tokenIn, tokenOut);
    console.log(`    📊 State: Ready by K: ${byK}, Ready by Time: ${byTime}`);
  }

  // Final state check
  console.log(`\n📊 Final State:`);
  const [finalByK, finalByTime] = await aggregator.readyToExecute(tokenIn, tokenOut);
  console.log(`  Ready by K: ${finalByK}`);
  console.log(`  Ready by Time: ${finalByTime}`);

  // Get batch info if possible
  try {
    const pairKey = await aggregator.pairKey(tokenIn, tokenOut);
    console.log(`  Pair Key: ${pairKey}`);
  } catch (error) {
    console.log(`  Could not get pair key: ${error}`);
  }

  console.log(`\n🎉 Demo enqueue completed!`);
  console.log(`📋 Next steps:`);
  console.log(`  1. Check the keeper bot to see if it executes the batch`);
  console.log(`  2. Monitor the BatchUpdated events for batch progress`);
  console.log(`  3. Use the frontend to check batch status`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo enqueue failed:", error);
    process.exit(1);
  });
