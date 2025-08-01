'use client';

import React, { useState, useEffect } from 'react';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const MIGRATION_THRESHOLD_LAMPORTS = new BN(690_000_000_000); // 690 SOL

// Pool Information Component - Fixed validation for base58 addresses
const PoolInfoCard = ({ poolAddress }: { poolAddress: string }) => {
  const { program } = useAnchorContext();
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoolInfo = async () => {
      // Reset poolInfo when no address is provided
      if (!poolAddress.trim()) {
        setPoolInfo(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (!program) return;
      
      // Validate that poolAddress is a valid base58 string
      if (poolAddress.length < 32 || poolAddress.length > 44) {
        setError('Invalid pool address format (must be 32-44 characters)');
        setPoolInfo(null);
        return;
      }
      
      // Check for non-base58 characters
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      if (!base58Regex.test(poolAddress)) {
        // Find the invalid characters
        const invalidChars = poolAddress.split('').filter(char => !/[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/.test(char));
        const uniqueInvalidChars = [...new Set(invalidChars)];
        
        let errorMsg = `Pool address contains invalid characters: ${uniqueInvalidChars.join(', ')}`;
        
        // Provide helpful suggestions for common mistakes
        if (uniqueInvalidChars.includes('0')) {
          errorMsg += '\n💡 Tip: Base58 uses "O" (capital O) instead of "0" (zero)';
        }
        if (uniqueInvalidChars.includes('O')) {
          errorMsg += '\n💡 Note: "O" (capital O) is not valid in base58';
        }
        if (uniqueInvalidChars.includes('I')) {
          errorMsg += '\n💡 Tip: Base58 uses "1" instead of "I" (capital i)';
        }
        if (uniqueInvalidChars.includes('l')) {
          errorMsg += '\n💡 Tip: Base58 uses "1" instead of "l" (lowercase L)';
        }
        
        errorMsg += '\n\nValid characters: A-H, J-N, P-Z, 1-9';
        
        setError(errorMsg);
        setPoolInfo(null);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const pool = new PublicKey(poolAddress);
        const poolData = await program.account.bondingCurvePool.fetch(pool);
        
        // Debug: Log the structure of poolData
        console.log('Pool data structure:', poolData);
        console.log('Pool data keys:', Object.keys(poolData));
        if (poolData.stats) {
          console.log('Pool stats:', poolData.stats);
          console.log('Pool stats keys:', Object.keys(poolData.stats));
        }
        
        setPoolInfo(poolData);
      } catch (err) {
        console.error('Error fetching pool info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setPoolInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolInfo();
  }, [program, poolAddress]);

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Pool Information</h3>
        <p>Loading pool data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Pool Information</h3>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!poolInfo) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Pool Information</h3>
        <p>Enter a pool address to view details</p>
      </div>
    );
  }

  // Helper to format lamports to SOL
  const formatLamports = (lamports: BN) => {
    return (lamports.toNumber() / 1_000_000_000).toFixed(3);
  };

  // Safely handle totalEscrowed which is in poolInfo.stats.totalEscrowed
  let escrowed: BN;
  let thresholdMet = false;
  let progressPercent = '0.00';

  try {
    if (poolInfo.stats && poolInfo.stats.totalEscrowed !== undefined) {
      // Create BN from the totalEscrowed value
      escrowed = new BN(poolInfo.stats.totalEscrowed.toString());
    } else {
      // Default to 0 if no totalEscrowed found
      escrowed = new BN(0);
    }

    thresholdMet = escrowed.gte(MIGRATION_THRESHOLD_LAMPORTS);
    progressPercent = Math.min(100, (escrowed.toNumber() / MIGRATION_THRESHOLD_LAMPORTS.toNumber()) * 100).toFixed(2);
  } catch (error) {
    console.error('Error processing totalEscrowed:', error, 'poolInfo.stats:', poolInfo.stats);
    escrowed = new BN(0);
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">
        Pool Information ({poolAddress.slice(0, 4)}...{poolAddress.slice(-4)})
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Collection Mint:</h4>
          <p className="text-xs break-all">{poolInfo.collection.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Creator:</h4>
          <p className="text-xs break-all">{poolInfo.config.creator.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Base Price (SOL):</h4>
          <p>{formatLamports(new BN(poolInfo.config.basePrice.toString()))}</p>
        </div>
        <div>
          <h4 className="font-semibold">Growth Factor:</h4>
          <p>{(poolInfo.config.growthFactor / 100).toFixed(2)}%</p>
        </div>
        <div>
          <h4 className="font-semibold">Current NFT Supply:</h4>
          <p>{poolInfo.state.currentSupply.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Protocol Fee (%):</h4>
          <p>{(poolInfo.config.protocolFee / 100).toFixed(2)}%</p>
        </div>
        <div>
          <h4 className="font-semibold">Total SOL Escrowed:</h4>
          <p>{formatLamports(escrowed)} SOL</p>
        </div>
        <div>
          <h4 className="font-semibold">Pool Active:</h4>
          <p>{poolInfo.state.isActive ? 'Yes' : 'No (Frozen)'}</p>
        </div>

        <div className="col-span-2">
          <h4 className="font-semibold">Tensor Migration Status:</h4>
          <p>
            {!poolInfo.state.isActive 
              ? 'Migrated (Pool Frozen)' 
              : thresholdMet 
                ? 'Ready for migration (Threshold Met)' 
                : 'Not eligible for migration yet'}
          </p>
        </div>

        <div className="col-span-2">
          <h4 className="font-semibold">Migration Threshold Progress:</h4>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className={`h-2.5 rounded-full ${thresholdMet ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm mt-1">
            {thresholdMet
              ? 'Threshold reached! (690 SOL)'
              : `Progress: ${formatLamports(escrowed)} / 690 SOL`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoolInfoCard;
