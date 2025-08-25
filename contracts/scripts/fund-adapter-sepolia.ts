import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("💰 Funding adapter with tokens on Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Funding with account: ${deployer.address}`);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  const adapterAddress = deployment.contracts.adapter;
  const routerAddress = deployment.config.uniswapV2Router;
  const tokenInAddress = deployment.mocks.tokenIn;
  
  console.log(`📦 Adapter: ${adapterAddress}`);
  console.log(`🔄 Router: ${routerAddress}`);
  console.log(`🪙 Token In: ${tokenInAddress}`);

  // Get contract instances
  const tokenIn = await ethers.getContractAt("MockERC20", tokenInAddress);
  const adapter = await ethers.getContractAt("DexAdapter", adapterAddress);

  // Check deployer's balance
  const deployerBalance = await tokenIn.balanceOf(deployer.address);
  console.log(`\n💳 Deployer balance: ${ethers.formatEther(deployerBalance)} TOKEN_IN`);

  if (deployerBalance < ethers.parseEther("50000")) {
    console.log(`❌ Insufficient balance. Need 50,000 TOKEN_IN, have ${ethers.formatEther(deployerBalance)}`);
    return;
  }

  // Transfer 50,000 tokens to adapter
  console.log("\n📤 Transferring 50,000 TOKEN_IN to adapter...");
  const transferAmount = ethers.parseEther("50000");
  
  const transferTx = await tokenIn.transfer(adapterAddress, transferAmount);
  await transferTx.wait();
  console.log(`  ✅ Transfer transaction: ${transferTx.hash}`);

  // Check if adapter has approve functions
  console.log("\n🔍 Checking adapter for approval functions...");
  
  try {
    // Try to call approveToken if it exists
    const approveTokenTx = await adapter.approveToken(tokenInAddress);
    await approveTokenTx.wait();
    console.log(`  ✅ Called approveToken(${tokenInAddress})`);
  } catch (error) {
    console.log(`  ⚠️  approveToken function not found or failed: ${error}`);
  }

  try {
    // Try to call approveRouter if it exists
    const approveRouterTx = await adapter.approveRouter(tokenInAddress, ethers.MaxUint256);
    await approveRouterTx.wait();
    console.log(`  ✅ Called approveRouter(${tokenInAddress}, max)`);
  } catch (error) {
    console.log(`  ⚠️  approveRouter function not found or failed: ${error}`);
  }

  // Check adapter's balance and allowance
  console.log("\n📊 Adapter status after funding:");
  const adapterBalance = await tokenIn.balanceOf(adapterAddress);
  const adapterAllowance = await tokenIn.allowance(adapterAddress, routerAddress);
  
  console.log(`  💰 Balance: ${ethers.formatEther(adapterBalance)} TOKEN_IN`);
  console.log(`  ✅ Allowance to router: ${ethers.formatEther(adapterAllowance)} TOKEN_IN`);
  
  if (adapterAllowance >= ethers.parseEther("50000")) {
    console.log(`  🎉 Adapter is ready for swaps!`);
  } else {
    console.log(`  ⚠️  Adapter allowance may be insufficient for large swaps`);
  }

  // Print summary
  console.log("\n🎉 Funding summary:");
  console.log("===================");
  console.log(`Adapter: ${adapterAddress}`);
  console.log(`Token In: ${tokenInAddress}`);
  console.log(`Router: ${routerAddress}`);
  console.log(`Funded Amount: ${ethers.formatEther(transferAmount)} TOKEN_IN`);
  console.log(`Adapter Balance: ${ethers.formatEther(adapterBalance)} TOKEN_IN`);
  console.log(`Router Allowance: ${ethers.formatEther(adapterAllowance)} TOKEN_IN`);
}

main().catch((e) => { 
  console.error("❌ Funding failed:", e); 
  process.exit(1); 
});
