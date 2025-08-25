import { ethers } from "hardhat";
async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deployer:", await signer.getAddress());
}
main().catch((e)=>{ console.error(e); process.exit(1); });

