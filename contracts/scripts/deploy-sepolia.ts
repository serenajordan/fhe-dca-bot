import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying fhe-dca-bot contracts to Sepolia...");

  // Read environment variables
  const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  // Validate required environment variables
  if (!sepoliaRpcUrl) {
    throw new Error("SEPOLIA_RPC_URL environment variable is required");
  }
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Sepolia configuration
  const UNISWAP_V2_ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const keeperFeeBps = process.env.KEEPER_FEE_BPS ? parseInt(process.env.KEEPER_FEE_BPS) : 10;
  const kMin = Number(process.env.K_MIN ?? 1);
  const timeWindow = Number(process.env.TIME_WINDOW ?? 60);
  const useDemoSwap = process.env.USE_DEMO_SWAP === "true" || true; // Default to true for Sepolia
  const demoPriceBps = 10000; // 1:1 price ratio

  console.log("📋 Sepolia Configuration:");
  console.log(`  SEPOLIA_RPC_URL: ${sepoliaRpcUrl.substring(0, 20)}...`);
  console.log(`  PRIVATE_KEY: ${privateKey.substring(0, 10)}...`);
  console.log(`  UNISWAP_V2_ROUTER: ${UNISWAP_V2_ROUTER}`);
  console.log(`  KEEPER_FEE_BPS: ${keeperFeeBps}`);
  console.log(`  K_MIN: ${kMin}`);
  console.log(`  TIME_WINDOW: ${timeWindow}s (${Math.floor(timeWindow / 60)}m)`);

  // Get signer from Hardhat
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deploying with account: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.01 ETH");
  }

  // Deploy EncryptedDCAIntents
  console.log("\n📝 Deploying EncryptedDCAIntents...");
  const EncryptedDCAIntents = await ethers.getContractFactory("EncryptedDCAIntents");
  const intents = await EncryptedDCAIntents.deploy();
  await intents.waitForDeployment();
  const intentsAddress = await intents.getAddress();
  console.log(`  ✅ EncryptedDCAIntents deployed to: ${intentsAddress}`);

  // Deploy BatchAggregator
  console.log("\n📦 Deploying BatchAggregator...");
  const BatchAggregator = await ethers.getContractFactory("BatchAggregator");
  const aggregator = await BatchAggregator.deploy(intentsAddress, kMin, timeWindow);
  await aggregator.waitForDeployment();
  const aggregatorAddress = await aggregator.getAddress();
  console.log(`  ✅ BatchAggregator deployed to: ${aggregatorAddress}`);
  console.log(`     kMin: ${kMin}, timeWindow: ${timeWindow} seconds`);

  // Deploy DexAdapter with Uniswap V2 Router
  console.log("\n🔄 Deploying DexAdapter...");
  const DexAdapter = await ethers.getContractFactory("DexAdapter");
  const adapter = await DexAdapter.deploy(
    UNISWAP_V2_ROUTER, 
    ethers.ZeroAddress, 
    ethers.ZeroAddress,
    useDemoSwap,
    demoPriceBps,
    true // demoMode = true for Sepolia
  );
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log(`  ✅ DexAdapter deployed to: ${adapterAddress}`);
  console.log(`     Router: ${UNISWAP_V2_ROUTER}`);
  console.log(`     Use Demo Swap: ${useDemoSwap}`);
  console.log(`     Demo Price BPS: ${demoPriceBps}`);

  // Deploy DcaExecutor
  console.log("\n⚡ Deploying DcaExecutor...");
  const DcaExecutor = await ethers.getContractFactory("DcaExecutor");
  
  // Use mock token addresses for the executor
  const mockTokenIn = "0xBF97A27EDc0EA3db66687527f07e6D26A18ecb18";
  const mockTokenOut = "0xDDae9A49198173473A531061D6b3115A6fa7E27f";
  
  const executor = await DcaExecutor.deploy(
    intentsAddress,
    aggregatorAddress,
    adapterAddress,
    mockTokenIn, // Use mock token addresses
    mockTokenOut, // Use mock token addresses
    keeperFeeBps,
    true // demoMode = true for Sepolia
  );
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log(`  ✅ DcaExecutor deployed to: ${executorAddress}`);
  console.log(`     keeperFeeBps: ${keeperFeeBps}`);

  // Save deployment addresses
  const deploymentData = {
    network: "sepolia",
    deployer: deployer.address,
    contracts: {
      intents: intentsAddress,
      aggregator: aggregatorAddress,
      adapter: adapterAddress,
      executor: executorAddress
    },
    config: {
      uniswapV2Router: UNISWAP_V2_ROUTER,
      keeperFeeBps,
      kMin,
      timeWindow,
      useDemoSwap,
      demoPriceBps,
      demoMode: true
    },
    deployedAt: new Date().toISOString()
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log(`\n💾 Deployment data saved to: ${deploymentFile}`);

  // Print summary
  console.log("\n🎉 Sepolia Deployment Summary:");
  console.log("=============================");
  console.log(`Network: ${deploymentData.network}`);
  console.log(`Deployer: ${deploymentData.deployer}`);
  console.log(`EncryptedDCAIntents: ${intentsAddress}`);
  console.log(`BatchAggregator: ${aggregatorAddress}`);
  console.log(`DexAdapter: ${adapterAddress}`);
  console.log(`DcaExecutor: ${executorAddress}`);
  console.log(`\nConfiguration:`);
  console.log(`  Uniswap V2 Router: ${UNISWAP_V2_ROUTER}`);
  console.log(`  Keeper Fee: ${keeperFeeBps} bps (${keeperFeeBps / 100}%)`);
  console.log(`  K-Anonymity: ${kMin} users`);
  console.log(`  Time Window: ${timeWindow} seconds (${Math.floor(timeWindow / 60)} minutes)`);

  console.log("\n🚀 Sepolia deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("  1. Update your frontend with the new contract addresses");
  console.log("  2. Set up your keeper bot with the new executor address");
  console.log("  3. Test the deployment with small amounts first");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Sepolia deployment failed:", error);
    process.exit(1);
  });
