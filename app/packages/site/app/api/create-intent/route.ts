import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encryptDcaParams, DcaParams } from '../../../src/lib/encryptDcaParams';
import { ADDRESSES } from '../../../src/addresses';

// EncryptedDCAIntents ABI for createIntent function
const intentsABI = [
  "function createIntent(string encryptedBudget, string encryptedPerBuy, string encryptedDurationSec, string encryptedFreqSec, string budgetProof, string perBuyProof, string durationSecProof, string freqSecProof) external"
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { budget, perBuy, durationSec, freqSec } = body;

    // Validate input parameters
    if (!budget || !perBuy || !durationSec || !freqSec) {
      return NextResponse.json({ 
        error: "Missing required parameters: budget, perBuy, durationSec, freqSec" 
      }, { status: 400 });
    }

    // Convert to bigint
    const dcaParams: DcaParams = {
      budget: BigInt(budget),
      perBuy: BigInt(perBuy),
      durationSec: BigInt(durationSec),
      freqSec: BigInt(freqSec)
    };

    console.log('Encrypting DCA parameters:', {
      budget: dcaParams.budget.toString(),
      perBuy: dcaParams.perBuy.toString(),
      durationSec: dcaParams.durationSec.toString(),
      freqSec: dcaParams.freqSec.toString()
    });

    // Encrypt the DCA parameters
    const encryptedParams = await encryptDcaParams(dcaParams);

    // Validate environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC || process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.EXECUTOR_KEY || process.env.PRIVATE_KEY;

    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not configured" }, { status: 400 });
    }

    if (!privateKey) {
      return NextResponse.json({ error: "Private key not configured" }, { status: 400 });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Create contract instance
    const intentsContract = new ethers.Contract(ADDRESSES.intents, intentsABI, wallet);

    console.log('Creating intent with encrypted parameters...');

    // Create the intent with encrypted parameters
    const tx = await intentsContract.createIntent(
      encryptedParams.encryptedBudget,
      encryptedParams.encryptedPerBuy,
      encryptedParams.encryptedDurationSec,
      encryptedParams.encryptedFreqSec,
      encryptedParams.budgetProof,
      encryptedParams.perBuyProof,
      encryptedParams.durationSecProof,
      encryptedParams.freqSecProof,
      { gasLimit: 500000 }
    );

    console.log('Intent creation transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction failed - no receipt received");
    }

    console.log('Intent created successfully:', tx.hash);

    return NextResponse.json({
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: 'success'
    });

  } catch (error: unknown) {
    console.error('Create intent API error:', error);
    
    let errorMessage = 'Intent creation failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 400 });
  }
}
