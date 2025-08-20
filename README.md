# fhe-dca-bot

A fully homomorphic encryption (FHE) enabled Dollar Cost Averaging (DCA) trading bot built with Zama's fhEVM technology.

## 🚀 Quickstart

1. **Clone and setup**
   ```bash
   git clone <your-repo-url>
   cd fhe-dca-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install:all
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development**
   ```bash
   # Terminal 1: Start local blockchain
   pnpm dev:node
   
   # Terminal 2: Start frontend
   pnpm dev:app
   ```

## 📁 Project Structure

```
fhe-dca-bot/
├── contracts/          # fhEVM + Hardhat project
├── app/               # React frontend using Zama's template
├── scripts/           # helper scripts and simulations
├── docs/              # documentation
└── package.json       # pnpm workspaces configuration
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `pnpm install:all` | Install dependencies for all workspaces |
| `pnpm build` | Build contracts and frontend |
| `pnpm dev:node` | Start local Hardhat node |
| `pnpm dev:app` | Start React development server |

### Individual Workspace Commands

**Contracts:**
```bash
pnpm -C contracts compile
pnpm -C contracts test
pnpm -C contracts deploy
```

**Frontend:**
```bash
pnpm -C app dev
pnpm -C app build
pnpm -C app preview
```

## 🔐 Security Notes

⚠️ **Do not commit secrets!**

- Never commit your `.env` file
- Never commit private keys or API keys
- Use `.env.example` as a template for required environment variables
- Keep your private keys secure and separate from the codebase

## 🧪 Testing

```bash
# Test contracts
pnpm -C contracts test

# Test frontend
pnpm -C app test
```

## 📚 Documentation

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [React Documentation](https://react.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Zama AI](https://zama.ai/)
- [fhEVM Documentation](https://docs.zama.ai/fhevm/)
- [Project Repository](https://github.com/your-username/fhe-dca-bot)
