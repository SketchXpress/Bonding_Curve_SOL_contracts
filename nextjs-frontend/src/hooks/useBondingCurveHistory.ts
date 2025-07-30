// /home/ubuntu/Bonding_Curve_SOL_contracts/nextjs-frontend/src/hooks/useBondingCurveHistory_updated.ts
// Updated implementation incorporating the provided solution for sell NFT fee detection.

import { useState, useEffect, useCallback } from "react";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection, // Used for both REST and RPC connections
  SystemProgram,
  TransactionResponse, // Import TransactionResponse type
  VersionedTransactionResponse, // Import VersionedTransactionResponse type
} from "@solana/web3.js";
import { AnchorProvider, Idl, InstructionCoder, Program } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "../utils/idl";
import { BondingCurveSystem } from "../types/bonding_curve_system";
// Import IDL directly from JSON file to avoid any TypeScript compilation issues
import BondingCurveIDL from "../idl/bonding_curve_system.json";

// Safe BN handling function to prevent _bn errors
const safeConvertBNObjects = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  try {
    // Handle BN objects with safer detection
    if (obj && typeof obj === 'object') {
      // Check for BN objects more safely
      const isBN = (
        obj.constructor && 
        (obj.constructor.name === 'BN' || 
         obj.constructor.toString().includes('BN') ||
         typeof obj.toString === 'function' && 
         typeof obj.toNumber === 'function' &&
         typeof obj.add === 'function')
      );
      
      if (isBN) {
        try {
          // Never access _bn property directly, just use toString
          return obj.toString();
        } catch (error) {
          console.warn('Error converting BN object:', error);
          return '0'; // Return safe default
        }
      }
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => {
        try {
          return safeConvertBNObjects(item);
        } catch (error) {
          console.warn('Error converting array item:', error);
          return item;
        }
      });
    }
    
    // Handle objects
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          try {
            result[key] = safeConvertBNObjects(obj[key]);
          } catch (error) {
            console.warn(`Error converting property ${key}:`, error);
            result[key] = obj[key]; // Keep original value if conversion fails
          }
        }
      }
      return result;
    }
    
    return obj;
  } catch (error) {
    console.warn('Error in safeConvertBNObjects:', error);
    return obj; // Return original object if all else fails
  }
};

// Define interfaces for Helius API responses
interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

// Simplified Helius Transaction type from /addresses endpoint
interface HeliusSignatureInfo {
  signature: string;
  timestamp: number;
  // Add other relevant fields if needed from this endpoint
}

// Enhanced Helius Transaction type from /transactions POST endpoint
interface HeliusEnhancedTransaction {
  signature: string;
  description?: string;
  type?: string;
  source?: string;
  fee?: number;
  feePayer: string;
  slot?: number;
  timestamp?: number;
  nativeTransfers?: NativeTransfer[];
  tokenTransfers?: any[];
  accountData?: any[];
  transactionError?: any;
  instructions: any[]; // Contains programId, accounts, data (base58)
  events?: any;
}

// Export the HistoryItem interface (no changes needed here)
export interface HistoryItem {
  signature: string;
  blockTime: number | null | undefined;
  instructionName: string;
  accounts: PublicKey[];
  args: any;
  description: string;
  type: string;
  source: string;
  error: any;
  poolAddress?: string; // Added: Pool address involved
  price?: number; // Added: Price in SOL
}

// Helius API Configuration (Separate REST and RPC)
const HELIUS_API_KEY = "69b4db73-1ed1-4558-8e85-192e0994e556"; // Use environment variable in production
const HELIUS_API_BASE = `https://api-devnet.helius.xyz/v0`; // For REST API calls
const HELIUS_RPC_ENDPOINT = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`; // For RPC calls
const programId = new PublicKey(PROGRAM_ID);

// Helper function to find account index by name in IDL
const findAccountIndex = (idlInstruction: any, accountName: string): number => {
  if (!idlInstruction || !idlInstruction.accounts) return -1;
  return idlInstruction.accounts.findIndex((acc: any) => acc.name === accountName);
};

// Revised Helper v2: Check legacy first
const getAccountKeys = (txDetails: TransactionResponse | VersionedTransactionResponse): PublicKey[] => {
  // Ensure txDetails and the nested properties exist
  if (!txDetails?.transaction?.message) {
    console.warn("Transaction details or message is missing");
    return [];
  }

  const message = txDetails.transaction.message;

  // Check if it's a legacy TransactionMessage (presence of accountKeys is definitive)
  if ("accountKeys" in message) {
    // It's a TransactionMessage
    return message.accountKeys; // Should be safe now
  }
  // Check if it's a VersionedMessage (presence of staticAccountKeys is definitive)
  else if ("staticAccountKeys" in message) {
    // It's a VersionedMessage
    return message.staticAccountKeys;
  }
  // Fallback if neither expected structure is found
  else {
    console.warn("Could not extract account keys from transaction message: Unknown format");
    // Attempt to log the message structure for debugging
    try {
      console.log("Unknown message structure:", JSON.stringify(message));
    } catch { /* Ignore stringify errors */ }
    return [];
  }
};





export function useBondingCurveHistory(limit: number = 50) {
  // Ensure polyfill is applied before any BN operations
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        require('../utils/bn-polyfill-direct.js');
        console.log('useBondingCurveHistory: Applied polyfill');
      }
    } catch (error) {
      console.warn('Failed to apply BN polyfill in useBondingCurveHistory:', error);
    }
  }, []);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [canLoadMore, setCanLoadMore] = useState<boolean>(true);
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);

  // Wrap the entire hook logic in a try-catch to prevent _bn errors from crashing the app
  const safeWrapper = useCallback((fn: () => any) => {
    try {
      return fn();
    } catch (error: any) {
      if (error.message && error.message.includes('_bn')) {
        console.warn('Caught _bn error, attempting to recover:', error);
        // Try to reapply the polyfill
        try {
          if (typeof window !== 'undefined') {
            require('../utils/bn-polyfill-direct.js');
          }
        } catch (patchError) {
          console.error('Failed to reapply polyfill:', patchError);
        }
        // Return a safe default
        return null;
      }
      throw error; // Re-throw non-_bn errors
    }
  }, []);

  // Connections for Helius REST and RPC
  const restConnection = new Connection(`${HELIUS_API_BASE}/?api-key=${HELIUS_API_KEY}`, "confirmed");
  const rpcConnection = new Connection(HELIUS_RPC_ENDPOINT, "confirmed");

  // Anchor setup (using RPC connection for potential on-chain reads if needed, though primarily for coder here)
  const wallet = {
    publicKey: SystemProgram.programId,
    signTransaction: async () => { throw new Error('Not implemented'); },
    signAllTransactions: async () => { throw new Error('Not implemented'); },
  };
  const provider = new AnchorProvider(rpcConnection, wallet, { commitment: "confirmed" });
  const program = new Program(BondingCurveIDL as unknown as Idl, provider);
  const instructionCoder = program.coder.instruction as InstructionCoder;

  // --- Function to extract price --- 
  const extractPrice = async (
    tx: HeliusEnhancedTransaction,
    decodedName: string,
    relevantInstruction: any,
    idlInstruction: any
  ): Promise<number | undefined> => {
    let price: number | undefined = undefined;
    let escrowAddress: string | undefined = undefined;

    // Find escrow address if relevant
    if (decodedName === "mintNft" || decodedName === "sellNft") {
      const escrowAccountIndex = findAccountIndex(idlInstruction, "escrow");
      if (escrowAccountIndex !== -1 && relevantInstruction.accounts.length > escrowAccountIndex) {
        escrowAddress = relevantInstruction.accounts[escrowAccountIndex];
      }
    }

    // --- Mint Price Extraction (using nativeTransfers from Enhanced API) ---
    if (decodedName === "mintNft" && escrowAddress && tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
      const payer = tx.feePayer; // Assume fee payer is the buyer
      console.log(`[${tx.signature}] (Mint) Looking for transfer from payer: ${payer} to escrow: ${escrowAddress}`);
      const transfersToEscrow = tx.nativeTransfers
        .filter((transfer: NativeTransfer) =>
          transfer.fromUserAccount === payer &&
          transfer.toUserAccount === escrowAddress
        )
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending

      if (transfersToEscrow.length > 0) {
        price = transfersToEscrow[0].amount / LAMPORTS_PER_SOL;
        console.log(`[${tx.signature}] (Mint) 💰 Found price via nativeTransfer: ${price} SOL`);
      } else {
        console.log(`[${tx.signature}] (Mint) ❌ No matching nativeTransfer found.`);
      }
    }
    // --- Sell Price Extraction (using getTransaction and balance changes) ---
    else if (decodedName === "sellNft" && escrowAddress) {
      console.log(`[${tx.signature}] (Sell) Attempting price extraction via getTransaction for escrow: ${escrowAddress}`);
      try {
        // Use RPC connection to get full transaction details
        const txDetails = await rpcConnection.getTransaction(tx.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0 // Request version 0 for balance info
        });

        if (txDetails?.meta?.preBalances && txDetails?.meta?.postBalances) {
          const preBalances = txDetails.meta.preBalances;
          const postBalances = txDetails.meta.postBalances;
          const accountKeys = getAccountKeys(txDetails); // Use helper to get keys
          const accountKeysStrings = accountKeys.map(pk => pk.toBase58());

          const escrowAccountIndexInTx = accountKeysStrings.findIndex(key => key === escrowAddress);
          const sellerAddress = tx.feePayer; // Assume fee payer is the seller
          const sellerAccountIndexInTx = accountKeysStrings.findIndex(key => key === sellerAddress);

          console.log(`[${tx.signature}] (Sell) Escrow index: ${escrowAccountIndexInTx}, Seller index: ${sellerAccountIndexInTx}`);

          if (escrowAccountIndexInTx !== -1 && preBalances.length > escrowAccountIndexInTx && postBalances.length > escrowAccountIndexInTx) {
            const escrowPreBalance = preBalances[escrowAccountIndexInTx];
            const escrowPostBalance = postBalances[escrowAccountIndexInTx];
            const escrowBalanceChange = (escrowPreBalance - escrowPostBalance);

            console.log(`[${tx.signature}] (Sell) Escrow Balance Change (lamports): ${escrowBalanceChange}`);

            // Use the escrow's decrease in balance as the price
            // Add a small tolerance for potential rent changes or minor discrepancies
            if (escrowBalanceChange > 1000) { // Check if change is significant (more than dust)
              price = escrowBalanceChange / LAMPORTS_PER_SOL;
              console.log(`[${tx.signature}] (Sell) 💰 Found price via balance change: ${price} SOL`);

              // Optional: Verify seller's balance increase as a sanity check
              if (sellerAccountIndexInTx !== -1 && preBalances.length > sellerAccountIndexInTx && postBalances.length > sellerAccountIndexInTx) {
                const sellerPreBalance = preBalances[sellerAccountIndexInTx];
                const sellerPostBalance = postBalances[sellerAccountIndexInTx];
                const sellerBalanceChange = (sellerPostBalance - sellerPreBalance);
                console.log(`[${tx.signature}] (Sell) Seller Balance Change (lamports): ${sellerBalanceChange}`);
                // You might compare sellerBalanceChange with escrowBalanceChange here
              }
            } else {
               console.log(`[${tx.signature}] (Sell) ⚠️ Escrow balance change is not significant.`);
            }
          } else {
            console.log(`[${tx.signature}] (Sell) ❌ Escrow account index not found in transaction details.`);
          }
        } else {
          console.log(`[${tx.signature}] (Sell) ❌ Could not get pre/post balances from getTransaction.`);
        }
      } catch (err: any) {
        console.error(`[${tx.signature}] (Sell) Error fetching/processing transaction details:`, err.message);
        // Fallback or error state could be set here
      }
    }

    return price;
  };
  // --- End extractPrice --- 

  const fetchHeliusHistory = useCallback(
    async (fetchBeforeSignature?: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Get signatures using Helius REST API (/addresses endpoint)
        let signaturesUrl = `${HELIUS_API_BASE}/addresses/${programId.toBase58()}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`;
        if (fetchBeforeSignature) {
          signaturesUrl += `&before=${fetchBeforeSignature}`;
        }

        console.log("Fetching transaction signatures from:", signaturesUrl);
        const signaturesResponse = await fetch(signaturesUrl);
        if (!signaturesResponse.ok) {
          const errorData = await signaturesResponse.json().catch(() => ({ message: signaturesResponse.statusText }));
          throw new Error(`Helius Signatures API Error: ${signaturesResponse.status} - ${errorData.message || "Failed to fetch signatures"}`);
        }
        const signaturesResponseData: HeliusSignatureInfo[] = await signaturesResponse.json();
        console.log(`Received ${signaturesResponseData.length} transaction signatures`);

        if (!Array.isArray(signaturesResponseData)) {
          throw new Error("Unexpected response format from Helius Signatures API");
        }
        if (signaturesResponseData.length === 0) {
          setCanLoadMore(false);
          setIsLoading(false);
          return;
        }
        if (signaturesResponseData.length < limit) {
          setCanLoadMore(false);
        }

        const signatures = signaturesResponseData.map((tx) => tx.signature);
        const basicInfoMap = new Map(signaturesResponseData.map(tx => [tx.signature, { timestamp: tx.timestamp }]));

        // Step 2: Get enhanced transaction data using Helius REST API (/transactions POST endpoint)
        console.log("Fetching enhanced transaction data for signatures:", signatures);
        const transactionsUrl = `${HELIUS_API_BASE}/transactions?api-key=${HELIUS_API_KEY}`;
        const detailedResponse = await fetch(transactionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: signatures }),
        });

        if (!detailedResponse.ok) {
          const errorData = await detailedResponse.json().catch(() => ({ message: detailedResponse.statusText }));
          throw new Error(`Helius Transactions API Error: ${detailedResponse.status} - ${errorData.message || "Failed to fetch transactions"}`);
        }
        const detailedTransactionsData: HeliusEnhancedTransaction[] = await detailedResponse.json();
        console.log(`Received ${detailedTransactionsData.length} enhanced transactions`);

        if (!Array.isArray(detailedTransactionsData)) {
          throw new Error("Unexpected response format from Helius Transactions API");
        }

        // Step 3: Process transactions and extract info (including price)
        const parsedHistoryPromises: Promise<HistoryItem | null>[] = detailedTransactionsData.map(async (tx) => {
          return safeWrapper(async () => {
            const basicInfo = basicInfoMap.get(tx.signature);
            if (!basicInfo) return null; // Skip if no basic info (shouldn't happen)

            let decodedName = "Unknown";
            let decodedArgs: any = {};
            let decodedAccounts: PublicKey[] = [];
            let poolAddress: string | undefined = undefined;
            let price: number | undefined = undefined;
            let relevantInstruction: any = undefined;
            let idlInstruction: any = undefined;

          if (tx.instructions && Array.isArray(tx.instructions)) {
            const mainProgramInstructionIndex = tx.instructions.findIndex(
              (ix: any) => ix.programId === programId.toBase58() && ix.data
            );
            relevantInstruction = tx.instructions[mainProgramInstructionIndex];

            if (relevantInstruction) {
              try {
                const decoded = (instructionCoder as any).decode(relevantInstruction.data, "base58");
                if (decoded && decoded.name) {
                  decodedName = decoded.name;
                  // Apply safe conversion to handle BN objects without _bn property
                  try {
                    // Ensure decoded.data exists and is an object before processing
                    if (decoded.data && typeof decoded.data === 'object') {
                      decodedArgs = safeConvertBNObjects(decoded.data);
                    } else {
                      decodedArgs = {};
                    }
                  } catch (argsError) {
                    console.warn(`[${tx.signature}] Error converting decoded args:`, argsError);
                    decodedArgs = {}; // Use empty object as fallback
                  }
                  
                  if (relevantInstruction.accounts && Array.isArray(relevantInstruction.accounts)) {
                    decodedAccounts = relevantInstruction.accounts.map((acc: string) => new PublicKey(acc));
                    idlInstruction = BondingCurveIDL.instructions.find(ix => ix.name === decodedName);

                    // Extract Pool Address
                    const poolAccountIndex = findAccountIndex(idlInstruction, "pool");
                    if (poolAccountIndex !== -1 && relevantInstruction.accounts.length > poolAccountIndex) {
                      poolAddress = relevantInstruction.accounts[poolAccountIndex];
                    }

                    // --- Extract Price --- 
                    // Call the dedicated price extraction function
                    try {
                      price = await extractPrice(tx, decodedName, relevantInstruction, idlInstruction);
                    } catch (priceError) {
                      console.warn(`[${tx.signature}] Error extracting price:`, priceError);
                      price = undefined; // Set to undefined if price extraction fails
                    }
                    // --- End Extract Price ---
                  }
                }
              } catch (e) {
                console.error(`[${tx.signature}] Error decoding instruction:`, e);
              }
            }
          }

          return {
            signature: tx.signature,
            blockTime: basicInfo.timestamp,
            instructionName: decodedName,
            accounts: decodedAccounts,
            args: decodedArgs,
            description: tx.description || "",
            type: tx.type || "",
            source: tx.source || "",
            error: tx.transactionError,
            poolAddress: poolAddress,
            price: price,
          };
          }) || null; // Close safeWrapper and provide fallback
        });

        // Wait for all price extractions and processing to complete
        const parsedHistoryResults = await Promise.all(parsedHistoryPromises);
        const parsedHistory = parsedHistoryResults.filter(item => item !== null) as HistoryItem[];

        if (parsedHistory.length > 0) {
          const newLastSignature = parsedHistory[parsedHistory.length - 1].signature;
          setLastSignature(newLastSignature);

          // Update state (ensure no duplicates and maintain sort order)
          setHistory((prev) => {
            const existingSignatures = new Set(prev.map((item) => item.signature));
            const newItems = parsedHistory.filter((item) => !existingSignatures.has(item.signature));
            const combined = [...newItems, ...prev];
            combined.sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0)); // Sort descending by time
            return combined;
          });
        }
      } catch (err: any) {
        console.error("Error in fetchHeliusHistory:", err);
        setError(err.message || "Failed to fetch transaction history");
        setCanLoadMore(false); // Stop loading more on error
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, limit, instructionCoder, extractPrice, safeWrapper] // Add safeWrapper dependency
  );

  // Initial fetch
  useEffect(() => {
    if (history.length === 0 && !isLoading && canLoadMore) {
      fetchHeliusHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Function to load more history items
  const loadMore = () => {
    if (canLoadMore && lastSignature && !isLoading) {
      fetchHeliusHistory(lastSignature);
    }
  };

  return { history, isLoading, error, loadMore, canLoadMore };
}

