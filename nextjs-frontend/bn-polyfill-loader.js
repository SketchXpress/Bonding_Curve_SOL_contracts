// bn-polyfill-loader.js
// This script ensures the bigint-buffer polyfill is loaded early in the environment

// Import the polyfill
require('./src/utils/bn-polyfill');

// Apply additional runtime patches
const BN = require('bn.js');

// Ensure global BN is available
if (typeof global !== 'undefined') {
  global.BN = BN;
}

// Patch any existing BN instances in global scope
function patchGlobalBNInstances() {
  if (typeof global !== 'undefined') {
    Object.keys(global).forEach(key => {
      try {
        const obj = global[key];
        if (obj && typeof obj === 'object') {
          // Fix for objects with toBN function but missing _bn property
          if (obj._bn === undefined && typeof obj.toBN === 'function') {
            obj._bn = new BN(0);
            console.log(`Fixed undefined _bn property on global.${key}`);
          }
          
          // Fix for BN instances without _bn property
          if (obj.constructor && obj.constructor.name === 'BN' && obj._bn === undefined) {
            obj._bn = obj;
            console.log(`Fixed BN instance without _bn property on global.${key}`);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    });
  }
}

// Run the global patching
patchGlobalBNInstances();

// Patch BN.prototype to ensure all instances have _bn property
if (BN.prototype && !BN.prototype._bn) {
  Object.defineProperty(BN.prototype, '_bn', {
    get: function() {
      return this;
    },
    configurable: true,
    enumerable: false
  });
  console.log('Patched BN.prototype with _bn property');
}

console.log('bigint-buffer polyfill loaded successfully');
