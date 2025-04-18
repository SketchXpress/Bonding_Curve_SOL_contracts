'use client';

import React, { useState } from 'react';
import { useCreateUser } from '@/hooks/useTransactions';

const CreateUserCard = () => {
  const [maxNfts, setMaxNfts] = useState(5);
  const { createUser, loading, error, txSignature } = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser();
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Create User</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="max-nfts" className="block text-gray-700 mb-2">Max NFTs:</label>
          <input
            type="number"
            id="max-nfts"
            value={maxNfts}
            onChange={(e) => setMaxNfts(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Create User'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {txSignature && (
        <div className="mt-4 text-green-600">
          Success! Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
        </div>
      )}
    </div>
  );
};

export default CreateUserCard;
