/**
 * Client-side polyfill for BN.js to handle bigint binding issues
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyClientPatches = void 0;
var bn_js_1 = require("bn.js");
var bigintBufferModule = require("bigint-buffer");

// Apply client-side patches for BN.js
function applyClientPatches() {
    console.log('Applying client-side BN.js patches');
    
    // Ensure BN is available globally
    if (typeof window !== 'undefined') {
        // @ts-expect-error - Intentionally bypassing TypeScript's type checking
        window.BN = bn_js_1.default;
        
        // Ensure BN prototype has _bn property
        if (bn_js_1.default.prototype && !Object.getOwnPropertyDescriptor(bn_js_1.default.prototype, '_bn')) {
            Object.defineProperty(bn_js_1.default.prototype, '_bn', {
                get: function() {
                    return this;
                },
                configurable: true,
                enumerable: false
            });
            console.log('Added _bn property to BN.prototype on client');
        }
    }
    
    // Patch bigint-buffer for client-side
    patchClientBigintBuffer();
    
    // Patch any existing BN instances in the client environment
    patchExistingClientInstances();
    
    console.log('Client-side BN.js patches applied successfully');
}
exports.applyClientPatches = applyClientPatches;

/**
 * Patch bigint-buffer for client-side use
 */
function patchClientBigintBuffer() {
    try {
        // Use the imported module with proper typing
        var bigintBuffer = bigintBufferModule;
        
        // Check if the module has the expected methods
        if (!bigintBuffer.toBigIntLE || !bigintBuffer.toBufferLE) {
            console.warn('Client-side bigint-buffer methods missing, applying polyfill');
            
            // Simple polyfill for toBigIntLE if missing
            if (!bigintBuffer.toBigIntLE) {
                bigintBuffer.toBigIntLE = function(buffer) {
                    try {
                        // Simple implementation for little-endian conversion
                        var result = 0n;
                        for (var i = buffer.length - 1; i >= 0; i--) {
                            result = (result << 8n) + BigInt(buffer[i]);
                        }
                        return result;
                    } catch (error) {
                        console.error('Error in client toBigIntLE polyfill:', error);
                        return 0n;
                    }
                };
            }
            
            // Simple polyfill for toBufferLE if missing
            if (!bigintBuffer.toBufferLE) {
                bigintBuffer.toBufferLE = function(value, length) {
                    try {
                        var buffer = Buffer.alloc(length);
                        var tempValue = value;
                        for (var i = 0; i < length; i++) {
                            buffer[i] = Number(tempValue & 0xffn);
                            tempValue = tempValue >> 8n;
                        }
                        return buffer;
                    } catch (error) {
                        console.error('Error in client toBufferLE polyfill:', error);
                        return Buffer.alloc(length);
                    }
                };
            }
        }
        
        console.log('Client-side bigint-buffer patched successfully');
        return true;
    } catch (error) {
        console.error('Failed to patch client-side bigint-buffer:', error);
        return false;
    }
}

// Export the function for use in BigIntPatcher component
exports.patchBigIntBuffer = patchClientBigintBuffer;

/**
 * Patch existing BN instances in the client environment
 */
function patchExistingClientInstances() {
    if (typeof window !== 'undefined') {
        try {
            // Recursively patch objects in window
            patchObjectRecursively(window, 0, new Set());
            console.log('Patched existing client BN instances');
        } catch (error) {
            console.error('Error patching client instances:', error);
        }
    }
}

/**
 * Recursively patch objects that might be using BN
 */
function patchObjectRecursively(obj, depth, visited) {
    if (depth === void 0) { depth = 0; }
    if (visited === void 0) { visited = new Set(); }
    
    // Prevent infinite recursion
    if (depth > 2 || visited.has(obj)) return;
    visited.add(obj);
    
    try {
        // Skip null/undefined
        if (obj === null || obj === undefined) return;
        
        // Check if this is an object
        if (typeof obj === 'object') {
            // Check if this is a BN instance without _bn property
            if (obj.constructor && obj.constructor.name === 'BN' && !('_bn' in obj)) {
                // Intentionally adding _bn property
                obj._bn = obj;
                console.log('Fixed client BN instance without _bn property');
            }
            
            // Check if this object has toBN method but missing _bn property
            if ('toBN' in obj && typeof obj.toBN === 'function' && !('_bn' in obj)) {
                // Intentionally adding _bn property
                obj._bn = new bn_js_1.default(0);
                console.log('Fixed client object with toBN but missing _bn property');
            }
            
            // Recursively check properties
            try {
                Object.keys(obj).forEach(function(key) {
                    try {
                        // Accessing properties dynamically
                        var value = obj[key];
                        if (value !== null && typeof value === 'object') {
                            patchObjectRecursively(value, depth + 1, visited);
                        }
                    } catch (_) {
                        // Ignore errors on individual properties
                    }
                });
            } catch (_) {
                // Ignore errors on Object.keys
            }
        }
    } catch (_) {
        // Ignore any errors
    }
}

// Apply patches immediately when this module is imported in client context
if (typeof window !== 'undefined') {
    applyClientPatches();
}

exports.default = applyClientPatches;
