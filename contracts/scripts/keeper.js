const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Contract ABIs (minimal for keeper operations)
const DcaExecutorABI = [
  "function isReady() external view returns (bool byK, bool byTime)",
  "function executeIfReady(uint256 decryptedAmount, uint256 minOut) external returns (uint256 amountIn, uint256 amountOut)"
];

async function loadDeploymentData() {
  // Try to load from deployment file first
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const localDeploymentFile = path.join(deploymentsDir, "localhost.json");
  
  if (fs.existsSync(localDeploymentFile)) {
    console.log("📁 Loading deployment data from file...");
    const data = JSON.parse(fs.readFileSync(localDeploymentFile, "utf8"));
    return data;
  }

  // Fallback to environment variables
  console.log("📁 Loading deployment data from environment variables...");
  const executorAddress = process.env.EXECUTOR_ADDRESS;
  if (!executorAddress) {
    throw new Error("EXECUTOR_ADDRESS environment variable is required when deployment file not found");
  }

  return {
    network: "unknown",
    deployer: "unknown",
    contracts: {
      intents: process.env.INTENTS_ADDRESS || "unknown",
      aggregator: process.env.AGGREGATOR_ADDRESS || "unknown",
      adapter: process.env.ADAPTER_ADDRESS || "unknown",
      executor: executorAddress
    },
    config: {
      tokenIn: process.env.TOKEN_IN || "unknown",
      tokenOut: process.env.TOKEN_OUT || "unknown",
      router: process.env.ROUTER || "unknown",
      keeperFeeBps: process.env.KEEPER_FEE_BPS ? parseInt(process.env.KEEPER_FEE_BPS) : 10,
      kMin: 10,
      timeWindow: 900
    },
    deployedAt: "unknown"
  };
}

async function main() {
  console.log("🤖 Starting fhe-dca-bot keeper...");

  // Load deployment data
  const deploymentData = await loadDeploymentData();
  console.log(`📋 Network: ${deploymentData.network}`);
  console.log(`📋 Executor: ${deploymentData.contracts.executor}`);

  // Setup provider and signer
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "http://localhost:8545";
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log(`👤 Keeper address: ${signer.address}`);

  // Create contract instance
  const executor = new ethers.Contract(
    deploymentData.contracts.executor,
    DcaExecutorABI,
    signer
  );

  console.log("🔍 Starting monitoring loop (30s intervals)...");
  console.log("Press Ctrl+C to stop\n");

  let executionCount = 0;

  while (true) {
    try {
      const now = new Date();
      console.log(`[${now.toISOString()}] Checking if batch is ready...`);

      // Check if batch is ready
      const [byK, byTime] = await executor.isReady();
      
      if (byK || byTime) {
        console.log(`✅ Batch ready! (byK: ${byK}, byTime: ${byTime})`);
        
        // For now, we'll use a placeholder decrypted amount
        // In production, this would be calculated based on the actual batch
        const decryptedAmount = 1000; // Placeholder - should be calculated from batch
        const minOut = 0; // No slippage protection for now
        
        console.log(`🚀 Executing batch with amount: ${decryptedAmount}`);
        
        const tx = await executor.executeIfReady(decryptedAmount, minOut);
        console.log(`📝 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        executionCount++;
        console.log(`📊 Total executions: ${executionCount}\n`);
      } else {
        console.log(`⏳ Batch not ready yet (byK: ${byK}, byTime: ${byTime})`);
      }

      // Wait 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));
      
    } catch (error) {
      console.error("❌ Error in keeper loop:", error);
      
      // If it's a network error, wait a bit longer before retrying
      if (error.message.includes("network") || error.message.includes("timeout")) {
        console.log("🔄 Network error, waiting 60s before retry...");
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else {
        // For other errors, exit
        console.error("💥 Fatal error, exiting keeper...");
        process.exit(1);
      }
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🛑 Keeper stopped by user");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n🛑 Keeper stopped by system");
  process.exit(0);
});

main()
  .catch((error) => {
    console.error("❌ Keeper failed:", error);
    process.exit(1);
  });
