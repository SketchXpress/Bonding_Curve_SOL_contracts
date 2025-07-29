'use client';

import React, { useState } from 'react';
import { useMigrateToTensor } from '@/hooks/useMigrateToTensor';
import { PublicKey } from '@solana/web3.js';

const MigrateToTensorCard = () => {
  const [poolAddress, setPoolAddress] = useState('');
  const { migrateToTensor, isLoading, error } = useMigrateToTensor();
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolAddress) {
      return;
    }
    try {
      // The migration function expects a collection mint, but we need to derive it from pool address
      // For now, we'll assume the poolAddress is actually the collection mint
      const result = await migrateToTensor({ collectionMint: new PublicKey(poolAddress) });
      if (result) {
        setMigrationResult(result);
      }
    } catch (err) {
      console.error('Error migrating to Tensor:', err);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Migrate to Tensor</h3>
      <p className="mb-4 text-gray-700">
        Migrate your collection to Tensor marketplace when it reaches the $69k threshold.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="pool-address" className="block text-gray-700 mb-2">Pool Address:</label>
          <input
            type="text"
            id="pool-address"
            value={poolAddress}
            onChange={(e) => setPoolAddress(e.target.value)}
            placeholder="Enter pool address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !poolAddress}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Migrate to Tensor'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {migrationResult && (
        <div className="mt-4 text-green-600">
          Success! Migration completed with transaction: {migrationResult.slice(0, 8)}...{migrationResult.slice(-8)}
        </div>
      )}
    </div>
  );
};

export default MigrateToTensorCard;
