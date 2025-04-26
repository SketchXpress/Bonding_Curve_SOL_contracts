'use client';

import React, { useState, useEffect } from 'react';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';

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

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Pool Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Base Price:</h4>
          <p>{poolInfo.basePrice.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Growth Factor:</h4>
          <p>{poolInfo.growthFactor.toString()}</p>
        </div>
        <div>
          <h4 className="font-semibold">Current Market Cap:</h4>
          <p>{poolInfo.currentMarketCap.toString()} SOL</p>
        </div>
        <div>
          <h4 className="font-semibold">Total Supply:</h4>
          <p>{poolInfo.totalSupply.toString()}</p>
        </div>
        
        {/* New fields for burn-distribute mechanism */}
        <div>
          <h4 className="font-semibold">Total Burned:</h4>
          <p>{poolInfo.totalBurned?.toString() || '0'} SOL</p>
        </div>
        <div>
          <h4 className="font-semibold">Total Distributed:</h4>
          <p>{poolInfo.totalDistributed?.toString() || '0'} SOL</p>
        </div>
        
        {/* Tensor migration status */}
        <div className="col-span-2">
          <h4 className="font-semibold">Tensor Migration Status:</h4>
          <p>
            {poolInfo.migratedToTensor 
              ? `Migrated (Timestamp: ${new Date(poolInfo.tensorMigrationTimestamp * 1000).toLocaleString()})` 
              : poolInfo.pastThreshold 
                ? 'Ready for migration' 
                : 'Not eligible for migration yet'}
          </p>
        </div>
        
        {/* Threshold status */}
        <div className="col-span-2">
          <h4 className="font-semibold">Threshold Status:</h4>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className={`h-2.5 rounded-full ${poolInfo.pastThreshold ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, (Number(poolInfo.currentMarketCap) / 69000000000) * 100)}%` }}
            ></div>
          </div>
          <p className="text-sm mt-1">
            {poolInfo.pastThreshold 
              ? 'Threshold reached! ($69k)' 
              : `Progress: ${((Number(poolInfo.currentMarketCap) / 69000000000) * 100).toFixed(2)}% of $69k`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoolInfoCard;
