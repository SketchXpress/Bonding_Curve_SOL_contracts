import { useAnchorContext } from "@/contexts/AnchorContextProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"; // Keep for Metaplex interactions if needed elsewhere
import { useState } from "react";
import { SafeBN, safePublicKey, isValidPublicKeyFormat } from "@/utils/bn-polyfill";
import * as anchor from "@coral-xyz/anchor";

// Define interfaces for the account data structures based on updated IDL
interface BondingCurvePool {
  collection: PublicKey;
  basePrice: anchor.BN;
  growthFactor: anchor.BN;
  currentSupply: anchor.BN;
  protocolFee: anchor.BN;
  creator: PublicKey;
  totalEscrowed: anchor.BN;
  isActive: boolean;
  bump: number;
}

// New hook for creating a collection NFT
export const useCreateCollectionNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [collectionMintAddress, setCollectionMintAddress] = useState<string | null>(null);

  const createCollectionNft = async (
    name: string,
    symbol: string,
    uri: string
  ) => {
    if (!program || !wallet.publicKey || !provider) {
      setError("Wallet not connected or program not initialized");
      return null;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);
    setCollectionMintAddress(null);

    try {
      // Create a new keypair for the collection mint
      const collectionMint = anchor.web3.Keypair.generate();
      setCollectionMintAddress(collectionMint.publicKey.toString());

      // Derive the metadata account address
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
          collectionMint.publicKey.toBuffer(),
        ],
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      );

      // Derive the master edition account address
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
          collectionMint.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      );

      console.log("Creating collection NFT with accounts:", {
        payer: wallet.publicKey.toString(),
        collectionMint: collectionMint.publicKey.toString(),
        metadataAccount: metadataAccount.toString(),
        masterEditionAccount: masterEditionAccount.toString(),
        tokenMetadataProgram: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
      });

      // Execute the transaction with the required accounts and args
      const tx = await program.methods
        .createCollectionNft(name, symbol, uri)
        .accounts({
          payer: wallet.publicKey,
          collectionMint: collectionMint.publicKey,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
          tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([collectionMint]) // Need to include the mint keypair as a signer
        .rpc({
          skipPreflight: false,
          commitment: "confirmed"
        });

      setTxSignature(tx);
      return {
        txSignature: tx,
        collectionMintAddress: collectionMint.publicKey.toString()
      };
    } catch (err) {
      console.error("Error creating collection NFT:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createCollectionNft, loading, error, txSignature, collectionMintAddress };
};

// Removed useBuyToken, useSellToken, useCreateUser hooks as they are obsolete

export const useCreatePool = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const createPool = async (
    basePrice: number,
    growthFactor: number,
    collectionMint: string
  ) => {
    if (!program || !wallet.publicKey || !provider) {
      setError("Wallet not connected or program not initialized");
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Validate collection mint format
      if (typeof collectionMint !== "string" || !isValidPublicKeyFormat(collectionMint)) {
        throw new Error("Invalid collection mint format");
      }
      
      // Use safePublicKey for collection mint
      const collectionMintKey = safePublicKey(collectionMint);
      if (!collectionMintKey) {
        throw new Error("Invalid collection mint address");
      }

      // Find pool account PDA using collection mint as seed
      const [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve-pool"), collectionMintKey.toBuffer()],
        program.programId
      );

      // Use SafeBN for numeric parameters
      const safeBasePrice = new SafeBN(basePrice).toBN();
      const safeGrowthFactor = new SafeBN(growthFactor).toBN();

      console.log("Creating pool with accounts:", {
        creator: wallet.publicKey.toString(),
        collectionMint: collectionMintKey.toString(),
        pool: poolAccount.toString(),
        systemProgram: SystemProgram.programId.toString(),
      });

      // Execute the transaction with updated accounts and args
      const tx = await program.methods
        .createPool(safeBasePrice, safeGrowthFactor)
        .accounts({
          creator: wallet.publicKey,
          collectionMint: collectionMintKey,
          pool: poolAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false,
          commitment: "confirmed"
        });

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error("Error creating pool:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { createPool, loading, error, txSignature };
};

export const useMigrateToTensor = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const migrateToTensor = async (poolAddress: string) => {
    if (!program || !wallet.publicKey) {
      setError("Wallet not connected or program not initialized");
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Validate pool address format
      if (typeof poolAddress !== "string" || !isValidPublicKeyFormat(poolAddress)) {
        throw new Error("Invalid pool address format");
      }
      
      // Use safePublicKey for pool address
      const pool = safePublicKey(poolAddress);
      if (!pool) {
        throw new Error("Invalid pool address");
      }
      
      // Get pool account data to check status
      const poolData = await program.account.bondingCurvePool.fetch(pool) as unknown as BondingCurvePool;

      
      // Check if already migrated (inactive)
      if (!poolData.isActive) {
        throw new Error("Pool already migrated/frozen");
      }

      // Execute the transaction with simplified accounts
      const tx = await program.methods
        .migrateToTensor()
        .accounts({
          authority: wallet.publicKey, // Assuming the wallet user is the authority
          pool,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false,
          commitment: "confirmed"
        });

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error("Error migrating to Tensor:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { migrateToTensor, loading, error, txSignature };
};
