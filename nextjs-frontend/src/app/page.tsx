
'use client';
import React, { useState } from 'react';
import { WalletContextProvider } from '@/contexts/WalletContextProvider';
import { AnchorContextProvider } from '@/contexts/AnchorContextProvider';
import WalletSection from '@/components/WalletSection';
import CreatePoolCard from '@/components/CreatePoolCard';
import CreateNftCard from '@/components/CreateNftCard';
import SellNftCard from '@/components/SellNftCard'; // Import the new component
import MigrateToTensorCard from '@/components/MigrateToTensorCard';
import PoolInfoCard from '@/components/PoolInfoCard';
import TransactionHistory from '@/components/TransactionHistory';
import CreateCollectionNftCard from '@/components/CreateCollectionNftCard';
import { useTransactionIntegration } from '@/hooks/useTransactionIntegration';
import BigIntPatcher from '@/components/BigIntPatcher';

// Create a wrapper component that uses the hook inside the providers
const AppContent = () => {
  // Use the transaction integration hook to connect transactions to history
  useTransactionIntegration();
  
  // State for pool address to be shared between components
  const [poolAddress, setPoolAddress] = useState('');
  
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Add BigIntPatcher to ensure client-side polyfill is applied */}
      <BigIntPatcher />
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Solana NFT-Only Bonding Curve System</h1>
          <p className="text-xl text-gray-600">With Token-Owned Escrow (TOE)</p>
        </header>
        
        <WalletSection />
        
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Contract Information</h2>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <p className="mb-2">
              <span className="font-medium">Program ID:</span>{' '}
              <span className="font-mono">EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY</span>
            </p>
            <p>
              <span className="font-medium">Network:</span> <span>Devnet</span>
            </p>
          </div>
          
          {/* Pool Information Card */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-bold">Pool Information</h2>
              <div className="ml-4 flex-grow">
                <input
                  type="text"
                  value={poolAddress}
                  onChange={(e) => setPoolAddress(e.target.value)}
                  placeholder="Enter pool address to view details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
            <PoolInfoCard poolAddress={poolAddress} />
          </div>
        </section>
        
        {/* Combined and cleaned Contract Functions section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Contract Functions</h2>
          {/* Create Collection NFT Card (placed above the grid for prominence) */}
          <div className="mb-6">
            <CreateCollectionNftCard /> 
          </div>
          {/* Grid for other functions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CreatePoolCard />
            <CreateNftCard />
            <SellNftCard /> {/* Added the SellNftCard */}
            <MigrateToTensorCard />
          </div>
        </section>
        
        {/* Removed the duplicate Contract Functions section */}
        
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
          <TransactionHistory />
        </section>
      </div>
    </main>
  );
};

export default function Home() {
  return (
    <WalletContextProvider>
      <AnchorContextProvider>
        <AppContent />
      </AnchorContextProvider>
    </WalletContextProvider>
  );
}

