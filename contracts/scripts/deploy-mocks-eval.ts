import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy mock tokens
  const Token = await ethers.getContractFactory("MockERC20");
  
  const tokenIn = await Token.deploy("Mock USD", "mUSD");
  await tokenIn.waitForDeployment();
  const tokenInAddress = await tokenIn.getAddress();

  const tokenOut = await Token.deploy("Mock WETH", "mWETH");
  await tokenOut.waitForDeployment();
  const tokenOutAddress = await tokenOut.getAddress();

  // Deploy mock router
  const Router = await ethers.getContractFactory("MockRouter");
  const router = await Router.deploy(10000); // 1:1 price ratio
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();

  // Mint some tokens to the router for swaps
  const mintAmount = ethers.parseEther("1000000"); // 1M tokens
  await tokenIn.mint(routerAddress, mintAmount);
  await tokenOut.mint(routerAddress, mintAmount);

  // Print only export commands for eval
  console.log(`export TOKEN_IN="${tokenInAddress}"`);
  console.log(`export TOKEN_OUT="${tokenOutAddress}"`);
  console.log(`export ROUTER="${routerAddress}"`);
}

main().catch((e) => { 
  console.error("❌ Mock deployment failed:", e); 
  process.exit(1); 
});
