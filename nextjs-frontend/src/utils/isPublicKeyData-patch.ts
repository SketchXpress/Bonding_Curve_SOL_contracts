// Utility helpers for BN and PublicKey data checks


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


// Pure utility version of isPublicKeyData logic (no patching)
const patchedIsPublicKeyData = (data: any): boolean => {
  try {
    if (data === undefined || data === null) {
      return false;
    }
    if (isBNLike(data)) {
      if (data._bn === undefined) {
        safeGetProperty(data, '_bn');
      }
    }
    if (data instanceof Uint8Array || Array.isArray(data)) {
      return data.length === 32;
    }
    if (typeof data === 'string') {
      try {
        return data.length >= 32 && data.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(data);
      } catch {
        return false;
      }
    }
    if (data && typeof data === 'object' && data._bn !== undefined) {
      return (
        data._bn instanceof Uint8Array ||
        (Array.isArray(data._bn) && data._bn.length === 32) ||
        isBNLike(data._bn)
      );
    }
    return false;
  } catch (error) {
    return false;
  }
};






export { patchedIsPublicKeyData, safeGetProperty, isBNLike };
