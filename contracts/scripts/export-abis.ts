import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("📦 Exporting contract ABIs to app directory...");

  // Define the contracts we want to export
  const contractsToExport = [
    "EncryptedDCAIntents",
    "BatchAggregator", 
    "DexAdapter",
    "DcaExecutor"
  ];

  // Source and destination directories
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const appAbiDir = path.join(__dirname, "..", "..", "app", "packages", "site", "src", "abi");

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(appAbiDir)) {
    fs.mkdirSync(appAbiDir, { recursive: true });
    console.log(`  📁 Created directory: ${appAbiDir}`);
  }

  let exportedCount = 0;

  for (const contractName of contractsToExport) {
    try {
      // Find the contract artifact file
      const contractFiles = findContractArtifact(artifactsDir, contractName);
      
      if (contractFiles.length === 0) {
        console.log(`  ⚠️  No artifact found for ${contractName}`);
        continue;
      }

      // Use the first found artifact
      const artifactPath = contractFiles[0];
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // Extract ABI
      const abi = artifact.abi;
      
      // Write ABI to destination
      const abiFileName = `${contractName}.json`;
      const abiFilePath = path.join(appAbiDir, abiFileName);
      
      fs.writeFileSync(abiFilePath, JSON.stringify(abi, null, 2));
      
      console.log(`  ✅ Exported ${contractName} ABI to ${abiFileName}`);
      exportedCount++;
      
    } catch (error) {
      console.error(`  ❌ Failed to export ${contractName}:`, error);
    }
  }

  console.log(`\n🎉 Successfully exported ${exportedCount} contract ABIs to ${appAbiDir}`);
}

function findContractArtifact(artifactsDir: string, contractName: string): string[] {
  const results: string[] = [];
  
  function searchDirectory(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        searchDirectory(fullPath);
      } else if (item === `${contractName}.json`) {
        results.push(fullPath);
      }
    }
  }
  
  searchDirectory(artifactsDir);
  return results;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI export failed:", error);
    process.exit(1);
  });

