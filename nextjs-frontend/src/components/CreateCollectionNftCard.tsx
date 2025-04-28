'use client';

import React, { useState } from 'react';
import { useCreateCollectionNft } from '@/hooks/useTransactions';

const CreateCollectionNftCard = () => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [uri, setUri] = useState('');
  const { createCollectionNft, loading, error, txSignature, collectionMintAddress } = useCreateCollectionNft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !symbol || !uri) {
      return;
    }

    await createCollectionNft(name, symbol, uri);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Create Collection NFT</h3>
      <p className="text-sm text-gray-600 mb-4">Create a new Metaplex Collection NFT. This will be the parent NFT for your collection.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="collection-name" className="block text-gray-700 mb-2">Collection Name:</label>
          <input
            type="text"
            id="collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Awesome Collection"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="collection-symbol" className="block text-gray-700 mb-2">Collection Symbol:</label>
          <input
            type="text"
            id="collection-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g., MYAC"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="collection-uri" className="block text-gray-700 mb-2">Metadata URI:</label>
          <input
            type="text"
            id="collection-uri"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="e.g., https://arweave.net/your_metadata_hash.json"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
           <p className="text-xs text-gray-500 mt-1">Link to the JSON file containing your collection's metadata.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Create Collection NFT'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {txSignature && collectionMintAddress && (
        <div className="mt-4 text-green-600">
          <p>Success! Transaction: <span className="font-mono text-xs">{txSignature.slice(0, 8)}...{txSignature.slice(-8)}</span></p>
          <p>Collection Mint Address: <span className="font-mono text-xs">{collectionMintAddress}</span></p>
          <p className="text-sm text-gray-700 mt-1">Copy this address to use when creating the Bonding Curve Pool.</p>
        </div>
      )}
    </div>
  );
};

export default CreateCollectionNftCard;
