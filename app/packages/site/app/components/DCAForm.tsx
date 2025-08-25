"use client";
import { useState } from "react";

interface IntentResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  status: string;
  encryptedParams?: unknown;
}

interface DCAFormProps {
  onIntentCreated?: (result: IntentResult) => void;
}

export default function DCAForm({ onIntentCreated }: DCAFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntentResult | null>(null);

  const [formData, setFormData] = useState({
    budget: "1000000", // 1 USDC (6 decimals)
    perBuy: "100000",  // 0.1 USDC per buy
    durationSec: "86400", // 24 hours
    freqSec: "3600"    // 1 hour frequency
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Validate inputs
    const budget = parseInt(formData.budget);
    const perBuy = parseInt(formData.perBuy);
    const durationSec = parseInt(formData.durationSec);
    const freqSec = parseInt(formData.freqSec);

    if (budget <= 0 || perBuy <= 0 || durationSec <= 0 || freqSec <= 0) {
      setError('All values must be positive integers');
      setLoading(false);
      return;
    }

    if (perBuy > budget) {
      setError('Per buy amount cannot exceed total budget');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create intent');
      }

      setResult(data);
      onIntentCreated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create intent');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="p-4 border rounded bg-white/50">
      <h3 className="font-semibold mb-4">Create DCA Intent (FHE)</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Total Budget (USDC - 6 decimals)
          </label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1000000"
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Example: 1000000 = 1 USDC
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Per Buy Amount (USDC - 6 decimals)
          </label>
          <input
            type="number"
            name="perBuy"
            value={formData.perBuy}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100000"
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Example: 100000 = 0.1 USDC per buy
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            name="durationSec"
            value={formData.durationSec}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="86400"
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Example: 86400 = 24 hours
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Frequency (seconds)
          </label>
          <input
            type="number"
            name="freqSec"
            value={formData.freqSec}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="3600"
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Example: 3600 = 1 hour
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Intent...
            </>
          ) : (
            'Create Encrypted Intent'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm font-medium">✅ Intent created successfully!</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Transaction: 
              <a 
                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                {result.txHash.slice(0, 8)}...{result.txHash.slice(-6)}
              </a>
            </p>
            <p>Block: {result.blockNumber.toLocaleString()}</p>
            <p>Gas used: {parseInt(result.gasUsed).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
