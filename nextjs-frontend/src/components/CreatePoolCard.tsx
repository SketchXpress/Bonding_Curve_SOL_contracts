'use client';

import React, { useState } from 'react';
import { useCreatePool } from '@/hooks/useTransactions';

const CreatePoolCard = () => {
  const [basePrice, setBasePrice] = useState(1000000);
  const [growthFactor, setGrowthFactor] = useState(3606);
  const { createPool, loading, error, txSignature } = useCreatePool();
  const [poolAddress, setPoolAddress] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Using valid Solana token mint addresses in base58 format
    // For real token mint, using wrapped SOL token mint address
    const realTokenMint = "So11111111111111111111111111111111111111112";
    
    // For synthetic token mint, we don't need to provide an actual address
    // The contract will create it as a PDA derived from the real token mint
    // But we need to provide a valid public key format for the frontend validation
    // Using a different known token address for demonstration
    const syntheticTokenMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    
    const result = await createPool(basePrice, growthFactor, realTokenMint, syntheticTokenMint);
    if (result) {
      setPoolAddress("Generated Pool Address"); // In a real implementation, we would get this from the transaction result
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Create Pool</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="base-price" className="block text-gray-700 mb-2">Base Price:</label>
          <input
            type="number"
            id="base-price"
            value={basePrice}
            onChange={(e) => setBasePrice(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="growth-factor" className="block text-gray-700 mb-2">Growth Factor:</label>
          <input
            type="number"
            id="growth-factor"
            value={growthFactor}
            onChange={(e) => setGrowthFactor(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Create Pool'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {txSignature && poolAddress && (
        <div className="mt-4 text-green-600">
          <p>Success! Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}</p>
          <p>Pool Address: {poolAddress}</p>
        </div>
      )}
    </div>
  );
};

export default CreatePoolCard;
