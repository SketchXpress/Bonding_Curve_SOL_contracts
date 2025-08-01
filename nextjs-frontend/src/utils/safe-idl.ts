// Enhanced IDL type definitions with mandatory address field
// This prevents the undefined address error that causes _bn property issues

import { Idl } from '@coral-xyz/anchor';

export interface BondingCurveIdl extends Idl {
  address: string;
  version: string;
  name: string;
  docs?: string[];
  instructions: any[];
  accounts?: any[];
  types?: any[];
  events?: any[];
  errors?: any[];
  constants?: any[];
}

// Type guard to ensure IDL has required fields
export function isValidBondingCurveIdl(idl: any): idl is BondingCurveIdl {
  return (
    typeof idl === 'object' &&
    idl !== null &&
    typeof idl.address === 'string' &&
    typeof idl.version === 'string' &&
    typeof idl.name === 'string' &&
    Array.isArray(idl.instructions)
  );
}

// Safe IDL creator that ensures address field is present
export function createSafeBondingCurveIdl(
  baseIdl: Omit<BondingCurveIdl, 'address'>,
  programId: string
): BondingCurveIdl {
  const safeIdl: BondingCurveIdl = {
    ...baseIdl,
    address: programId
  };
  
  if (!isValidBondingCurveIdl(safeIdl)) {
    throw new Error('Invalid IDL structure: missing required fields');
  }
  
  return safeIdl;
}

// Enhanced error handling for Program creation
export function createSafeProgram(
  idl: any,
  provider: any,
  programId?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Ensure IDL has address field
      if (!idl.address && programId) {
        idl = { ...idl, address: programId };
      }
      
      if (!idl.address) {
        reject(new Error('IDL must have an address field or programId must be provided'));
        return;
      }
      
      // Validate the IDL structure
      if (!isValidBondingCurveIdl(idl)) {
        reject(new Error('Invalid IDL structure'));
        return;
      }
      
      // Import Program dynamically to ensure patches are applied
      import('@coral-xyz/anchor').then(({ Program }) => {
        try {
          const program = new Program(idl, provider);
          resolve(program);
        } catch (error) {
          reject(new Error(`Failed to create Program: ${error}`));
        }
      }).catch(reject);
      
    } catch (error) {
      reject(new Error(`IDL preparation failed: ${error}`));
    }
  });
}

export type { BondingCurveIdl as default };
