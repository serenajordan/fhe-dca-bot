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
  console.log("🔐 Approving adapter to spend tokens on router...");
  
  const adapterAddress = deployment.contracts.adapter;
  const routerAddress = deployment.config.uniswapV2Router;
  const tokenInAddress = process.env.TOKEN_IN!;
  
  console.log(`📋 Adapter Address: ${adapterAddress}`);
  console.log(`🔄 Router Address: ${routerAddress}`);
  console.log(`🪙 Token In Address: ${tokenInAddress}`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instance
  const tokenIn = await ethers.getContractAt("MockERC20", tokenInAddress);
  
  // Check current allowance
  const currentAllowance = await tokenIn.allowance(adapterAddress, routerAddress);
  console.log(`📊 Current allowance: ${ethers.formatEther(currentAllowance)} tokens`);
  
  if (currentAllowance > ethers.parseEther("100000")) {
    console.log(`✅ Adapter already has sufficient allowance`);
    return;
  }

  // Approve router to spend adapter's tokens
  console.log(`\n🔄 Approving router to spend adapter's tokens...`);
  try {
    // We need to call approve from the adapter's perspective
    // First, let's check if the adapter has a function to approve the router
    const adapter = await ethers.getContractAt("DexAdapter", adapterAddress);
    
    try {
      // Try to call approveRouter if it exists
      const approveTx = await adapter.approveRouter(tokenInAddress, ethers.MaxUint256);
      console.log(`📝 Approve transaction sent: ${approveTx.hash}`);
      
      console.log(`⏳ Waiting for confirmation...`);
      const approveReceipt = await approveTx.wait();
      console.log(`✅ Approve confirmed: ${approveTx.hash} (gas: ${approveReceipt.gasUsed})`);
      
      // Verify the approval
      const newAllowance = await tokenIn.allowance(adapterAddress, routerAddress);
      console.log(`📊 New allowance: ${ethers.formatEther(newAllowance)} tokens`);
      
      if (newAllowance >= ethers.parseEther("100000")) {
        console.log(`🎉 Successfully approved adapter to spend tokens on router!`);
      } else {
        console.log(`⚠️  Approval may have failed - allowance didn't increase as expected`);
      }
      
    } catch (adapterError: any) {
      console.log(`⚠️  Adapter approveRouter function not available: ${adapterError.message}`);
      console.log(`💡 Trying manual approval...`);
      
      // Manual approval - we need to call approve from the adapter's perspective
      // This requires the adapter to have tokens and call approve itself
      console.log(`❌ Manual approval not implemented - adapter needs to call approve itself`);
      return;
    }
    
  } catch (error: any) {
    console.error(`❌ Approval failed:`, error.message);
    if (error.data) {
      console.error(`📋 Error data:`, error.data);
    }
    throw error;
  }

  console.log(`\n🎉 Adapter approval completed!`);
  console.log(`📋 Summary:`);
  console.log(`  Adapter: ${adapterAddress}`);
  console.log(`  Router: ${routerAddress}`);
  console.log(`  Token: ${tokenInAddress}`);
  console.log(`  Final Allowance: ${ethers.formatEther(await tokenIn.allowance(adapterAddress, routerAddress))} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Adapter approval failed:", error);
    process.exit(1);
  });
