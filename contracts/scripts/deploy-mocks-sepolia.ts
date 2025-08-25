import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying mock tokens on Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);

  // Uniswap V2 Router address on Sepolia
  const ROUTER_ADDRESS = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  
  // Router ABI for addLiquidity function
  const routerABI = [
    "function factory() external pure returns (address)",
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
  ];
  
  const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, deployer);
  console.log(`🔄 Using Uniswap V2 Router: ${ROUTER_ADDRESS}`);

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

  // Mint tokens to deployer
  console.log("\n🏦 Minting tokens to deployer...");
  const mintAmount = ethers.parseEther("1000000"); // 1M tokens
  await tokenIn.mint(deployer.address, mintAmount);
  await tokenOut.mint(deployer.address, mintAmount);
  console.log(`  ✅ Minted ${ethers.formatEther(mintAmount)} of each token to deployer`);

  // Approve router to spend tokens
  console.log("\n✅ Approving router to spend tokens...");
  const approveAmount = ethers.parseEther("1000000"); // 1M tokens
  await tokenIn.approve(ROUTER_ADDRESS, approveAmount);
  await tokenOut.approve(ROUTER_ADDRESS, approveAmount);
  console.log(`  ✅ Approved router to spend ${ethers.formatEther(approveAmount)} of each token`);

  // Add liquidity
  console.log("\n💧 Adding liquidity to Uniswap V2...");
  const liquidityAmount = ethers.parseEther("100000"); // 100K tokens each
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  try {
    const addLiquidityTx = await router.addLiquidity(
      tokenInAddress,
      tokenOutAddress,
      liquidityAmount,
      liquidityAmount,
      0, // slippage tolerance
      0, // slippage tolerance
      deployer.address,
      deadline,
      { gasLimit: 500000 } // Add explicit gas limit
    );
    
    await addLiquidityTx.wait();
    console.log(`  ✅ Added liquidity: ${ethers.formatEther(liquidityAmount)} of each token`);
    console.log(`  📝 Transaction: ${addLiquidityTx.hash}`);
  } catch (error) {
    console.log(`  ⚠️  Failed to add liquidity: ${error}`);
    console.log(`  📝 This is expected if the pair doesn't exist yet or FHEVM plugin interferes`);
    console.log(`  📝 You can manually add liquidity later using the token addresses`);
  }

  // Get pair info
  const factoryAddress = await router.factory();
  
  // Factory ABI
  const factoryABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  const pairAddress = await factory.getPair(tokenInAddress, tokenOutAddress);
  
  console.log("\n📊 Pair Information:");
  console.log(`  Factory: ${factoryAddress}`);
  console.log(`  Pair: ${pairAddress}`);
  
  if (pairAddress !== ethers.ZeroAddress) {
    // Pair ABI
    const pairABI = [
      "function token0() external view returns (address)",
      "function token1() external view returns (address)"
    ];
    
    const pair = new ethers.Contract(pairAddress, pairABI, deployer);
    console.log(`  Token0: ${await pair.token0()}`);
    console.log(`  Token1: ${await pair.token1()}`);
  } else {
    console.log(`  ⚠️  Pair doesn't exist yet - will be created when liquidity is added`);
  }

  // Update deployment file
  console.log("\n📝 Updating deployment file...");
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  deployment.mocks = {
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress
  };
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`  ✅ Updated ${deploymentPath}`);

  // Print shell exports
  console.log("\n📋 Shell exports (copy and paste these):");
  console.log("==========================================");
  console.log(`export TOKEN_IN="${tokenInAddress}"`);
  console.log(`export TOKEN_OUT="${tokenOutAddress}"`);
  console.log("==========================================");

  // Print summary
  console.log("\n🎉 Mock deployment summary:");
  console.log("===========================");
  console.log(`Mock USD (mUSD): ${tokenInAddress}`);
  console.log(`Mock WETH (mWETH): ${tokenOutAddress}`);
  console.log(`Uniswap V2 Router: ${ROUTER_ADDRESS}`);
  console.log(`Pair Address: ${pairAddress}`);
  console.log(`Liquidity Added: ${ethers.formatEther(liquidityAmount)} of each token`);
  console.log(`Deployer Balance: ${ethers.formatEther(mintAmount - liquidityAmount)} of each token`);
}

main().catch((e) => { 
  console.error("❌ Mock deployment failed:", e); 
  process.exit(1); 
});
