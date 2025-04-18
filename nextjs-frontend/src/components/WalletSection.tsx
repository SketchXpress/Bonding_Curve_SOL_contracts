'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const WalletSection = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const bal = await connection.getBalance(publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    // Set up an interval to refresh the balance
    const intervalId = setInterval(fetchBalance, 10000);

    return () => clearInterval(intervalId);
  }, [publicKey, connection]);

  return (
    <section className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Wallet Connection</h2>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="mb-4 md:mb-0">
          <div className={`text-lg font-medium ${publicKey ? 'text-green-600' : 'text-red-600'}`}>
            {publicKey ? 'Connected' : 'Not connected'}
          </div>
          {publicKey && (
            <div className="mt-2">
              <p className="text-gray-700">
                Address: <span className="font-mono">{publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}</span>
              </p>
              <p className="text-gray-700">
                Balance: <span className="font-mono">{balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}</span>
              </p>
            </div>
          )}
        </div>
        <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors" />
      </div>
    </section>
  );
};

export default WalletSection;
