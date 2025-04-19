/**
 * Polyfill and safety wrapper for BN.js to handle bigint binding issues
 * This file provides safe wrappers and polyfills for BN.js functionality
 * to prevent "Cannot read properties of undefined (reading '_bn')" errors
 */

import BN from 'bn.js';
import * as bigintBufferModule from 'bigint-buffer';
import { PublicKey } from '@solana/web3.js';

// Define proper types for bigint-buffer methods
interface BigIntBuffer {
  toBigIntLE?: (buffer: Buffer) => bigint;
  toBufferLE?: (value: bigint, length: number) => Buffer;
  // Add other methods if needed
}

/**
 * Safely creates a PublicKey instance with error handling
 * @param value - The value to convert to PublicKey
 * @returns A PublicKey instance or null if creation fails
 */
export function safePublicKey(value: string | Buffer | Uint8Array | number[] | PublicKey | null | undefined): PublicKey | null {
  if (!value) {
    console.warn('Attempted to create PublicKey from null or undefined value');
    return null;
  }
  
  try {
    return new PublicKey(value);
  } catch (error) {
    console.error('Error creating PublicKey:', error);
    return null;
  }
}

/**
 * Safely creates a BN instance with error handling
 * @param value - The value to convert to BN
 * @param base - Optional base for string conversion
 * @returns A BN instance or null if creation fails
 */
export function safeBN(value: string | number | BN | Buffer | null | undefined, base?: number): BN | null {
  try {
    if (value === null || value === undefined) {
      console.warn('Attempted to create BN from null or undefined value');
      return null;
    }
    
    return new BN(value, base);
  } catch (error) {
    console.error('Error creating BN instance:', error);
    return null;
  }
}

/**
 * Safe wrapper for BN operations that handles null values
 */
export class SafeBN {
  private _bn: BN | null;

  constructor(value: string | number | BN | Buffer | null | undefined, base?: number) {
    this._bn = safeBN(value, base);
  }

  /**
   * Get the underlying BN instance
   */
  get bn(): BN | null {
    return this._bn;
  }

  /**
   * Convert to BN safely
   */
  toBN(): BN {
    if (!this._bn) {
      // Return a default BN(0) if the internal BN is null
      console.warn('Attempted to use null BN, returning BN(0) as fallback');
      return new BN(0);
    }
    return this._bn;
  }

  /**
   * Safe add operation
   */
  add(value: SafeBN | BN | number | string): SafeBN {
    if (!this._bn) {
      return new SafeBN(0);
    }
    
    try {
      if (value instanceof SafeBN) {
        return new SafeBN(this._bn.add(value.toBN()));
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return new SafeBN(this._bn.add(bnValue));
      }
    } catch (error) {
      console.error('Error in SafeBN.add:', error);
      return new SafeBN(this._bn);
    }
  }

  /**
   * Safe subtract operation
   */
  sub(value: SafeBN | BN | number | string): SafeBN {
    if (!this._bn) {
      return new SafeBN(0);
    }
    
    try {
      if (value instanceof SafeBN) {
        return new SafeBN(this._bn.sub(value.toBN()));
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return new SafeBN(this._bn.sub(bnValue));
      }
    } catch (error) {
      console.error('Error in SafeBN.sub:', error);
      return new SafeBN(this._bn);
    }
  }

  /**
   * Safe multiply operation
   */
  mul(value: SafeBN | BN | number | string): SafeBN {
    if (!this._bn) {
      return new SafeBN(0);
    }
    
    try {
      if (value instanceof SafeBN) {
        return new SafeBN(this._bn.mul(value.toBN()));
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return new SafeBN(this._bn.mul(bnValue));
      }
    } catch (error) {
      console.error('Error in SafeBN.mul:', error);
      return new SafeBN(this._bn);
    }
  }

  /**
   * Safe divide operation
   */
  div(value: SafeBN | BN | number | string): SafeBN {
    if (!this._bn) {
      return new SafeBN(0);
    }
    
    try {
      if (value instanceof SafeBN) {
        if (!value.bn || value.bn.isZero()) {
          console.error('Division by zero attempted');
          return new SafeBN(this._bn);
        }
        return new SafeBN(this._bn.div(value.toBN()));
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        if (bnValue.isZero()) {
          console.error('Division by zero attempted');
          return new SafeBN(this._bn);
        }
        return new SafeBN(this._bn.div(bnValue));
      }
    } catch (error) {
      console.error('Error in SafeBN.div:', error);
      return new SafeBN(this._bn);
    }
  }

  /**
   * Convert to string
   */
  toString(base?: number): string {
    if (!this._bn) {
      return '0';
    }
    try {
      return this._bn.toString(base);
    } catch (error) {
      console.error('Error in SafeBN.toString:', error);
      return '0';
    }
  }

  /**
   * Convert to number
   */
  toNumber(): number {
    if (!this._bn) {
      return 0;
    }
    try {
      return this._bn.toNumber();
    } catch (error) {
      console.error('Error in SafeBN.toNumber:', error);
      return 0;
    }
  }

  /**
   * Check if equal to another value
   */
  eq(value: SafeBN | BN | number | string): boolean {
    if (!this._bn) {
      return false;
    }
    
    try {
      if (value instanceof SafeBN) {
        return value.bn ? this._bn.eq(value.bn) : false;
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return this._bn.eq(bnValue);
      }
    } catch (error) {
      console.error('Error in SafeBN.eq:', error);
      return false;
    }
  }

  /**
   * Check if greater than another value
   */
  gt(value: SafeBN | BN | number | string): boolean {
    if (!this._bn) {
      return false;
    }
    
    try {
      if (value instanceof SafeBN) {
        return value.bn ? this._bn.gt(value.bn) : true;
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return this._bn.gt(bnValue);
      }
    } catch (error) {
      console.error('Error in SafeBN.gt:', error);
      return false;
    }
  }

  /**
   * Check if less than another value
   */
  lt(value: SafeBN | BN | number | string): boolean {
    if (!this._bn) {
      return false;
    }
    
    try {
      if (value instanceof SafeBN) {
        return value.bn ? this._bn.lt(value.bn) : false;
      } else {
        const bnValue = value instanceof BN ? value : new BN(value);
        return this._bn.lt(bnValue);
      }
    } catch (error) {
      console.error('Error in SafeBN.lt:', error);
      return false;
    }
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return !this._bn || this._bn.isZero();
  }
}

/**
 * Patch for bigint-buffer to handle missing native bindings
 * This helps prevent the "Failed to load bindings, pure JS will be used" error
 */
export function patchBigintBuffer() {
  try {
    // Use the imported module with proper typing
    const bigintBuffer = bigintBufferModule as BigIntBuffer;
    
    // Check if the module has the expected methods
    if (!bigintBuffer.toBigIntLE || !bigintBuffer.toBufferLE) {
      console.warn('bigint-buffer methods missing, applying polyfill');
      
      // Simple polyfill for toBigIntLE if missing
      if (!bigintBuffer.toBigIntLE) {
        bigintBuffer.toBigIntLE = function(buffer: Buffer): bigint {
          try {
            // Simple implementation for little-endian conversion
            let result = 0n;
            for (let i = buffer.length - 1; i >= 0; i--) {
              result = (result << 8n) + BigInt(buffer[i]);
            }
            return result;
          } catch (error) {
            console.error('Error in toBigIntLE polyfill:', error);
            return 0n;
          }
        };
      }
      
      // Simple polyfill for toBufferLE if missing
      if (!bigintBuffer.toBufferLE) {
        bigintBuffer.toBufferLE = function(value: bigint, length: number): Buffer {
          try {
            const buffer = Buffer.alloc(length);
            let tempValue = value;
            for (let i = 0; i < length; i++) {
              buffer[i] = Number(tempValue & 0xffn);
              tempValue = tempValue >> 8n;
            }
            return buffer;
          } catch (error) {
            console.error('Error in toBufferLE polyfill:', error);
            return Buffer.alloc(length);
          }
        };
      }
    }
    
    console.log('bigint-buffer patched successfully');
  } catch (error) {
    console.error('Failed to patch bigint-buffer:', error);
  }
}

// Apply the patch immediately when this module is imported
patchBigintBuffer();

export default SafeBN;
