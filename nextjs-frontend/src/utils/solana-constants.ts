/**
 * Centralized Solana Constants
 * 
 * This file provides reliable, hard-coded Solana program IDs to avoid
 * import issues with bundled packages in Next.js environment.
 * 
 * These constants are used throughout the application to ensure consistent
 * and correct program IDs are passed to transactions.
 */

import { PublicKey } from '@solana/web3.js';

// Token Program IDs - Hard-coded to avoid bundling issues
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Metaplex Program IDs
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// System Program
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111112');

// Rent Sysvar
export const RENT_SYSVAR_ID = new PublicKey('SysvarRent111111111111111111111111111111111');

// Bonding Curve Program ID (from deployment)
export const BONDING_CURVE_PROGRAM_ID = new PublicKey('ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE');

/**
 * Validates that all program IDs are correct
 */
export function validateProgramIds(): boolean {
  const expectedIds = {
    TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    METADATA_PROGRAM_ID: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    SYSTEM_PROGRAM_ID: '11111111111111111111111111111112',
    RENT_SYSVAR_ID: 'SysvarRent111111111111111111111111111111111',
    BONDING_CURVE_PROGRAM_ID: 'ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE'
  };

  const actualIds = {
    TOKEN_PROGRAM_ID: TOKEN_PROGRAM_ID.toString(),
    ASSOCIATED_TOKEN_PROGRAM_ID: ASSOCIATED_TOKEN_PROGRAM_ID.toString(),
    METADATA_PROGRAM_ID: METADATA_PROGRAM_ID.toString(),
    SYSTEM_PROGRAM_ID: SYSTEM_PROGRAM_ID.toString(),
    RENT_SYSVAR_ID: RENT_SYSVAR_ID.toString(),
    BONDING_CURVE_PROGRAM_ID: BONDING_CURVE_PROGRAM_ID.toString()
  };

  let isValid = true;
  for (const [key, expected] of Object.entries(expectedIds)) {
    const actual = actualIds[key as keyof typeof actualIds];
    if (actual !== expected) {
      console.error(`Program ID mismatch for ${key}: expected ${expected}, got ${actual}`);
      isValid = false;
    }
  }

  if (isValid) {
    console.log('✓ All program IDs validated successfully');
  }

  return isValid;
}

// Helper functions for associated token addresses
// Note: Import these directly from @solana/spl-token in your files to avoid conflicts
// export { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Export commonly used types
// export type { Account, Mint } from '@solana/spl-token';
