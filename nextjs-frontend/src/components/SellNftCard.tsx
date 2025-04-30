
'use client';

import React, { useState } from 'react';
import { useSellNft } from '@/hooks/useNftTransactions';

const SellNftCard = () => {
  const [nftMintAddress, setNftMintAddress] = useState('');
  const [poolAddress, setPoolAddress] = useState('');
  const { sellNft, loading, error, txSignature } = useSellNft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nftMintAddress || !poolAddress) {
      alert('Please enter both NFT Mint Address and Pool Address');
      return;
    }
    
    await sellNft(nftMintAddress, poolAddress);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Sell NFT (Burn & Withdraw SOL)</h3>
      <p className="text-sm text-gray-600 mb-4">
        Sell (burn) an NFT you own and withdraw the SOL currently held in its Token-Owned Escrow (TOE), based on the bonding curve's sell price.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="sell-nft-mint" className="block text-gray-700 mb-2">NFT Mint Address:</label>
          <input
            type="text"
            id="sell-nft-mint"
            value={nftMintAddress}
            onChange={(e) => setNftMintAddress(e.target.value)}
            placeholder="Enter the mint address of the NFT to sell"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="sell-pool-address" className="block text-gray-700 mb-2">Pool Address:</label>
          <input
            type="text"
            id="sell-pool-address"
            value={poolAddress}
            onChange={(e) => setPoolAddress(e.target.value)}
            placeholder="Enter the associated bonding curve pool address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Sell NFT'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {txSignature && (
        <div className="mt-4 text-green-600">
          <p>Success! Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}</p>
          <p>NFT burned and SOL withdrawn to your wallet.</p>
        </div>
      )}
    </div>
  );
};

export default SellNftCard;

