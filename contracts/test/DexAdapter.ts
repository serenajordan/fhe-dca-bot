import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { MockERC20, MockERC20__factory } from "../types";
import { MockRouter, MockRouter__factory } from "../types";
import { DexAdapter, DexAdapter__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  treasury: HardhatEthersSigner;
};

describe("DexAdapter", function () {
  let signers: Signers;
  let tokenIn: MockERC20;
  let tokenOut: MockERC20;
  let router: MockRouter;
  let adapter: DexAdapter;
  let tokenInAddress: string;
  let tokenOutAddress: string;
  let routerAddress: string;
  let adapterAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0], 
      treasury: ethSigners[1]
    };
  });

  beforeEach(async function () {
    // Deploy MockERC20 tokens
    const tokenInFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
    tokenIn = (await tokenInFactory.deploy("Mock Token In", "MTI")) as MockERC20;
    tokenInAddress = await tokenIn.getAddress();

    const tokenOutFactory = (await ethers.getContractFactory("MockERC20")) as MockERC20__factory;
    tokenOut = (await tokenOutFactory.deploy("Mock Token Out", "MTO")) as MockERC20;
    tokenOutAddress = await tokenOut.getAddress();

    // Deploy MockRouter with 1:1 price (10000 bps)
    const routerFactory = (await ethers.getContractFactory("MockRouter")) as MockRouter__factory;
    router = (await routerFactory.deploy(10000)) as MockRouter;
    routerAddress = await router.getAddress();

    // Deploy DexAdapter
    const adapterFactory = (await ethers.getContractFactory("DexAdapter")) as DexAdapter__factory;
    adapter = (await adapterFactory.deploy(routerAddress, tokenInAddress, tokenOutAddress)) as DexAdapter;
    adapterAddress = await adapter.getAddress();

    // Mint tokens to treasury
    await tokenIn.mint(signers.treasury.address, ethers.parseEther("10000"));
    await tokenOut.mint(routerAddress, ethers.parseEther("10000")); // Router needs tokens to swap
  });

  it("should deploy with correct parameters", async function () {
    expect(await adapter.router()).to.equal(routerAddress);
    expect(await adapter.tokenIn()).to.equal(tokenInAddress);
    expect(await adapter.tokenOut()).to.equal(tokenOutAddress);
    expect(await router.priceBps()).to.equal(10000);
  });

  it("should execute swap successfully", async function () {
    const amountIn = ethers.parseEther("1000");
    const minOut = ethers.parseEther("990");
    const treasuryAddress = signers.treasury.address;

    // Get initial balances
    const initialTokenInBalance = await tokenIn.balanceOf(treasuryAddress);
    const initialTokenOutBalance = await tokenOut.balanceOf(treasuryAddress);

    // Approve adapter to spend tokenIn from treasury
    await tokenIn.connect(signers.treasury).approve(adapterAddress, amountIn);

    // Execute swap
    const tx = await adapter.connect(signers.treasury).swapAggregate(amountIn, minOut, treasuryAddress);
    const receipt = await tx.wait();

    // Get final balances
    const finalTokenInBalance = await tokenIn.balanceOf(treasuryAddress);
    const finalTokenOutBalance = await tokenOut.balanceOf(treasuryAddress);

    // Verify tokenIn balance decreased by amountIn
    expect(finalTokenInBalance).to.equal(initialTokenInBalance - amountIn);

    // Verify tokenOut balance increased by ~1000 (1:1 price)
    const expectedTokenOut = amountIn; // 1:1 price
    expect(finalTokenOutBalance).to.equal(initialTokenOutBalance + expectedTokenOut);

    // Verify SwapAggregateExecuted event was emitted
    const event = receipt?.logs?.find(log => {
      try {
        const parsed = adapter.interface.parseLog(log as any);
        return parsed?.name === "SwapAggregateExecuted";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    // Verify no per-user data appears in logs (only aggregate amounts)
    const eventData = adapter.interface.parseLog(event as any);
    expect(eventData?.args?.amountIn).to.equal(amountIn);
    expect(eventData?.args?.amountOut).to.equal(expectedTokenOut);
  });

  it("should handle different price ratios", async function () {
    // Deploy new router with 2:1 price (20000 bps)
    const routerFactory = (await ethers.getContractFactory("MockRouter")) as MockRouter__factory;
    const newRouter = (await routerFactory.deploy(20000)) as MockRouter;
    const newRouterAddress = await newRouter.getAddress();

    // Deploy new adapter
    const adapterFactory = (await ethers.getContractFactory("DexAdapter")) as DexAdapter__factory;
    const newAdapter = (await adapterFactory.deploy(newRouterAddress, tokenInAddress, tokenOutAddress)) as DexAdapter;
    const newAdapterAddress = await newAdapter.getAddress();

    // Mint tokens to new router
    await tokenOut.mint(newRouterAddress, ethers.parseEther("10000"));

    const amountIn = ethers.parseEther("1000");
    const minOut = ethers.parseEther("1900"); // Expect 2x output
    const treasuryAddress = signers.treasury.address;

    // Get initial balances
    const initialTokenInBalance = await tokenIn.balanceOf(treasuryAddress);
    const initialTokenOutBalance = await tokenOut.balanceOf(treasuryAddress);

    // Approve adapter to spend tokenIn from treasury
    await tokenIn.connect(signers.treasury).approve(newAdapterAddress, amountIn);

    // Execute swap
    const tx = await newAdapter.connect(signers.treasury).swapAggregate(amountIn, minOut, treasuryAddress);
    await tx.wait();

    // Get final balances
    const finalTokenInBalance = await tokenIn.balanceOf(treasuryAddress);
    const finalTokenOutBalance = await tokenOut.balanceOf(treasuryAddress);

    // Verify tokenIn balance decreased by amountIn
    expect(finalTokenInBalance).to.equal(initialTokenInBalance - amountIn);

    // Verify tokenOut balance increased by 2x amountIn (2:1 price)
    const expectedTokenOut = amountIn * 2n; // 2:1 price
    expect(finalTokenOutBalance).to.equal(initialTokenOutBalance + expectedTokenOut);
  });

  it("should revert if insufficient output amount", async function () {
    const amountIn = ethers.parseEther("1000");
    const minOut = ethers.parseEther("1100"); // Higher than 1:1 price allows
    const treasuryAddress = signers.treasury.address;

    // Approve adapter to spend tokenIn from treasury
    await tokenIn.connect(signers.treasury).approve(adapterAddress, amountIn);

    // Execute swap should revert
    await expect(
      adapter.connect(signers.treasury).swapAggregate(amountIn, minOut, treasuryAddress)
    ).to.be.revertedWith("MockRouter: INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("should revert if insufficient allowance", async function () {
    const amountIn = ethers.parseEther("1000");
    const minOut = ethers.parseEther("990");
    const treasuryAddress = signers.treasury.address;

    // Don't approve adapter to spend tokenIn

    // Execute swap should revert
    await expect(
      adapter.connect(signers.treasury).swapAggregate(amountIn, minOut, treasuryAddress)
    ).to.be.revertedWithCustomError(tokenIn, "ERC20InsufficientAllowance");
  });

  it("should revert if insufficient balance", async function () {
    const amountIn = ethers.parseEther("10001"); // More than treasury has (10000)
    const minOut = ethers.parseEther("9900");
    const treasuryAddress = signers.treasury.address;

    // Approve adapter to spend tokenIn from treasury
    await tokenIn.connect(signers.treasury).approve(adapterAddress, amountIn);

    // Execute swap should revert
    await expect(
      adapter.connect(signers.treasury).swapAggregate(amountIn, minOut, treasuryAddress)
    ).to.be.revertedWithCustomError(tokenIn, "ERC20InsufficientBalance");
  });
});
