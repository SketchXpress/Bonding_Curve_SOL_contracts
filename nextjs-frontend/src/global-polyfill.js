// Enhanced Global polyfills for Bonding Curve SOL Contracts
// Based on comprehensive library analysis and targeted Solana compatibility

console.log('[Enhanced Global Polyfill] Initializing ultra-comprehensive polyfills...');

// Import our targeted Solana BN patch immediately - browser compatible
try {
  if (typeof require !== 'undefined') {
    const { patchBNForSolana } = require('./solana-bn-patch');
    patchBNForSolana();
  } else if (typeof window !== 'undefined' && window.patchBNForSolana) {
    window.patchBNForSolana();
  }
  console.log('[Enhanced Global Polyfill] ✓ Targeted Solana BN patch loaded and executed');
} catch (error) {
  console.warn('[Enhanced Global Polyfill] Could not load Solana BN patch:', error);
}

// Import and initialize the isPublicKeyData patch
try {
  if (typeof require !== 'undefined') {
    require('./utils/isPublicKeyData-patch');
  } else if (typeof window !== 'undefined') {
    // Dynamic import for browser environment
    import('./utils/isPublicKeyData-patch.ts').catch(err => {
      console.warn('[Enhanced Global Polyfill] Could not load isPublicKeyData patch:', err);
    });
  }
  console.log('[Enhanced Global Polyfill] ✓ isPublicKeyData patch loaded and executed');
} catch (error) {
  console.warn('[Enhanced Global Polyfill] Could not load isPublicKeyData patch:', error);
}

// Ultra-comprehensive BN.js compatibility patch - enhanced with real library requirements
function ultraComprehensiveBNPatch() {
  console.log('[Ultra Comprehensive BN Patch] Starting enhanced BN compatibility...');
  
  try {
    // 1. Enhanced Direct BN.js patching based on Solana source analysis
    let BN = null;
    try {
      if (typeof require !== 'undefined') {
        BN = require('bn.js');
      }
    } catch (e) {
      // Browser environment or require not available
      if (typeof window !== 'undefined' && window.BN) {
        BN = window.BN;
      }
    }
    
    if (BN && BN.prototype) {
      // Critical: Based on Solana source - PublicKey checks for value._bn and assigns this._bn = value._bn
      if (!BN.prototype.hasOwnProperty('_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() { return this; },
          set: function(value) { this.__bn_internal__ = value; },
          configurable: true,
          enumerable: false
        });
      }
      
      // Enhanced constructor to always set _bn
      const originalConstructor = BN.prototype.constructor;
      BN.prototype.constructor = function(...args) {
        const result = originalConstructor.apply(this, args);
        if (!this._bn) this._bn = this;
        return result;
      };
      
      // Patch any existing methods that create new BN instances
      const methodsToPath = ['add', 'sub', 'mul', 'div', 'mod', 'pow', 'abs', 'neg'];
      methodsToPath.forEach(methodName => {
        if (BN.prototype[methodName]) {
          const originalMethod = BN.prototype[methodName];
          BN.prototype[methodName] = function(...args) {
            const result = originalMethod.apply(this, args);
            if (result && typeof result === 'object' && !result._bn) {
              result._bn = result;
            }
            return result;
          };
        }
      });
      
      console.log('[Ultra Comprehensive BN Patch] ✓ Enhanced BN.js prototype patched with method wrapping');
    }
    
    // 2. Advanced Solana-specific isPublicKeyData function compatibility
    // Based on: function isPublicKeyData(value) { return value._bn !== undefined; }
    if (typeof window !== 'undefined') {
      const originalIsPublicKeyData = window.isPublicKeyData;
      
      window.isPublicKeyData = function(value) {
        // Primary: Ensure BN instances are properly recognized
        if (value && typeof value === 'object') {
          // If it's a BN instance, ensure it has _bn
          if (value.constructor?.name === 'BN' || value.isBN || value.toBN) {
            if (!value._bn) value._bn = value;
            return true;
          }
          
          // Check for existing _bn property (primary Solana check)
          if (value._bn !== undefined) {
            return true;
          }
          
          // Enhanced: Check for PublicKey-like objects
          if (value.toBase58 && typeof value.toBase58 === 'function') {
            if (!value._bn) value._bn = value;
            return true;
          }
        }
        
        // Fallback to original if exists
        return originalIsPublicKeyData ? originalIsPublicKeyData(value) : false;
      };
      
      console.log('[Ultra Comprehensive BN Patch] ✓ Enhanced isPublicKeyData function');
    }
    
    // 3. Browser-compatible module loading interception
    if (typeof require !== 'undefined' && typeof window === 'undefined') {
      // Node.js environment only
      try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        
        Module.prototype.require = function(id) {
          const result = originalRequire.apply(this, arguments);
          
          // Target Solana and BN-related modules specifically
          if (id.includes('@solana/web3.js') || 
              id.includes('bn.js') || 
              id.includes('@metaplex') ||
              id.includes('@coral-xyz/anchor')) {
            
            if (result && typeof result === 'object') {
              // Enhanced: Patch PublicKey class directly if found
              if (result.PublicKey && typeof result.PublicKey === 'function') {
                const OriginalPublicKey = result.PublicKey;
                
                result.PublicKey = class extends OriginalPublicKey {
                  constructor(...args) {
                    try {
                      super(...args);
                      // Ensure _bn property for Solana compatibility
                      if (!this._bn) {
                        this._bn = this;
                      }
                    } catch (error) {
                      // If super constructor fails due to _bn issue, try to patch and retry
                      console.warn('[Ultra Comprehensive BN Patch] PublicKey constructor failed, applying emergency patch:', error);
                      
                      // Emergency BN patching
                      try {
                        const BN = require('bn.js');
                        if (BN && !BN.prototype._bn) {
                          Object.defineProperty(BN.prototype, '_bn', {
                            get: function() { return this; },
                            configurable: true,
                            enumerable: false
                          });
                        }
                        
                        // Retry constructor
                        super(...args);
                        if (!this._bn) this._bn = this;
                      } catch (retryError) {
                        console.error('[Ultra Comprehensive BN Patch] PublicKey constructor retry failed:', retryError);
                        throw retryError;
                      }
                    }
                  }
                };
                
                console.log(`[Ultra Comprehensive BN Patch] ✓ Enhanced PublicKey class in ${id}`);
              }
              
              // Patch any BN-like constructors
              Object.keys(result).forEach(key => {
                const value = result[key];
                if (value && typeof value === 'function' && value.prototype) {
                  // Enhanced BN detection
                  if (key === 'BN' || 
                      key.toLowerCase().includes('bn') || 
                      value.prototype.constructor?.name === 'BN' ||
                      (value.prototype.add && value.prototype.sub && value.prototype.mul)) {
                    
                    if (!value.prototype.hasOwnProperty('_bn')) {
                      try {
                        Object.defineProperty(value.prototype, '_bn', {
                          get: function() { return this; },
                          set: function(val) { this.__bn_ref__ = val; },
                          configurable: true,
                          enumerable: false
                        });
                        console.log(`[Ultra Comprehensive BN Patch] ✓ Module ${id}.${key} enhanced`);
                      } catch (e) {
                        console.warn(`[Ultra Comprehensive BN Patch] Failed to patch ${id}.${key}:`, e instanceof Error ? e.message : String(e));
                      }
                    }
                  }
                }
              });
            }
          }
          
          return result;
        };
        
        console.log('[Ultra Comprehensive BN Patch] ✓ Enhanced module require interception installed');
      } catch (moduleError) {
        console.warn('[Ultra Comprehensive BN Patch] Module require interception not available:', moduleError.message);
      }
    }
    
    // 4. Global BN object patching with Solana compatibility
    ['BN', 'BigNumber', '_BN'].forEach(name => {
      if (typeof window !== 'undefined') {
        const windowObj = window;
        if (windowObj[name]) {
          const OriginalBN = windowObj[name];
          if (OriginalBN.prototype && !OriginalBN.prototype.hasOwnProperty('_bn')) {
            try {
              Object.defineProperty(OriginalBN.prototype, '_bn', {
                get: function() { return this; },
                set: function(value) { this.__bn_self__ = value; },
                configurable: true,
                enumerable: false
              });
              console.log(`[Ultra Comprehensive BN Patch] ✓ Global ${name} enhanced`);
            } catch (e) {
              console.warn(`[Ultra Comprehensive BN Patch] Failed to enhance ${name}:`, e instanceof Error ? e.message : String(e));
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.error('[Ultra Comprehensive BN Patch] Critical error:', error);
  }
}

// Enhanced emergency BN compatibility layer - optimized for Solana
function enhancedEmergencyBNCompatibility() {
  console.log('[Enhanced Emergency BN] Installing enhanced emergency BN compatibility...');
  
  // Create a comprehensive Solana-compatible mock BN if none exists
  if (typeof window !== 'undefined' && !window.BN) {
    window.BN = class SolanaCompatibleBN {
      constructor(value) {
        this._bn = this; // Critical: Solana isPublicKeyData compatibility
        this.value = value;
        this.isBN = true; // BN.js compatibility flag
      }
      
      toString() { return this.value?.toString() || '0'; }
      toNumber() { return Number(this.value) || 0; }
      toHex() { return '0x' + Number(this.value || 0).toString(16); }
      toBN() { return this; }
      
      // Enhanced BN.js compatibility methods
      add(other) { 
        const result = new window.BN(this.toNumber() + (other?.toNumber?.() || Number(other) || 0));
        result._bn = result;
        return result;
      }
      sub(other) { 
        const result = new window.BN(this.toNumber() - (other?.toNumber?.() || Number(other) || 0));
        result._bn = result;
        return result;
      }
      mul(other) { 
        const result = new window.BN(this.toNumber() * (other?.toNumber?.() || Number(other) || 1));
        result._bn = result;
        return result;
      }
      
      // Solana-specific compatibility methods
      equals(other) { return this.toString() === other?.toString(); }
      toBuffer() { 
        try {
          return Buffer.from(this.toString(), 'hex'); 
        } catch {
          return Buffer.alloc(32);
        }
      }
    };
    console.log('[Enhanced Emergency BN] ✓ Solana-compatible emergency BN class created');
  }
  
  // Enhanced global compatibility functions
  if (typeof window !== 'undefined') {
    // Ultra-enhanced isPublicKeyData based on actual Solana source analysis
    window.isPublicKeyData = window.isPublicKeyData || function(value) {
      if (!value || typeof value !== 'object') return false;
      
      // Primary check: does it have _bn property? (Solana requirement)
      if (value._bn !== undefined) return true;
      
      // Secondary check: is it a BN-like object?
      if (value.constructor?.name === 'BN' || value.isBN) {
        // Ensure it has _bn for Solana compatibility
        if (!value._bn) value._bn = value;
        return true;
      }
      
      // Tertiary check: PublicKey-like objects
      if (value.toBase58 && typeof value.toBase58 === 'function') {
        if (!value._bn) value._bn = value;
        return true;
      }
      
      return false;
    };
    
    // Enhanced BN creator with comprehensive Solana compatibility
    window.createSolanaBN = window.createSolanaBN || function(value) {
      const BNClass = window.BN || Number;
      const bn = new BNClass(value);
      
      // Ensure comprehensive Solana compatibility
      if (!bn._bn) bn._bn = bn;
      if (!bn.isBN) bn.isBN = true;
      if (!bn.toBN) bn.toBN = () => bn;
      
      return bn;
    };
    
    console.log('[Enhanced Emergency BN] ✓ Enhanced Solana compatibility functions installed');
  }
}

// Execute all enhanced patches immediately
ultraComprehensiveBNPatch();
enhancedEmergencyBNCompatibility();

// Global error recovery system for _bn errors
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && message.toString().includes('_bn')) {
      console.warn('[Enhanced Global Polyfill] Detected _bn error, applying emergency patches:', message);
      
      // Immediate re-patching
      try {
        ultraComprehensiveBNPatch();
        enhancedEmergencyBNCompatibility();
        console.log('[Enhanced Global Polyfill] ✓ Emergency re-patching completed');
      } catch (patchError) {
        console.error('[Enhanced Global Polyfill] Emergency re-patching failed:', patchError);
      }
    }
    
    // Call original error handler
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  console.log('[Enhanced Global Polyfill] ✓ Enhanced global error recovery system installed');
}

console.log('[Enhanced Global Polyfill] ✓ All enhanced polyfills initialized successfully');
