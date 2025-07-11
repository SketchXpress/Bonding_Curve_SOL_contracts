import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { BidListingCard } from '../components/BidListingCard';
import { BidPlacementCard } from '../components/BidPlacementCard';
import { BidManagementCard } from '../components/BidManagementCard';
import { useBidListing } from '../hooks/useBidListing';
import { useBidPlacement } from '../hooks/useBidPlacement';

interface NFTData {
  mint: PublicKey;
  name: string;
  image: string;
  owner: PublicKey;
  isListed: boolean;
  listingPubkey?: PublicKey;
}

const MarketplacePage: React.FC = () => {
  const { publicKey } = useWallet();
  const { getUserListings } = useBidListing();
  const { getUserBids } = useBidPlacement();
  
  const [activeTab, setActiveTab] = useState<'browse' | 'my-nfts' | 'my-activity'>('browse');
  const [userNFTs, setUserNFTs] = useState<NFTData[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFTData[]>([]);
  const [userBids, setUserBids] = useState<any[]>([]);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock NFT data - in a real app, you'd fetch this from your program
  const mockNFTs: NFTData[] = [
    {
      mint: new PublicKey('11111111111111111111111111111111'),
      name: 'SketchXpress #001',
      image: 'https://via.placeholder.com/300x300?text=NFT+1',
      owner: new PublicKey('11111111111111111111111111111111'),
      isListed: false,
    },
    {
      mint: new PublicKey('22222222222222222222222222222222'),
      name: 'SketchXpress #002',
      image: 'https://via.placeholder.com/300x300?text=NFT+2',
      owner: new PublicKey('22222222222222222222222222222222'),
      isListed: true,
      listingPubkey: new PublicKey('33333333333333333333333333333333'),
    },
    {
      mint: new PublicKey('44444444444444444444444444444444'),
      name: 'SketchXpress #003',
      image: 'https://via.placeholder.com/300x300?text=NFT+3',
      owner: new PublicKey('44444444444444444444444444444444'),
      isListed: true,
      listingPubkey: new PublicKey('55555555555555555555555555555555'),
    },
  ];

  useEffect(() => {
    if (publicKey) {
      fetchUserData();
    }
  }, [publicKey]);

  const fetchUserData = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Fetch user's NFTs (mock data for now)
      const ownedNFTs = mockNFTs.filter(nft => nft.owner.equals(publicKey));
      setUserNFTs(ownedNFTs);

      // Fetch user's bids
      const bids = await getUserBids(publicKey);
      setUserBids(bids);

      // Fetch user's listings
      const listings = await getUserListings(publicKey);
      setUserListings(listings);

      // Set listed NFTs (all active listings)
      const listed = mockNFTs.filter(nft => nft.isListed);
      setListedNFTs(listed);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleListingCreated = (listingPubkey: PublicKey) => {
    console.log('New listing created:', listingPubkey.toString());
    fetchUserData(); // Refresh data
  };

  const handleBidPlaced = (bidPubkey: PublicKey) => {
    console.log('New bid placed:', bidPubkey.toString());
    fetchUserData(); // Refresh data
  };

  const handleBidCancelled = (bidId: number) => {
    console.log('Bid cancelled:', bidId);
    fetchUserData(); // Refresh data
  };

  const handleBidAccepted = (bidId: number) => {
    console.log('Bid accepted:', bidId);
    fetchUserData(); // Refresh data
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

