import { createInstance, FhevmInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

// Singleton FHEVM instance for Sepolia
let fhevmInstance: FhevmInstance | null = null;

export async function getFhevm(): Promise<FhevmInstance> {
  if (!fhevmInstance) {
    fhevmInstance = await createInstance(SepoliaConfig);
  }
  return fhevmInstance;
}

// Export the getter function
export default getFhevm;
