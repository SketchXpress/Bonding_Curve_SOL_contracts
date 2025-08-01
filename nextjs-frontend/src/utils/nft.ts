/**
 * nft.ts
 * Utility functions for NFT operations in the marketplace
 * Handles NFT metadata fetching, listing management, and data processing
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  Metaplex,       // Metaplex SDK for NFT operations
  JsonMetadata,   // Type for NFT metadata JSON
  findMetadataPda // Helper to find metadata PDAs
} from '@metaplex-foundation/js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { Listing } from '../types/marketplace';

// Configuration for retry mechanism
const MAX_RETRIES = 3;        // Maximum number of retry attempts
const RETRY_DELAY = 1000;     // Delay between retries in milliseconds

/**
 * retry
 * Generic retry function for handling transient failures in network requests
 * 
 * @param fn - Function to retry
 * @param retries - Number of retry attempts (default: MAX_RETRIES)
 * @param delay - Delay between retries in ms (default: RETRY_DELAY)
 * @returns Promise resolving to the function result
 */
async function retry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

/**
 * fetchJson
 * Helper function to fetch and parse JSON data with error handling
 * 
 * @param url - URL to fetch JSON from
 * @returns Promise resolving to the parsed JSON data
 * @throws Error if the fetch fails or response is not OK
 */
async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * NFTMetadata
 * Interface representing the metadata for an NFT in our marketplace
 */
export interface NFTMetadata {
  mint: PublicKey;
  name: string;
  image: string;
  owner: PublicKey;
  isListed: boolean;
  listingPubkey?: PublicKey;
}

/**
 * getTokensByOwner
 * Fetches all NFTs owned by a specific wallet address
 * 
 * This function:
 * 1. Gets all token accounts owned by the user
 * 2. Filters for NFTs (tokens with amount 1 and 0 decimals)
 * 3. Fetches metadata for each NFT using Metaplex
 * 4. Returns formatted NFT metadata array
 * 
 * @param connection - Solana connection instance
 * @param owner - Public key of the NFT owner
 * @returns Promise resolving to array of NFT metadata
 */
export async function getTokensByOwner(connection: Connection, owner: PublicKey): Promise<NFTMetadata[]> {
  try {
    const metaplex = new Metaplex(connection);
    
    // Get all token accounts owned by the user
    // Uses retry mechanism for reliability
    const tokenAccounts = await retry(() => 
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Filter for NFTs (tokens with amount 1)
    const nftAccounts = tokenAccounts.value.filter(
      (account) => account.account.data.parsed.info.tokenAmount.amount === '1' &&
      account.account.data.parsed.info.tokenAmount.decimals === 0
    );

    // Fetch metadata for each NFT
    const nftMetadataPromises = nftAccounts.map(async (nftAccount) => {
      const mintPubkey = new PublicKey(nftAccount.account.data.parsed.info.mint);
      
      try {
        // Fetch NFT data using Metaplex
        const nft = await retry(async () => {
          const nftData = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });
          if (!nftData) throw new Error('NFT not found');
          return nftData;
        });

        // Fetch URI data with retry
        const json = await retry(() => fetchJson(nft.uri));

        return {
          mint: mintPubkey,
          name: nft.name,
          image: json.image,
          owner: owner,
          isListed: false, // This will be updated from your listing data
        };
      } catch (error) {
        console.error(`Error fetching metadata for token ${mintPubkey.toString()}:`, error);
        return null;
      }
    });

    const nftMetadataResults = await Promise.all(nftMetadataPromises);
    return nftMetadataResults.filter((metadata): metadata is NFTMetadata => metadata !== null);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return [];
  }
}

/**
 * getAllListedNFTs
 * Fetches all NFTs currently listed in the marketplace
 * 
 * This function:
 * 1. Queries program accounts for active listings
 * 2. Deserializes listing data
 * 3. Fetches NFT metadata for each listed NFT
 * 4. Returns formatted metadata with listing information
 * 
 * @param connection - Solana connection instance
 * @returns Promise resolving to array of listed NFT metadata
 */
export async function getAllListedNFTs(connection: Connection): Promise<NFTMetadata[]> {
  try {
    const metaplex = new Metaplex(connection);
    const LISTING_SEED = 'listing';
    const programId = new PublicKey('ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE'); // Your marketplace program ID

    // Get all program accounts for listings
    const accounts = await retry(() =>
      connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 0, // Depends on your listing account structure
              bytes: LISTING_SEED
            }
          }
        ]
      })
    );

    const listedNFTs = await Promise.all(
      accounts.map(async ({ pubkey, account }) => {
        try {
          // Parse your listing account data based on your program's structure
          const data = account.data;
          const mintPubkey = new PublicKey(data.slice(8, 40)); // Adjust based on your account structure
          const ownerPubkey = new PublicKey(data.slice(40, 72)); // Adjust based on your account structure

          // Fetch NFT data using Metaplex
          const nft = await retry(async () => {
            const nftData = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });
            if (!nftData) throw new Error('NFT not found');
            return nftData;
          });

          // Fetch URI data with retry
          const json = await retry(() => fetchJson(nft.uri));

          const metadata: NFTMetadata = {
            mint: mintPubkey,
            name: nft.name,
            image: json.image,
            owner: ownerPubkey,
            isListed: true,
            listingPubkey: pubkey
          };

          return metadata;
        } catch (error) {
          console.error(`Error processing listing account ${pubkey.toString()}:`, error);
          return null;
        }
      })
    );

    return listedNFTs.filter((nft): nft is NFTMetadata => nft !== null);
  } catch (error) {
    console.error('Error fetching listed NFTs:', error);
    return [];
  }
}
