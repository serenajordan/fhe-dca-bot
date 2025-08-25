import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Read deployment data
const deploymentPath = path.join(process.cwd(), '../../../contracts/deployments/sepolia.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

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
    const blockData = await provider.getBlock(block);
    const timestamp = blockData?.timestamp || Math.floor(Date.now() / 1000);

    // Call readyToExecute with mock tokens
    const tokenIn = "0xBF97A27EDc0EA3db66687527f07e6D26A18ecb18";
    const tokenOut = "0xDDae9A49198173473A531061D6b3115A6fa7E27f";
    const [byK, byTime] = await aggregator.readyToExecute(tokenIn, tokenOut);

    return NextResponse.json({
      byK,
      byTime,
      block,
      timestamp,
      network: 'sepolia',
      contracts: {
        aggregator: deployment.contracts.aggregator,
        executor: deployment.contracts.executor
      }
    });

  } catch (error: unknown) {
    console.error('Status API error:', error);
    return NextResponse.json({ 
      byK: false, 
      byTime: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch status'
    }, { status: 200 });
  }
}
