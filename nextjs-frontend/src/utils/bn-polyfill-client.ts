'use client';

/**
 * Enhanced client-side polyfill for BN.js and BigInt functionality
 * This ensures that objects have the _bn property even when native bindings aren't available
 * Specifically targets Solana wallet adapter and Anchor framework BN instances
 */
export function patchBigIntBuffer() {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.log('Applying enhanced client-side BigInt buffer patch for Solana wallet');
      
      // Store original console.error to restore later
      const originalConsoleError = console.error;
      
      // Temporarily suppress specific errors during patching
      console.error = function(...args) {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('_bn') || errorMessage.includes('bigint')) {
          // Suppress specific errors
          return;
        }
        return originalConsoleError.apply(console, args);
      };
      
      // Patch BN.prototype directly if it exists
      if (typeof window.BN !== 'undefined') {
        const BNPrototype = window.BN.prototype;
        
        // Add _bn property to BN prototype if it doesn't exist
        if (!BNPrototype._bn) {
          Object.defineProperty(BNPrototype, '_bn', {
            get: function() {
              // Return this as the _bn property (self-reference)
              return this;
            },
            configurable: true,
            enumerable: false
          });
          console.log('Patched BN.prototype with _bn property');
        }
      }
      
      // Patch Buffer.prototype if needed
      if (typeof Buffer !== 'undefined' && Buffer.prototype) {
        const BufferPrototype = Buffer.prototype;
        if (!BufferPrototype._bn) {
          Object.defineProperty(BufferPrototype, '_bn', {
            get: function() {
              // Create a fallback _bn property
              return {
                toString: () => this.toString('hex')
              };
            },
            configurable: true,
            enumerable: false
          });
        }
      }
      
      // Patch global BigInt if needed
      if (typeof BigInt !== 'undefined') {
        const BigIntPrototype = BigInt.prototype;
        if (!BigIntPrototype._bn) {
          Object.defineProperty(BigIntPrototype, '_bn', {
            get: function() {
              return {
                toString: () => this.toString()
              };
            },
            configurable: true,
            enumerable: false
          });
        }
      }
      
      // Monkey patch the BN constructor to ensure all instances have _bn
      if (typeof window.BN === 'function') {
        const originalBN = window.BN;
        
        // @ts-ignore - Intentionally bypassing TypeScript's type checking for constructor patching
        window.BN = function(...args) {
          // Call the original constructor with arguments
          // @ts-ignore - Intentionally bypassing TypeScript's spread argument check
          const instance = new originalBN(...args);
          
          // Ensure the instance has _bn property
          if (!instance._bn) {
            Object.defineProperty(instance, '_bn', {
              value: instance,
              configurable: true,
              enumerable: false
            });
          }
          
          return instance;
        };
        
        // Copy prototype and static properties
        window.BN.prototype = originalBN.prototype;
        Object.setPrototypeOf(window.BN, originalBN);
        
        console.log('Monkey patched BN constructor to ensure _bn property');
      }
      
      // Patch specific Solana libraries
      patchSolanaLibraries();
      
      // Add a global error handler to catch and fix _bn errors
      window.addEventListener('error', function(event) {
        if (event.error && event.error.message && 
            (event.error.message.includes("Cannot read properties of undefined (reading '_bn')") ||
             event.error.message.includes("Cannot read property '_bn' of undefined"))) {
          console.warn('Caught _bn error, attempting to fix dynamically');
          
          // Try to find and fix the BN instances in the current context
          setTimeout(() => {
            patchAllBNInstances();
            patchSolanaLibraries();
          }, 0);
          
          // Prevent the error from propagating
          event.preventDefault();
        }
      });
      
      // Restore original console.error
      console.error = originalConsoleError;
      
      console.log('Enhanced client-side BigInt buffer patch applied successfully');
    }
  } catch (error) {
    console.error('Error applying enhanced client-side BigInt buffer patch:', error);
  }
}

/**
 * Patch specific Solana libraries that use BN
 */
function patchSolanaLibraries() {
  try {
    // Check for Solana wallet adapter
    if (window.solana) {
      console.log('Patching Solana wallet adapter');
      
      // Patch solana.BN if it exists
      if (window.solana.BN) {
        const originalSolanaBN = window.solana.BN;
        
        // @ts-ignore - Intentionally bypassing TypeScript's type checking
        window.solana.BN = function(...args) {
          // @ts-ignore - Intentionally bypassing TypeScript's type checking
          const instance = new originalSolanaBN(...args);
          
          if (!instance._bn) {
            Object.defineProperty(instance, '_bn', {
              value: instance,
              configurable: true,
              enumerable: false
            });
          }
          
          return instance;
        };
        
        // @ts-ignore - Intentionally bypassing TypeScript's type checking
        window.solana.BN.prototype = originalSolanaBN.prototype;
        // @ts-ignore - Intentionally bypassing TypeScript's type checking
        Object.setPrototypeOf(window.solana.BN, originalSolanaBN);
      }
    }
    
    // Check for @solana/web3.js
    if (window.solanaWeb3) {
      console.log('Patching @solana/web3.js');
      patchObjectRecursively(window.solanaWeb3);
    }
    
    // Check for @coral-xyz/anchor
    if (window.anchor) {
      console.log('Patching @coral-xyz/anchor');
      patchObjectRecursively(window.anchor);
    }
    
    // Patch any global BN-related objects
    if (window.BN) patchObjectRecursively(window.BN);
    
    console.log('Completed Solana libraries patching');
  } catch (error) {
    console.error('Error in patchSolanaLibraries:', error);
  }
}

/**
 * Recursively patch all BN instances in an object
 */
function patchObjectRecursively(obj: unknown, depth = 0, visited = new Set<object>()) {
  // Prevent infinite recursion and cycles
  if (depth > 5 || obj === null || typeof obj !== 'object' || visited.has(obj as object)) return;
  visited.add(obj as object);
  
  // Check if this is a BN instance
  const objRecord = obj as Record<string, unknown>;
  if (objRecord.constructor && 
      (objRecord.constructor.name === 'BN' || objRecord.constructor.name === 'BigNumber')) {
    if (!objRecord._bn) {
      Object.defineProperty(objRecord, '_bn', {
        value: obj,
        configurable: true,
        enumerable: false
      });
    }
  }
  
  // Recursively check all properties
  try {
    for (const key in objRecord) {
      try {
        if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
          const value = objRecord[key];
          if (value && typeof value === 'object') {
            patchObjectRecursively(value, depth + 1, visited);
          }
        }
      } catch {
        // Ignore errors on individual properties
      }
    }
  } catch {
    // Ignore errors on iteration
  }
}

/**
 * Recursively patch all BN instances in the window object
 */
function patchAllBNInstances() {
  try {
    // Start patching from the window object
    patchObjectRecursively(window);
    
    // Specifically target wallet connection objects
    const solanaWindow = window as unknown as {
      solana?: {
        // @ts-ignore - Intentionally bypassing TypeScript's type checking
        connect: (...args: any[]) => Promise<any>;
        BN?: unknown;
      };
      solanaWeb3?: unknown;
      anchor?: unknown;
      BN?: unknown;
    };
    
    if (solanaWindow.solana && solanaWindow.solana.connect) {
      // Monkey patch the connect method
      const originalConnect = solanaWindow.solana.connect;
      
      // @ts-ignore - Intentionally bypassing TypeScript's type checking
      solanaWindow.solana.connect = async function(...args) {
        try {
          // @ts-ignore - Intentionally bypassing TypeScript's type checking
          const result = await originalConnect.apply(this, args);
          
          // After connection, patch any new BN instances
          setTimeout(() => {
            patchObjectRecursively(solanaWindow.solana);
            console.log('Patched BN instances after wallet connection');
          }, 100);
          
          return result;
        } catch (error) {
          console.error('Error in patched connect method:', error);
          throw error;
        }
      };
      
      console.log('Monkey patched wallet connect method');
    }
    
    console.log('Completed recursive patching of BN instances');
  } catch (error) {
    console.error('Error in patchAllBNInstances:', error);
  }
}

// Add global type definitions for the window object
declare global {
  interface Window {
    BN: unknown;
    solana?: unknown;
    solanaWeb3?: unknown;
    anchor?: unknown;
  }
}

export default patchBigIntBuffer;
