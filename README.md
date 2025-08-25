# fhEVM DCA Bot (Sepolia)

A fully functional DCA (Dollar Cost Averaging) bot built on fhEVM with k-anonymity and time-window triggers, deployed on Sepolia testnet.

## 🚀 Features

- **K-anonymity protection**: Batches execute when minimum participants reached
- **Time-window triggers**: Fallback execution after configurable time period
- **Uniswap V2 integration**: Real DEX swaps on Sepolia
- **Demo mode**: Test with mock tokens and demo swap logic
- **Web UI**: Real-time status monitoring and manual execution
- **Keeper bot**: Automated batch execution monitoring

## 📋 Prerequisites

- Node.js 20+
- pnpm
- Sepolia testnet ETH
- Infura/Alchemy RPC endpoint

## 🛠️ Setup

### 1. Environment Configuration

**Contracts (.env):**
```bash
cd contracts
cp .env.example .env
# Edit .env with your values:
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# PRIVATE_KEY=0xYOUR_PRIVATE_KEY
# TOKEN_IN=0x... (mock token address)
# TOKEN_OUT=0x... (mock token address)
```

**Frontend (.env.local):**
```bash
cd app/packages/site
cp .env.local.example .env.local
# Edit .env.local with your values:
# NEXT_PUBLIC_RPC=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# EXECUTOR_KEY=0xYOUR_PRIVATE_KEY
```

### 2. Deploy Contracts

```bash
# Deploy main contracts
pnpm -C contracts run deploy:sepolia

# Deploy mock tokens
pnpm -C contracts run deploy:mocks:sepolia

# Fund adapter with tokens
pnpm -C contracts run fund:adapter:sepolia
```

### 3. Build & Run

```bash
# Build everything
pnpm build

# Start frontend
cd app/packages/site && pnpm dev
```

## 🎯 Usage

### Frontend (http://localhost:3000)

1. **Monitor Status**: View real-time batch status (Ready by K/Time)
2. **Execute Batches**: Click "Execute (demo)" to manually trigger execution
3. **View Transactions**: Click transaction hashes to see on Etherscan

### Keeper Bot

```bash
# Run keeper (monitors every 30s)
cd contracts
pnpm run keeper:sepolia
```

### Demo Data

```bash
# Enqueue demo users
cd contracts
pnpm run enqueue:demo
```

## 🏗️ Architecture

### Contracts

- **EncryptedDCAIntents**: Stores user DCA intents
- **BatchAggregator**: Aggregates intents with k-anonymity
- **DexAdapter**: Handles DEX swaps (Uniswap V2)
- **DcaExecutor**: Main execution contract

### Frontend

- **Status Component**: Real-time batch status polling
- **BatchActions**: Manual execution interface
- **API Routes**: Server-side transaction execution

## 🔧 Configuration

### Key Parameters

- `K_MIN`: Minimum participants for k-anonymity (default: 10)
- `TIME_WINDOW`: Fallback time window in seconds (default: 120)
- `KEEPER_FEE_BPS`: Keeper fee in basis points (default: 10)

### Network Settings

- **Chain**: Sepolia (11155111)
- **Router**: Uniswap V2 on Sepolia
- **Tokens**: Mock ERC20 tokens for testing

## 🧪 Testing

### Manual Testing

1. Deploy contracts and mock tokens
2. Enqueue demo users with `pnpm run enqueue:demo`
3. Wait for time window or reach k-anonymity threshold
4. Execute batch via UI or keeper bot

### Automated Testing

```bash
# Run contract tests
cd contracts
pnpm test
```

## 📊 Monitoring

### Events

- `BatchUpdated`: When users are enqueued
- `BatchExecuted`: When batch is executed
- `SwapAggregateExecuted`: When swap completes

### Logs

- Keeper bot logs execution attempts and results
- API routes log transaction details
- Frontend shows real-time status updates

## 🚨 Troubleshooting

### Common Issues

1. **"not ready" error**: Batch hasn't met k-anonymity or time window
2. **"insufficient balance"**: Adapter needs more tokens
3. **"RPC error"**: Check your Infura/Alchemy endpoint
4. **"ABI not found"**: Run `pnpm build` to export fresh ABIs

### Debug Steps

1. Check contract addresses in `contracts/deployments/sepolia.json`
2. Verify environment variables are set correctly
3. Monitor keeper logs for execution attempts
4. Check Etherscan for transaction status

## 🔒 Security

- Private keys are never committed to git
- Environment files are git-ignored
- Demo mode uses mock tokens for safe testing
- Keeper bot includes proper error handling

## 📝 License

BSD-3-Clause-Clear

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
