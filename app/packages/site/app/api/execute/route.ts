import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Read deployment data
const deploymentPath = path.join(process.cwd(), '../../../contracts/deployments/sepolia.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// DcaExecutor ABI for executeIfReady function
const executorABI = [
  "function executeIfReady(uint256 decryptedAmount, uint256 minOut) external returns (uint256 amountIn, uint256 amountOut)",
  "function isReady() external view returns (bool byK, bool byTime)"
];

export async function POST() {
  try {
    // Get environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC || process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.EXECUTOR_KEY || process.env.PRIVATE_KEY;
    const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER || 'https://sepolia.etherscan.io';

    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not configured" }, { status: 400 });
    }

    if (!privateKey) {
      return NextResponse.json({ error: "Executor private key not configured" }, { status: 400 });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get demo amounts from environment
    const decryptedAmount = process.env.NEXT_PUBLIC_DEMO_DECRYPTED_AMOUNT || 
                           process.env.DEMO_DECRYPTED_AMOUNT || 
                           "1000000";
    const minOut = process.env.NEXT_PUBLIC_DEMO_MIN_OUT || 
                   process.env.DEMO_MIN_OUT || 
                   "0";

    console.log(`Executing batch with decryptedAmount: ${decryptedAmount}, minOut: ${minOut}`);

    // Debug: Check if the function exists
    console.log(`Executor contract: ${deployment.contracts.executor}`);
    console.log(`Executor ABI:`, executorABI);

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
    console.log(`Transaction confirmed: ${tx.hash} (gas: ${receipt.gasUsed})`);

    return NextResponse.json({
      hash: tx.hash,
      explorerUrl: `${explorerUrl}/tx/${tx.hash}`,
      gasUsed: receipt.gasUsed.toString(),
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
