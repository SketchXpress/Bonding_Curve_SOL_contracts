'use client';

import React, { useState, useEffect } from 'react';

interface Transaction {
  type: string;
  signature: string;
  timestamp: number;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Function to add a new transaction to the history
  const addTransaction = (type: string, signature: string) => {
    const newTransaction = {
      type,
      signature,
      timestamp: Date.now(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  // Make the addTransaction function available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction = addTransaction;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction;
      }
    };
  }, []);

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format signature for display
  const formatSignature = (signature: string) => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions yet</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={index} className="border-b pb-3 last:border-b-0">
              <div className="flex justify-between items-center">
                <span className="font-medium">{tx.type}</span>
                <span className="text-sm text-gray-500">{formatDate(tx.timestamp)}</span>
              </div>
              <div className="mt-1">
                <a 
                  href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 font-mono text-sm"
                >
                  {formatSignature(tx.signature)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
