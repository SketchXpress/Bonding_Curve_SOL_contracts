// bs58-polyfill.js
// A browser-compatible implementation of base58 encoding/decoding

// Base58 alphabet
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = ALPHABET.length;

/**
 * Encode a Uint8Array to base58 string
 * @param {Uint8Array} bytes - The bytes to encode
 * @returns {string} - The base58 encoded string
 */
export function encode(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array');
  }

  // Skip & count leading zeroes
  let zeroes = 0;
  let i = 0;
  while (i < bytes.length && bytes[i] === 0) {
    zeroes++;
    i++;
  }

  // Allocate enough space in big-endian base58 representation
  const size = ((bytes.length - zeroes) * 138 / 100) + 1; // log(256) / log(58)
  const b58 = new Uint8Array(size);
  
  // Process the bytes
  while (i < bytes.length) {
    let carry = bytes[i];
    
    // Apply "b58 = b58 * 256 + ch"
    let j = 0;
    for (let k = b58.length - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= size) break;
      carry += 256 * b58[k];
      b58[k] = carry % BASE;
      carry = Math.floor(carry / BASE);
    }
    
    i++;
  }

  // Skip leading zeroes in base58 result
  i = 0;
  while (i < b58.length && b58[i] === 0) {
    i++;
  }

  // Translate the result into a string
  let str = '1'.repeat(zeroes);
  for (; i < b58.length; i++) {
    str += ALPHABET[b58[i]];
  }

  return str;
}

/**
 * Decode a base58 string to Uint8Array
 * @param {string} str - The base58 encoded string
 * @returns {Uint8Array} - The decoded bytes
 */
export function decode(str) {
  if (typeof str !== 'string') {
    throw new Error('Input must be a string');
  }

  // Skip & count leading '1's
  let zeroes = 0;
  let i = 0;
  while (i < str.length && str[i] === '1') {
    zeroes++;
    i++;
  }

  // Allocate enough space in big-endian base256 representation
  const size = ((str.length - zeroes) * 733 / 1000) + 1; // log(58) / log(256)
  const b256 = new Uint8Array(size);

  // Process the characters
  while (i < str.length) {
    const ch = str.charAt(i);
    const value = ALPHABET.indexOf(ch);
    
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${ch}`);
    }

    // Apply "b256 = b256 * 58 + value"
    let j = 0;
    let carry = value;
    for (let k = b256.length - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= size) break;
      carry += 58 * b256[k];
      b256[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    
    i++;
  }

  // Skip leading zeroes in b256 result
  i = 0;
  while (i < b256.length && b256[i] === 0) {
    i++;
  }

  // Create the result array with leading zeroes
  const result = new Uint8Array(zeroes + (b256.length - i));
  result.fill(0, 0, zeroes);
  
  let j = zeroes;
  while (i < b256.length) {
    result[j++] = b256[i++];
  }

  return result;
}

// Export as default object
export default {
  encode,
  decode
};
