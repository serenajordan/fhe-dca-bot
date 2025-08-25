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
  console.log("💰 Transferring TOKEN_OUT to executor...");
  
  const executorAddress = deployment.contracts.executor;
  const tokenOutAddress = process.env.TOKEN_OUT!;
  const transferAmount = ethers.parseEther("10000"); // 10,000 tokens for demo fees
  
  console.log(`📋 Executor Address: ${executorAddress}`);
  console.log(`🪙 Token Out Address: ${tokenOutAddress}`);
  console.log(`💰 Transfer Amount: ${ethers.formatEther(transferAmount)} tokens`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instance
  const tokenOut = await ethers.getContractAt("MockERC20", tokenOutAddress);
  
  // Check deployer's token balance
  const deployerBalance = await tokenOut.balanceOf(deployer.address);
  console.log(`📊 Deployer Token Balance: ${ethers.formatEther(deployerBalance)} tokens`);
  
  if (deployerBalance < transferAmount) {
    console.log(`❌ Insufficient balance. Need ${ethers.formatEther(transferAmount)}, have ${ethers.formatEther(deployerBalance)}`);
    return;
  }

  // Check executor's current balance
  const executorBalance = await tokenOut.balanceOf(executorAddress);
  console.log(`📊 Executor Current Balance: ${ethers.formatEther(executorBalance)} tokens`);

  // Transfer tokens to executor
  console.log(`\n🔄 Transferring tokens to executor...`);
  try {
    const transferTx = await tokenOut.transfer(executorAddress, transferAmount);
    console.log(`📝 Transfer transaction sent: ${transferTx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const transferReceipt = await transferTx.wait();
    console.log(`✅ Transfer confirmed: ${transferTx.hash} (gas: ${transferReceipt.gasUsed})`);
    
    // Verify the transfer
    const newExecutorBalance = await tokenOut.balanceOf(executorAddress);
    console.log(`📊 Executor New Balance: ${ethers.formatEther(newExecutorBalance)} tokens`);
    
    if (newExecutorBalance >= transferAmount) {
      console.log(`🎉 Successfully transferred ${ethers.formatEther(transferAmount)} TOKEN_OUT to executor!`);
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

  console.log(`\n🎉 TOKEN_OUT transfer completed!`);
  console.log(`📋 Summary:`);
  console.log(`  Executor: ${executorAddress}`);
  console.log(`  Token: ${tokenOutAddress}`);
  console.log(`  Amount: ${ethers.formatEther(transferAmount)} tokens`);
  console.log(`  Final Balance: ${ethers.formatEther(await tokenOut.balanceOf(executorAddress))} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Transfer failed:", error);
    process.exit(1);
  });
