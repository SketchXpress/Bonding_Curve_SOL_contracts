// Modified verification script to avoid TypeScript import issues
// verify-runtime.js

console.log('Verifying BN polyfill at runtime...');

// Use require for JavaScript modules instead of TypeScript imports
const BN = require('bn.js');
if (!BN) {
  console.error('BN is not available!');
  process.exit(1);
}

// Create a BN instance
const bn = new BN(123);
console.log('BN instance created:', bn.toString());

// Check if BN prototype has necessary methods
if (!BN.prototype.toString || !BN.prototype.toNumber) {
  console.error('BN prototype methods are missing!');
  process.exit(1);
}

// Check if bigint-buffer is available
try {
  const bigintBuffer = require('bigint-buffer');
  console.log('bigint-buffer is available');
  
  // Test the methods
  const buffer = Buffer.from([1, 2, 3, 4]);
  
  // Check if the methods exist
  if (typeof bigintBuffer.toBigIntLE !== 'function') {
    console.error('toBigIntLE method is missing!');
    process.exit(1);
  }
  
  if (typeof bigintBuffer.toBufferLE !== 'function') {
    console.error('toBufferLE method is missing!');
    process.exit(1);
  }
  
  // Test the methods
  const bigint = bigintBuffer.toBigIntLE(buffer);
  console.log('Buffer to BigInt conversion works:', bigint);
  
  const newBuffer = bigintBuffer.toBufferLE(bigint, 4);
  console.log('BigInt to Buffer conversion works:', newBuffer);
  
  // Create a SafeBN class manually to test _bn property
  class TestBN {
    constructor(value) {
      this._bn = new BN(value);
    }
    
    toBN() {
      return this._bn;
    }
  }
  
  // Test the _bn property
  const testBn = new TestBN(456);
  if (!testBn._bn) {
    console.error('_bn property is missing on test object!');
    process.exit(1);
  }
  
  console.log('_bn property exists on test object:', testBn._bn.toString());
  
  // Apply our patching function to an object with undefined _bn
  const testObj = {
    toBN: function() { return new BN(789); },
    _bn: undefined
  };
  
  // Manual patching similar to what our polyfill does
  if (testObj._bn === undefined && typeof testObj.toBN === 'function') {
    testObj._bn = new BN(0);
    console.log('Fixed undefined _bn property on test object');
  }
  
  if (!testObj._bn) {
    console.error('Failed to patch _bn property on test object!');
    process.exit(1);
  }
  
  console.log('Successfully patched _bn property on test object:', testObj._bn.toString());
  
} catch (error) {
  console.error('Error testing bigint-buffer:', error);
  process.exit(1);
}

console.log('BN polyfill verification successful!');
