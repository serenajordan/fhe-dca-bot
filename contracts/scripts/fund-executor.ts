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
  console.log("💰 Funding executor with TOKEN_IN...");
  
  const executorAddress = deployment.contracts.executor;
  const tokenInAddress = process.env.TOKEN_IN!;
  const fundAmount = ethers.parseEther("1000000"); // 1,000,000 tokens for demo
  
  console.log(`📋 Executor Address: ${executorAddress}`);
  console.log(`🪙 Token In Address: ${tokenInAddress}`);
  console.log(`💰 Fund Amount: ${ethers.formatEther(fundAmount)} tokens`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instance
  const tokenIn = await ethers.getContractAt("MockERC20", tokenInAddress);
  
  // Check deployer's token balance
  const deployerBalance = await tokenIn.balanceOf(deployer.address);
  console.log(`📊 Deployer Token Balance: ${ethers.formatEther(deployerBalance)} tokens`);
  
  if (deployerBalance < fundAmount) {
    console.log(`⚠️  Warning: Deployer has insufficient tokens. Need ${ethers.formatEther(fundAmount)}, have ${ethers.formatEther(deployerBalance)}`);
    console.log(`💡 You may need to mint more tokens or use a different account`);
  }

  // Check executor's current balance
  const executorBalance = await tokenIn.balanceOf(executorAddress);
  console.log(`📊 Executor Current Balance: ${ethers.formatEther(executorBalance)} tokens`);

  // Transfer tokens to executor
  console.log(`\n🔄 Transferring tokens to executor...`);
  try {
    const transferTx = await tokenIn.transfer(executorAddress, fundAmount);
    console.log(`📝 Transfer transaction sent: ${transferTx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const transferReceipt = await transferTx.wait();
    console.log(`✅ Transfer confirmed: ${transferTx.hash} (gas: ${transferReceipt.gasUsed})`);
    
    // Verify the transfer
    const newExecutorBalance = await tokenIn.balanceOf(executorAddress);
    console.log(`📊 Executor New Balance: ${ethers.formatEther(newExecutorBalance)} tokens`);
    
    if (newExecutorBalance >= fundAmount) {
      console.log(`🎉 Successfully funded executor with ${ethers.formatEther(fundAmount)} tokens!`);
    } else {
      console.log(`⚠️  Transfer may have failed - executor balance didn't increase as expected`);
    }
    
  } catch (error: any) {
    console.error(`❌ Transfer failed:`, error.message);
    if (error.data) {
      console.error(`📋 Error data:`, error.data);
    }
    throw error;
  }

  console.log(`\n🎉 Executor funding completed!`);
  console.log(`📋 Summary:`);
  console.log(`  Executor: ${executorAddress}`);
  console.log(`  Token: ${tokenInAddress}`);
  console.log(`  Amount: ${ethers.formatEther(fundAmount)} tokens`);
  console.log(`  Final Balance: ${ethers.formatEther(await tokenIn.balanceOf(executorAddress))} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Executor funding failed:", error);
    process.exit(1);
  });
