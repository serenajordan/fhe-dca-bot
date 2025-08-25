import BatchActions from './components/BatchActions';
import Status from './components/Status';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">fhEVM DCA Bot (Sepolia)</h1>
      <p className="text-gray-600 mt-2">
        Monitor batch status and execute DCA operations on Sepolia testnet
      </p>
      
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <Status />
        <BatchActions />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Monitor batch status (Ready by K-anonymity or Time window)</li>
          <li>• Execute batches when ready using the &quot;Execute (demo)&quot; button</li>
          <li>• View transaction details and gas usage</li>
          <li>• Check contract addresses on Etherscan</li>
        </ul>
      </div>
    </main>
  );
}
