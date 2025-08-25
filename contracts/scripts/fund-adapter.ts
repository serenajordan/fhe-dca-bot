import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.log("💰 Funding DexAdapter with TOKEN_IN...");

  // Validate environment variables
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const tokenIn = process.env.TOKEN_IN;

  if (!rpcUrl || !privateKey || !tokenIn) {
    throw new Error("Missing required environment variables: SEPOLIA_RPC_URL, PRIVATE_KEY, TOKEN_IN");
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

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`👤 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);

  // MockERC20 ABI for token operations
  const mockERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  // Create token contract instance
  const tokenContract = new ethers.Contract(tokenIn, mockERC20ABI, wallet);

  // Check deployer's token balance
  const deployerBalance = await tokenContract.balanceOf(wallet.address);
  console.log(`📊 Deployer TOKEN_IN balance: ${ethers.formatUnits(deployerBalance, 18)}`);

  // Fund amount (40,000 tokens)
  const fundAmount = ethers.parseUnits("40000", 18);
  
  if (deployerBalance < fundAmount) {
    throw new Error(`Insufficient tokens. Need ${ethers.formatUnits(fundAmount, 18)}, have ${ethers.formatUnits(deployerBalance, 18)}`);
  }

  // Transfer tokens to adapter
  console.log(`🔄 Transferring ${ethers.formatUnits(fundAmount, 18)} TOKEN_IN to adapter...`);
  const tx = await tokenContract.transfer(adapterAddress, fundAmount);
  
  console.log(`📝 Transaction sent: ${tx.hash}`);
  console.log(`⏳ Waiting for confirmation...`);
  
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed.toString()})`);

  // Check adapter's new balance
  const adapterBalance = await tokenContract.balanceOf(adapterAddress);
  console.log(`📊 Adapter TOKEN_IN balance: ${ethers.formatUnits(adapterBalance, 18)}`);

  console.log("\n🎉 Adapter funding completed successfully!");
  console.log(`📋 Next steps:`);
  console.log(`  1. Create demo intents using the frontend`);
  console.log(`  2. Monitor batch status`);
  console.log(`  3. Execute when ready`);
}

main().catch((error) => {
  console.error("❌ Funding failed:", error);
  process.exit(1);
});
