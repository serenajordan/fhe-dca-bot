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
1. **Fund Adapter**: `0xa7dbbd4f64d960702c495b4e1856f067243b151b468a15150f337822094000a0`
2. **Intent 1**: `0x4d644cc2fb43d2a5ef03bbc45a81779cc3f635bf5c11f207093b111828dc3785`
3. **Intent 2**: `0x22a3d3e8f2d5762bf5e5018f8fd1b657e83e6eafc2084ca072d17e1a6fd7aa17`
4. **Intent 3**: `0x04f3fdc9ffa8e0a54a33302496020d5475fb043f678d9a9fd2f18179fbc82eb8`
5. **Execute Batch**: `0xb89475223bbae0196f688f26604f3f17054f59e863e60a7bb251b125cd7ce07a`

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

## Vercel & CI

This repo deploys the Next.js app (`app/packages/site`) on Vercel.

**Build Commands (via `vercel.json`):**
- Install: `corepack enable && corepack prepare pnpm@10.0.0 --activate && pnpm -w install --no-frozen-lockfile`
- Build: `pnpm -C app/packages/site build`

**Required Environment Variables**
Set these for **Preview** and **Production** in Vercel.

Public (safe to expose):
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_RPC`
- `NEXT_PUBLIC_INTENTS`
- `NEXT_PUBLIC_AGGREGATOR`
- `NEXT_PUBLIC_EXECUTOR`
- `NEXT_PUBLIC_ADAPTER`
- `NEXT_PUBLIC_TOKEN_IN`
- `NEXT_PUBLIC_TOKEN_OUT`
- `NEXT_PUBLIC_DEMO_MODE` (on/off)

Server-only (secrets):
- `SEPOLIA_RPC_URL`
- `EXECUTOR_KEY`
- `UNISWAP_ROUTER`
- `K_MIN`
- `TIME_WINDOW`

**CLI (optional):**
```bash
npm i -g vercel
vercel login
vercel link      # select the project
vercel env add <KEY>    # repeat for each key above (Preview & Production)
```

## Vercel Deploy (Monorepo)

**⚠️ Important:** Project Root Directory in Vercel settings must be: `app/packages/site`

Build & Output use `vercel.json` (already configured)

**Environment Variables (examples):**

Public (safe to expose):
- `NEXT_PUBLIC_CHAIN_ID=11155111`
- `NEXT_PUBLIC_RPC=https://sepolia.infura.io/v3/<YOUR_PROJECT_ID>`
- `NEXT_PUBLIC_INTENTS=0x...`
- `NEXT_PUBLIC_AGGREGATOR=0x...`
- `NEXT_PUBLIC_EXECUTOR=0x...`
- `NEXT_PUBLIC_ADAPTER=0x...`
- `NEXT_PUBLIC_TOKEN_IN=0x...`
- `NEXT_PUBLIC_TOKEN_OUT=0x...`
- `NEXT_PUBLIC_DEMO_MODE=on` (or off)

Server-only (Project → Settings → Environment Variables):
- `EXECUTOR_KEY=<private key>`
- `UNISWAP_ROUTER=0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3`
- `K_MIN=3, TIME_WINDOW=60`
- `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<YOUR_PROJECT_ID>`

**If Vercel shows "No Next.js version detected", verify:**
- ✅ `app/packages/site/package.json` has "next" dependency
- ✅ Project Root Directory is `app/packages/site`

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
