// Demo pipeline for localhost
import { ethers, network, fhevm } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🎬 Starting fhe-dca-bot local demo...");

  // Check if we're running in a mock environment
  let isMockEnvironment = false;
  try {
    isMockEnvironment = fhevm.isMock;
  } catch (error) {
    console.log("⚠️  Warning: FHEVM plugin not initialized");
    console.log("   This script requires the FHEVM mock environment to create encrypted intents");
    console.log("   Please run this script with the hardhat network that supports FHEVM");
    console.log("   For now, we'll skip the encrypted intent creation and just set up the basic demo");
    
    // Run the simplified version instead
    await runSimplifiedDemo();
    return;
  }
  
  if (!isMockEnvironment) {
    console.log("⚠️  Warning: Not running in FHEVM mock environment");
    console.log("   This script requires the FHEVM mock environment to create encrypted intents");
    console.log("   Please run this script with the hardhat network that supports FHEVM");
    console.log("   For now, we'll skip the encrypted intent creation and just set up the basic demo");
    
    // Run the simplified version instead
    await runSimplifiedDemo();
    return;
  }

  // 1) Load deployment addresses (written by deploy:local)
  const depPath = path.join(__dirname, "../deployments/localhost.json");
  if (!fs.existsSync(depPath)) {
    throw new Error("Deployment file not found. Run 'pnpm run deploy:local' first.");
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  const INTENTS = dep.contracts.intents;
  const AGGREGATOR = dep.contracts.aggregator;
  const ADAPTER = dep.contracts.adapter;
  const EXECUTOR = dep.contracts.executor;

  console.log("📁 Loaded deployment addresses:");
  console.log(`  Intents: ${INTENTS}`);
  console.log(`  Aggregator: ${AGGREGATOR}`);
  console.log(`  Adapter: ${ADAPTER}`);
  console.log(`  Executor: ${EXECUTOR}`);

  // 2) Load token addresses from env (set by deploy:mocks)
  const TOKEN_IN = process.env.TOKEN_IN;
  const TOKEN_OUT = process.env.TOKEN_OUT;
  if (!TOKEN_IN || !TOKEN_OUT) {
    throw new Error("Set TOKEN_IN and TOKEN_OUT env vars. Run 'eval $(pnpm run deploy:mocks:eval)' first.");
  }

  console.log("💰 Token addresses:");
  console.log(`  TOKEN_IN: ${TOKEN_IN}`);
  console.log(`  TOKEN_OUT: ${TOKEN_OUT}`);

  // 3) Get signers
  const signers = await ethers.getSigners();
  const u0 = signers[1];
  const u1 = signers[2];
  const u2 = signers[3];

  console.log("👥 Using signers:");
  console.log(`  User 0: ${u0.address}`);
  console.log(`  User 1: ${u1.address}`);
  console.log(`  User 2: ${u2.address}`);

  // 4) Get contracts
  const intents = await ethers.getContractAt("EncryptedDCAIntents", INTENTS);
  const aggregator = await ethers.getContractAt("BatchAggregator", AGGREGATOR);
  const adapter = await ethers.getContractAt("DexAdapter", ADAPTER);

  // 5) Encrypt helper — reuse the pattern from your tests
  const now = Math.floor(Date.now() / 1000);

  // Helper to create an intent for a signer with the encrypted bytes
  async function createIntentFor(signer: any) {
    console.log(`\n🔐 Creating intent for ${signer.address}...`);

    const budget = 1000;
    const perBuy = 100;
    const freq = 60;
    const startTs = now;
    const endTs = now + 86400; // 1 day
    const dipBps = 0;

    // Encrypt values using the same pattern as tests
    const encryptedBudget = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add128(budget)
      .encrypt();

    const encryptedPerBuy = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add64(perBuy)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add32(freq)
      .encrypt();

    const encryptedStart = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add64(startTs)
      .encrypt();

    const encryptedEnd = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add64(endTs)
      .encrypt();

    const encryptedDipBps = await fhevm
      .createEncryptedInput(INTENTS, signer.address)
      .add16(dipBps)
      .encrypt();

    await intents.connect(signer).createOrUpdateIntent({
      budget: encryptedBudget.handles[0],
      perBuy: encryptedPerBuy.handles[0],
      freq: encryptedFreq.handles[0],
      start: encryptedStart.handles[0],
      end: encryptedEnd.handles[0],
      dipBps: encryptedDipBps.handles[0],
      budgetProof: encryptedBudget.inputProof,
      perBuyProof: encryptedPerBuy.inputProof,
      freqProof: encryptedFreq.inputProof,
      startProof: encryptedStart.inputProof,
      endProof: encryptedEnd.inputProof,
      dipBpsProof: encryptedDipBps.inputProof
    });

    console.log(`  ✅ Intent created with perBuy=${perBuy}, freq=${freq}s`);
  }

  // 6) Create intents for 3 users
  console.log("\n📝 Creating encrypted intents...");
  await createIntentFor(u0);
  await createIntentFor(u1);
  await createIntentFor(u2);

  // 7) Enqueue each user to the pair (this opens the batch & sets firstTs)
  console.log("\n📦 Enqueuing users into batch...");
  
  // Helper to enqueue a user
  async function enqueueUser(signer: any) {
    console.log(`  Enqueuing ${signer.address}...`);
    
    const encryptedPerBuy = await fhevm
      .createEncryptedInput(AGGREGATOR, signer.address)
      .add64(100)
      .encrypt();
    
    await aggregator.connect(signer).enqueue(TOKEN_IN, TOKEN_OUT, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    console.log(`  ✅ Enqueued`);
  }

  await enqueueUser(u0);
  await enqueueUser(u1);
  await enqueueUser(u2);

  // Check batch status
  const [byK, byTime] = await aggregator.readyToExecute(TOKEN_IN, TOKEN_OUT);
  console.log(`\n📊 Batch status: readyByK=${byK}, readyByTime=${byTime}`);

  // 8) Fund the adapter with TOKEN_IN so a swap can happen (MockERC20 mint)
  console.log("\n🏦 Funding adapter with TOKEN_IN...");
  const tokenIn = await ethers.getContractAt("MockERC20", TOKEN_IN);
  const fundAmount = ethers.parseUnits("100000", 18); // 100k tokens
  await tokenIn.mint(ADAPTER, fundAmount);
  console.log(`  ✅ Minted ${ethers.formatUnits(fundAmount, 18)} TOKEN_IN to adapter`);

  // 9) Fast-forward time beyond the fallback window (your deploy uses 900s)
  console.log("\n⏰ Fast-forwarding time by 901 seconds...");
  await network.provider.send("evm_increaseTime", [901]);
  await network.provider.send("evm_mine");
  
  const newTime = await ethers.provider.getBlock("latest").then(b => b?.timestamp);
  console.log(`  ✅ Time advanced to ${newTime} (${new Date(newTime! * 1000).toISOString()})`);

  // Check final batch status
  const [finalByK, finalByTime] = await aggregator.readyToExecute(TOKEN_IN, TOKEN_OUT);
  console.log(`\n📊 Final batch status: readyByK=${finalByK}, readyByTime=${finalByTime}`);

  console.log("\n🎉 Demo setup complete!");
  console.log("======================");
  console.log("✅ Created encrypted intents for 3 users");
  console.log("✅ Enqueued all users into batch");
  console.log("✅ Funded adapter with 100k TOKEN_IN");
  console.log("✅ Fast-forwarded time by 901 seconds");
  console.log("\n🤖 Keeper should execute on its next 30s check.");
  console.log("   Run 'pnpm run keeper:local' in another terminal to start the keeper.");
}

// Simplified demo function for non-FHEVM environments
async function runSimplifiedDemo() {
  console.log("\n🔄 Running simplified demo (no encrypted intents)...");
  
  // 1) Load deployment addresses (written by deploy:local)
  const depPath = path.join(__dirname, "../deployments/localhost.json");
  if (!fs.existsSync(depPath)) {
    throw new Error("Deployment file not found. Run 'pnpm run deploy:local' first.");
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  const INTENTS = dep.contracts.intents;
  const AGGREGATOR = dep.contracts.aggregator;
  const ADAPTER = dep.contracts.adapter;
  const EXECUTOR = dep.contracts.executor;

  console.log("📁 Loaded deployment addresses:");
  console.log(`  Intents: ${INTENTS}`);
  console.log(`  Aggregator: ${AGGREGATOR}`);
  console.log(`  Adapter: ${ADAPTER}`);
  console.log(`  Executor: ${EXECUTOR}`);

  // 2) Load token addresses from env (set by deploy:mocks)
  const TOKEN_IN = process.env.TOKEN_IN;
  const TOKEN_OUT = process.env.TOKEN_OUT;
  if (!TOKEN_IN || !TOKEN_OUT) {
    throw new Error("Set TOKEN_IN and TOKEN_OUT env vars. Run 'eval $(pnpm run deploy:mocks:eval)' first.");
  }

  console.log("💰 Token addresses:");
  console.log(`  TOKEN_IN: ${TOKEN_IN}`);
  console.log(`  TOKEN_OUT: ${TOKEN_OUT}`);

  // 3) Get signers
  const signers = await ethers.getSigners();
  const u0 = signers[1];
  const u1 = signers[2];
  const u2 = signers[3];

  console.log("👥 Using signers:");
  console.log(`  User 0: ${u0.address}`);
  console.log(`  User 1: ${u1.address}`);
  console.log(`  User 2: ${u2.address}`);

  // 4) Get contracts
  const intents = await ethers.getContractAt("EncryptedDCAIntents", INTENTS);
  const aggregator = await ethers.getContractAt("BatchAggregator", AGGREGATOR);
  const adapter = await ethers.getContractAt("DexAdapter", ADAPTER);

  console.log("📋 Contracts loaded successfully");

  // 8) Fund the adapter with TOKEN_IN so a swap can happen (MockERC20 mint)
  console.log("\n🏦 Funding adapter with TOKEN_IN...");
  const tokenIn = await ethers.getContractAt("MockERC20", TOKEN_IN);
  const fundAmount = ethers.parseUnits("100000", 18); // 100k tokens
  await tokenIn.mint(ADAPTER, fundAmount);
  console.log(`  ✅ Minted ${ethers.formatUnits(fundAmount, 18)} TOKEN_IN to adapter`);

  // 9) Fast-forward time beyond the fallback window (your deploy uses 900s)
  console.log("\n⏰ Fast-forwarding time by 901 seconds...");
  await network.provider.send("evm_increaseTime", [901]);
  await network.provider.send("evm_mine");
  
  const newTime = await ethers.provider.getBlock("latest").then(b => b?.timestamp);
  console.log(`  ✅ Time advanced to ${newTime} (${new Date(newTime! * 1000).toISOString()})`);

  console.log("\n🎉 Simplified demo setup complete!");
  console.log("======================");
  console.log("✅ Loaded deployment addresses");
  console.log("✅ Funded adapter with 100k TOKEN_IN");
  console.log("✅ Fast-forwarded time by 901 seconds");
  console.log("\n🤖 Keeper should execute on its next 30s check.");
  console.log("   Run 'pnpm run keeper:local' in another terminal to start the keeper.");
}

main().catch((e) => { 
  console.error("Error in demo script:", e); 
  process.exit(1); 
});
