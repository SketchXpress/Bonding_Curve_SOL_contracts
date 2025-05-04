'use client';

import React, { useState, useEffect } from 'react';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const MIGRATION_THRESHOLD_LAMPORTS = new BN(690_000_000_000); // 690 SOL

const PoolInfoCard = ({ poolAddress }: { poolAddress: string }) => {
  const { program } = useAnchorContext();
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!program || !poolAddress) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const pool = new PublicKey(poolAddress);
        const poolData = await program.account.bondingCurvePool.fetch(pool);
        
        setPoolInfo(poolData);
      } catch (err) {
        console.error('Error fetching pool info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
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

  const escrowed = poolInfo.totalEscrowed as BN;
  const thresholdMet = escrowed.gte(MIGRATION_THRESHOLD_LAMPORTS);
  const progressPercent = Math.min(100, (escrowed.toNumber() / MIGRATION_THRESHOLD_LAMPORTS.toNumber()) * 100).toFixed(2);

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
          <p className="text-xs break-all">{poolInfo.creator.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Base Price (SOL):</h4>
          <p>{formatLamports(poolInfo.basePrice)}</p>
        </div>
        <div>
          <h4 className="font-semibold">Growth Factor:</h4>
          <p>{(poolInfo.growthFactor.toNumber() / 1_000_000).toFixed(6)}</p>
        </div>
        <div>
          <h4 className="font-semibold">Current NFT Supply:</h4>
          <p>{poolInfo.currentSupply.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Protocol Fee (%):</h4>
          <p>{(poolInfo.protocolFee.toNumber() / 100).toFixed(2)}%</p>
        </div>
        <div>
          <h4 className="font-semibold">Total SOL Escrowed:</h4>
          <p>{formatLamports(escrowed)} SOL</p>
        </div>
        <div>
          <h4 className="font-semibold">Pool Active:</h4>
          <p>{poolInfo.isActive ? 'Yes' : 'No (Frozen)'}</p>
        </div>

        <div className="col-span-2">
          <h4 className="font-semibold">Tensor Migration Status:</h4>
          <p>
            {!poolInfo.isActive 
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
