// buffer-polyfill.js
// A simple polyfill for Node.js Buffer in browser environments

// Create a Buffer polyfill if it doesn't exist
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  console.log('Initializing Buffer polyfill for browser environment');
  
  // Use the browser's TextEncoder and TextDecoder for string conversions
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  
  class BufferPolyfill {
    constructor(input) {
      if (typeof input === 'string') {
        // Convert string to Uint8Array
        this._buffer = textEncoder.encode(input);
      } else if (input instanceof Uint8Array) {
        // Use the Uint8Array directly
        this._buffer = input;
      } else if (Array.isArray(input)) {
        // Convert array to Uint8Array
        this._buffer = new Uint8Array(input);
      } else if (typeof input === 'number') {
        // Create a buffer of specified size
        this._buffer = new Uint8Array(input);
      } else {
        throw new Error('Unsupported input type for Buffer');
      }
    }
    
    // Convert to Uint8Array
    toBuffer() {
      return this._buffer;
    }
    
    // Convert to string
    toString(encoding = 'utf-8') {
      return textDecoder.decode(this._buffer);
    }
    
    // Get buffer length
    get length() {
      return this._buffer.length;
    }
  }
  
  // Static method to create buffer from string
  BufferPolyfill.from = function(input, encoding) {
    if (typeof input === 'string') {
      return new BufferPolyfill(input);
    } else if (input instanceof Uint8Array) {
      return new BufferPolyfill(input);
    } else if (Array.isArray(input)) {
      return new BufferPolyfill(input);
    } else {
      throw new Error('Unsupported input type for Buffer.from');
    }
  };
  
  // Expose Buffer globally
  window.Buffer = BufferPolyfill;
  
  console.log('Buffer polyfill initialized successfully');
}

export default window.Buffer;
