import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBidManagement } from '../hooks/useBidManagement';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface CollectionFeesCardProps {
  collectionMint: PublicKey;
  collectionName: string;
  userNFTs: PublicKey[]; // NFTs owned by the user in this collection
}

interface CollectionFeesData {
  totalAccumulated: number;
  totalNFTs: number;
  perNFTAmount: number;
  lastDistribution: number;
  distributionCount: number;
  userClaimableAmount: number;
  userNFTCount: number;
}

export const CollectionFeesCard: React.FC<CollectionFeesCardProps> = ({
  collectionMint,
  collectionName,
  userNFTs,
}) => {
  const { publicKey } = useWallet();
  const { distributeCollectionFees, claimNftHolderFees, isLoading } = useBidManagement();
  
  const [feesData, setFeesData] = useState<CollectionFeesData | null>(null);
  const [loadingAction, setLoadingAction] = useState<'distribute' | 'claim' | null>(null);

  useEffect(() => {
    fetchFeesData();
  }, [collectionMint, userNFTs]);

  const fetchFeesData = async () => {
    try {
      // In a real implementation, you'd fetch this from your program
      // For now, using mock data
      const mockData: CollectionFeesData = {
        totalAccumulated: 0.5 * LAMPORTS_PER_SOL, // 0.5 SOL accumulated
        totalNFTs: 100, // 100 NFTs in collection
        perNFTAmount: (0.5 * LAMPORTS_PER_SOL) / 100, // 0.005 SOL per NFT
        lastDistribution: Date.now() / 1000 - 86400, // 24 hours ago
        distributionCount: 5,
        userClaimableAmount: userNFTs.length * ((0.5 * LAMPORTS_PER_SOL) / 100),
        userNFTCount: userNFTs.length,
      };
      
      setFeesData(mockData);
    } catch (error) {
      console.error('Error fetching fees data:', error);
    }
  };

  const handleDistributeFees = async () => {
    if (!publicKey || !feesData) return;

    setLoadingAction('distribute');
    try {
      await distributeCollectionFees(collectionMint);
      await fetchFeesData(); // Refresh data
    } catch (error) {
      console.error('Error distributing fees:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClaimFees = async () => {
    if (!publicKey || userNFTs.length === 0) return;

    setLoadingAction('claim');
    try {
      // Claim fees for each NFT the user owns
      for (const nftMint of userNFTs) {
        await claimNftHolderFees(nftMint);
      }
      await fetchFeesData(); // Refresh data
    } catch (error) {
      console.error('Error claiming fees:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 3600) {
      return `${Math.floor(diff / 60)} minutes ago`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)} hours ago`;
    } else {
      return `${Math.floor(diff / 86400)} days ago`;
    }
  };

  if (!feesData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const canDistribute = feesData.totalAccumulated > 0;
  const canClaim = userNFTs.length > 0 && feesData.userClaimableAmount > 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">{collectionName}</h3>
        <p className="text-purple-100 text-sm">Collection Fee Distribution</p>
      </div>

      <div className="p-6">
        {/* Collection Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {(feesData.totalAccumulated / LAMPORTS_PER_SOL).toFixed(3)}
            </div>
            <div className="text-sm text-gray-600">SOL Accumulated</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{feesData.totalNFTs}</div>
            <div className="text-sm text-gray-600">Total NFTs</div>
          </div>
        </div>

        {/* Per NFT Distribution */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900">Per NFT Amount</span>
            <span className="text-lg font-bold text-blue-900">
              {(feesData.perNFTAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL
            </span>
          </div>
          <div className="text-xs text-blue-700">
            Last distribution: {formatTimeAgo(feesData.lastDistribution)} 
            (Round #{feesData.distributionCount})
          </div>
        </div>

        {/* User's Position */}
        {publicKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-green-900 mb-3">Your Position</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-bold text-green-900">{userNFTs.length}</div>
                <div className="text-sm text-green-700">NFTs Owned</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-900">
                  {(feesData.userClaimableAmount / LAMPORTS_PER_SOL).toFixed(6)}
                </div>
                <div className="text-sm text-green-700">SOL Claimable</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Distribute Fees Button */}
          <button
            onClick={handleDistributeFees}
            disabled={!canDistribute || loadingAction === 'distribute'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loadingAction === 'distribute' 
              ? 'Distributing...' 
              : `Distribute ${(feesData.totalAccumulated / LAMPORTS_PER_SOL).toFixed(3)} SOL`
            }
          </button>

          {/* Claim Fees Button */}
          {publicKey && (
            <button
              onClick={handleClaimFees}
              disabled={!canClaim || loadingAction === 'claim'}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loadingAction === 'claim' 
                ? 'Claiming...' 
                : canClaim 
                  ? `Claim ${(feesData.userClaimableAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`
                  : 'No fees to claim'
              }
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">How it works</h4>
              <div className="mt-1 text-sm text-yellow-700">
                <p>• 1% of all accepted bids goes to collection fee pool</p>
                <p>• Fees are distributed equally among all NFT holders</p>
                <p>• Anyone can trigger distribution, but you must claim your share</p>
                <p>• You can only claim fees for NFTs you currently own</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

