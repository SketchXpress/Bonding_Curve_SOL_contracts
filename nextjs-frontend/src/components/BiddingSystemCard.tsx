'use client';

import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useBidListing } from '@/hooks/useBidListing';
import { useBidPlacement } from '@/hooks/useBidPlacement';
import { useBidManagement } from '@/hooks/useBidManagement';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BiddingSystemCardProps {
  className?: string;
}

interface NFTListing {
  address: string;
  nftMint: string;
  minBid: number;
  highestBid: number;
  highestBidder: string | null;
  status: string;
  expiresAt: number;
  lister: string;
}

interface BidInfo {
  bidId: number;
  amount: number;
  bidder: string;
  status: string;
  createdAt: number;
  expiresAt: number;
}

export const BiddingSystemCard: React.FC<BiddingSystemCardProps> = ({ className = '' }) => {
  const { publicKey } = useWallet();
  const { listForBids, getBidListing, cancelListing, isLoading: listingLoading } = useBidListing();
  const { placeBid, getBidsForNft, isLoading: bidLoading } = useBidPlacement();
  const { acceptBid, cancelBid: cancelBidManagement, isLoading: managementLoading } = useBidManagement();
  
  // Form states
  const [nftMint, setNftMint] = useState('');
  const [minBid, setMinBid] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [searchMint, setSearchMint] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  
  // Data states
  const [currentListing, setCurrentListing] = useState<NFTListing | null>(null);
  const [listingBids, setListingBids] = useState<BidInfo[]>([]);
  const [userListings, setUserListings] = useState<NFTListing[]>([]);
  const [userBids, setUserBids] = useState<BidInfo[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'create' | 'browse' | 'manage' | 'mybids'>('browse');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  const isLoading = listingLoading || bidLoading || managementLoading;

  // Clear messages when tab changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab]);

  // Fetch user data when tab changes
  useEffect(() => {
    if (publicKey) {
      if (activeTab === 'manage') {
        fetchUserListings();
      } else if (activeTab === 'mybids') {
        fetchUserBids();
      }
    }
  }, [publicKey, activeTab]);

  const fetchUserListings = async () => {
    // This would fetch all listings created by the user
    // For now, we'll implement a placeholder
    try {
      setUserListings([]);
    } catch (err) {
      console.error('Error fetching user listings:', err);
    }
  };

  const fetchUserBids = async () => {
    if (!publicKey) return;
    
    try {
      // This would fetch all bids placed by the user
      setUserBids([]);
    } catch (err) {
      console.error('Error fetching user bids:', err);
    }
  };

  const handleCreateListing = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!nftMint || !minBid) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const nftMintPubkey = new PublicKey(nftMint);
      const minBidLamports = parseFloat(minBid) * LAMPORTS_PER_SOL;
      const duration = parseInt(durationHours);

      const listingPubkey = await listForBids(
        nftMintPubkey,
        minBidLamports,
        duration
      );

      setSuccess(`✅ Listing created successfully! Others can now bid on your NFT.`);
      setNftMint('');
      setMinBid('');
      setDurationHours('24');
    } catch (err) {
      console.error('Error creating listing:', err);
      if (err instanceof Error && err.message.includes('cannot be listed')) {
        setError(err.message);
      } else {
        setError('Failed to create listing. Make sure you own the NFT and it was minted through the bonding curve system.');
      }
    }
  };

  const handleSearchListing = async () => {
    if (!searchMint) {
      setError('Please enter an NFT mint address');
      return;
    }

    setLoadingListing(true);
    setError(null);

    try {
      const nftMintPubkey = new PublicKey(searchMint);
      
      // Derive the bid listing PDA
      const [bidListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMintPubkey.toBuffer()],
        new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa')
      );

      const listingData = await getBidListing(bidListingPda);
      const bids = await getBidsForNft(nftMintPubkey);

      if (listingData) {
        setCurrentListing({
          address: bidListingPda.toString(),
          nftMint: searchMint,
          minBid: listingData.minBid / LAMPORTS_PER_SOL,
          highestBid: listingData.highestBid / LAMPORTS_PER_SOL,
          highestBidder: listingData.highestBidder?.toString() || null,
          status: Object.keys(listingData.status)[0],
          expiresAt: listingData.expiresAt,
          lister: listingData.lister.toString(),
        });
        setListingBids(bids);
      } else {
        setCurrentListing(null);
        setError('No active listing found for this NFT');
      }
    } catch (err) {
      console.error('Error searching listing:', err);
      setError('Failed to find listing for this NFT');
      setCurrentListing(null);
    } finally {
      setLoadingListing(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!publicKey || !currentListing || !bidAmount) {
      setError('Please fill in all required fields');
      return;
    }

    if (currentListing.lister === publicKey.toString()) {
      setError('You cannot bid on your own listing');
      return;
    }

    try {
      setError(null);
      
      const nftMintPubkey = new PublicKey(currentListing.nftMint);
      const bidAmountLamports = parseFloat(bidAmount) * LAMPORTS_PER_SOL;
      
      await placeBid(nftMintPubkey, bidAmountLamports, 24);
      
      setSuccess('✅ Bid placed successfully!');
      setBidAmount('');
      
      // Refresh the listing data
      await handleSearchListing();
    } catch (err) {
      console.error('Error placing bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!currentListing) return;
    
    try {
      const nftMintPubkey = new PublicKey(currentListing.nftMint);
      
      // Derive the bid listing PDA
      const [bidListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMintPubkey.toBuffer()],
        new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa')
      );
      
      // Derive the bid PDA (we need the bidder's pubkey for this)
      // For now, we'll need to get this from the bid data
      const bids = await getBidsForNft(nftMintPubkey);
      const targetBid = bids.find((bid: any) => bid.bidId === bidId);
      
      if (!targetBid) {
        throw new Error('Bid not found');
      }
      
      const [bidPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          bidListingPda.toBuffer(),
          new PublicKey(targetBid.bidder).toBuffer()
        ],
        new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa')
      );
      
      await acceptBid(bidListingPda, bidPda, bidId);
      setSuccess('✅ Bid accepted successfully!');
      
      // Refresh the listing data
      await handleSearchListing();
    } catch (err) {
      console.error('Error accepting bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept bid');
    }
  };

  const handleCancelBid = async (bidId: number) => {
    if (!currentListing) return;
    
    try {
      const nftMintPubkey = new PublicKey(currentListing.nftMint);
      
      // Derive the bid listing PDA
      const [bidListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMintPubkey.toBuffer()],
        new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa')
      );
      
      // Derive the bid PDA
      const bids = await getBidsForNft(nftMintPubkey);
      const targetBid = bids.find((bid: any) => bid.bidId === bidId);
      
      if (!targetBid) {
        throw new Error('Bid not found');
      }
      
      const [bidPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          bidListingPda.toBuffer(),
          new PublicKey(targetBid.bidder).toBuffer()
        ],
        new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa')
      );
      
      await cancelBidManagement(bidPda, bidId);
      setSuccess('✅ Bid cancelled successfully!');
      
      // Refresh the listing data
      await handleSearchListing();
    } catch (err) {
      console.error('Error cancelling bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel bid');
    }
  };

  const isValidBid = () => {
    if (!bidAmount || !currentListing) return false;
    
    const bidAmountSOL = parseFloat(bidAmount);
    const minRequired = currentListing.highestBid > 0 
      ? currentListing.highestBid * 1.05 // 5% higher than current highest
      : currentListing.minBid;
    
    return bidAmountSOL >= minRequired;
  };

  const getMinBidRequired = () => {
    if (!currentListing) return 0;
    
    return currentListing.highestBid > 0 
      ? currentListing.highestBid * 1.05 // 5% higher than current highest
      : currentListing.minBid;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const formatTimeRemaining = (expiresAt: number) => {
    if (expiresAt === 0) return 'No expiry';
    
    const now = Date.now() / 1000;
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m remaining`;
    } else {
      return 'Less than 1m remaining';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 pt-6">
          {[
            { key: 'browse', label: 'Browse & Bid' },
            { key: 'create', label: 'Create Listing' },
            { key: 'manage', label: 'My Listings' },
            { key: 'mybids', label: 'My Bids' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Browse & Bid Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Browse NFT Listings</h2>
              <p className="text-gray-600 mb-4">
                Search for NFT listings and place your bids
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchMint}
                onChange={(e) => setSearchMint(e.target.value)}
                placeholder="Enter NFT mint address to search for listings"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearchListing}
                disabled={loadingListing}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loadingListing ? 'Searching...' : 'Search'}
              </button>
            </div>

            {currentListing && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">NFT Listing Found</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentListing.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentListing.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">NFT Mint:</span>
                      <p className="font-mono text-xs break-all">{currentListing.nftMint}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Lister:</span>
                      <p className="font-mono text-xs">{formatAddress(currentListing.lister)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Time Remaining:</span>
                      <p className="text-sm">{formatTimeRemaining(currentListing.expiresAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">Min Bid:</span>
                      <p className="font-bold text-blue-600">{currentListing.minBid.toFixed(3)} SOL</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Highest Bid:</span>
                      <p className="font-bold text-green-600">
                        {currentListing.highestBid > 0 ? `${currentListing.highestBid.toFixed(3)} SOL` : 'No bids yet'}
                      </p>
                    </div>
                    {currentListing.highestBidder && (
                      <div>
                        <span className="text-gray-600">Highest Bidder:</span>
                        <p className="font-mono text-xs">{formatAddress(currentListing.highestBidder)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Place Bid Section */}
                {publicKey && currentListing.lister !== publicKey.toString() && currentListing.status === 'Active' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium mb-3">Place Your Bid</h4>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Min: ${getMinBidRequired().toFixed(3)} SOL`}
                        step="0.001"
                        min={getMinBidRequired()}
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handlePlaceBid}
                        disabled={!isValidBid() || isLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                      >
                        {isLoading ? 'Placing...' : 'Place Bid'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum required: {getMinBidRequired().toFixed(3)} SOL
                    </p>
                  </div>
                )}

                {/* Bid History */}
                {listingBids.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium mb-3">Bid History ({listingBids.length} bids)</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {listingBids
                        .sort((a, b) => b.amount - a.amount)
                        .map((bid, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white p-3 rounded border">
                          <div className="flex-1">
                            <span className="font-mono text-xs">{formatAddress(bid.bidder)}</span>
                            <p className="text-xs text-gray-500">{formatTime(bid.createdAt)}</p>
                          </div>
                          <div className="text-center">
                            <span className="font-bold text-lg">{(bid.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              bid.status === 'Active' ? 'bg-green-100 text-green-800' :
                              bid.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {bid.status}
                            </span>
                            {/* Action buttons for listing owner */}
                            {publicKey && currentListing.lister === publicKey.toString() && bid.status === 'Active' && (
                              <button
                                onClick={() => handleAcceptBid(bid.bidId)}
                                disabled={isLoading}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Accept
                              </button>
                            )}
                            {/* Cancel button for bidder */}
                            {publicKey && bid.bidder === publicKey.toString() && bid.status === 'Active' && (
                              <button
                                onClick={() => handleCancelBid(bid.bidId)}
                                disabled={isLoading}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Listing Tab */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create NFT Bid Listing</h2>
              <p className="text-gray-600 mb-4">
                List your NFT for bidding to allow others to place bids
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                NFT Mint Address *
              </label>
              <input
                type="text"
                value={nftMint}
                onChange={(e) => setNftMint(e.target.value)}
                placeholder="Enter the mint address of your NFT"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">You must own this NFT to create a listing</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Minimum Bid (SOL) *
              </label>
              <input
                type="number"
                value={minBid}
                onChange={(e) => setMinBid(e.target.value)}
                placeholder="0.1"
                step="0.001"
                min="0"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">The minimum amount bidders must bid</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Listing Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (Recommended)</option>
                <option value="48">48 Hours</option>
                <option value="72">72 Hours</option>
                <option value="168">7 Days</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How long the listing will accept bids</p>
            </div>

            <button
              onClick={handleCreateListing}
              disabled={isLoading || !publicKey}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating Listing...' : 'Create Bid Listing'}
            </button>
          </div>
        )}

        {/* My Listings Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">My NFT Listings</h2>
              <p className="text-gray-600 mb-4">
                Manage your active bid listings and accept bids
              </p>
            </div>

            {userListings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <p className="text-gray-600 text-lg">No active listings found</p>
                <p className="text-gray-500 mb-4">Create your first listing to start receiving bids</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Listing
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userListings.map((listing, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <p className="font-mono text-sm">{formatAddress(listing.nftMint)}</p>
                        <div className="flex gap-4 text-sm">
                          <span>Min Bid: <strong>{listing.minBid.toFixed(3)} SOL</strong></span>
                          {listing.highestBid > 0 && (
                            <span className="text-green-600">
                              Highest Bid: <strong>{listing.highestBid.toFixed(3)} SOL</strong>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatTimeRemaining(listing.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          listing.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {listing.status}
                        </span>
                        {listing.status === 'Active' && (
                          <button
                            onClick={() => {/* Implement cancel listing */}}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            disabled={isLoading}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Bids Tab */}
        {activeTab === 'mybids' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">My Bids</h2>
              <p className="text-gray-600 mb-4">
                Track all the bids you've placed on NFTs
              </p>
            </div>

            {userBids.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-6xl mb-4">💰</div>
                <p className="text-gray-600 text-lg">No bids placed yet</p>
                <p className="text-gray-500 mb-4">Browse NFT listings to place your first bid</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Browse Listings
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                        {userBids.map((bid, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <p className="text-sm text-gray-600">NFT: <span className="font-mono">{formatAddress(bid.bidder)}</span></p>
                                <div className="flex gap-4 text-sm">
                                  <span>Bid Amount: <strong className="text-blue-600">{(bid.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL</strong></span>
                                  <span>Placed: {formatTime(bid.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Expires: {formatTime(bid.expiresAt)}
                                </p>
                              </div>
                              <div className="flex gap-2 items-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  bid.status === 'Active' ? 'bg-green-100 text-green-800' :
                                  bid.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {bid.status}
                                </span>
                                {bid.status === 'Active' && (
                                  <button
                                    onClick={() => handleCancelBid(bid.bidId)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    disabled={isLoading}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
              </div>
            )}
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <div className="flex">
              <div className="text-red-600 text-xl mr-2">⚠️</div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3">📖 How the Bidding System Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h5 className="font-medium mb-2">🎯 For Sellers (Listing):</h5>
              <ul className="space-y-1 list-disc list-inside">
                <li>You must own the NFT to create a listing</li>
                <li>Set a minimum bid amount in SOL</li>
                <li>Choose how long the listing stays active</li>
                <li>Accept the best bid or let it expire</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">💰 For Buyers (Bidding):</h5>
              <ul className="space-y-1 list-disc list-inside">
                <li>Search for NFTs you want to bid on</li>
                <li>Place bids above the minimum amount</li>
                <li>Each new bid must be 5% higher than current highest</li>
                <li>Your SOL is held in escrow until bid is resolved</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
