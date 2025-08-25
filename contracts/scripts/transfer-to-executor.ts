import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Minimal ERC20 interface
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  console.log("💰 Transferring tokens to executor...");
  
  const executorAddress = deployment.contracts.executor;
  const tokenInAddress = process.env.TOKEN_IN!;
  const transferAmount = ethers.parseEther("100000"); // 100,000 tokens (smaller amount)
  
  console.log(`📋 Executor Address: ${executorAddress}`);
  console.log(`🪙 Token In Address: ${tokenInAddress}`);
  console.log(`💰 Transfer Amount: ${ethers.formatEther(transferAmount)} tokens`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instance using ethers directly
  const tokenIn = new ethers.Contract(tokenInAddress, ERC20_ABI, deployer);
  
  // Check deployer's token balance
  const deployerBalance = await tokenIn.balanceOf(deployer.address);
  console.log(`📊 Deployer Token Balance: ${ethers.formatEther(deployerBalance)} tokens`);
  
  if (deployerBalance < transferAmount) {
    console.log(`❌ Insufficient balance. Need ${ethers.formatEther(transferAmount)}, have ${ethers.formatEther(deployerBalance)}`);
    return;
  }

  // Check executor's current balance
  const executorBalance = await tokenIn.balanceOf(executorAddress);
  console.log(`📊 Executor Current Balance: ${ethers.formatEther(executorBalance)} tokens`);

  // Transfer tokens to executor
  console.log(`\n🔄 Transferring tokens to executor...`);
  try {
    const transferTx = await tokenIn.transfer(executorAddress, transferAmount, { gasLimit: 100000 });
    console.log(`📝 Transfer transaction sent: ${transferTx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const transferReceipt = await transferTx.wait();
    console.log(`✅ Transfer confirmed: ${transferTx.hash} (gas: ${transferReceipt.gasUsed})`);
    
    // Verify the transfer
    const newExecutorBalance = await tokenIn.balanceOf(executorAddress);
    console.log(`📊 Executor New Balance: ${ethers.formatEther(newExecutorBalance)} tokens`);
    
    if (newExecutorBalance >= transferAmount) {
      console.log(`🎉 Successfully transferred ${ethers.formatEther(transferAmount)} tokens to executor!`);
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

  console.log(`\n🎉 Transfer completed!`);
  console.log(`📋 Summary:`);
  console.log(`  Executor: ${executorAddress}`);
  console.log(`  Token: ${tokenInAddress}`);
  console.log(`  Amount: ${ethers.formatEther(transferAmount)} tokens`);
  console.log(`  Final Balance: ${ethers.formatEther(await tokenIn.balanceOf(executorAddress))} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Transfer failed:", error);
    process.exit(1);
  });
