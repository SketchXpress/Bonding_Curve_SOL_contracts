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
import { AnchorProvider, Idl, BorshInstructionCoder, Program } from "@coral-xyz/anchor";
import { IDL as BondingCurveIDL, PROGRAM_ID } from "../utils/idl";

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
const HELIUS_RPC_ENDPOINT = `https://rpc-devnet.helius.xyz/?api-key=${HELIUS_API_KEY}`; // For RPC calls
const programId = new PublicKey(PROGRAM_ID);

// Helper function to find account index by name in IDL
const findAccountIndex = (idlInstruction: any, accountName: string): number => {
  if (!idlInstruction || !idlInstruction.accounts) return -1;
  return idlInstruction.accounts.findIndex((acc: any) => acc.name === accountName);
};

// Helper to safely get account keys from transaction response
const getAccountKeys = (txDetails: TransactionResponse | VersionedTransactionResponse): PublicKey[] => {
  const message = txDetails.transaction.message;
  
  // For versioned transactions with staticAccountKeys
  if ('staticAccountKeys' in message) {
    return message.staticAccountKeys;
  }
  // For versioned transactions with getAccountKeys method
  else if ('getAccountKeys' in message && typeof message.getAccountKeys === 'function') {
    return message.getAccountKeys();
  }
  // For legacy transactions
  else if ('accountKeys' in message) {
    return message.accountKeys;
  }
  // Fallback case
  else {
    console.warn('Could not extract account keys from transaction message');
    return [];
  }
};





export function useBondingCurveHistory(limit: number = 50) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [canLoadMore, setCanLoadMore] = useState<boolean>(true);
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);

  // Connections for Helius REST and RPC
  const restConnection = new Connection(`${HELIUS_API_BASE}/?api-key=${HELIUS_API_KEY}`, "confirmed");
  const rpcConnection = new Connection(HELIUS_RPC_ENDPOINT, "confirmed");

  // Anchor setup (using RPC connection for potential on-chain reads if needed, though primarily for coder here)
  const provider = new AnchorProvider(rpcConnection, {} as any, { commitment: "confirmed" });
  const program = new Program(BondingCurveIDL as Idl, programId, provider);
  const instructionCoder = program.coder.instruction as BorshInstructionCoder;

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
                const decoded = instructionCoder.decode(relevantInstruction.data, "base58");
                if (decoded) {
                  decodedName = decoded.name;
                  decodedArgs = decoded.data;
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
                    price = await extractPrice(tx, decodedName, relevantInstruction, idlInstruction);
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
    [isLoading, limit, instructionCoder, extractPrice] // Add extractPrice dependency
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

