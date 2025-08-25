// Import contract addresses
import { ADDRESSES } from './addresses';

export const ADDRS = {
  intents: ADDRESSES.intents,
  aggregator: ADDRESSES.aggregator,
  executor: ADDRESSES.executor,
  adapter: ADDRESSES.adapter,
  tokenIn: ADDRESSES.tokenIn,
  tokenOut: ADDRESSES.tokenOut,
};

export const IS_LOCAL = (process.env.NEXT_PUBLIC_FHEVM || 'off') === 'off';
export const FHE_ENABLED = (process.env.NEXT_PUBLIC_FHEVM || 'off') === 'on';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC || 'http://127.0.0.1:8545';
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER || 'https://sepolia.etherscan.io';
export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '11155111';
