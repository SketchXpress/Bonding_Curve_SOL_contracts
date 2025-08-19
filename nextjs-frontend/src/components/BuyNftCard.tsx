'use client';

import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useBuyNft } from '@/hooks/useBuyNft';

interface BuyNftCardProps {
  className?: string;
}

interface NftInfo {
  mint: string;
  name: string;
  image?: string;
  owner: string;
  currentPrice: number;
  lastSalePrice?: number;
}

export const BuyNftCard: React.FC<BuyNftCardProps> = ({ className = '' }) => {
  const { buyNft, getCurrentPrice, getNftOwner, isLoading, error } = useBuyNft();
  
  // Form states
  const [nftMint, setNftMint] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('5'); // 5% default
  
  // NFT info states
  const [nftInfo, setNftInfo] = useState<NftInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Transaction states
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Fetch NFT information when mint changes
  const fetchNftInfo = async (mintAddress: string) => {
    if (!mintAddress || !PublicKey.isOnCurve(mintAddress)) {
      setNftInfo(null);
      return;
    }

    setLoadingInfo(true);
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      const [currentPrice, owner] = await Promise.all([
        getCurrentPrice(mintPubkey),
        getNftOwner(mintPubkey)
      ]);

      if (currentPrice !== null && owner) {
        setNftInfo({
          mint: mintAddress,
          name: `NFT ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
          owner: owner.toString(),
          currentPrice: currentPrice,
        });
      } else {
        setNftInfo(null);
      }
    } catch (err) {
      console.error('Error fetching NFT info:', err);
      setNftInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  // Auto-fetch info when mint changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only fetch if we have a valid mint address
      if (nftMint && PublicKey.isOnCurve(nftMint)) {
        fetchNftInfo(nftMint);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [nftMint]);

  // Calculate max price with slippage
  const calculateMaxPriceWithSlippage = (currentPrice: number, slippage: number): number => {
    return currentPrice * (1 + slippage / 100);
  };

  // Handle buy NFT
  const handleBuyNft = async () => {
    if (!nftMint || !nftInfo) {
      setTransactionError('Please enter a valid NFT mint address');
      return;
    }

    try {
      setTransactionError(null);
      
      const mintPubkey = new PublicKey(nftMint);
      const slippage = parseFloat(slippageTolerance) || 5;
      const finalMaxPrice = maxPrice 
        ? parseFloat(maxPrice)
        : calculateMaxPriceWithSlippage(nftInfo.currentPrice, slippage);

      const signature = await buyNft({
        nftMint: mintPubkey,
        maxPrice: finalMaxPrice,
      });

      if (signature) {
        setLastTransaction(signature);
        setNftMint('');
        setMaxPrice('');
        setNftInfo(null);
        
        // Show success message
        alert('NFT purchased successfully!');
      }
    } catch (err) {
      console.error('Buy NFT error:', err);
      setTransactionError(err instanceof Error ? err.message : 'Failed to buy NFT');
    }
  };

  // Refresh NFT info
  const handleRefresh = async () => {
    if (nftMint) {
      setRefreshing(true);
      await fetchNftInfo(nftMint);
      setRefreshing(false);
    }
  };

  // Format SOL amount
  const formatSOL = (amount: number) => {
    return amount.toFixed(4);
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Buy NFT</h2>
        <p className="text-gray-600">
          Purchase an NFT from the bonding curve marketplace
        </p>
      </div>

      {/* NFT Mint Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            NFT Mint Address *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nftMint}
              onChange={(e) => setNftMint(e.target.value)}
              placeholder="Enter NFT mint address (e.g., 7BgD...)"
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleRefresh}
              disabled={!nftMint || loadingInfo || refreshing}
              className="px-4 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {refreshing ? '↻' : '🔄'}
            </button>
          </div>
          {nftMint && !PublicKey.isOnCurve(nftMint) && (
            <p className="text-red-500 text-sm mt-1">Invalid public key format</p>
          )}
        </div>

        {/* NFT Information Display */}
        {loadingInfo && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-blue-700">Loading NFT information...</p>
          </div>
        )}

        {nftInfo && (
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">NFT Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{nftInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Owner:</span>
                <span className="font-mono text-xs">{formatAddress(nftInfo.owner)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Price:</span>
                <span className="font-bold text-green-600">{formatSOL(nftInfo.currentPrice)} SOL</span>
              </div>
              {nftInfo.lastSalePrice && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale:</span>
                  <span className="font-medium">{formatSOL(nftInfo.lastSalePrice)} SOL</span>
                </div>
              )}
            </div>
          </div>
        )}

        {nftMint && !loadingInfo && !nftInfo && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <p className="text-red-700">NFT not found or not available for purchase</p>
          </div>
        )}

        {/* Price Settings */}
        {nftInfo && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Max Price (SOL) - Optional
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={`Auto: ${formatSOL(calculateMaxPriceWithSlippage(nftInfo.currentPrice, parseFloat(slippageTolerance)))}`}
                step="0.001"
                min="0"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <p className="text-gray-500 text-sm mt-1">
                Leave empty to use current price + slippage tolerance
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Slippage Tolerance (%)
              </label>
              <div className="flex gap-2">
                {['1', '3', '5', '10'].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippageTolerance(value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      slippageTolerance === value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippageTolerance}
                  onChange={(e) => setSlippageTolerance(e.target.value)}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm"
                  min="0"
                  max="50"
                  step="0.1"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-semibold mb-2">Purchase Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Price:</span>
                  <span>{formatSOL(nftInfo.currentPrice)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage ({slippageTolerance}%):</span>
                  <span>+{formatSOL(nftInfo.currentPrice * parseFloat(slippageTolerance) / 100)} SOL</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Max You'll Pay:</span>
                  <span>{formatSOL(maxPrice ? parseFloat(maxPrice) : calculateMaxPriceWithSlippage(nftInfo.currentPrice, parseFloat(slippageTolerance)))} SOL</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuyNft}
          disabled={!nftInfo || isLoading || loadingInfo}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing Purchase...' : 'Buy NFT'}
        </button>

        {/* Error Display */}
        {(error || transactionError) && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <p className="text-red-700">{error || transactionError}</p>
          </div>
        )}

        {/* Success Display */}
        {lastTransaction && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
            <p className="text-green-700 mb-2">✅ NFT purchased successfully!</p>
            <p className="text-sm text-gray-600 break-all">
              Transaction: {lastTransaction}
            </p>
            <a
              href={`https://explorer.solana.com/tx/${lastTransaction}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Solana Explorer →
            </a>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-semibold text-blue-800 mb-2">How Buying Works</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Enter an NFT mint address to view current price and owner</li>
            <li>Set a maximum price you're willing to pay (includes slippage)</li>
            <li>The transaction will fail if the actual price exceeds your maximum</li>
            <li>SOL is transferred directly to the current owner</li>
            <li>NFT ownership is transferred to your wallet</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
