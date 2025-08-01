// Targeted patch for @solana/web3.js isPublicKeyData function
// This intercepts the actual function causing the "_bn" property errors

// Store the original function reference
let originalIsPublicKeyData: any = null;

// Enhanced BN compatibility check
const isBNLike = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check if it's a BN instance or has BN-like properties
  return (
    obj.constructor?.name === 'BN' ||
    obj._bn !== undefined ||
    (typeof obj.toString === 'function' && typeof obj.toNumber === 'function') ||
    (obj.words && Array.isArray(obj.words)) ||
    (obj.negative !== undefined && obj.length !== undefined)
  );
};

// Safe property access function
const safeGetProperty = (obj: any, prop: string): any => {
  try {
    if (!obj) return undefined;
    
    // If accessing _bn property and it doesn't exist, create it
    if (prop === '_bn' && obj._bn === undefined && isBNLike(obj)) {
      // Create a proxy _bn property that returns the object itself
      Object.defineProperty(obj, '_bn', {
        get: function() { return this; },
        set: function(value: any) { /* Allow setting */ },
        configurable: true,
        enumerable: false
      });
      return obj;
    }
    
    return obj[prop];
  } catch {
    return undefined;
  }
};

// Patch function to intercept isPublicKeyData calls
const patchedIsPublicKeyData = (data: any): boolean => {
  try {
    // Handle undefined/null data
    if (data === undefined || data === null) {
      return false;
    }
    
    // If it's a BN-like object, ensure it has _bn property
    if (isBNLike(data)) {
      if (data._bn === undefined) {
        safeGetProperty(data, '_bn');
      }
    }
    
    // Handle array-like data (Uint8Array for public keys)
    if (data instanceof Uint8Array || Array.isArray(data)) {
      return data.length === 32; // Public keys are 32 bytes
    }
    
    // Handle string data (base58 encoded public keys)
    if (typeof data === 'string') {
      try {
        // Basic base58 validation - should be 32-44 characters for a public key
        return data.length >= 32 && data.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(data);
      } catch {
        return false;
      }
    }
    
    // Handle objects with _bn property
    if (data && typeof data === 'object' && data._bn !== undefined) {
      // This might be a PublicKey-like object, check if it has the right structure
      return (
        data._bn instanceof Uint8Array ||
        (Array.isArray(data._bn) && data._bn.length === 32) ||
        isBNLike(data._bn)
      );
    }
    
    // Call original function if available
    if (originalIsPublicKeyData && typeof originalIsPublicKeyData === 'function') {
      return originalIsPublicKeyData(data);
    }
    
    return false;
  } catch (error) {
    console.warn('isPublicKeyData patch error:', error);
    return false;
  }
};

// Module interception system
const interceptSolanaModule = () => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') return;
    
    // Create a module loading interceptor
    const originalDefine = (window as any).define;
    const originalRequire = (window as any).require;
    
    // Patch require function if it exists
    if (originalRequire) {
      (window as any).require = function(moduleName: string, ...args: any[]) {
        const result = originalRequire.call(this, moduleName, ...args);
        
        // Check if this is the Solana web3.js module
        if (moduleName && moduleName.includes('@solana/web3.js')) {
          patchSolanaWeb3Module(result);
        }
        
        return result;
      };
    }
    
    // Try to find and patch existing Solana modules
    setTimeout(() => {
      try {
        // Look for Solana modules in the global scope
        const possibleModules = [
          '@solana/web3.js',
          'solana-web3',
          'web3',
        ];
        
        for (const moduleName of possibleModules) {
          try {
            if (typeof require !== 'undefined') {
              const module = require(moduleName);
              patchSolanaWeb3Module(module);
            }
          } catch {
            // Module not found, continue
          }
        }
      } catch {
        // Ignore errors in module detection
      }
    }, 100);
  } catch (error) {
    console.warn('Failed to set up Solana module interceptor:', error);
  }
};

// Function to patch the actual Solana web3.js module
const patchSolanaWeb3Module = (module: any) => {
  try {
    if (!module) return;
    
    // Look for isPublicKeyData function in the module
    if (module.isPublicKeyData && typeof module.isPublicKeyData === 'function') {
      if (!originalIsPublicKeyData) {
        originalIsPublicKeyData = module.isPublicKeyData;
      }
      module.isPublicKeyData = patchedIsPublicKeyData;
      console.log('✅ Patched isPublicKeyData in @solana/web3.js module');
    }
    
    // Check for PublicKey class and patch its static methods
    if (module.PublicKey) {
      const PublicKeyClass = module.PublicKey;
      
      // Patch static isOnCurve method if it exists
      if (PublicKeyClass.isOnCurve && typeof PublicKeyClass.isOnCurve === 'function') {
        const originalIsOnCurve = PublicKeyClass.isOnCurve;
        PublicKeyClass.isOnCurve = function(pubkey: any) {
          try {
            // Ensure the pubkey has proper structure before calling original
            if (pubkey && typeof pubkey === 'object' && pubkey._bn === undefined && isBNLike(pubkey)) {
              safeGetProperty(pubkey, '_bn');
            }
            return originalIsOnCurve.call(this, pubkey);
          } catch (error) {
            console.warn('PublicKey.isOnCurve patch error:', error);
            return false;
          }
        };
        console.log('✅ Patched PublicKey.isOnCurve');
      }
    }
    
    console.log('✅ Solana web3.js module patching complete');
  } catch (error) {
    console.warn('Failed to patch Solana web3.js module:', error);
  }
};

// Initialize the interceptor
if (typeof window !== 'undefined') {
  interceptSolanaModule();
  
  // Also try direct patching after modules are loaded
  setTimeout(() => {
    try {
      // Try to import and patch the module directly
      import('@solana/web3.js').then(patchSolanaWeb3Module).catch(() => {
        // Ignore import errors
      });
    } catch {
      // Ignore dynamic import errors
    }
  }, 500);
}

export { patchedIsPublicKeyData, safeGetProperty, isBNLike };
