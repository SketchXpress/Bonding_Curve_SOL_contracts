/**
 * Client-side polyfill for BN.js to handle bigint binding issues
 * Browser-compatible version
 */

// Browser-safe BN polyfill
export function applyClientPatches() {
  if (typeof window === 'undefined') {
    // Skip on server side
    return;
  }

  console.log('Applying client-side BN.js patches');
  
  try {
    // Try to get BN from window or global
    let BN = (window as any).BN;
    
    if (!BN) {
      // Try dynamic import for BN
      import('bn.js').then((bnModule) => {
        BN = bnModule.default || bnModule;
        patchBN(BN);
      }).catch((err) => {
        console.warn('Could not load BN.js:', err);
      });
    } else {
      patchBN(BN);
    }
    
  } catch (error) {
    console.warn('Client patches failed:', error);
  }
}

function patchBN(BN: any) {
  if (!BN || !BN.prototype) {
    return;
  }

  // Critical patch: Add _bn property for Solana compatibility
  if (!Object.prototype.hasOwnProperty.call(BN.prototype, '_bn')) {
    Object.defineProperty(BN.prototype, '_bn', {
      get: function() { 
        return this;
      },
      set: function(value) { 
        // Allow setting for compatibility
      },
      configurable: true,
      enumerable: false
    });
  }

  // Ensure toBuffer method exists
  if (!BN.prototype.toBuffer) {
    BN.prototype.toBuffer = function(endian?: string, length?: number) {
      return this.toArrayLike(Buffer, endian, length);
    };
  }

  // Make BN globally available
  if (typeof window !== 'undefined') {
    (window as any).BN = BN;
  }

  console.log('Client-side BN.js patches applied successfully');
}

// Auto-apply patches when loaded
if (typeof window !== 'undefined') {
  applyClientPatches();
}

// Default export
export default { applyClientPatches };
