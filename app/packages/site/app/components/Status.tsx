"use client";
import { useEffect, useState } from "react";
import { EXPLORER_URL } from "../../src/config";

interface StatusData {
  block: number;
  byK: boolean;
  byTime: boolean;
  aggregator: string;
  executor: string;
  error?: string;
}

export default function Status() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|undefined>();

  const fetchStatus = async () => {
    setErr(undefined);
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "status error");
      setStatus(j);
      setLoading(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to fetch");
      setStatus(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, []);

  const getStatusBadge = (ready: boolean) => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {ready ? 'Ready' : 'Not Ready'}
      </span>
    );
  };

  return (
    <div className="p-4 border rounded bg-white/50">
      <h3 className="font-semibold mb-2">Batch Status (Sepolia)</h3>
      
      {loading && <p className="text-gray-600">Loading...</p>}
      
      {err ? (
        <p className="text-red-600">Error: {err}</p>
      ) : status ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span>Ready by K:</span>
            {getStatusBadge(status.byK)}
          </div>
          <div className="flex items-center gap-2">
            <span>Ready by Time:</span>
            {getStatusBadge(status.byTime)}
          </div>
          
          {status.block && (
            <div className="text-sm text-gray-600">
              Block: {status.block.toLocaleString()}
            </div>
          )}
          
          <div className="text-sm space-y-1">
            <div>
              Aggregator: 
              <a 
                href={`${EXPLORER_URL}/address/${status.aggregator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                {status.aggregator.slice(0, 8)}...{status.aggregator.slice(-6)}
              </a>
            </div>
            <div>
              Executor: 
              <a 
                href={`${EXPLORER_URL}/address/${status.executor}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                {status.executor.slice(0, 8)}...{status.executor.slice(-6)}
              </a>
            </div>
          </div>
          

        </div>
      ) : null}
      
      <button 
        className="mt-3 px-3 py-2 rounded bg-black text-white hover:bg-gray-800" 
        onClick={fetchStatus}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Refresh Status'}
      </button>
    </div>
  );
}
