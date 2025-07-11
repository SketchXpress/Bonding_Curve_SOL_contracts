import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBidManagement } from '../hooks/useBidManagement';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BidData {
  bidId: number;
  nftMint: PublicKey;
  bidder: PublicKey;
  amount: number;
  status: string;
  createdAt: number;
  expiresAt: number;
}

interface BidManagementCardProps {
  userBids: BidData[];
  userListings: any[];
  onBidCancelled?: (bidId: number) => void;
  onBidAccepted?: (bidId: number) => void;
}

export const BidManagementCard: React.FC<BidManagementCardProps> = ({
  userBids,
  userListings,
  onBidCancelled,
  onBidAccepted,
}) => {
  const { publicKey } = useWallet();
  const { cancelBid, acceptBid, isLoading } = useBidManagement();
  
  const [activeTab, setActiveTab] = useState<'bids' | 'listings'>('bids');
  const [loadingBidId, setLoadingBidId] = useState<number | null>(null);

  const handleCancelBid = async (bidId: number) => {
    if (!publicKey) return;

    try {
      setLoadingBidId(bidId);
      await cancelBid(bidId);
      
      if (onBidCancelled) {
        onBidCancelled(bidId);
      }
    } catch (error) {
      console.error('Error cancelling bid:', error);
    } finally {
      setLoadingBidId(null);
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!publicKey) return;

    try {
      setLoadingBidId(bidId);
      await acceptBid(bidId);
      
      if (onBidAccepted) {
        onBidAccepted(bidId);
      }
    } catch (error) {
      console.error('Error accepting bid:', error);
    } finally {
      setLoadingBidId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'outbid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    if (expiresAt === 0) return 'No expiry';
    
    const now = Date.now() / 1000;
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">Connect wallet to manage your bids and listings</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('bids')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
              activeTab === 'bids'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Bids ({userBids.length})
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
              activeTab === 'listings'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Listings ({userListings.length})
          </button>
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'bids' ? (
          <div className="space-y-4">
            {userBids.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bids placed yet</p>
            ) : (
              userBids.map((bid) => (
                <div key={bid.bidId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Bid #{bid.bidId}
                      </h4>
                      <p className="text-sm text-gray-600">
                        NFT: {bid.nftMint.toString().slice(0, 8)}...
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bid.status)}`}>
                      {bid.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="font-medium">{(bid.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time Remaining</p>
                      <p className="font-medium">{formatTimeRemaining(bid.expiresAt)}</p>
                    </div>
                  </div>

                  {bid.status.toLowerCase() === 'active' && (
                    <button
                      onClick={() => handleCancelBid(bid.bidId)}
                      disabled={loadingBidId === bid.bidId}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      {loadingBidId === bid.bidId ? 'Cancelling...' : 'Cancel Bid'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {userListings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active listings</p>
            ) : (
              userListings.map((listing) => (
                <div key={listing.nftMint.toString()} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {listing.nftName || 'NFT Listing'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        NFT: {listing.nftMint.toString().slice(0, 8)}...
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                      {listing.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Min Bid</p>
                      <p className="font-medium">{(listing.minBid / LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Highest Bid</p>
                      <p className="font-medium">
                        {listing.highestBid > 0 
                          ? `${(listing.highestBid / LAMPORTS_PER_SOL).toFixed(3)} SOL`
                          : 'No bids yet'
                        }
                      </p>
                    </div>
                  </div>

                  {listing.highestBid > 0 && listing.status.toLowerCase() === 'active' && (
                    <div className="space-y-2">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <strong>Highest Bidder:</strong> {listing.highestBidder?.toString().slice(0, 8)}...
                        </p>
                        <p className="text-sm text-green-800">
                          <strong>Amount:</strong> {(listing.highestBid / LAMPORTS_PER_SOL).toFixed(3)} SOL
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleAcceptBid(listing.highestBidId)}
                        disabled={loadingBidId === listing.highestBidId}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        {loadingBidId === listing.highestBidId ? 'Accepting...' : 'Accept Highest Bid'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

