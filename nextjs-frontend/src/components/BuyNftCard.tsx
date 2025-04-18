'use client';

import React, { useState } from 'react';
import { useBuyNft } from '@/hooks/useNftTransactions';

const BuyNftCard = () => {
  const [nftMintAddress, setNftMintAddress] = useState('');
  const { buyNft, loading, error, txSignature } = useBuyNft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nftMintAddress) {
      return;
    }
    await buyNft(nftMintAddress);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Buy NFT</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="nft-mint" className="block text-gray-700 mb-2">NFT Mint Address:</label>
          <input
            type="text"
            id="nft-mint"
            value={nftMintAddress}
            onChange={(e) => setNftMintAddress(e.target.value)}
            placeholder="Enter NFT mint address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !nftMintAddress}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Buy NFT'}
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

export default BuyNftCard;
