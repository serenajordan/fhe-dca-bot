// Environment validation utility
export function validateEnv() {
  // Server-side only variables (never exposed to client)
  const serverRequired = {
    EXECUTOR_KEY: process.env.EXECUTOR_KEY,
    SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  };

  // Public variables (safe for client)
  const publicRequired = {
    NEXT_PUBLIC_RPC: process.env.NEXT_PUBLIC_RPC,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  };

  const missingServer = Object.entries(serverRequired)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const missingPublic = Object.entries(publicRequired)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingServer.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missingServer.join(', ')}\n` +
      'These are server-side only and should be set in Vercel dashboard.'
    );
  }

  if (missingPublic.length > 0) {
    throw new Error(
      `Missing required public environment variables: ${missingPublic.join(', ')}\n` +
      'These can be set in .env.local or Vercel dashboard.'
    );
  }
}

// Validate environment on import (only in production)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw error;
  }
}
