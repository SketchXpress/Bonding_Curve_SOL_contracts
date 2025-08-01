'use client';

import React, { useState } from 'react';
import { useMintNft } from '@/hooks/useNftTransactions';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@/utils/idl';

const CreateNftCard = () => {
  const [name, setName] = useState('My NFT');
  const [symbol, setSymbol] = useState('MNFT');
  const [uri, setUri] = useState('https://example.com/nft.json');
  const [collectionMintAddress, setCollectionMintAddress] = useState('');
  const { mintNft, loading, error, txSignature, nftMintAddress, escrowAddress } = useMintNft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!collectionMintAddress) {
      alert('Please enter a collection mint address');
      return;
    }
    
    // Derive pool address from collection mint
    try {
      const collectionMint = new PublicKey(collectionMintAddress);
      console.log('Collection mint address:', collectionMint.toString());
      
      const [poolAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve-pool'), collectionMint.toBuffer()],
        PROGRAM_ID // Use imported Program ID
      );
      
      console.log('Derived pool address:', poolAddress.toString());
      console.log('Attempting to mint NFT for pool:', poolAddress.toString());
      await mintNft(poolAddress.toString(), name, symbol, uri);
    } catch (error: any) {
      if (error.message && error.message.includes('Account does not exist')) {
        alert(`❌ Pool Not Found!\n\nThe bonding curve pool for collection ${collectionMintAddress} does not exist yet.\n\n✅ Solution: Create a pool first using the "Create Pool" card, then try minting NFTs.`);
      } else {
        alert('Error: ' + (error.message || 'Invalid collection mint address'));
      }
      console.error('Error:', error);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Mint NFT with TOE</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 mb-2">
          <strong>📋 Instructions:</strong>
        </p>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>First, create a bonding curve pool using the "Create Pool" card above</li>
          <li>Copy the collection mint address from the pool creation result</li>
          <li>Paste it below to mint NFTs for that collection</li>
        </ol>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Mint an NFT with a Token-Owned Escrow (TOE). The current price from the bonding curve will be locked in the NFT's escrow.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="collection-mint" className="block text-gray-700 mb-2">Collection Mint Address:</label>
          <input
            type="text"
            id="collection-mint"
            value={collectionMintAddress}
            onChange={(e) => setCollectionMintAddress(e.target.value)}
            placeholder="Paste collection mint address from pool creation result..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">The pool address will be derived automatically from the collection mint</p>
        </div>
        <div className="mb-4">
          <label htmlFor="nft-name" className="block text-gray-700 mb-2">Name:</label>
          <input
            type="text"
            id="nft-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="nft-symbol" className="block text-gray-700 mb-2">Symbol:</label>
          <input
            type="text"
            id="nft-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="nft-uri" className="block text-gray-700 mb-2">URI:</label>
          <input
            type="text"
            id="nft-uri"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Mint NFT'}
        </button>
      </form>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      {txSignature && nftMintAddress && (
        <div className="mt-4 text-green-600">
          <p>Success! Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}</p>
          <p>NFT Mint Address: {nftMintAddress}</p>
          {escrowAddress && <p>TOE Escrow Address: {escrowAddress}</p>}
        </div>
      )}
    </div>
  );
};

export default CreateNftCard;
