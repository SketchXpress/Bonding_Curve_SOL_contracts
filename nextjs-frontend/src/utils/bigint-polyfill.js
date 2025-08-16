// BigInt polyfill for Node.js and browser compatibility
// This module provides BigInt support where it's not natively available

console.log('[BigInt Polyfill] Initializing BigInt compatibility...');

/**
 * Apply BigInt polyfill if needed
 */
function applyBigIntPolyfill() {
  try {
    // Check if BigInt is already available
    if (typeof BigInt !== 'undefined') {
      console.log('[BigInt Polyfill] ✓ Native BigInt support detected');
      return true;
    }
    
    console.log('[BigInt Polyfill] Native BigInt not available, creating polyfill...');
    
    // Simple BigInt polyfill for basic operations
    const BigIntPolyfill = function(value) {
      // Convert various inputs to string representation
      if (typeof value === 'string') {
        this.value = value;
      } else if (typeof value === 'number') {
        this.value = Math.floor(value).toString();
      } else if (value && value.toString) {
        this.value = value.toString();
      } else {
        this.value = '0';
      }
      
      // Mark as BigInt-like
      this.__isBigInt__ = true;
    };
    
    BigIntPolyfill.prototype = {
      toString: function(radix) {
        if (radix && radix !== 10) {
          try {
            return parseInt(this.value, 10).toString(radix);
          } catch (e) {
            return this.value;
          }
        }
        return this.value;
      },
      
      valueOf: function() {
        return this.value;
      },
      
      toNumber: function() {
        return parseInt(this.value, 10) || 0;
      }
    };
    
    // Install globally
    if (typeof window !== 'undefined') {
      window.BigInt = BigIntPolyfill;
    }
    if (typeof global !== 'undefined') {
      global.BigInt = BigIntPolyfill;
    }
    
    console.log('[BigInt Polyfill] ✓ BigInt polyfill installed');
    return true;
    
  } catch (error) {
    console.error('[BigInt Polyfill] Error installing BigInt polyfill:', error);
    return false;
  }
}

/**
 * Apply buffer polyfill for BigInt operations
 */
function applyBufferPolyfill() {
  try {
    // Check if Buffer is available
    if (typeof Buffer !== 'undefined') {
      console.log('[BigInt Polyfill] ✓ Native Buffer support detected');
      return true;
    }
    
    console.log('[BigInt Polyfill] Buffer not available, creating minimal polyfill...');
    
    // Minimal Buffer polyfill for basic operations
    const BufferPolyfill = {
      from: function(data, encoding) {
        if (typeof data === 'string') {
          if (encoding === 'hex') {
            // Convert hex string to Uint8Array
            const bytes = [];
            for (let i = 0; i < data.length; i += 2) {
              bytes.push(parseInt(data.substr(i, 2), 16));
            }
            return new Uint8Array(bytes);
          }
        }
        return new Uint8Array(0);
      },
      
      alloc: function(size, fill) {
        const buffer = new Uint8Array(size);
        if (fill !== undefined) {
          buffer.fill(fill);
        }
        return buffer;
      }
    };
    
    // Install globally
    if (typeof window !== 'undefined') {
      window.Buffer = BufferPolyfill;
    }
    if (typeof global !== 'undefined') {
      global.Buffer = BufferPolyfill;
    }
    
    console.log('[BigInt Polyfill] ✓ Minimal Buffer polyfill installed');
    return true;
    
  } catch (error) {
    console.error('[BigInt Polyfill] Error installing Buffer polyfill:', error);
    return false;
  }
}

// Apply polyfills immediately
applyBigIntPolyfill();
applyBufferPolyfill();

// Export functions for manual application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    applyBigIntPolyfill,
    applyBufferPolyfill
  };
}

console.log('[BigInt Polyfill] ✓ BigInt compatibility module loaded');
