import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedDCAIntents, EncryptedDCAIntents__factory } from "../types";
import { BatchAggregator, BatchAggregator__factory } from "../types";
import { MockERC20, MockERC20__factory } from "../types";
import { MockRouter, MockRouter__factory } from "../types";
import { DexAdapter, DexAdapter__factory } from "../types";
import { DcaExecutor, DcaExecutor__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
  keeper: HardhatEthersSigner;
};

async function deployFixture() {
  // Deploy MockERC20 tokens
  const tokenInFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
  const tokenIn = (await tokenInFactory.deploy("Mock Token In", "MTI")) as MockERC20;
  const tokenInAddress = await tokenIn.getAddress();

  const tokenOutFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
  const tokenOut = (await tokenOutFactory.deploy("Mock Token Out", "MTO")) as MockERC20;
  const tokenOutAddress = await tokenOut.getAddress();

  // Deploy EncryptedDCAIntents
  const intentsFactory = (await ethers.getContractFactory("EncryptedDCAIntents")) as EncryptedDCAIntents__factory;
  const intents = (await intentsFactory.deploy()) as EncryptedDCAIntents;
  const intentsAddress = await intents.getAddress();

  // Deploy BatchAggregator with kMin=3, timeWindow=60
  const aggregatorFactory = (await ethers.getContractFactory("BatchAggregator")) as BatchAggregator__factory;
  const aggregator = (await aggregatorFactory.deploy(intentsAddress, 3, 60)) as BatchAggregator;
  const aggregatorAddress = await aggregator.getAddress();

  // Deploy MockRouter with 1:1 price (10000 bps)
  const routerFactory = (await ethers.getContractFactory("MockRouter")) as MockRouter__factory;
  const router = (await routerFactory.deploy(10000)) as MockRouter;
  const routerAddress = await router.getAddress();

  // Deploy DexAdapter
  const adapterFactory = (await ethers.getContractFactory("DexAdapter")) as DexAdapter__factory;
  const adapter = (await adapterFactory.deploy(routerAddress, tokenInAddress, tokenOutAddress)) as DexAdapter;
  const adapterAddress = await adapter.getAddress();

  // Deploy DcaExecutor with keeperFeeBps=10 (0.10%)
  const executorFactory = (await ethers.getContractFactory("DcaExecutor")) as DcaExecutor__factory;
  const executor = (await executorFactory.deploy(
    intentsAddress,
    aggregatorAddress,
    adapterAddress,
    tokenInAddress,
    tokenOutAddress,
    10 // 0.10% keeper fee
  )) as DcaExecutor;
  const executorAddress = await executor.getAddress();

  return {
    tokenIn,
    tokenOut,
    intents,
    aggregator,
    router,
    adapter,
    executor,
    tokenInAddress,
    tokenOutAddress,
    intentsAddress,
    aggregatorAddress,
    routerAddress,
    adapterAddress,
    executorAddress
  };
}

describe("DcaExecutor", function () {
  let signers: Signers;
  let tokenIn: MockERC20;
  let tokenOut: MockERC20;
  let intents: EncryptedDCAIntents;
  let aggregator: BatchAggregator;
  let router: MockRouter;
  let adapter: DexAdapter;
  let executor: DcaExecutor;
  let tokenInAddress: string;
  let tokenOutAddress: string;
  let intentsAddress: string;
  let aggregatorAddress: string;
  let routerAddress: string;
  let adapterAddress: string;
  let executorAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0], 
      alice: ethSigners[1], 
      bob: ethSigners[2], 
      charlie: ethSigners[3],
      keeper: ethSigners[4]
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({
      tokenIn,
      tokenOut,
      intents,
      aggregator,
      router,
      adapter,
      executor,
      tokenInAddress,
      tokenOutAddress,
      intentsAddress,
      aggregatorAddress,
      routerAddress,
      adapterAddress,
      executorAddress
    } = await deployFixture());

    // Mint tokens for testing
    // Router needs tokenOut to swap
    await tokenOut.mint(routerAddress, ethers.parseEther("10000"));
    
    // Executor needs tokenIn to execute swaps (will receive from adapter)
    await tokenIn.mint(executorAddress, ethers.parseEther("10000"));
  });

  it("should deploy with correct parameters", async function () {
    expect(await executor.intents()).to.equal(intentsAddress);
    expect(await executor.aggregator()).to.equal(aggregatorAddress);
    expect(await executor.adapter()).to.equal(adapterAddress);
    expect(await executor.tokenIn()).to.equal(tokenInAddress);
    expect(await executor.tokenOut()).to.equal(tokenOutAddress);
    expect(await executor.keeperFeeBps()).to.equal(10);
  });

  it("should complete full DCA execution flow", async function () {
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

      await intents
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
      return await aggregator.connect(user).enqueue(tokenInAddress, tokenOutAddress, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    }

    // Create intents for 3 users with perBuy = 100 each
    await createIntentForUser(signers.alice, 100);
    await createIntentForUser(signers.bob, 100);
    await createIntentForUser(signers.charlie, 100);

    // Each user enqueues
    await enqueueUser(signers.alice, 100);
    await enqueueUser(signers.bob, 100);
    await enqueueUser(signers.charlie, 100);

    // Check if ready (should be true by k-anonymity)
    const [byK, byTime] = await executor.isReady();
    expect(byK).to.be.true;
    expect(byTime).to.be.false;

    // Get initial balances
    const initialExecutorTokenOutBalance = await tokenOut.balanceOf(executorAddress);
    const initialKeeperTokenOutBalance = await tokenOut.balanceOf(signers.keeper.address);

    // Execute the batch
    const totalAmountIn = 300; // 100 * 3 users (we know this from our test setup)
    
    // Executor needs tokenIn tokens to execute the swap
    await tokenIn.mint(executorAddress, totalAmountIn);
    const minOut = 290; // Expecting ~300 total (100 * 3), allowing for some slippage
    const tx = await executor.connect(signers.keeper).executeIfReady(totalAmountIn, minOut);
    const receipt = await tx.wait();

    // Get final balances
    const finalExecutorTokenOutBalance = await tokenOut.balanceOf(executorAddress);
    const finalKeeperTokenOutBalance = await tokenOut.balanceOf(signers.keeper.address);

    // Calculate expected values
    const expectedAmountOut = totalAmountIn; // 1:1 price
    const expectedFee = Math.floor((expectedAmountOut * 10) / 10000); // 0.10% keeper fee
    const expectedExecutorIncrease = expectedAmountOut - expectedFee;

    // Verify tokenOut balance of executor increased by ~300 minus fee
    expect(finalExecutorTokenOutBalance - initialExecutorTokenOutBalance).to.equal(expectedExecutorIncrease);

    // Verify fee paid to keeper
    expect(finalKeeperTokenOutBalance - initialKeeperTokenOutBalance).to.equal(expectedFee);

    // Verify BatchExecuted event was emitted with correct data
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = executor.interface.parseLog(log as any);
        return parsed?.name === "BatchExecuted";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    const eventData = executor.interface.parseLog(event as any);
    expect(eventData?.args?.count).to.equal(3);
    expect(eventData?.args?.amountIn).to.equal(totalAmountIn);
    expect(eventData?.args?.amountOut).to.equal(expectedAmountOut);
    expect(eventData?.args?.fee).to.equal(expectedFee);

    // Verify no per-user amounts/events were emitted anywhere besides aggregate
    // Check that no other events contain individual user data
    const allEvents = receipt?.logs || [];
    for (const log of allEvents) {
      try {
        // Check executor events
        const executorEvent = executor.interface.parseLog(log as any);
        if (executorEvent?.name === "BatchExecuted") {
          // This is the expected aggregate event - verify it only has aggregate data
          expect(executorEvent.args).to.have.property("count");
          expect(executorEvent.args).to.have.property("amountIn");
          expect(executorEvent.args).to.have.property("amountOut");
          expect(executorEvent.args).to.have.property("fee");
          // Should not have any user addresses or individual amounts
          expect(executorEvent.args).to.not.have.property("user");
          expect(executorEvent.args).to.not.have.property("userAmount");
        }
      } catch {
        // Try other contract interfaces
        try {
          const aggregatorEvent = aggregator.interface.parseLog(log as any);
          if (aggregatorEvent?.name === "BatchConsumed") {
            // Aggregator events should only have count, not individual amounts
            expect(aggregatorEvent.args).to.have.property("count");
            expect(aggregatorEvent.args).to.not.have.property("userAmount");
          }
        } catch {
          // Ignore events from other contracts that we can't parse
        }
      }
    }
  });

  it("should revert when batch is not ready", async function () {
    // Try to execute without any users in the batch
    await expect(
      executor.connect(signers.keeper).executeIfReady(100, 90)
    ).to.be.revertedWith("not ready");
  });

  it("should handle zero keeper fee", async function () {
    // Deploy executor with zero keeper fee
    const executorFactory = (await ethers.getContractFactory("DcaExecutor")) as DcaExecutor__factory;
    const zeroFeeExecutor = (await executorFactory.deploy(
      intentsAddress,
      aggregatorAddress,
      adapterAddress,
      tokenInAddress,
      tokenOutAddress,
      0 // 0% keeper fee
    )) as DcaExecutor;

    // Mint tokens for the zero fee executor
    await tokenIn.mint(await zeroFeeExecutor.getAddress(), ethers.parseEther("10000"));

    // Helper functions
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

      await intents
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

    async function enqueueUser(user: HardhatEthersSigner, perBuy: number) {
      const encryptedPerBuy = await fhevm
        .createEncryptedInput(aggregatorAddress, user.address)
        .add64(perBuy)
        .encrypt();
      return await aggregator.connect(user).enqueue(tokenInAddress, tokenOutAddress, encryptedPerBuy.handles[0], encryptedPerBuy.inputProof);
    }

    // Create intents and enqueue users
    await createIntentForUser(signers.alice, 100);
    await createIntentForUser(signers.bob, 100);
    await createIntentForUser(signers.charlie, 100);

    await enqueueUser(signers.alice, 100);
    await enqueueUser(signers.bob, 100);
    await enqueueUser(signers.charlie, 100);

    // Get initial balances
    const initialKeeperBalance = await tokenOut.balanceOf(signers.keeper.address);

    // Executor needs tokenIn tokens to execute the swap
    const totalAmountIn = 300; // 100 * 3 users
    await tokenIn.mint(await zeroFeeExecutor.getAddress(), totalAmountIn);

    // Execute with zero fee executor
    const tx = await zeroFeeExecutor.connect(signers.keeper).executeIfReady(totalAmountIn, 290);
    const receipt = await tx.wait();

    // Get final balance
    const finalKeeperBalance = await tokenOut.balanceOf(signers.keeper.address);

    // Verify no fee was paid to keeper
    expect(finalKeeperBalance - initialKeeperBalance).to.equal(0);

    // Verify event shows zero fee
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = zeroFeeExecutor.interface.parseLog(log as any);
        return parsed?.name === "BatchExecuted";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    const eventData = zeroFeeExecutor.interface.parseLog(event as any);
    expect(eventData?.args?.fee).to.equal(0);
  });
});
