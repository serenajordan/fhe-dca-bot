import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

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

// BatchAggregator ABI for readyToExecute function
const aggregatorABI = [
  "function readyToExecute(address tokenIn, address tokenOut) external view returns (bool byK, bool byTime)"
];

export async function GET() {
  try {
    // Get RPC URL from environment
    const rpcUrl = process.env.NEXT_PUBLIC_RPC || process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ 
        byK: false, 
        byTime: false, 
        error: "RPC URL not configured" 
      }, { status: 200 });
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create contract instance
    const aggregator = new ethers.Contract(
      deployment.contracts.aggregator,
      aggregatorABI,
      provider
    );

    // Get current block info
    const block = await provider.getBlockNumber();

    // Call readyToExecute with mock tokens
    const tokenIn = "0xBF97A27EDc0EA3db66687527f07e6D26A18ecb18";
    const tokenOut = "0xDDae9A49198173473A531061D6b3115A6fa7E27f";
    const [byK, byTime] = await aggregator.readyToExecute(tokenIn, tokenOut);

    return NextResponse.json({
      block,
      byK,
      byTime,
      aggregator: deployment.contracts.aggregator,
      executor: deployment.contracts.executor
    });

  } catch (error: unknown) {
    console.error('Status API error:', error);
    return NextResponse.json({ 
      block: 0,
      byK: false, 
      byTime: false, 
      aggregator: deployment.contracts.aggregator,
      executor: deployment.contracts.executor,
      error: error instanceof Error ? error.message : 'Failed to fetch status'
    }, { status: 200 });
  }
}
