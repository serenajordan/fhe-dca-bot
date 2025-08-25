import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_IN = process.env.TOKEN_IN;

// Validate required environment variables
if (!SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL environment variable is required");
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY environment variable is required");
if (!TOKEN_IN) throw new Error("TOKEN_IN environment variable is required");

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Minimal ERC20 interface for token operations
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

async function main() {
  console.log("💰 Funding adapter with TOKEN_IN...");
  
  const adapterAddress = deployment.contracts.adapter;
  const tokenInAddress = TOKEN_IN!; // We already validated this above
  const fundAmount = ethers.parseEther("500000"); // 500,000 tokens (1e18 each) - safe amount
  
  console.log(`📋 Adapter Address: ${adapterAddress}`);
  console.log(`🪙 Token In Address: ${tokenInAddress}`);
  console.log(`💰 Fund Amount: ${ethers.formatEther(fundAmount)} tokens`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Create token contract instance using getContractAt to avoid FHEVM issues
  const tokenIn = await ethers.getContractAt("MockERC20", tokenInAddress);
  
  // Check deployer's token balance
  const deployerBalance = await tokenIn.balanceOf(deployer.address);
  console.log(`📊 Deployer Token Balance: ${ethers.formatEther(deployerBalance)} tokens`);
  
  if (deployerBalance < fundAmount) {
    console.log(`⚠️  Warning: Deployer has insufficient tokens. Need ${ethers.formatEther(fundAmount)}, have ${ethers.formatEther(deployerBalance)}`);
    console.log(`💡 You may need to mint more tokens or use a different account`);
  }

  // Check adapter's current balance
  const adapterBalance = await tokenIn.balanceOf(adapterAddress);
  console.log(`📊 Adapter Current Balance: ${ethers.formatEther(adapterBalance)} tokens`);

  // Transfer tokens to adapter
  console.log(`\n🔄 Transferring tokens to adapter...`);
  try {
    const transferTx = await tokenIn.transfer(adapterAddress, fundAmount);
    console.log(`📝 Transfer transaction sent: ${transferTx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const transferReceipt = await transferTx.wait();
    console.log(`✅ Transfer confirmed: ${transferTx.hash} (gas: ${transferReceipt.gasUsed})`);
    
    // Verify the transfer
    const newAdapterBalance = await tokenIn.balanceOf(adapterAddress);
    console.log(`📊 Adapter New Balance: ${ethers.formatEther(newAdapterBalance)} tokens`);
    
    if (newAdapterBalance >= fundAmount) {
      console.log(`🎉 Successfully funded adapter with ${ethers.formatEther(fundAmount)} tokens!`);
    } else {
      console.log(`⚠️  Transfer may have failed - adapter balance didn't increase as expected`);
    }
    
  } catch (error: any) {
    console.error(`❌ Transfer failed:`, error.message);
    if (error.data) {
      console.error(`📋 Error data:`, error.data);
    }
    throw error;
  }

  // Optional: Approve adapter to spend tokens (if needed)
  console.log(`\n🔐 Checking if adapter needs approval...`);
  try {
    const allowance = await tokenIn.allowance(adapterAddress, adapterAddress);
    console.log(`📊 Current allowance: ${ethers.formatEther(allowance)} tokens`);
    
    if (allowance < fundAmount) {
      console.log(`🔄 Approving adapter to spend tokens...`);
      const approveTx = await tokenIn.approve(adapterAddress, ethers.MaxUint256);
      console.log(`📝 Approve transaction sent: ${approveTx.hash}`);
      
      const approveReceipt = await approveTx.wait();
      console.log(`✅ Approve confirmed: ${approveTx.hash} (gas: ${approveReceipt.gasUsed})`);
    } else {
      console.log(`✅ Adapter already has sufficient allowance`);
    }
  } catch (error: any) {
    console.log(`⚠️  Approval check failed (this may be normal):`, error.message);
  }

  console.log(`\n🎉 Adapter funding completed!`);
  console.log(`📋 Summary:`);
  console.log(`  Adapter: ${adapterAddress}`);
  console.log(`  Token: ${tokenInAddress}`);
  console.log(`  Amount: ${ethers.formatEther(fundAmount)} tokens`);
  console.log(`  Final Balance: ${ethers.formatEther(await tokenIn.balanceOf(adapterAddress))} tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Adapter funding failed:", error);
    process.exit(1);
  });
