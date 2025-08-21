const { HDNodeWallet } = require('ethers');

// Hardhat's default mnemonic:
const m = 'test test test test test test test test test test test junk';

console.log("🔑 Hardhat Local Accounts & Private Keys");
console.log("========================================");
console.log("Mnemonic:", m);
console.log("");

for (let i = 0; i < 10; i++) {
  const w = HDNodeWallet.fromPhrase(m, `m/44'/60'/0'/0/${i}`);
  console.log(`${i}: ${w.address} ${w.privateKey}`);
}

console.log("");
console.log("💡 Usage:");
console.log("  - Copy private keys for testing");
console.log("  - Use addresses for contract interactions");
console.log("  - Account 0 is typically the deployer");
console.log("  - Accounts 1-9 are available for testing");
