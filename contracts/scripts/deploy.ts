import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying fhe-dca-bot contracts...");

  // Read environment variables
  const tokenIn = process.env.TOKEN_IN;
  const tokenOut = process.env.TOKEN_OUT;
  const router = process.env.ROUTER;
  const keeperFeeBps = process.env.KEEPER_FEE_BPS ? parseInt(process.env.KEEPER_FEE_BPS) : 10;

  // Validate required environment variables
  if (!tokenIn) {
    throw new Error("TOKEN_IN environment variable is required");
  }
  if (!tokenOut) {
    throw new Error("TOKEN_OUT environment variable is required");
  }
  if (!router) {
    throw new Error("ROUTER environment variable is required");
  }

  console.log("📋 Configuration:");
  console.log(`  TOKEN_IN: ${tokenIn}`);
  console.log(`  TOKEN_OUT: ${tokenOut}`);
  console.log(`  ROUTER: ${router}`);
  console.log(`  KEEPER_FEE_BPS: ${keeperFeeBps}`);

  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deploying with account: ${deployer.address}`);

  // Deploy EncryptedDCAIntents
  console.log("\n📝 Deploying EncryptedDCAIntents...");
  const EncryptedDCAIntents = await ethers.getContractFactory("EncryptedDCAIntents");
  const intents = await EncryptedDCAIntents.deploy();
  await intents.waitForDeployment();
  const intentsAddress = await intents.getAddress();
  console.log(`  ✅ EncryptedDCAIntents deployed to: ${intentsAddress}`);

  // Deploy BatchAggregator with kMin=10, timeWindow=900
  console.log("\n📦 Deploying BatchAggregator...");
  const BatchAggregator = await ethers.getContractFactory("BatchAggregator");
  const aggregator = await BatchAggregator.deploy(intentsAddress, 10, 900);
  await aggregator.waitForDeployment();
  const aggregatorAddress = await aggregator.getAddress();
  console.log(`  ✅ BatchAggregator deployed to: ${aggregatorAddress}`);
  console.log(`     kMin: 10, timeWindow: 900 seconds`);

  // Deploy DexAdapter
  console.log("\n🔄 Deploying DexAdapter...");
  const DexAdapter = await ethers.getContractFactory("DexAdapter");
  const adapter = await DexAdapter.deploy(router, tokenIn, tokenOut);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log(`  ✅ DexAdapter deployed to: ${adapterAddress}`);

  // Deploy DcaExecutor
  console.log("\n⚡ Deploying DcaExecutor...");
  const DcaExecutor = await ethers.getContractFactory("DcaExecutor");
  const executor = await DcaExecutor.deploy(
    intentsAddress,
    aggregatorAddress,
    adapterAddress,
    tokenIn,
    tokenOut,
    keeperFeeBps
  );
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log(`  ✅ DcaExecutor deployed to: ${executorAddress}`);
  console.log(`     keeperFeeBps: ${keeperFeeBps}`);

  // Save deployment addresses
  const deploymentData = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    deployer: deployer.address,
    contracts: {
      intents: intentsAddress,
      aggregator: aggregatorAddress,
      adapter: adapterAddress,
      executor: executorAddress
    },
    config: {
      tokenIn,
      tokenOut,
      router,
      keeperFeeBps,
      kMin: 10,
      timeWindow: 900
    },
    deployedAt: new Date().toISOString()
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = await ethers.provider.getNetwork().then(n => n.name);
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log(`\n💾 Deployment data saved to: ${deploymentFile}`);

  // Print summary
  console.log("\n🎉 Deployment Summary:");
  console.log("======================");
  console.log(`Network: ${deploymentData.network}`);
  console.log(`Deployer: ${deploymentData.deployer}`);
  console.log(`EncryptedDCAIntents: ${intentsAddress}`);
  console.log(`BatchAggregator: ${aggregatorAddress}`);
  console.log(`DexAdapter: ${adapterAddress}`);
  console.log(`DcaExecutor: ${executorAddress}`);
  console.log(`\nConfiguration:`);
  console.log(`  Token In: ${tokenIn}`);
  console.log(`  Token Out: ${tokenOut}`);
  console.log(`  Router: ${router}`);
  console.log(`  Keeper Fee: ${keeperFeeBps} bps (${keeperFeeBps / 100}%)`);
  console.log(`  K-Anonymity: ${10} users`);
  console.log(`  Time Window: ${900} seconds (15 minutes)`);

  console.log("\n🚀 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
