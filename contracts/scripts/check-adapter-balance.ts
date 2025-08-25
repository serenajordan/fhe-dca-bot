import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("📊 Checking DexAdapter balances...");

  // Validate environment variables
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const tokenIn = process.env.TOKEN_IN;
  const tokenOut = process.env.TOKEN_OUT;

  if (!rpcUrl || !tokenIn || !tokenOut) {
    throw new Error("Missing required environment variables: SEPOLIA_RPC_URL, TOKEN_IN, TOKEN_OUT");
  }

  // Load deployment data
  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Run deploy-sepolia.ts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const adapterAddress = deployment.contracts.adapter;

  console.log(`📋 Configuration:`);
  console.log(`  RPC URL: ${rpcUrl.substring(0, 20)}...`);
  console.log(`  Adapter: ${adapterAddress}`);
  console.log(`  Token In: ${tokenIn}`);
  console.log(`  Token Out: ${tokenOut}`);

  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // MockERC20 ABI for token operations
  const mockERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ];

  // Create token contract instances
  const tokenInContract = new ethers.Contract(tokenIn, mockERC20ABI, provider);
  const tokenOutContract = new ethers.Contract(tokenOut, mockERC20ABI, provider);

  // Get token symbols and decimals
  const [tokenInSymbol, tokenInDecimals, tokenOutSymbol, tokenOutDecimals] = await Promise.all([
    tokenInContract.symbol(),
    tokenInContract.decimals(),
    tokenOutContract.symbol(),
    tokenOutContract.decimals()
  ]);

  // Check adapter balances
  const [tokenInBalance, tokenOutBalance] = await Promise.all([
    tokenInContract.balanceOf(adapterAddress),
    tokenOutContract.balanceOf(adapterAddress)
  ]);

  console.log("\n📊 Adapter Balances:");
  console.log(`  ${tokenInSymbol}: ${ethers.formatUnits(tokenInBalance, tokenInDecimals)}`);
  console.log(`  ${tokenOutSymbol}: ${ethers.formatUnits(tokenOutBalance, tokenOutDecimals)}`);

  // Check if adapter has sufficient funds for demo
  const minTokenIn = ethers.parseUnits("100000", tokenInDecimals); // 100k tokens
  const minTokenOut = ethers.parseUnits("10000", tokenOutDecimals); // 10k tokens

  console.log("\n🔍 Demo Readiness Check:");
  console.log(`  ${tokenInSymbol} (need ${ethers.formatUnits(minTokenIn, tokenInDecimals)}): ${tokenInBalance >= minTokenIn ? "✅" : "❌"}`);
  console.log(`  ${tokenOutSymbol} (need ${ethers.formatUnits(minTokenOut, tokenOutDecimals)}): ${tokenOutBalance >= minTokenOut ? "✅" : "❌"}`);

  if (tokenInBalance < minTokenIn) {
    console.log(`\n⚠️  Adapter needs more ${tokenInSymbol}. Run fund-adapter.ts`);
  }

  if (tokenOutBalance < minTokenOut) {
    console.log(`\n⚠️  Adapter needs more ${tokenOutSymbol}. Consider funding it.`);
  }

  if (tokenInBalance >= minTokenIn && tokenOutBalance >= minTokenOut) {
    console.log(`\n✅ Adapter is ready for demo execution!`);
  }
}

main().catch((error) => {
  console.error("❌ Balance check failed:", error);
  process.exit(1);
});
