// /home/ubuntu/Bonding_Curve_SOL_contracts/nextjs-frontend/src/components/TransactionHistory_enhanced.tsx
// NOTE: This is a conceptual example. Styling and detailed data presentation need refinement.
// FIXES APPLIED (v2) - Updated import path, added type for tx, display pool address and price

"use client";

import React from "react";
// FIX: Update import path and import HistoryItem type
import {
  useBondingCurveHistory,
  HistoryItem,
} from "@/hooks/useBondingCurveHistory"; 
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// Helper function to format timestamp
const formatDate = (timestamp: number | null | undefined) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleString(); // Convert seconds to milliseconds
};

// Helper function to format address (signature or pool)
const formatAddress = (address: string | undefined) => {
  if (!address) return "N/A";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

// Helper function to format instruction name (simple example)
const formatInstructionName = (name: string) => {
  // Convert camelCase to Title Case
  const result = name.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const TransactionHistory = () => {
  // Use the enhanced hook
  const { history, isLoading, error, loadMore, canLoadMore } = useBondingCurveHistory(20); 

  return (
    <div className="bg-gray-800 text-white shadow-md rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4">On-Chain Transaction History</h2>
      {isLoading && history.length === 0 && <p className="text-gray-400">Loading history...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {history.length === 0 && !isLoading && !error && (
        <p className="text-gray-500">No transaction history found for this program.</p>
      )}

      {history.length > 0 && (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2"> 
          {/* FIX: Add type annotation for tx */}
          {history.map((tx: HistoryItem) => (
            <div key={tx.signature} className="border-b border-gray-600 pb-3 last:border-b-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-purple-400">{formatInstructionName(tx.instructionName)}</span>
                <span className="text-xs text-gray-400">{formatDate(tx.blockTime)}</span>
              </div>
              <div className="text-sm space-y-1">
                {/* Display Pool Address if available */}
                {tx.poolAddress && (
                    <p>Pool: <span className="font-mono text-gray-300">{formatAddress(tx.poolAddress)}</span></p>
                )}
                
                {/* Display Price if available */}
                {tx.price !== undefined && (
                    <p>Price: <span className="font-semibold text-green-400">{tx.price.toFixed(4)} SOL</span></p>
                )}

                {/* Display specific args */}
                {tx.instructionName === "createPool" && tx.args.basePrice && (
                  <p>Base Price: {(Number(tx.args.basePrice) / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
                )}
                {tx.instructionName === "mintNft" && tx.args.name && (
                  <p>Name: {tx.args.name}</p>
                )}
                {tx.instructionName === "sellNft" && (
                  <p>NFT Sold (Details in explorer)</p> 
                )}
                
                <p>
                  Signature: 
                  <a 
                    href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} // Adjust cluster as needed
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono ml-1"
                  >
                    {formatAddress(tx.signature)}
                  </a>
                </p>
                {tx.error && <p className="text-red-500 text-xs">Transaction Failed: {JSON.stringify(tx.error)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {canLoadMore && (
        <button 
          onClick={loadMore}
          disabled={isLoading}
          className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
};

export default TransactionHistory;

