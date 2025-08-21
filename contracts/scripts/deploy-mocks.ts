import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying mock tokens and router...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);

  // Deploy mock tokens
  console.log("\n💰 Deploying MockERC20 tokens...");
  const Token = await ethers.getContractFactory("MockERC20");
  
  const tokenIn = await Token.deploy("Mock USD", "mUSD");
  await tokenIn.waitForDeployment();
  const tokenInAddress = await tokenIn.getAddress();
  console.log(`  ✅ Mock USD (mUSD) deployed to: ${tokenInAddress}`);

  const tokenOut = await Token.deploy("Mock WETH", "mWETH");
  await tokenOut.waitForDeployment();
  const tokenOutAddress = await tokenOut.getAddress();
  console.log(`  ✅ Mock WETH (mWETH) deployed to: ${tokenOutAddress}`);

  // Deploy mock router
  console.log("\n🔄 Deploying MockRouter...");
  const Router = await ethers.getContractFactory("MockRouter");
  const router = await Router.deploy(10000); // 1:1 price ratio
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`  ✅ MockRouter deployed to: ${routerAddress}`);
  console.log(`     Price ratio: 1:1 (10000 bps)`);

  // Mint some tokens to the router for swaps
  console.log("\n🏦 Minting tokens to router for swaps...");
  const mintAmount = ethers.parseEther("1000000"); // 1M tokens
  await tokenIn.mint(routerAddress, mintAmount);
  await tokenOut.mint(routerAddress, mintAmount);
  console.log(`  ✅ Minted ${ethers.formatEther(mintAmount)} tokens to router`);

  // Print shell exports (for eval compatibility)
  console.log(`export TOKEN_IN="${tokenInAddress}"`);
  console.log(`export TOKEN_OUT="${tokenOutAddress}"`);
  console.log(`export ROUTER="${routerAddress}"`);
  
  // Print summary for manual copy-paste
  console.log("\n📋 Shell exports (copy and paste these):");
  console.log("==========================================");
  console.log(`export TOKEN_IN="${tokenInAddress}"`);
  console.log(`export TOKEN_OUT="${tokenOutAddress}"`);
  console.log(`export ROUTER="${routerAddress}"`);
  console.log("\n💡 To set environment variables automatically, run:");
  console.log("   eval \$(pnpm run deploy:mocks:eval)");
  console.log("\n   Or copy and paste the export commands above.");

  // Print summary
  console.log("\n🎉 Mock deployment summary:");
  console.log("===========================");
  console.log(`Mock USD (mUSD): ${tokenInAddress}`);
  console.log(`Mock WETH (mWETH): ${tokenOutAddress}`);
  console.log(`MockRouter: ${routerAddress}`);
  console.log(`Price Ratio: 1:1`);
  console.log(`Router Balance: ${ethers.formatEther(mintAmount)} of each token`);
}

main().catch((e) => { 
  console.error("❌ Mock deployment failed:", e); 
  process.exit(1); 
});
