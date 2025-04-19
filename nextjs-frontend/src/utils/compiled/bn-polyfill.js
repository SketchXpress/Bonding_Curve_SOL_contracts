'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.patchBigintBuffer = patchBigintBuffer;
exports.default = void 0;

var _bnJs = _interopRequireDefault(require("bn.js"));

var bigintBufferModule = _interopRequireWildcard(require("bigint-buffer"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Ensure BN prototype methods exist
function ensureBNPrototype() {
  try {
    // Add toJSON method if missing
    if (!_bnJs.default.prototype.toJSON) {
      _bnJs.default.prototype.toJSON = function () {
        try {
          return this.toString(10);
        } catch (error) {
          console.error('Error in toJSON:', error);
          return "0";
        }
      };
    }

    // Add toNumber method if missing
    if (!_bnJs.default.prototype.toNumber) {
      _bnJs.default.prototype.toNumber = function () {
        try {
          return parseInt(this.toString(10), 10);
        } catch (error) {
          console.error('Error in toNumber:', error);
          return 0;
        }
      };
    }
    
    // Add toBN method if missing
    if (!_bnJs.default.prototype.toBN) {
      _bnJs.default.prototype.toBN = function() {
        return this;
      };
    }
    
    // Define _bn property on the prototype with a getter that returns this
    if (!Object.getOwnPropertyDescriptor(_bnJs.default.prototype, '_bn')) {
      Object.defineProperty(_bnJs.default.prototype, '_bn', {
        get: function() {
          // If _bn is undefined, return this
          if (this._bnValue === undefined) {
            this._bnValue = this;
          }
          return this._bnValue;
        },
        set: function(value) {
          this._bnValue = value;
        },
        configurable: true,
        enumerable: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error ensuring BN prototype methods:', error);
    return false;
  }
}

/**
 * Safe BN wrapper with additional methods
 */
class SafeBN {
  constructor(number, base, endian) {
    try {
      this._bn = new _bnJs.default(number, base, endian);
    } catch (error) {
      console.error('Error creating BN instance:', error);
      this._bn = new _bnJs.default(0);
    }
  }

  /**
   * Get the internal BN instance
   */
  toBN() {
    return this._bn;
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    try {
      return this._bn.toString(10);
    } catch (error) {
      console.error('Error in toJSON:', error);
      return "0";
    }
  }

  /**
   * Convert to number
   */
  toNumber() {
    try {
      return this._bn.toNumber();
    } catch (error) {
      console.error('Error in toNumber:', error);
      return 0;
    }
  }

  /**
   * Check if zero
   */
  isZero() {
    return this._bn.isZero();
  }
}

/**
 * Enhanced patch for bigint-buffer to handle missing native bindings in Docker
 */
function patchBigintBuffer() {
  try {
    // Ensure BN prototype methods exist
    ensureBNPrototype();
    
    // Use the imported module with proper typing
    const bigintBuffer = bigintBufferModule;
    
    // Check if the module has the expected methods
    if (!bigintBuffer.toBigIntLE || !bigintBuffer.toBufferLE) {
      console.warn('bigint-buffer methods missing, applying polyfill');
      
      // Simple polyfill for toBigIntLE if missing
      if (!bigintBuffer.toBigIntLE) {
        bigintBuffer.toBigIntLE = function(buffer) {
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
        bigintBuffer.toBufferLE = function(value, length) {
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
      
      // Add BE methods if missing
      if (!bigintBuffer.toBigIntBE) {
        bigintBuffer.toBigIntBE = function(buffer) {
          try {
            let result = 0n;
            for (let i = 0; i < buffer.length; i++) {
              result = (result << 8n) + BigInt(buffer[i]);
            }
            return result;
          } catch (error) {
            console.error('Error in toBigIntBE polyfill:', error);
            return 0n;
          }
        };
      }
      
      if (!bigintBuffer.toBufferBE) {
        bigintBuffer.toBufferBE = function(value, length) {
          try {
            const buffer = Buffer.alloc(length);
            let tempValue = value;
            for (let i = length - 1; i >= 0; i--) {
              buffer[i] = Number(tempValue & 0xffn);
              tempValue = tempValue >> 8n;
            }
            return buffer;
          } catch (error) {
            console.error('Error in toBufferBE polyfill:', error);
            return Buffer.alloc(length);
          }
        };
      }
    }
    
    // Patch global objects if they exist
    if (typeof window !== 'undefined') {
      // Apply patches to any existing instances in the window object
      patchExistingInstances(window);
      
      // Add defensive property handling
      addDefensiveBNPropertyHandling();
    }
    
    // Patch global BN constructor if available
    if (typeof window !== 'undefined' && window.BN) {
      const originalBN = window.BN;
      
      window.BN = function(...args) {
        const instance = new originalBN(...args);
        
        // Ensure _bn property exists
        if (!instance._bn) {
          Object.defineProperty(instance, '_bn', {
            value: instance,
            configurable: true,
            enumerable: false,
            writable: true
          });
        }
        
        return instance;
      };
      
      // Copy prototype and static properties
      window.BN.prototype = originalBN.prototype;
      Object.setPrototypeOf(window.BN, originalBN);
    }
    
    console.log('bigint-buffer patched successfully');
    return true;
  } catch (error) {
    console.error('Failed to patch bigint-buffer:', error);
    return false;
  }
}

/**
 * Add defensive property handling for _bn property
 */
function addDefensiveBNPropertyHandling() {
  if (typeof window === 'undefined') return;
  
  try {
    // Monkey patch Object.prototype.hasOwnProperty to handle _bn property specially
    const originalHasOwnProperty = Object.prototype.hasOwnProperty;
    Object.prototype.hasOwnProperty = function(prop) {
      // Special case for _bn property on BN-like objects
      if (prop === '_bn' && 
          this && 
          typeof this === 'object' && 
          (this.constructor && this.constructor.name === 'BN' || typeof this.toBN === 'function')) {
        return true;
      }
      return originalHasOwnProperty.call(this, prop);
    };
    
    // Monkey patch Object.prototype.propertyIsEnumerable to handle _bn property specially
    const originalPropertyIsEnumerable = Object.prototype.propertyIsEnumerable;
    Object.prototype.propertyIsEnumerable = function(prop) {
      // Special case for _bn property on BN-like objects
      if (prop === '_bn' && 
          this && 
          typeof this === 'object' && 
          (this.constructor && this.constructor.name === 'BN' || typeof this.toBN === 'function')) {
        return false;
      }
      return originalPropertyIsEnumerable.call(this, prop);
    };
  } catch (error) {
    console.error('Error adding defensive property handling:', error);
  }
}

/**
 * Recursively patch existing instances that might be using BN
 */
function patchExistingInstances(obj, depth = 0, visited = new Set()) {
  // Prevent infinite recursion
  if (depth > 3 || visited.has(obj)) return;
  visited.add(obj);
  
  try {
    // Type guard to check if object has the right structure
    const hasToBN = (o) => 
        o !== null && 
        typeof o === 'object' && 
        'toBN' in o && 
        typeof o.toBN === 'function';      
    
    // Check if this object has a _bn property that's undefined
    if (hasToBN(obj) && obj._bn === undefined) {
      // Fix the object by setting a default _bn
      try {
        const bn = obj.toBN();
        if (bn) {
          Object.defineProperty(obj, '_bn', {
            value: bn,
            configurable: true,
            enumerable: false,
            writable: true
          });
        } else {
          Object.defineProperty(obj, '_bn', {
            value: new _bnJs.default(0),
            configurable: true,
            enumerable: false,
            writable: true
          });
        }
      } catch (e) {
        // If toBN() fails, set _bn to a default BN instance
        Object.defineProperty(obj, '_bn', {
          value: new _bnJs.default(0),
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      console.log('Fixed undefined _bn property on object');
    }
    
    // Check if this is a BN instance without _bn property
    if (obj.constructor && obj.constructor.name === 'BN' && obj._bn === undefined) {
      Object.defineProperty(obj, '_bn', {
        value: obj,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    
    // Recursively check properties
    if (obj !== null && typeof obj === 'object') {
      try {
        Object.keys(obj).forEach(key => {
          try {
            const value = obj[key];
            if (value !== null && typeof value === 'object') {
              patchExistingInstances(value, depth + 1, visited);
            }
          } catch {
            // Ignore errors on individual properties
          }
        });
      } catch {
        // Ignore errors on Object.keys
      }
    }
  } catch  {
    // Ignore errors
  }
}

// Apply the patch immediately when this module is imported
patchBigintBuffer();

// Set environment variable to indicate we're in Docker
if (typeof process !== 'undefined' && process.env) {
  process.env.DOCKER_ENVIRONMENT = 'true';
}

var _default = SafeBN;
exports.default = _default;
