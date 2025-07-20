/**
 * marketplace.tsx
 * Main marketplace component for NFT trading with bidding functionality
 * 
 * This component provides three main views:
 * 1. Browse - Shows all listed NFTs available for bidding
 * 2. My NFTs - Displays user's owned NFTs that can be listed
 * 3. My Activity - Shows user's active bids and listings
 */

import React, { useState, useEffect } from 'react';
// Wallet integration hooks and components
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';

// NFT utility functions for fetching token data
import { getTokensByOwner, getAllListedNFTs } from '../utils/nft';

// Component imports for different marketplace features
import { BidListingCard } from '../components/BidListingCard';      // For creating new listings
import { BidPlacementCard } from '../components/BidPlacementCard';  // For placing bids on NFTs
import { BidManagementCard } from '../components/BidManagementCard'; // For managing bids/listings

// Custom hooks for bid and listing management
import { useBidListing } from '../hooks/useBidListing';     // Handles listing creation and management
import { useBidPlacement } from '../hooks/useBidPlacement'; // Handles bid placement and management

// Type definitions for marketplace entities
import { NFTMetadata, Listing, BidData } from '../types/marketplace';

/**
 * MarketplacePage Component
 * Main component for the NFT marketplace interface
 */
const MarketplacePage: React.FC = () => {
  // Wallet connection state
  const { publicKey } = useWallet();  // Current user's wallet public key
  const { connection } = useConnection(); // Solana connection object
  
  // Custom hooks for managing bids and listings
  const { getUserListings } = useBidListing();   // Fetch user's active listings
  const { getUserBids } = useBidPlacement();     // Fetch user's active bids
  
  // Component state management
  const [activeTab, setActiveTab] = useState<'browse' | 'my-nfts' | 'my-activity'>('browse'); // Current view tab
  const [userNFTs, setUserNFTs] = useState<NFTMetadata[]>([]); // User's owned NFTs
  const [listedNFTs, setListedNFTs] = useState<NFTMetadata[]>([]); // All NFTs listed in marketplace
  const [userBids, setUserBids] = useState<BidData[]>([]); // User's active bids
  const [userListings, setUserListings] = useState<Listing[]>([]); // User's active listings
  const [loading, setLoading] = useState(false); // Loading state for data fetching

  useEffect(() => {
    if (publicKey) {
      fetchUserData();
    }
  }, [publicKey]);

  const fetchUserData = async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    try {
      // Fetch data in parallel for better performance
      const [ownedNFTs, bids, listings, allListedNFTs]: [NFTMetadata[], BidData[], Listing[], NFTMetadata[]] = await Promise.all([
        getTokensByOwner(connection, publicKey).catch(err => {
          console.error('Error fetching owned NFTs:', err);
          return [];
        }),
        getUserBids(publicKey).catch(err => {
          console.error('Error fetching user bids:', err);
          return [];
        }),
        getUserListings(publicKey).catch(err => {
          console.error('Error fetching user listings:', err);
          return [];
        }),
        getAllListedNFTs(connection).catch(err => {
          console.error('Error fetching listed NFTs:', err);
          return [];
        })
      ]);

      // Update states with fetched data
      setUserBids(bids);
      setUserListings(listings);
      setListedNFTs(allListedNFTs);

      // Update NFT listing status based on user's listings
      const nftsWithListingStatus = ownedNFTs.map(nft => {
        const listing = listings.find(l => l.nftMint.toBase58() === nft.mint.toBase58());
        return {
          ...nft,
          isListed: !!listing,
          listingPubkey: listing?.pubkey,
        };
      });
      setUserNFTs(nftsWithListingStatus);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Event Handlers for Marketplace Actions
   * Each handler logs the action and refreshes the marketplace data
   */

  /**
   * Handles the creation of a new NFT listing
   * @param listingPubkey - Public key of the newly created listing
   */
  const handleListingCreated = (listingPubkey: PublicKey) => {
    console.log('New listing created:', listingPubkey.toString());
    fetchUserData(); // Refresh all marketplace data
  };

  /**
   * Handles when a new bid is placed on an NFT
   * @param bidPubkey - Public key of the newly placed bid
   */
  const handleBidPlaced = (bidPubkey: PublicKey) => {
    console.log('New bid placed:', bidPubkey.toString());
    fetchUserData(); // Refresh all marketplace data
  };

  /**
   * Handles the cancellation of a bid
   * @param bidId - ID of the cancelled bid
   */
  const handleBidCancelled = (bidId: number) => {
    console.log('Bid cancelled:', bidId);
    fetchUserData(); // Refresh all marketplace data
  };

  /**
   * Handles when a bid is accepted by the NFT owner
   * @param bidId - ID of the accepted bid
   */
  const handleBidAccepted = (bidId: number) => {
    console.log('Bid accepted:', bidId);
    fetchUserData(); // Refresh all marketplace data
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">SketchXpress Marketplace</h1>
            </div>
            <div className="flex items-center space-x-4">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Listings
            </button>
            <button
              onClick={() => setActiveTab('my-nfts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-nfts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My NFTs ({userNFTs.length})
            </button>
            <button
              onClick={() => setActiveTab('my-activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Activity
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!publicKey ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your Solana wallet to start trading NFTs with the bidding system
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            {activeTab === 'browse' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Active Listings ({listedNFTs.length})
                </h2>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                        <div className="h-48 bg-gray-300 rounded mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : listedNFTs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No active listings found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listedNFTs.map((nft) => (
                      <BidPlacementCard
                        key={nft.mint.toString()}
                        nftMint={nft.mint}
                        nftName={nft.name}
                        nftImage={nft.image}
                        listingPubkey={nft.listingPubkey!}
                        onBidPlaced={handleBidPlaced}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-nfts' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  My NFTs ({userNFTs.length})
                </h2>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                        <div className="h-48 bg-gray-300 rounded mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : userNFTs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">You don't own any NFTs yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Mint some NFTs from the bonding curve or win some bids!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {userNFTs.map((nft) => (
                      <BidListingCard
                        key={nft.mint.toString()}
                        nftMint={nft.mint}
                        nftName={nft.name}
                        nftImage={nft.image}
                        onListingCreated={handleListingCreated}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-activity' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  My Bidding Activity
                </h2>
                <BidManagementCard
                  userBids={userBids}
                  userListings={userListings}
                  onBidCancelled={handleBidCancelled}
                  onBidAccepted={handleBidAccepted}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Revenue Distribution Info */}
      <div className="bg-blue-50 border-t border-blue-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Fair Revenue Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600 mb-2">95%</div>
                <div className="text-sm text-gray-600">to Original Minter</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-blue-600 mb-2">4%</div>
                <div className="text-sm text-gray-600">to Platform</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-purple-600 mb-2">1%</div>
                <div className="text-sm text-gray-600">to All NFT Holders</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;

