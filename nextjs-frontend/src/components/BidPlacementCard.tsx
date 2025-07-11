import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBidPlacement } from '../hooks/useBidPlacement';
import { useBidListing } from '../hooks/useBidListing';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BidPlacementCardProps {
  nftMint: PublicKey;
  nftName: string;
  nftImage: string;
  listingPubkey: PublicKey;
  onBidPlaced?: (bidPubkey: PublicKey) => void;
}

interface BidListingData {
  nftMint: PublicKey;
  lister: PublicKey;
  originalMinter: PublicKey;
  minBid: number;
  highestBid: number;
  highestBidder: PublicKey | null;
  status: string;
  createdAt: number;
  expiresAt: number;
}

export const BidPlacementCard: React.FC<BidPlacementCardProps> = ({
  nftMint,
  nftName,
  nftImage,
  listingPubkey,
  onBidPlaced,
}) => {
  const { publicKey } = useWallet();
  const { placeBid, isLoading } = useBidPlacement();
  const { getBidListing } = useBidListing();
  
  const [bidAmount, setBidAmount] = useState<string>('');
  const [listingData, setListingData] = useState<BidListingData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const fetchListingData = async () => {
      try {
        const data = await getBidListing(listingPubkey);
        setListingData(data);
      } catch (error) {
        console.error('Error fetching listing data:', error);
      }
    };

    fetchListingData();
  }, [listingPubkey, getBidListing]);

  useEffect(() => {
    if (!listingData || listingData.expiresAt === 0) return;

    const updateTimeRemaining = () => {
      const now = Date.now() / 1000;
      const remaining = listingData.expiresAt - now;
      
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [listingData]);

  const handlePlaceBid = async () => {
    if (!publicKey || !bidAmount || !listingData) return;

    try {
      const bidAmountLamports = parseFloat(bidAmount) * LAMPORTS_PER_SOL;
      const bidId = Date.now(); // Simple bid ID generation
      
      const bidPubkey = await placeBid(
        nftMint,
        bidId,
        bidAmountLamports,
        24 // 24 hour bid duration
      );
      
      if (onBidPlaced && bidPubkey) {
        onBidPlaced(bidPubkey);
      }
      
      setBidAmount('');
      
      // Refresh listing data
      const updatedData = await getBidListing(listingPubkey);
      setListingData(updatedData);
    } catch (error) {
      console.error('Error placing bid:', error);
    }
  };

  const isValidBid = () => {
    if (!bidAmount || !listingData) return false;
    
    const bidAmountLamports = parseFloat(bidAmount) * LAMPORTS_PER_SOL;
    const minRequired = listingData.highestBid > 0 
      ? listingData.highestBid * 1.05 // 5% higher than current highest
      : listingData.minBid;
    
    return bidAmountLamports >= minRequired;
  };

  const getMinBidRequired = () => {
    if (!listingData) return 0;
    
    const minRequired = listingData.highestBid > 0 
      ? listingData.highestBid * 1.05 // 5% higher than current highest
      : listingData.minBid;
    
    return minRequired / LAMPORTS_PER_SOL;
  };

  if (!listingData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const isExpired = listingData.expiresAt > 0 && Date.now() / 1000 > listingData.expiresAt;
  const isOwnListing = publicKey && listingData.lister.equals(publicKey);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        <img
          src={nftImage}
          alt={nftName}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
          {isExpired ? 'Expired' : 'Active Listing'}
        </div>
        {timeRemaining && !isExpired && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
            {timeRemaining}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{nftName}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Min Bid:</span>
            <span className="font-medium">{(listingData.minBid / LAMPORTS_PER_SOL).toFixed(3)} SOL</span>
          </div>
          
          {listingData.highestBid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Highest Bid:</span>
              <span className="font-medium text-green-600">
                {(listingData.highestBid / LAMPORTS_PER_SOL).toFixed(3)} SOL
              </span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Original Minter:</span>
            <span className="font-mono text-xs">
              {listingData.originalMinter.toString().slice(0, 8)}...
            </span>
          </div>
        </div>

        {!publicKey ? (
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <p className="text-gray-600 text-sm">Connect wallet to place bid</p>
          </div>
        ) : isOwnListing ? (
          <div className="bg-yellow-100 rounded-lg p-3 text-center">
            <p className="text-yellow-800 text-sm">You cannot bid on your own listing</p>
          </div>
        ) : isExpired ? (
          <div className="bg-red-100 rounded-lg p-3 text-center">
            <p className="text-red-800 text-sm">This listing has expired</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Bid (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min={getMinBidRequired()}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Min: ${getMinBidRequired().toFixed(3)} SOL`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum required: {getMinBidRequired().toFixed(3)} SOL
              </p>
            </div>

            <button
              onClick={handlePlaceBid}
              disabled={isLoading || !isValidBid()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Placing Bid...' : 'Place Bid'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

