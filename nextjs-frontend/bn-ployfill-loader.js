// bn-polyfill-loader.js
// This script ensures the bigint-buffer polyfill is loaded early in the Docker environment
// Import the polyfill
require('./src/utils/compiled/bn-polyfill');
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
        if (obj && typeof obj === 'object' && obj._bn === undefined && typeof obj.toBN === 'function') {
          obj._bn = new BN(0);
          console.log(`Fixed undefined _bn property on global.${key}`);
        }
      } catch (e) {
        // Ignore errors
      }
    });
  }
}
// Run the global patching
patchGlobalBNInstances();
console.log('Docker-specific bigint-buffer polyfill loaded successfully');
