/**
 * Enhanced polyfill for BN.js to handle _bn property access issues
 */

// Create a global safety wrapper for BN objects
(function() {
    'use strict';
    
    // Store original BN constructor if it exists
    var originalBN = typeof BN !== 'undefined' ? BN : null;
    
    // Create a safety proxy for BN objects
    function createSafetyProxy() {
      if (typeof window === 'undefined') return;
      
      console.log('Setting up global defensive error handling for _bn property');
      
      // IMPORTANT: Remove any global _bn property getter/setter from Object.prototype
      // This was causing the "Cannot set property _bn of #<Object> which has only a getter" error
      if (Object.getOwnPropertyDescriptor(Object.prototype, '_bn')) {
        delete Object.prototype._bn;
        console.log('Removed global _bn property from Object.prototype to prevent conflicts');
      }
      
      // Create a WeakMap to store _bn values safely
      var bnValueMap = new WeakMap();
      
      // Patch the global BN constructor if it exists
      if (originalBN) {
        try {
          // Add _bn property to prototype with both getter and setter
          if (!Object.getOwnPropertyDescriptor(originalBN.prototype, '_bn')) {
            // Use a variable to store the value
            var bnValue = undefined;
            
            Object.defineProperty(originalBN.prototype, '_bn', {
              get: function() { 
                // If we have a stored value in the WeakMap, use that
                if (bnValueMap.has(this)) {
                  return bnValueMap.get(this);
                }
                // Otherwise return this object itself
                return this; 
              },
              set: function(newValue) { 
                // Store the new value in the WeakMap
                bnValueMap.set(this, newValue);
              },
              configurable: true,
              enumerable: false
            });
            console.log('Added _bn property with getter/setter to BN.prototype');
          }
          
          // Create a wrapped constructor that ensures _bn property works correctly
          window.BN = function() {
            // Create a new BN instance using the original constructor
            var bnInstance = new (Function.prototype.bind.apply(
              originalBN, 
              [null].concat(Array.prototype.slice.call(arguments))
            ));
            
            // Ensure _bn property has both getter and setter
            if (!Object.getOwnPropertyDescriptor(bnInstance, '_bn')) {
              // Store the initial value
              var value = bnInstance;
              
              Object.defineProperty(bnInstance, '_bn', {
                get: function() { return value; },
                set: function(newValue) { value = newValue; },
                configurable: true,
                enumerable: false
              });
            }
            
            return bnInstance;
          };
          
          // Copy prototype and static properties
          window.BN.prototype = originalBN.prototype;
          Object.setPrototypeOf(window.BN, originalBN);
          
          console.log('Direct BN.js prototype patch applied successfully');
        } catch (e) {
          console.error('Error applying direct BN.js prototype patch:', e);
        }
      }
      
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
      
      // Patch any existing BN instances
      try {
        patchExistingInstances(window);
      } catch (e) {
        console.error('Error patching existing instances:', e);
      }
    }
    
    // Recursively patch existing instances that might be using BN
    function patchExistingInstances(obj, depth, visited) {
      depth = depth || 0;
      visited = visited || new Set();
      
      // Prevent infinite recursion
      if (depth > 2 || !obj || visited.has(obj)) return;
      visited.add(obj);
      
      try {
        // Check if this is an object
        if (typeof obj === 'object') {
          // Check if this looks like a BN instance
          if (obj.constructor && 
              (obj.constructor.name === 'BN' || 
               obj.constructor.name === 'SafeBN' || 
               (typeof obj.toString === 'function' && obj.toString().includes('BN')))) {
            
            // Ensure _bn property has both getter and setter
            if (!Object.getOwnPropertyDescriptor(obj, '_bn')) {
              var value = obj; // Store the initial value
              Object.defineProperty(obj, '_bn', {
                get: function() { return value; },
                set: function(newValue) { value = newValue; },
                configurable: true,
                enumerable: false
              });
            }
          }
          
          // Check if this object has toBN method
          if (typeof obj.toBN === 'function') {
            // Ensure the toBN method always returns an object with proper _bn property
            var originalToBN = obj.toBN;
            obj.toBN = function() {
              var result = originalToBN.apply(this, arguments);
              if (result) {
                // Ensure _bn property has both getter and setter
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
          }
          
          // Recursively check properties (with limited depth)
          if (depth < 2) {
            try {
              Object.keys(obj).forEach(function(key) {
                try {
                  var value = obj[key];
                  if (value && typeof value === 'object') {
                    patchExistingInstances(value, depth + 1, visited);
                  }
                } catch (e) {
                  // Ignore errors on individual properties
                }
              });
            } catch (e) {
              // Ignore errors on Object.keys
            }
          }
        }
      } catch (e) {
        // Ignore any errors
      }
    }
    
    // Apply the patch immediately when this script is loaded
    if (typeof window !== 'undefined') {
      // Apply immediately
      createSafetyProxy();
      
      // Also apply after a short delay to ensure it runs after other scripts
      setTimeout(createSafetyProxy, 100);
      
      // And apply when the document is fully loaded
      if (document.readyState === 'complete') {
        setTimeout(createSafetyProxy, 500);
      } else {
        window.addEventListener('load', function() {
          setTimeout(createSafetyProxy, 500);
        });
      }
    }
  })();
  