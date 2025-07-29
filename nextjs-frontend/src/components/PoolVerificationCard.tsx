'use client';

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';

const PoolVerificationCard = () => {
  const [collectionMintAddress, setCollectionMintAddress] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { program } = useAnchorContext();

  const verifyPool = async () => {
    if (!program || !collectionMintAddress) {
      alert('Please enter a collection mint address and ensure wallet is connected');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const collectionMint = new PublicKey(collectionMintAddress);
      
      // Derive pool address
      const [poolAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve-pool'), collectionMint.toBuffer()],
        program.programId
      );

      console.log('Verifying pool...');
      console.log('Collection Mint:', collectionMint.toString());
      console.log('Derived Pool Address:', poolAddress.toString());
      console.log('Program ID:', program.programId.toString());
      console.log('Network:', program.provider.connection.rpcEndpoint);

      // Check if pool account exists
      const poolAccountInfo = await program.provider.connection.getAccountInfo(poolAddress);
      
      let poolData = null;
      if (poolAccountInfo) {
        try {
          poolData = await program.account.bondingCurvePool.fetch(poolAddress);
        } catch (fetchError) {
          console.error('Error fetching pool data:', fetchError);
        }
      }

      setResults({
        collectionMint: collectionMint.toString(),
        poolAddress: poolAddress.toString(),
        exists: !!poolAccountInfo,
        accountInfo: poolAccountInfo,
        poolData: poolData,
        programId: program.programId.toString(),
        network: program.provider.connection.rpcEndpoint,
      });

    } catch (error) {
      console.error('Verification error:', error);
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4 text-yellow-800">🔍 Pool Verification Tool</h3>
      <p className="text-sm text-yellow-700 mb-4">
        Use this tool to check if your bonding curve pool exists and verify the addresses.
      </p>
      
      <div className="mb-4">
        <label htmlFor="verify-collection-mint" className="block text-yellow-700 mb-2 font-medium">
          Collection Mint Address:
        </label>
        <input
          type="text"
          id="verify-collection-mint"
          value={collectionMintAddress}
          onChange={(e) => setCollectionMintAddress(e.target.value)}
          placeholder="Paste your collection mint address here..."
          className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <button
        onClick={verifyPool}
        disabled={loading || !collectionMintAddress}
        className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Verify Pool'}
      </button>

      {results && (
        <div className="mt-6 bg-white rounded-lg p-4 border border-yellow-200">
          <h4 className="font-bold mb-3 text-yellow-800">Verification Results:</h4>
          
          {results.error ? (
            <div className="text-red-600">
              <strong>Error:</strong> {results.error}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div><strong>Collection Mint:</strong> <code className="bg-gray-100 px-1">{results.collectionMint}</code></div>
              <div><strong>Derived Pool Address:</strong> <code className="bg-gray-100 px-1">{results.poolAddress}</code></div>
              <div><strong>Pool Exists:</strong> <span className={results.exists ? 'text-green-600' : 'text-red-600'}>{results.exists ? '✅ YES' : '❌ NO'}</span></div>
              <div><strong>Program ID:</strong> <code className="bg-gray-100 px-1">{results.programId}</code></div>
              <div><strong>Network:</strong> <code className="bg-gray-100 px-1">{results.network}</code></div>
              
              {results.exists && results.poolData && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <strong className="text-green-800">Pool Data Found:</strong>
                  <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(results.poolData, null, 2)}
                  </pre>
                </div>
              )}
              
              {!results.exists && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <strong className="text-red-800">Pool Not Found:</strong>
                  <p className="text-sm text-red-700 mt-1">
                    This means either:
                    <br />• The pool was never created
                    <br />• You're using the wrong collection mint address
                    <br />• You're on a different network than where the pool was created
                    <br />• The pool was created with a different program ID
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PoolVerificationCard;
