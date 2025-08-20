import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedDCAIntents, EncryptedDCAIntents__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedDCAIntents")) as EncryptedDCAIntents__factory;
  const encryptedDCAIntentsContract = (await factory.deploy()) as EncryptedDCAIntents;
  const encryptedDCAIntentsContractAddress = await encryptedDCAIntentsContract.getAddress();

  return { encryptedDCAIntentsContract, encryptedDCAIntentsContractAddress };
}

describe("EncryptedDCAIntents", function () {
  let signers: Signers;
  let encryptedDCAIntentsContract: EncryptedDCAIntents;
  let encryptedDCAIntentsContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ encryptedDCAIntentsContract, encryptedDCAIntentsContractAddress } = await deployFixture());
  });

  it("should return false for getIntentActive when no intent exists", async function () {
    const isActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    expect(isActive).to.be.false;
  });

  it("should create an intent and emit IntentCreated event", async function () {
    const budget = 1000;
    const perBuy = 50;
    const freq = 3600; // 1 hour
    const startTs = Math.floor(Date.now() / 1000);
    const endTs = startTs + (30 * 24 * 3600); // 30 days from now
    const dipBps = 0;

    // Encrypt all values
    const encryptedBudget = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add128(budget)
      .encrypt();

    const encryptedPerBuy = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(perBuy)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add32(freq)
      .encrypt();

    const encryptedStart = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(startTs)
      .encrypt();

    const encryptedEnd = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(endTs)
      .encrypt();

    const encryptedDipBps = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add16(dipBps)
      .encrypt();

    // Create the intent
    const tx = await encryptedDCAIntentsContract
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

    const receipt = await tx.wait();

    // Check that IntentCreated event was emitted
    expect(receipt?.logs).to.not.be.undefined;
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = encryptedDCAIntentsContract.interface.parseLog(log as any);
        return parsed?.name === "IntentCreated";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    // Check that the intent is now active
    const isActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    expect(isActive).to.be.true;
  });

  it("should update an existing intent and emit IntentUpdated event", async function () {
    // First create an intent
    const budget1 = 1000;
    const perBuy1 = 50;
    const freq1 = 3600;
    const startTs1 = Math.floor(Date.now() / 1000);
    const endTs1 = startTs1 + (30 * 24 * 3600);
    const dipBps1 = 0;

    const encryptedBudget1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add128(budget1)
      .encrypt();

    const encryptedPerBuy1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(perBuy1)
      .encrypt();

    const encryptedFreq1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add32(freq1)
      .encrypt();

    const encryptedStart1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(startTs1)
      .encrypt();

    const encryptedEnd1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(endTs1)
      .encrypt();

    const encryptedDipBps1 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add16(dipBps1)
      .encrypt();

    await encryptedDCAIntentsContract
      .connect(signers.alice)
      .createOrUpdateIntent({
        budget: encryptedBudget1.handles[0],
        perBuy: encryptedPerBuy1.handles[0],
        freq: encryptedFreq1.handles[0],
        start: encryptedStart1.handles[0],
        end: encryptedEnd1.handles[0],
        dipBps: encryptedDipBps1.handles[0],
        budgetProof: encryptedBudget1.inputProof,
        perBuyProof: encryptedPerBuy1.inputProof,
        freqProof: encryptedFreq1.inputProof,
        startProof: encryptedStart1.inputProof,
        endProof: encryptedEnd1.inputProof,
        dipBpsProof: encryptedDipBps1.inputProof
      });

    // Now update the intent with different values
    const budget2 = 2000;
    const perBuy2 = 100;
    const freq2 = 7200; // 2 hours
    const startTs2 = Math.floor(Date.now() / 1000);
    const endTs2 = startTs2 + (60 * 24 * 3600); // 60 days from now
    const dipBps2 = 500; // 5%

    const encryptedBudget2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add128(budget2)
      .encrypt();

    const encryptedPerBuy2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(perBuy2)
      .encrypt();

    const encryptedFreq2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add32(freq2)
      .encrypt();

    const encryptedStart2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(startTs2)
      .encrypt();

    const encryptedEnd2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(endTs2)
      .encrypt();

    const encryptedDipBps2 = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add16(dipBps2)
      .encrypt();

    // Update the intent
    const tx = await encryptedDCAIntentsContract
      .connect(signers.alice)
      .createOrUpdateIntent({
        budget: encryptedBudget2.handles[0],
        perBuy: encryptedPerBuy2.handles[0],
        freq: encryptedFreq2.handles[0],
        start: encryptedStart2.handles[0],
        end: encryptedEnd2.handles[0],
        dipBps: encryptedDipBps2.handles[0],
        budgetProof: encryptedBudget2.inputProof,
        perBuyProof: encryptedPerBuy2.inputProof,
        freqProof: encryptedFreq2.inputProof,
        startProof: encryptedStart2.inputProof,
        endProof: encryptedEnd2.inputProof,
        dipBpsProof: encryptedDipBps2.inputProof
      });

    const receipt = await tx.wait();

    // Check that IntentUpdated event was emitted
    expect(receipt?.logs).to.not.be.undefined;
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = encryptedDCAIntentsContract.interface.parseLog(log as any);
        return parsed?.name === "IntentUpdated";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    // Check that the intent is still active
    const isActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    expect(isActive).to.be.true;
  });

  it("should cancel an intent and emit IntentCancelled event", async function () {
    // First create an intent
    const budget = 1000;
    const perBuy = 50;
    const freq = 3600;
    const startTs = Math.floor(Date.now() / 1000);
    const endTs = startTs + (30 * 24 * 3600);
    const dipBps = 0;

    const encryptedBudget = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add128(budget)
      .encrypt();

    const encryptedPerBuy = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(perBuy)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add32(freq)
      .encrypt();

    const encryptedStart = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(startTs)
      .encrypt();

    const encryptedEnd = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(endTs)
      .encrypt();

    const encryptedDipBps = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add16(dipBps)
      .encrypt();

    await encryptedDCAIntentsContract
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

    // Verify intent is active
    let isActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    expect(isActive).to.be.true;

    // Cancel the intent
    const tx = await encryptedDCAIntentsContract.connect(signers.alice).cancelIntent();
    const receipt = await tx.wait();

    // Check that IntentCancelled event was emitted
    expect(receipt?.logs).to.not.be.undefined;
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = encryptedDCAIntentsContract.interface.parseLog(log as any);
        return parsed?.name === "IntentCancelled";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    // Check that the intent is now inactive
    isActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    expect(isActive).to.be.false;
  });

  it("should revert when trying to cancel a non-existent intent", async function () {
    await expect(
      encryptedDCAIntentsContract.connect(signers.alice).cancelIntent()
    ).to.be.revertedWith("No active intent to cancel");
  });

  it("should allow different users to have separate intents", async function () {
    // Alice creates an intent
    const aliceBudget = 1000;
    const alicePerBuy = 50;
    const freq = 3600;
    const startTs = Math.floor(Date.now() / 1000);
    const endTs = startTs + (30 * 24 * 3600);
    const dipBps = 0;

    const aliceEncryptedBudget = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add128(aliceBudget)
      .encrypt();

    const aliceEncryptedPerBuy = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(alicePerBuy)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add32(freq)
      .encrypt();

    const encryptedStart = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(startTs)
      .encrypt();

    const encryptedEnd = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add64(endTs)
      .encrypt();

    const encryptedDipBps = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.alice.address)
      .add16(dipBps)
      .encrypt();

    await encryptedDCAIntentsContract
      .connect(signers.alice)
      .createOrUpdateIntent({
        budget: aliceEncryptedBudget.handles[0],
        perBuy: aliceEncryptedPerBuy.handles[0],
        freq: encryptedFreq.handles[0],
        start: encryptedStart.handles[0],
        end: encryptedEnd.handles[0],
        dipBps: encryptedDipBps.handles[0],
        budgetProof: aliceEncryptedBudget.inputProof,
        perBuyProof: aliceEncryptedPerBuy.inputProof,
        freqProof: encryptedFreq.inputProof,
        startProof: encryptedStart.inputProof,
        endProof: encryptedEnd.inputProof,
        dipBpsProof: encryptedDipBps.inputProof
      });

    // Bob creates a different intent
    const bobBudget = 2000;
    const bobPerBuy = 100;

    const bobEncryptedBudget = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add128(bobBudget)
      .encrypt();

    const bobEncryptedPerBuy = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add64(bobPerBuy)
      .encrypt();

    const bobEncryptedFreq = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add32(freq)
      .encrypt();

    const bobEncryptedStart = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add64(startTs)
      .encrypt();

    const bobEncryptedEnd = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add64(endTs)
      .encrypt();

    const bobEncryptedDipBps = await fhevm
      .createEncryptedInput(encryptedDCAIntentsContractAddress, signers.bob.address)
      .add16(dipBps)
      .encrypt();

    await encryptedDCAIntentsContract
      .connect(signers.bob)
      .createOrUpdateIntent({
        budget: bobEncryptedBudget.handles[0],
        perBuy: bobEncryptedPerBuy.handles[0],
        freq: bobEncryptedFreq.handles[0],
        start: bobEncryptedStart.handles[0],
        end: bobEncryptedEnd.handles[0],
        dipBps: bobEncryptedDipBps.handles[0],
        budgetProof: bobEncryptedBudget.inputProof,
        perBuyProof: bobEncryptedPerBuy.inputProof,
        freqProof: bobEncryptedFreq.inputProof,
        startProof: bobEncryptedStart.inputProof,
        endProof: bobEncryptedEnd.inputProof,
        dipBpsProof: bobEncryptedDipBps.inputProof
      });

    // Both intents should be active
    const aliceActive = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    const bobActive = await encryptedDCAIntentsContract.getIntentActive(signers.bob.address);
    
    expect(aliceActive).to.be.true;
    expect(bobActive).to.be.true;

    // Alice cancels her intent, Bob's should remain active
    await encryptedDCAIntentsContract.connect(signers.alice).cancelIntent();
    
    const aliceActiveAfter = await encryptedDCAIntentsContract.getIntentActive(signers.alice.address);
    const bobActiveAfter = await encryptedDCAIntentsContract.getIntentActive(signers.bob.address);
    
    expect(aliceActiveAfter).to.be.false;
    expect(bobActiveAfter).to.be.true;
  });
});
