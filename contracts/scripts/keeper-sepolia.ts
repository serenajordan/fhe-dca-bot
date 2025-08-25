import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_IN = process.env.TOKEN_IN;
const TOKEN_OUT = process.env.TOKEN_OUT;
const DEMO_DECRYPTED_AMOUNT = process.env.DEMO_DECRYPTED_AMOUNT || "1000000000000000000"; // 1 ETH in wei
const DEMO_MIN_OUT = process.env.DEMO_MIN_OUT || "0";

// Validate required environment variables (fail early if missing)
if (!SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL environment variable is required");
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY environment variable is required");
if (!TOKEN_IN) throw new Error("TOKEN_IN environment variable is required");
if (!TOKEN_OUT) throw new Error("TOKEN_OUT environment variable is required");

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Load contract ABIs
const DcaExecutor = JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/DcaExecutor.sol/DcaExecutor.json"), "utf8"));
const BatchAggregator = JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/BatchAggregator.sol/BatchAggregator.json"), "utf8"));

async function main() {
  console.log("🚀 Starting Sepolia Keeper...");
  console.log(`📋 RPC URL: ${SEPOLIA_RPC_URL!.substring(0, 20)}...`);
  console.log(`👤 Keeper Address: ${new ethers.Wallet(PRIVATE_KEY!).address}`);
  console.log(`⚡ Executor: ${addresses.contracts.executor}`);
  console.log(`📦 Aggregator: ${addresses.contracts.aggregator}`);
  console.log(`🪙 Token In: ${TOKEN_IN || 'NOT SET'}`);
  console.log(`🪙 Token Out: ${TOKEN_OUT || 'NOT SET'}`);
  console.log(`💰 Demo Decrypted Amount: ${DEMO_DECRYPTED_AMOUNT}`);
  console.log(`📉 Demo Min Out: ${DEMO_MIN_OUT}`);

  // Check if tokens are set
  if (TOKEN_IN === "0x0000000000000000000000000000000000000000" || 
      TOKEN_OUT === "0x0000000000000000000000000000000000000000" ||
      !TOKEN_IN || !TOKEN_OUT) {
    console.log("⚠️  Skipping because tokens are unset");
    return;
  }

  // Initialize ethers v6
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL!);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  
  // Initialize contracts
  const exec = new ethers.Contract(addresses.contracts.executor, DcaExecutor.abi, wallet);
  const agg = new ethers.Contract(addresses.contracts.aggregator, BatchAggregator.abi, provider);

  console.log("✅ Keeper initialized. Starting monitoring loop...\n");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const [byK, byTime] = await agg.readyToExecute(TOKEN_IN, TOKEN_OUT);
      const timestamp = new Date().toISOString();
      
      console.log(`${timestamp} 📊 Status: Ready by K: ${byK}, Ready by Time: ${byTime}`);
      
      if (byK || byTime) {
        console.log(`🚀 Executing batch...`);
        
        const decryptedAmount = BigInt(DEMO_DECRYPTED_AMOUNT);
        const minOut = BigInt(DEMO_MIN_OUT);
        
        console.log(`📋 Decrypted Amount: ${decryptedAmount.toString()}`);
        console.log(`📋 Min Out: ${minOut.toString()}`);
        
        const tx = await exec.executeIfReady(decryptedAmount, minOut);
        console.log(`📝 Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed})`);
        console.log(`🎉 Batch executed successfully!\n`);
      } else {
        console.log(`⏳ No batch ready for execution\n`);
      }
    } catch (e: any) {
      const data = e?.info?.error?.data ?? e?.data;
      console.error("Keeper error:", e.shortMessage ?? e.message, "data:", data);
    }
    
    // Poll every 30 seconds
    await new Promise(r => setTimeout(r, 30_000));
  }
}

main().catch((error) => {
  console.error("💥 Keeper crashed:", error);
  process.exit(1);
});
