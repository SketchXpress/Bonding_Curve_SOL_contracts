'use client';

import React, { useState } from 'react';
import { useSellToken } from '@/hooks/useTransactions';

const SellTokenCard = () => {
  const [poolAddress, setPoolAddress] = useState('');
  const [amount, setAmount] = useState(5000000);
  const { sellToken, loading, error, txSignature } = useSellToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolAddress) {
      return;
    }
    await sellToken(poolAddress, amount);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Sell Token</h3>
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
        <div className="mb-4">
          <label htmlFor="sell-amount" className="block text-gray-700 mb-2">Amount:</label>
          <input
            type="number"
            id="sell-amount"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !poolAddress}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Sell Token'}
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

export default SellTokenCard;
