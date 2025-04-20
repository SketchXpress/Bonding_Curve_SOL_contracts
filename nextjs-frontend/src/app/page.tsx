'use client';
import React from 'react';
import { WalletContextProvider } from '@/contexts/WalletContextProvider';
import { AnchorContextProvider } from '@/contexts/AnchorContextProvider';
import WalletSection from '@/components/WalletSection';
import CreateUserCard from '@/components/CreateUserCard';
import CreatePoolCard from '@/components/CreatePoolCard';
import BuyTokenCard from '@/components/BuyTokenCard';
import SellTokenCard from '@/components/SellTokenCard';
import CreateNftCard from '@/components/CreateNftCard';
import BuyNftCard from '@/components/BuyNftCard';
import TransactionHistory from '@/components/TransactionHistory';
import { useTransactionIntegration } from '@/hooks/useTransactionIntegration';
import BigIntPatcher from '@/components/BigIntPatcher';

// Create a wrapper component that uses the hook inside the providers
const AppContent = () => {
  // Use the transaction integration hook to connect transactions to history
  useTransactionIntegration();
  
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Add BigIntPatcher to ensure client-side polyfill is applied */}
      <BigIntPatcher />
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Solana Bonding Curve System</h1>
          <p className="text-xl text-gray-600">Interact with your deployed Solana contract</p>
        </header>
        <WalletSection />
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Contract Information</h2>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <p className="mb-2">
              <span className="font-medium">Program ID:</span>{' '}
              <span className="font-mono">GgLTQpotYKSqmH55whQEqnCafngwxga1RzckdkpufFMU</span>
            </p>
            <p>
              <span className="font-medium">Network:</span> <span>Devnet</span>
            </p>
          </div>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Contract Functions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CreateUserCard />
            <CreatePoolCard />
            <BuyTokenCard />
            <SellTokenCard />
            <CreateNftCard />
            <BuyNftCard />
          </div>
        </section>
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
