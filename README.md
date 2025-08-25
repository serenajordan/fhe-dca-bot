# fhEVM DCA Bot (Sepolia - FHE)

A privacy-preserving Dollar-Cost Averaging (DCA) bot built on fhEVM using Zama's Fully Homomorphic Encryption. Users create encrypted DCA intents that are batched and executed automatically while maintaining privacy.

## 🚀 Overview

### How It Works
1. **Encrypted DCA Intents**: Users create DCA parameters (budget, per-buy amount, duration, frequency) that are encrypted using FHE
2. **Batch Aggregation**: Multiple user intents are aggregated using k-anonymity (k=3) and time windows (60s)
3. **Single Uniswap V2 Swap**: When conditions are met, the batch executes a single swap on Uniswap V2
4. **Proportional Settlement**: Users receive their proportional share of the swapped tokens

### Architecture
```
User Intent (Encrypted) → BatchAggregator → DcaExecutor → DexAdapter → Uniswap V2
```

### Smart Contracts (Sepolia)
- **EncryptedDCAIntents**: `0x2f3bA9B9E722207720254DFEa75BF565A3d5A9F6`
- **BatchAggregator**: `0x6BB0054f650c47b72d888935A193041C56182ce9`
- **DcaExecutor**: `0x5f576d4f6C7590935488A3a3794353C438c7E0E2`
- **DexAdapter**: `0xbCA4DD5266df830d6c479bB53456aCbd06663D2f`

### Example Transactions
1. **Fund Adapter**: `0x053d3e6fc829d7a1d4d7f6fe0179e014fbe981830c6612d9d167644fc287cee8`
2. **Intent 1**: `0xfc8f54c734719bd266d539c8fdabbb5d879a81f8b1183ad8d4a01c2e1c5a424f`
3. **Intent 2**: `0x2bbe0a4933789b0b62d7d1585021c365a887ef0fe6a662c6b8bc8fdab29e36ff`
4. **Intent 3**: `0x57912f3793f20f805fe1f01835a7c9173bc43ef30de6b4420e7659aee88103bb`
5. **Execute Batch**: `0xba92ce35f44ab67612ce91e845e1d052de289e471ddc56498efd1145b49d96b1`

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- pnpm
- Sepolia RPC URL (Infura/Alchemy)
- Private key with Sepolia ETH

### Quick Start
```bash
# Install dependencies
pnpm install

# Build contracts
pnpm -C contracts build

# Start frontend
pnpm -C app/packages/site dev
```

### Demo Commands
```bash
# 1. Fund adapter with tokens
pnpm -C contracts run fund:adapter

# 2. Create demo intents
pnpm -C contracts run enqueue:demo

# 3. Execute batch (via frontend or API)
curl -X POST http://localhost:3000/api/execute
```

Visit http://localhost:3000 to see the demo in action!

## 🌐 Vercel Deployment

### Environment Variables

#### Public Variables (Client-Side)
```bash
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
NEXT_PUBLIC_EXPLORER=https://sepolia.etherscan.io
NEXT_PUBLIC_DEMO_MODE=on
```

#### Server Variables (Server-Side Only)
```bash
EXECUTOR_KEY="0xYOUR_PRIVATE_KEY"
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
TOKEN_IN="0xBF97A27EDc0EA3db66687527f07e6D26A18ecb18"
TOKEN_OUT="0xDDae9A49198173473A531061D6b3115A6fa7E27f"
```

### Deploy Steps
1. **Fork/Clone** this repository
2. **Set Environment Variables** in Vercel dashboard
3. **Deploy**: `vercel --prod`
4. **Verify**: Check contract addresses and transactions

### Security Notes
- **EXECUTOR_KEY**: Server-side only, never exposed to client
- **Demo Mode**: Simulated swaps for demonstration
- **Private Keys**: Stored securely in Vercel environment variables
- **FHE Implementation**: Mock encryption for demo; real FHE in production

## 🔒 Security Architecture

### Client-Side (Safe)
- Public contract addresses
- RPC URLs
- Transaction status
- UI state

### Server-Side (Protected)
- Private keys for transaction signing
- Environment validation
- API rate limiting
- Error handling

### Demo vs Production
- **Demo Mode**: `NEXT_PUBLIC_DEMO_MODE=on` - Simulated swaps
- **Production**: Real Uniswap V2 swaps with actual FHE encryption

## 📚 API Reference

### `/api/status`
Returns batch status and contract addresses.
```json
{
  "block": 9062357,
  "byK": true,
  "byTime": true,
  "aggregator": "0x6BB0054f650c47b72d888935A193041C56182ce9",
  "executor": "0x5f576d4f6C7590935488A3a3794353C438c7E0E2"
}
```

### `/api/create-intent`
Creates an encrypted DCA intent.
```json
{
  "budget": "1000000",
  "perBuy": "100000",
  "durationSec": "86400",
  "freqSec": "3600"
}
```

### `/api/execute`
Executes a ready batch.
```json
{
  "txHash": "0xba92ce35f44ab67612ce91e845e1d052de289e471ddc56498efd1145b49d96b1",
  "blockNumber": 9062361,
  "gasUsed": "72441",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0xba92ce35f44ab67612ce91e845e1d052de289e471ddc56498efd1145b49d96b1",
  "status": "success"
}
```

## 🏗️ Project Structure

```
fhe-dca-bot/
├── contracts/                 # Smart contracts
│   ├── contracts/            # Solidity contracts
│   ├── scripts/              # Deployment & utility scripts
│   └── deployments/          # Contract addresses
├── app/packages/site/        # Next.js frontend
│   ├── app/                  # App Router
│   ├── src/                  # Source code
│   └── components/           # React components
└── docs/                     # Documentation
```

## 🧪 Testing

### Contract Tests
```bash
# Run all tests
pnpm -C contracts test

# Run Sepolia tests
pnpm -C contracts test:sepolia
```

### Frontend Tests
```bash
# Build and test
pnpm -C app/packages/site build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) for FHE technology
- [fhEVM](https://docs.zama.ai/fhevm) for the development framework
- [Uniswap](https://uniswap.org/) for DEX integration

---

## 📋 Submission Checklist

- [ ] Contracts deployed to Sepolia
- [ ] Frontend builds successfully
- [ ] Environment variables configured
- [ ] Demo commands working
- [ ] API endpoints functional
- [ ] Security measures in place
- [ ] Documentation complete
- [ ] No secrets committed to git
