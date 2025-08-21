import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedDCAIntents, EncryptedDCAIntents__factory } from "../types";
import { BatchAggregator, BatchAggregator__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  // Deploy EncryptedDCAIntents first
  const intentsFactory = (await ethers.getContractFactory("EncryptedDCAIntents")) as EncryptedDCAIntents__factory;
  const intentsContract = (await intentsFactory.deploy()) as EncryptedDCAIntents;
  const intentsAddress = await intentsContract.getAddress();

  // Deploy BatchAggregator with kMin=3, timeWindow=60
  const aggregatorFactory = (await ethers.getContractFactory("BatchAggregator")) as BatchAggregator__factory;
  const aggregatorContract = (await aggregatorFactory.deploy(intentsAddress, 3, 60)) as BatchAggregator;
  const aggregatorAddress = await aggregatorContract.getAddress();

  return { 
    intentsContract, 
    intentsAddress, 
    aggregatorContract, 
    aggregatorAddress 
  };
}

describe("BatchAggregator", function () {
  let signers: Signers;
  let intentsContract: EncryptedDCAIntents;
  let intentsAddress: string;
  let aggregatorContract: BatchAggregator;
  let aggregatorAddress: string;

  // Test token addresses
  const tokenIn = "0x1234567890123456789012345678901234567890";
  const tokenOut = "0x0987654321098765432109876543210987654321";

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0], 
      alice: ethSigners[1], 
      bob: ethSigners[2], 
      charlie: ethSigners[3] 
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ 
      intentsContract, 
      intentsAddress, 
      aggregatorContract, 
      aggregatorAddress 
    } = await deployFixture());
  });

  it("should deploy with correct parameters", async function () {
    expect(await aggregatorContract.intents()).to.equal(intentsAddress);
    expect(await aggregatorContract.kMin()).to.equal(3);
    expect(await aggregatorContract.timeWindowSecs()).to.equal(60);
  });

  it("should generate correct pair keys", async function () {
    const expectedKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"], 
      [tokenIn, tokenOut]
    ));
    expect(await aggregatorContract.pairKey(tokenIn, tokenOut)).to.equal(expectedKey);
  });

  it("should complete full k-anonymity flow with 3 users", async function () {
    // Helper function to create intent for a user
    async function createIntentForUser(user: HardhatEthersSigner, perBuy: number) {
      const budget = 1000;
      const freq = 60;
      const startTs = Math.floor(Date.now() / 1000);
      const endTs = startTs + (30 * 24 * 3600);
      const dipBps = 0;

      const encryptedBudget = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add128(budget)
        .encrypt();

      const encryptedPerBuy = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(perBuy)
        .encrypt();

      const encryptedFreq = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add32(freq)
        .encrypt();

      const encryptedStart = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(startTs)
        .encrypt();

      const encryptedEnd = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(endTs)
        .encrypt();

      const encryptedDipBps = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add16(dipBps)
        .encrypt();

      await intentsContract
        .connect(user)
        .createOrUpdateIntent({
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
    }

    // Helper function to enqueue a user
    async function enqueueUser(user: HardhatEthersSigner, perBuy: number) {
      const encryptedPerBuy = await fhevm
        .createEncryptedInput(aggregatorAddress, user.address)
        .add64(perBuy)
        .encrypt();
      return await aggregatorContract.connect(user).enqueue(tokenIn, tokenOut, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    }

    // Create intents for all 3 users
    await createIntentForUser(signers.alice, 5);
    await createIntentForUser(signers.bob, 10);
    await createIntentForUser(signers.charlie, 15);

    // Verify intents are active
    expect(await intentsContract.getIntentActive(signers.alice.address)).to.be.true;
    expect(await intentsContract.getIntentActive(signers.bob.address)).to.be.true;
    expect(await intentsContract.getIntentActive(signers.charlie.address)).to.be.true;

    // Check initial ready state (should be false, false)
    let [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false;
    expect(readyByTime).to.be.false;

    // Alice enqueues first
    const tx1 = await enqueueUser(signers.alice, 5);
    const receipt1 = await tx1.wait();

    // Check BatchUpdated event for Alice
    const event1 = receipt1?.logs?.find(log => {
      try {
        const parsed = aggregatorContract.interface.parseLog(log as any);
        return parsed?.name === "BatchUpdated";
      } catch {
        return false;
      }
    });
    expect(event1).to.not.be.undefined;

    // Check ready state after Alice (should be false, false)
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false;
    expect(readyByTime).to.be.false;

    // Bob enqueues second
    const tx2 = await enqueueUser(signers.bob, 10);
    const receipt2 = await tx2.wait();

    // Check ready state after Bob (should be false, false)
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false;
    expect(readyByTime).to.be.false;

    // Charlie enqueues third
    const tx3 = await enqueueUser(signers.charlie, 15);
    const receipt3 = await tx3.wait();

    // Check ready state after Charlie (should be true, false)
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.true;
    expect(readyByTime).to.be.false;

    // Verify BatchUpdated events increment count without exposing amounts
    const event3 = receipt3?.logs?.find(log => {
      try {
        const parsed = aggregatorContract.interface.parseLog(log as any);
        return parsed?.name === "BatchUpdated";
      } catch {
        return false;
      }
    });
    expect(event3).to.not.be.undefined;

    // Consume the batch
    const consumeTx = await aggregatorContract.consumeOpenBatch(tokenIn, tokenOut);
    const consumeReceipt = await consumeTx.wait();

    // Check BatchConsumed event
    const consumeEvent = consumeReceipt?.logs?.find(log => {
      try {
        const parsed = aggregatorContract.interface.parseLog(log as any);
        return parsed?.name === "BatchConsumed";
      } catch {
        return false;
      }
    });
    expect(consumeEvent).to.not.be.undefined;

    // Verify batch is reset
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false;
    expect(readyByTime).to.be.false;

    // Verify included mapping is reset (users can enqueue again)
    await enqueueUser(signers.alice, 5);
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false; // Only 1 user now
  });

  it("should trigger ready by time after 61 seconds with only 2 users", async function () {
    // Helper function to create intent for a user
    async function createIntentForUser(user: HardhatEthersSigner, perBuy: number) {
      const budget = 1000;
      const freq = 60;
      const startTs = Math.floor(Date.now() / 1000);
      const endTs = startTs + (30 * 24 * 3600);
      const dipBps = 0;

      const encryptedBudget = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add128(budget)
        .encrypt();

      const encryptedPerBuy = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(perBuy)
        .encrypt();

      const encryptedFreq = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add32(freq)
        .encrypt();

      const encryptedStart = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(startTs)
        .encrypt();

      const encryptedEnd = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add64(endTs)
        .encrypt();

      const encryptedDipBps = await fhevm
        .createEncryptedInput(intentsAddress, user.address)
        .add16(dipBps)
        .encrypt();

      await intentsContract
        .connect(user)
        .createOrUpdateIntent({
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
    }

    // Helper function to enqueue a user
    async function enqueueUser(user: HardhatEthersSigner, perBuy: number) {
      const encryptedPerBuy = await fhevm
        .createEncryptedInput(aggregatorAddress, user.address)
        .add64(perBuy)
        .encrypt();
      return await aggregatorContract.connect(user).enqueue(tokenIn, tokenOut, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    }

    // Create intents for 2 users only
    await createIntentForUser(signers.alice, 5);
    await createIntentForUser(signers.bob, 10);

    // Both users enqueue
    await enqueueUser(signers.alice, 5);
    await enqueueUser(signers.bob, 10);

    // Check initial state (should be false, false)
    let [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false; // Only 2 users, need 3
    expect(readyByTime).to.be.false; // Time window not elapsed

    // Fast forward time by 61 seconds
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTime = currentBlock?.timestamp || Math.floor(Date.now() / 1000);
    const newTime = currentTime + 61;
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTime]);
    // Mine a block to update the timestamp
    await ethers.provider.send("evm_mine", []);

    // Check state after time elapse (should be false, true)
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false; // Still only 2 users
    expect(readyByTime).to.be.true; // Time window has elapsed

    // Consume the batch
    const tx = await aggregatorContract.consumeOpenBatch(tokenIn, tokenOut);
    await tx.wait();
    // Note: We can't easily get the return values from the transaction
    // But we can verify the batch was consumed by checking the ready state

    // Verify batch is reset
    [readyByK, readyByTime] = await aggregatorContract.readyToExecute(tokenIn, tokenOut);
    expect(readyByK).to.be.false;
    expect(readyByTime).to.be.false;
  });

  it("should prevent double enrollment", async function () {
    // Create intent for Alice
    const budget = 1000;
    const perBuy = 5;
    const freq = 60;
    const startTs = Math.floor(Date.now() / 1000);
    const endTs = startTs + (30 * 24 * 3600);
    const dipBps = 0;

    const encryptedBudget = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add128(budget)
      .encrypt();

    const encryptedPerBuy = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add64(perBuy)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add32(freq)
      .encrypt();

    const encryptedStart = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add64(startTs)
      .encrypt();

    const encryptedEnd = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add64(endTs)
      .encrypt();

    const encryptedDipBps = await fhevm
      .createEncryptedInput(intentsAddress, signers.alice.address)
      .add16(dipBps)
      .encrypt();

    // Helper function to enqueue a user
    async function enqueueUser(user: HardhatEthersSigner, perBuy: number) {
      const encryptedPerBuy = await fhevm
        .createEncryptedInput(aggregatorAddress, user.address)
        .add64(perBuy)
        .encrypt();
      return await aggregatorContract.connect(user).enqueue(tokenIn, tokenOut, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    }

    await intentsContract
      .connect(signers.alice)
      .createOrUpdateIntent({
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

    // Alice enqueues first time
    await enqueueUser(signers.alice, 5);

    // Alice tries to enqueue again - should revert
    await expect(
      enqueueUser(signers.alice, 5)
    ).to.be.revertedWith("already in batch");
  });

  it("should prevent enqueue without active intent", async function () {
    // Try to enqueue without creating an intent
    const encryptedPerBuy = await fhevm
      .createEncryptedInput(aggregatorAddress, signers.alice.address)
      .add64(5)
      .encrypt();
    await expect(
      aggregatorContract.connect(signers.alice).enqueue(tokenIn, tokenOut, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof)
    ).to.be.revertedWith("intent inactive");
  });

  it("should prevent consuming non-existent batch", async function () {
    // Try to consume a batch that doesn't exist
    await expect(
      aggregatorContract.consumeOpenBatch(tokenIn, tokenOut)
    ).to.be.revertedWith("no open batch");
  });
});
