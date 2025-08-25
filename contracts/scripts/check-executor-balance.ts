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
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

async function main() {
  console.log("🔍 Checking executor balance and configuration...");
  
  const executorAddress = deployment.contracts.executor;
  const adapterAddress = deployment.contracts.adapter;
  const tokenInAddress = process.env.TOKEN_IN!;
  const tokenOutAddress = process.env.TOKEN_OUT!;
  
  console.log(`📋 Executor Address: ${executorAddress}`);
  console.log(`📋 Adapter Address: ${adapterAddress}`);
  console.log(`🪙 Token In Address: ${tokenInAddress}`);
  console.log(`🪙 Token Out Address: ${tokenOutAddress}`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instances
  const tokenIn = await ethers.getContractAt("MockERC20", tokenInAddress);
  const tokenOut = await ethers.getContractAt("MockERC20", tokenOutAddress);
  
  // Check balances
  const executorTokenInBalance = await tokenIn.balanceOf(executorAddress);
  const executorTokenOutBalance = await tokenOut.balanceOf(executorAddress);
  const adapterTokenInBalance = await tokenIn.balanceOf(adapterAddress);
  const adapterTokenOutBalance = await tokenOut.balanceOf(adapterAddress);
  
  console.log(`\n💰 Token Balances:`);
  console.log(`  Executor TOKEN_IN: ${ethers.formatEther(executorTokenInBalance)} tokens`);
  console.log(`  Executor TOKEN_OUT: ${ethers.formatEther(executorTokenOutBalance)} tokens`);
  console.log(`  Adapter TOKEN_IN: ${ethers.formatEther(adapterTokenInBalance)} tokens`);
  console.log(`  Adapter TOKEN_OUT: ${ethers.formatEther(adapterTokenOutBalance)} tokens`);

  // Check allowances
  const executorToAdapterAllowance = await tokenIn.allowance(executorAddress, adapterAddress);
  const adapterToRouterAllowance = await tokenIn.allowance(adapterAddress, deployment.config.uniswapV2Router);
  
  console.log(`\n🔐 Allowances:`);
  console.log(`  Executor → Adapter: ${ethers.formatEther(executorToAdapterAllowance)} tokens`);
  console.log(`  Adapter → Router: ${ethers.formatEther(adapterToRouterAllowance)} tokens`);

  // Check if batch is ready
  const aggregator = await ethers.getContractAt("BatchAggregator", deployment.contracts.aggregator);
  const result = await aggregator.readyToExecute(tokenInAddress, tokenOutAddress);
  const byK = result[0];
  const byTime = result[1];
  
  console.log(`\n📊 Batch Status:`);
  console.log(`  Ready by K: ${byK}`);
  console.log(`  Ready by Time: ${byTime}`);

  // Check if executor has enough tokens for the demo amount
  const demoAmount = ethers.parseEther("1000000"); // 1,000,000 tokens
  const hasEnoughTokens = executorTokenInBalance >= demoAmount;
  
  console.log(`\n🎯 Demo Execution Check:`);
  console.log(`  Demo Amount: ${ethers.formatEther(demoAmount)} tokens`);
  console.log(`  Has Enough Tokens: ${hasEnoughTokens}`);
  
  if (!hasEnoughTokens) {
    console.log(`❌ ISSUE: Executor doesn't have enough TOKEN_IN for demo execution!`);
    console.log(`💡 SOLUTION: Transfer tokens to executor or reduce demo amount`);
  } else {
    console.log(`✅ Executor has sufficient tokens for demo execution`);
  }

  // Check if adapter has enough allowance
  const hasEnoughAllowance = adapterToRouterAllowance >= demoAmount;
  console.log(`  Has Enough Allowance: ${hasEnoughAllowance}`);
  
  if (!hasEnoughAllowance) {
    console.log(`❌ ISSUE: Adapter doesn't have enough allowance to router!`);
    console.log(`💡 SOLUTION: Approve adapter to spend more tokens`);
  } else {
    console.log(`✅ Adapter has sufficient allowance for demo execution`);
  }

  console.log(`\n📋 Summary:`);
  console.log(`  Executor needs ${ethers.formatEther(demoAmount)} TOKEN_IN`);
  console.log(`  Executor has ${ethers.formatEther(executorTokenInBalance)} TOKEN_IN`);
  console.log(`  Adapter has ${ethers.formatEther(adapterTokenInBalance)} TOKEN_IN`);
  console.log(`  Batch ready: ${byK || byTime}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
