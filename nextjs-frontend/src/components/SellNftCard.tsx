
'use client';

import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { PROGRAM_ID, IDL } from '../utils/idl';
import { TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID, METADATA_PROGRAM_ID } from '../utils/solana-constants';

interface SellNftCardProps {
  className?: string;
}

interface NftInfo {
  mint: string;
  name: string;
  owner: string;
  currentPrice: number;
  canSell: boolean;
  poolAddress?: string;
}

export const SellNftCard: React.FC<SellNftCardProps> = ({ className = '' }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  // Form states
  const [nftMint, setNftMint] = useState('');
  
  // NFT info states
  const [nftInfo, setNftInfo] = useState<NftInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  
  // Transaction states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getProvider = () => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx) => {
          const signed = await sendTransaction(tx, connection);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );
  };

  // Fetch NFT information when mint changes
  const fetchNftInfo = async (mintAddress: string) => {
    if (!mintAddress || !PublicKey.isOnCurve(mintAddress)) {
      setNftInfo(null);
      return;
    }

    setLoadingInfo(true);
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      const mintPubkey = new PublicKey(mintAddress);

      // Check if user owns this NFT
      const userTokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey!);
      
      try {
        const tokenAccountInfo = await getAccount(connection, userTokenAccount);
        
        if (tokenAccountInfo.amount < 1n) {
          setNftInfo({
            mint: mintAddress,
            name: `NFT ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
            owner: 'Not owned by you',
            currentPrice: 0,
            canSell: false,
          });
          return;
        }
      } catch (err) {
        setNftInfo({
          mint: mintAddress,
          name: `NFT ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
          owner: 'Not owned by you',
          currentPrice: 0,
          canSell: false,
        });
        return;
      }

      // Try to get NFT data
      try {
        const [nftDataPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('nft_data'), mintPubkey.toBuffer()],
          PROGRAM_ID
        );

        const nftDataAccount = await (program.account as any).nftData.fetch(nftDataPda);
        const collectionId = nftDataAccount.collectionId;
        
        // Get the pool for this collection
        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('bonding-curve-pool'), collectionId.toBuffer()],
          PROGRAM_ID
        );

        const poolAccount = await (program.account as any).bondingCurvePool.fetch(poolPda);
        
        // Calculate current sell price (simplified - actual calculation may be more complex)
        const currentSupply = poolAccount.state.currentSupply;
        const basePrice = poolAccount.config.basePrice.toNumber();
        const growthFactor = poolAccount.config.growthFactor;
        
        // Simple bonding curve formula: price = basePrice * (growthFactor/10000)^(supply-1)
        const currentPrice = basePrice * Math.pow(growthFactor / 10000, Math.max(0, currentSupply - 1));
        
        setNftInfo({
          mint: mintAddress,
          name: nftDataAccount.name || `NFT ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
          owner: 'You',
          currentPrice: currentPrice / 1e9, // Convert lamports to SOL
          canSell: true,
          poolAddress: poolPda.toString(),
        });
      } catch (nftDataErr) {
        // NFT might not be from our bonding curve system
        setNftInfo({
          mint: mintAddress,
          name: `NFT ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
          owner: 'You',
          currentPrice: 0,
          canSell: false,
        });
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
      if (nftMint && publicKey) {
        fetchNftInfo(nftMint);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [nftMint, publicKey]);

  const handleSellNft = async () => {
    if (!publicKey || !nftInfo || !nftInfo.canSell) {
      setError('Cannot sell this NFT');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      const mintPubkey = new PublicKey(nftMint);

      // Get NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft_data'), mintPubkey.toBuffer()],
        PROGRAM_ID
      );

      const nftDataAccount = await (program.account as any).nftData.fetch(nftDataPda);
      const collectionId = nftDataAccount.collectionId;
      const creator = nftDataAccount.creator;

      // Get pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve-pool'), collectionId.toBuffer()],
        PROGRAM_ID
      );

      // Get escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft_escrow'), mintPubkey.toBuffer()],
        PROGRAM_ID
      );

      // Get user's NFT token account
      const sellerNftTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      // Get metadata account PDA
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPubkey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      // Get master edition account PDA
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPubkey.toBuffer(),
          Buffer.from('edition'),
        ],
        METADATA_PROGRAM_ID
      );

      // Get collection metadata account PDA
      const [collectionMetadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          collectionId.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      const tx = await program.methods
        .sellNft()
        .accounts({
          seller: publicKey,
          pool: poolPda,
          escrow: escrowPda,
          creator: creator,
          nftMint: mintPubkey,
          sellerNftTokenAccount: sellerNftTokenAccount,
          tokenMetadataProgram: METADATA_PROGRAM_ID,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
          collectionMint: collectionId,
          collectionMetadata: collectionMetadata,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setSuccess(`✅ NFT sold successfully! You received ${nftInfo.currentPrice.toFixed(4)} SOL`);
      setNftMint('');
      setNftInfo(null);

    } catch (err) {
      console.error('Error selling NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to sell NFT');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sell NFT</h2>
        <p className="text-gray-600">
          Sell your NFT back to the bonding curve and receive SOL
        </p>
      </div>

      <div className="space-y-4">
        {/* NFT Mint Input */}
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Your NFT Mint Address *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nftMint}
              onChange={(e) => setNftMint(e.target.value)}
              placeholder="Enter NFT mint address you own"
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => fetchNftInfo(nftMint)}
              disabled={!nftMint || loadingInfo}
              className="px-4 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingInfo ? '↻' : '🔄'}
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
          <div className={`p-4 rounded-md border ${
            nftInfo.canSell 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              nftInfo.canSell ? 'text-green-800' : 'text-red-800'
            }`}>
              NFT Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{nftInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Owner:</span>
                <span className="font-medium">{nftInfo.owner}</span>
              </div>
              {nftInfo.canSell && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Sell Price:</span>
                    <span className="font-bold text-green-600">{nftInfo.currentPrice.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pool Address:</span>
                    <span className="font-mono text-xs">{nftInfo.poolAddress && formatAddress(nftInfo.poolAddress)}</span>
                  </div>
                </>
              )}
            </div>
            
            {!nftInfo.canSell && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  <strong>Cannot Sell:</strong> This NFT is either not owned by you or not part of our bonding curve system.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sell Button */}
        <button
          onClick={handleSellNft}
          disabled={!nftInfo?.canSell || isLoading || loadingInfo}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing Sale...' : `Sell NFT ${nftInfo?.canSell ? `for ${nftInfo.currentPrice.toFixed(4)} SOL` : ''}`}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <div className="flex">
              <div className="text-red-600 text-xl mr-2">⚠️</div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-semibold text-blue-800 mb-2">How Selling Works</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Only NFTs from our bonding curve system can be sold through this interface</li>
            <li>The NFT will be burned and you'll receive SOL based on the current bonding curve price</li>
            <li>The selling price decreases as more NFTs are sold (supply decreases)</li>
            <li>You must own the NFT to sell it</li>
            <li>Selling removes the NFT from circulation permanently</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
