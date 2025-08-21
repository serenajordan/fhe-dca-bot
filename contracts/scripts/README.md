# Deployment and Keeper Scripts

This directory contains scripts for deploying and running the fhe-dca-bot contracts.

## Mock Deployment Script (`deploy-mocks.ts`)

Deploys mock tokens and router for local testing and development.

### Usage

```bash
# Deploy mocks with detailed output
pnpm run deploy:mocks

# Deploy mocks and set environment variables automatically
eval $(pnpm run deploy:mocks:eval)
```

### What it Deploys

- **Mock USD (mUSD)**: Mock stablecoin token
- **Mock WETH (mWETH)**: Mock wrapped ETH token  
- **MockRouter**: Mock DEX router with 1:1 price ratio
- **Token Minting**: Mints 1M tokens to router for swaps

### Output

The script will:
1. Deploy mock tokens and router
2. Mint tokens to router for liquidity
3. Print shell export commands
4. Provide instructions for automatic environment variable setting

### Environment Variables Set

```bash
export TOKEN_IN="0x..."    # Mock USD address
export TOKEN_OUT="0x..."   # Mock WETH address  
export ROUTER="0x..."      # MockRouter address
```

## Deployment Script (`deploy.ts`)

Deploys all contracts in the correct order with proper configuration.

### Usage

```bash
# Deploy to localhost (requires hardhat node running)
pnpm run deploy:local

# Deploy to Sepolia testnet
pnpm run deploy:sepolia
```

### Required Environment Variables

- `TOKEN_IN`: Input token address (e.g., USDC)
- `TOKEN_OUT`: Output token address (e.g., ETH)  
- `ROUTER`: DEX router address (e.g., Uniswap V2 Router)
- `PRIVATE_KEY`: Deployer private key
- `SEPOLIA_RPC_URL`: RPC URL for Sepolia (for sepolia deployment)

### Optional Environment Variables

- `KEEPER_FEE_BPS`: Keeper fee in basis points (default: 10 = 0.10%)

### Output

The script will:
1. Deploy all contracts in sequence
2. Save deployment addresses to `deployments/{network}.json`
3. Print a summary of all addresses and configuration

## Keeper Script (`keeper.js`)

Monitors the DcaExecutor contract and executes batches when ready.

### Usage

```bash
# Run keeper for localhost
pnpm run keeper:local

# Run keeper for Sepolia
pnpm run keeper:sepolia
```

### Required Environment Variables

- `PRIVATE_KEY`: Keeper wallet private key
- `SEPOLIA_RPC_URL`: RPC URL (defaults to localhost:8545)

### Configuration

The keeper script will automatically load contract addresses from:
1. `deployments/localhost.json` (for local deployment)
2. Environment variables (fallback)

### Behavior

- Checks `executor.isReady()` every 30 seconds
- Executes batches when ready (by k-anonymity or time window)
- Logs all transactions and errors
- Graceful shutdown on Ctrl+C

### Production Notes

- The keeper currently uses a placeholder decrypted amount (1000)
- In production, this should be calculated from the actual batch
- Consider adding slippage protection and gas optimization
- Monitor for failed transactions and implement retry logic

## Deployment Files

Deployment addresses are automatically saved to:
- `deployments/localhost.json` (for localhost deployment)
- `deployments/sepolia.json` (for Sepolia deployment)

These files contain:
- Contract addresses
- Network configuration
- Deployment timestamp
- Keeper fee settings

## Account Helper Script (`print-keys.js`)

Prints Hardhat local accounts and private keys for testing.

### Usage

```bash
pnpm run print-keys
```

### Output

The script will display:
- Hardhat's default mnemonic
- 10 account addresses and private keys
- Usage instructions

### Example Output

```
🔑 Hardhat Local Accounts & Private Keys
========================================
Mnemonic: test test test test test test test test test test test junk

0: 0x1090495C9bC80106a8E42D89E10fd58adbDA409b 0x287cfecc881e96eb57b8ac6ce43437609a9a231e2ef3276149ab91ae7e54b3db
1: 0x1A24e5C53B1438f15B25c819fEe1F894e6D131f2 0x44d4c20e2c2aaca3ba8d9363675be1241ec7f40897dae419bb5407fe55d2078b
...
```

### Use Cases

- **Testing**: Copy private keys for wallet testing
- **Contract Interaction**: Use addresses for contract calls
- **Development**: Account 0 is deployer, 1-9 for testing
- **Debugging**: Verify account balances and transactions
