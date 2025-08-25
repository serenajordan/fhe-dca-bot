import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env file from contracts root
config({ path: path.join(__dirname, "..", ".env") });

// Load deployment addresses
const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

async function main() {
  console.log("🔍 Checking deployed executor contract...");
  
  const executorAddress = deployment.contracts.executor;
  
  console.log(`📋 Executor Address: ${executorAddress}`);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log(`👤 Deployer: ${deployer.address}`);

  // Try to get contract at address
  try {
    const executor = await ethers.getContractAt("DcaExecutor", executorAddress);
    console.log(`✅ Successfully connected to DcaExecutor contract`);
    
    // Check if executeIfReady function exists
    if (executor.executeIfReady) {
      console.log(`✅ executeIfReady function exists`);
    } else {
      console.log(`❌ executeIfReady function does not exist`);
    }
    
    // Check if isReady function exists
    if (executor.isReady) {
      console.log(`✅ isReady function exists`);
    } else {
      console.log(`❌ isReady function does not exist`);
    }
    
    // List all functions
    console.log(`\n📋 All contract functions:`);
    const functions = Object.keys(executor.interface.functions);
    functions.forEach((func, index) => {
      console.log(`  ${index + 1}. ${func}`);
    });
    
  } catch (error: any) {
    console.error(`❌ Error connecting to contract:`, error.message);
    
    // Try to get contract as generic contract
    try {
      console.log(`\n🔄 Trying to connect as generic contract...`);
      const genericContract = new ethers.Contract(executorAddress, [], deployer);
      
      // Try to call some basic functions
      console.log(`📋 Trying basic contract calls...`);
      
      // Check if contract exists
      const code = await deployer.provider.getCode(executorAddress);
      if (code === "0x") {
        console.log(`❌ No contract deployed at ${executorAddress}`);
      } else {
        console.log(`✅ Contract exists at ${executorAddress}`);
        console.log(`📊 Contract code length: ${code.length} characters`);
      }
      
    } catch (genericError: any) {
      console.error(`❌ Generic contract error:`, genericError.message);
    }
  }

  console.log(`\n🎉 Contract check completed!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
