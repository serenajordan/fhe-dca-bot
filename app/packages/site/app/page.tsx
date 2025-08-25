import Status from './components/Status';
import BatchActions from './components/BatchActions';
import DCAForm from './components/DCAForm';

export default function Home() {
  return (
    <main className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-semibold">fhEVM DCA Bot (Sepolia - FHE)</h1>
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'on' && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Demo Mode</span>
        )}
      </div>
      <p className="text-gray-600 mt-2">
        Create encrypted DCA intents and execute batch operations with real FHE on Sepolia testnet
      </p>
      
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <Status />
        <BatchActions />
      </div>
      
      <div className="mt-6">
        <DCAForm />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Create encrypted DCA intents with real FHE encryption</li>
          <li>• Monitor batch status (Ready by K-anonymity or Time window)</li>
          <li>• Execute batches with automatic decryption of encrypted amounts</li>
          <li>• View transaction details and gas usage</li>
          <li>• Check contract addresses on Etherscan</li>
        </ul>
      </div>
    </main>
  );
}
