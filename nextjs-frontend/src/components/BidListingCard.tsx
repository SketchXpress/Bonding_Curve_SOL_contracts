import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBidListing } from '../hooks/useBidListing';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BidListingCardProps {
  nftMint: PublicKey;
  nftName: string;
  nftImage: string;
  onListingCreated?: (listingPubkey: PublicKey) => void;
}

export const BidListingCard: React.FC<BidListingCardProps> = ({
  nftMint,
  nftName,
  nftImage,
  onListingCreated,
}) => {
  const { publicKey } = useWallet();
  const { listForBids, isLoading } = useBidListing();
  
  const [minBid, setMinBid] = useState<string>('');
  const [duration, setDuration] = useState<number>(24);
  const [showForm, setShowForm] = useState(false);

  const handleListForBids = async () => {
    if (!publicKey || !minBid) return;

    try {
      const minBidLamports = parseFloat(minBid) * LAMPORTS_PER_SOL;
      const listingPubkey = await listForBids(
        nftMint,
        minBidLamports,
        duration > 0 ? duration : undefined
      );
      
      if (onListingCreated && listingPubkey) {
        onListingCreated(listingPubkey);
      }
      
      setShowForm(false);
      setMinBid('');
      setDuration(24);
    } catch (error) {
      console.error('Error listing NFT for bids:', error);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-600">Connect wallet to list NFT for bids</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        <img
          src={nftImage}
          alt={nftName}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          List for Bids
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{nftName}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Mint: {nftMint.toString().slice(0, 8)}...
        </p>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            List for Bids
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Bid (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={minBid}
                onChange={(e) => setMinBid(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (hours)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>7 days</option>
                <option value={0}>No expiry</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleListForBids}
                disabled={isLoading || !minBid}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Listing...' : 'Create Listing'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

