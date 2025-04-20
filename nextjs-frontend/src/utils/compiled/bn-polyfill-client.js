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
        try {
            // Defensive check to ensure bn_js_1.default exists before using it
            if (bn_js_1 && bn_js_1.default) {
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
                
                // Create a proxy for BN constructor to ensure _bn property is always available
                var originalBN = bn_js_1.default;
                var SafeBN = function() {
                    // Create a new BN instance using the original constructor
                    var args = Array.prototype.slice.call(arguments);
                    var instance = new (Function.prototype.bind.apply(originalBN, [null].concat(args)));
                    
                    // Ensure _bn property exists and is not undefined
                    if (!instance._bn) {
                        instance._bn = instance;
                    }
                    
                    return instance;
                };
                
                // Copy prototype and static properties
                SafeBN.prototype = originalBN.prototype;
                Object.setPrototypeOf(SafeBN, originalBN);
                
                // Replace the global BN constructor
                window.BN = SafeBN;
                
                // Also replace the imported BN
                bn_js_1.default = SafeBN;
            } else {
                console.warn('BN.js not properly imported, attempting fallback');
                // Fallback to global BN if available
                if (typeof BN !== 'undefined') {
                    window.BN = BN;
                    if (BN.prototype && !Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
                        Object.defineProperty(BN.prototype, '_bn', {
                            get: function() {
                                return this;
                            },
                            configurable: true,
                            enumerable: false
                        });
                        console.log('Added _bn property to global BN.prototype');
                    }
                } else {
                    console.error('BN.js not available, wallet connection may fail');
                }
            }
            
            // IMPORTANT: Remove any global _bn property getter/setter from Object.prototype
            // This was causing the "Cannot set property _bn of #<Object> which has only a getter" error
            if (Object.getOwnPropertyDescriptor(Object.prototype, '_bn')) {
                delete Object.prototype._bn;
                console.log('Removed global _bn property from Object.prototype to prevent conflicts');
            }
            
            // Instead of adding a global getter, use a more targeted approach with WeakMap
            var bnValueMap = new WeakMap();
            
            // Create a utility function to safely get/set _bn property
            window._bnSafeAccess = function(obj, value) {
                if (!obj || typeof obj !== 'object') return obj;
                
                if (arguments.length > 1) {
                    // Setter mode
                    bnValueMap.set(obj, value);
                    return value;
                } else {
                    // Getter mode
                    if (bnValueMap.has(obj)) {
                        return bnValueMap.get(obj);
                    }
                    
                    // If this is a BN instance, return the object itself
                    if (obj.constructor && 
                        (obj.constructor.name === 'BN' || 
                         obj.constructor.name === 'SafeBN' ||
                         (typeof obj.toString === 'function' && obj.toString().includes('BN')))) {
                        bnValueMap.set(obj, obj);
                        return obj;
                    }
                    
                    return undefined;
                }
            };
            
            console.log('Added safe _bn access utility function');
        } catch (err) {
            console.error('Error setting up BN.js:', err);
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
            if (obj.constructor && 
                (obj.constructor.name === 'BN' || 
                 obj.constructor.name === 'SafeBN' || 
                 (typeof obj.toString === 'function' && obj.toString().includes('BN')))) {
                
                // Use defineProperty with both getter and setter
                if (!Object.getOwnPropertyDescriptor(obj, '_bn')) {
                    var value = obj; // Store the initial value
                    Object.defineProperty(obj, '_bn', {
                        get: function() { return value; },
                        set: function(newValue) { value = newValue; },
                        configurable: true,
                        enumerable: false
                    });
                    console.log('Fixed client BN instance with proper _bn getter/setter');
                }
            }
            
            // Check if this object has toBN method
            if ('toBN' in obj && typeof obj.toBN === 'function') {
                // Ensure the toBN method always returns an object with _bn property
                var originalToBN = obj.toBN;
                obj.toBN = function() {
                    var result = originalToBN.apply(this, arguments);
                    if (result) {
                        // Use defineProperty with both getter and setter if _bn doesn't exist
                        if (!Object.getOwnPropertyDescriptor(result, '_bn')) {
                            var value = result; // Store the initial value
                            Object.defineProperty(result, '_bn', {
                                get: function() { return value; },
                                set: function(newValue) { value = newValue; },
                                configurable: true,
                                enumerable: false
                            });
                        }
                    }
                    return result;
                };
                
                console.log('Enhanced toBN method to ensure proper _bn property');
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
    // Wrap in try-catch to prevent any errors from breaking the application
    try {
        // Apply immediately
        applyClientPatches();
        
        // Also apply after a short delay to ensure it runs after other scripts
        setTimeout(function() {
            applyClientPatches();
        }, 100);
        
        // And apply when the document is fully loaded
        if (document.readyState === 'complete') {
            setTimeout(function() {
                applyClientPatches();
            }, 500);
        } else {
            window.addEventListener('load', function() {
                setTimeout(function() {
                    applyClientPatches();
                }, 500);
            });
        }
    } catch (e) {
        console.error('Error applying client patches:', e);
    }
}

exports.default = applyClientPatches;
