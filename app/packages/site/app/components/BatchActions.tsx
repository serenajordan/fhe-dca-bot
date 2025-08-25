"use client";
import { useState } from "react";
// EXPLORER_URL is used in the result display

interface ExecuteResponse {
  hash: string;
  explorerUrl: string;
  gasUsed: string;
  status: string;
  error?: string;
}

export default function BatchActions() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const r = await fetch("/api/execute", { method: "POST" });
      const j = await r.json();
      
      if (!r.ok) {
        throw new Error(j?.error || "Execute failed");
      }
      
      setResult(j);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to execute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white/50">
      <h3 className="font-semibold mb-2">Batch Actions</h3>
      
      <div className="flex gap-3">
        <button 
          className="px-3 py-2 rounded bg-gray-300 text-gray-600" 
          disabled
          title="Enqueue functionality not implemented for demo"
        >
          Enqueue
        </button>
        <button 
          className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50" 
          onClick={execute}
          disabled={loading}
        >
          {loading ? 'Executing...' : 'Execute (demo)'}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">Error: {error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm font-medium">✅ Transaction successful!</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Hash: 
              <a 
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                {result.hash.slice(0, 8)}...{result.hash.slice(-6)}
              </a>
            </p>
            <p>Gas used: {parseInt(result.gasUsed).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
