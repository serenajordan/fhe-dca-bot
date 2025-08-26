import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
// import { decryptValue } from '@/lib/encryptDcaParams';

// Read deployment data
const deploymentPath = path.join(process.cwd(), '../../../../contracts/deployments/sepolia.json');
let deployment: { contracts: { aggregator: string; executor: string } };
try {
  deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
} catch {
  console.error('Failed to load deployment file:', deploymentPath);
  // Return demo data if deployment file not found
  deployment = {
    contracts: {
      aggregator: "0x6BB0054f650c47b72d888935A193041C56182ce9",
      executor: "0x5f576d4f6C7590935488A3a3794353C438c7E0E2"
    }
  };
}

// DcaExecutor ABI for executeIfReady function
const executorABI = [
  "function executeIfReady(uint256 decryptedAmount, uint256 minOut) external returns (uint256 amountIn, uint256 amountOut)",
  "function isReady() external view returns (bool byK, bool byTime)",
  "function isExecutionAllowed() external view returns (bool allowed)"
];

// BatchAggregator ABI for getting encrypted batch data (unused in demo mode)
// const aggregatorABI = [
//   "function getOpenBatch(address tokenIn, address tokenOut) external view returns (bytes32 key, uint256 sum, uint16 count, bool open)",
//   "function readyToExecute(address tokenIn, address tokenOut) external view returns (bool byK, bool byTime)"
// ];

export async function POST() {
  try {
    // Get environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC || process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.EXECUTOR_KEY || process.env.PRIVATE_KEY;

    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not configured" }, { status: 400 });
    }

    if (!privateKey) {
      return NextResponse.json({ error: "Executor private key not configured" }, { status: 400 });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get demo amounts from environment (fallback)
    const fallbackAmount = process.env.NEXT_PUBLIC_DEMO_DECRYPTED_AMOUNT || 
                          process.env.DEMO_DECRYPTED_AMOUNT || 
                          "1000000";
    const minOut = process.env.NEXT_PUBLIC_DEMO_MIN_OUT || 
                   process.env.DEMO_MIN_OUT || 
                   "0";

    console.log(`Checking batch readiness and getting encrypted data...`);

    // Check if execution is allowed
    const executor = new ethers.Contract(deployment.contracts.executor, executorABI, wallet);
    const isAllowed = await executor.isExecutionAllowed();
    
    if (!isAllowed) {
      return NextResponse.json({ error: "Batch not ready for execution" }, { status: 400 });
    }

    // For demo purposes, use fallback amount
    // In production, this would decrypt the actual batch sum
    const decryptedAmount = BigInt(fallbackAmount);
    console.log(`Using demo amount: ${decryptedAmount.toString()}`);

    // Create contract interface and encode function call manually
    const executorInterface = new ethers.Interface(executorABI);
    const encodedData = executorInterface.encodeFunctionData("executeIfReady", [
      BigInt(decryptedAmount),
      BigInt(minOut)
    ]);
    
    console.log(`Encoded function data: ${encodedData}`);

    // Execute the batch using raw transaction
    const tx = await wallet.sendTransaction({
      to: deployment.contracts.executor,
      data: encodedData,
      gasLimit: 500000
    });

    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction failed - no receipt received");
    }
    console.log(`Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed})`);

    const explorerUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    
    return NextResponse.json({
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl,
      status: 'success'
    });

  } catch (error: unknown) {
    console.error('Execute API error:', error);
    
    // Try to decode revert reason
    let errorMessage = 'Execution failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error && typeof error === 'object' && 'data' in error) {
      try {
        // Basic revert reason extraction
        const revertData = (error as { data?: string }).data;
        if (revertData && revertData.startsWith('0x08c379a0')) {
          // Standard revert reason format
          const reason = ethers.AbiCoder.defaultAbiCoder().decode(
            ['string'],
            '0x' + revertData.slice(10)
          )[0];
          errorMessage = `Contract revert: ${reason}`;
        }
      } catch (decodeError) {
        console.error('Failed to decode revert reason:', decodeError);
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 400 });
  }
}
