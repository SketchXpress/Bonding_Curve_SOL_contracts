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
    // Mock token mint addresses for testing purposes
    const realTokenMint = "11111111111111111111111111111111";
    const syntheticTokenMint = "22222222222222222222222222222222";
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
