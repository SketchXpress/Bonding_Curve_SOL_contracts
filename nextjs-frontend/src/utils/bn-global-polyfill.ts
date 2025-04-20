/**
 * Global BN.js polyfill to handle all _bn property access issues
 * This file is loaded early in the application lifecycle to ensure
 * all BN instances are properly patched before wallet connection
 */

// Make this a module file by adding an export
export {};

// Import BN type from bn.js
import type BN from 'bn.js';

// Use the existing BN type from global.d.ts instead of declaring a new one
declare global {
  interface Window {
    __fixBNProperties: () => void;
  }
}

(function() {
  'use strict';
  
  console.log('Applying global BN.js defensive patches');
  
  // Create a global safety net for _bn property access
  function setupGlobalSafetyNet(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Store original console methods
      const originalConsoleError = console.error;
      
      // Override console.error to catch and fix _bn property errors
      console.error = function(...args: any[]): void {
        // Check if this is a _bn property error
        const errorMsg = args[0] && typeof args[0].toString === 'function' ? args[0].toString() : '';
        if (errorMsg.includes('_bn') && (errorMsg.includes('undefined') || errorMsg.includes('null'))) {
          console.log('Intercepted _bn property error, applying emergency fix');
          applyEmergencyFix();
        }
        
        // Call original console.error
        return originalConsoleError.apply(console, args);
      };
      
      // Remove any existing _bn property from Object.prototype
      if (Object.getOwnPropertyDescriptor(Object.prototype, '_bn')) {
        delete (Object.prototype as any)._bn;
      }
      
      // Create a global _bn property on Object.prototype with both getter and setter
      Object.defineProperty(Object.prototype, '_bn', {
        configurable: true,
        get: function(this: any): any {
          // If this is a BN instance or has BN-like properties, return this
          if (this && 
              (this.constructor && this.constructor.name === 'BN' || 
               typeof this.toString === 'function' && this.toString().includes('BN') ||
               (this.negative !== undefined && this.words && Array.isArray(this.words)))) {
            return this;
          }
          
          // For other objects, create a BN-like object on demand
          if (!this._bnValue) {
            // Create a minimal BN-like object
            this._bnValue = {
              negative: 0,
              words: [0],
              length: 1,
              red: null,
              toString: function() { return '0'; }
            };
          }
          return this._bnValue;
        },
        set: function(this: any, value: any): void {
          // Store the value
          this._bnValue = value;
        }
      });
      
      console.log('Added global defensive _bn property to Object.prototype');
      
      // Patch BN constructor if available
      if (typeof window.BN !== 'undefined') {
        patchBNConstructor(window.BN);
      }
      
      // Monitor for BN constructor becoming available
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor): any {
        // Call original defineProperty
        const result = originalDefineProperty.call(Object, obj, prop, descriptor);
        
        // Check if this is defining the BN constructor
        if (prop === 'BN' && typeof obj[prop] === 'function') {
          patchBNConstructor(obj[prop]);
        }
        
        return result;
      };
      
      // Patch any existing BN instances
      patchExistingInstances(window);
      
      console.log('Global BN.js defensive patches applied successfully');
    } catch (e) {
      console.log('Error applying global BN.js defensive patches:', e);
    }
  }
  
  // Apply emergency fix when an error is detected
  function applyEmergencyFix(): void {
    try {
      // Find all objects that might be BN instances
      const allObjects: any[] = [];
      
      // Collect objects from global scope
      for (const key in window) {
        try {
          const obj = (window as any)[key];
          if (obj && typeof obj === 'object') {
            allObjects.push(obj);
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Process collected objects
      for (let i = 0; i < allObjects.length; i++) {
        try {
          const obj = allObjects[i];
          
          // Check if this looks like a BN instance
          if (obj.negative !== undefined && obj.words && Array.isArray(obj.words)) {
            // Ensure _bn property exists
            if (!obj._bn) {
              Object.defineProperty(obj, '_bn', {
                value: obj,
                configurable: true,
                enumerable: false,
                writable: true
              });
            }
          }
          
          // Also check prototype chain
          const proto = Object.getPrototypeOf(obj);
          if (proto && proto.constructor && proto.constructor.name === 'BN') {
            // Ensure _bn property exists on prototype
            if (!Object.getOwnPropertyDescriptor(proto, '_bn')) {
              Object.defineProperty(proto, '_bn', {
                get: function() { return this; },
                set: function() { /* Allow setting but ignore */ },
                configurable: true,
                enumerable: false
              });
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      console.log('Applied emergency fix for _bn property access');
    } catch (e) {
      console.log('Error applying emergency fix:', e);
    }
  }
  
  // Patch BN constructor
  function patchBNConstructor(BNConstructor: any): void {
    try {
      // Store original constructor
      const originalBN = BNConstructor;
      
      // Create a safe wrapper
      const SafeBN = function(this: any) {
        // Create instance using original constructor
        const args = Array.from(arguments);
        const instance = new (Function.prototype.bind.apply(
          originalBN, 
          [null, ...args]
        ));
        
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
      SafeBN.prototype = originalBN.prototype;
      Object.setPrototypeOf(SafeBN, originalBN);
      
      // Copy all static methods and properties from original BN
      for (const prop in originalBN) {
        if (Object.prototype.hasOwnProperty.call(originalBN, prop)) {
          (SafeBN as any)[prop] = originalBN[prop];
        }
      }
      
      // Ensure static methods like isBN, min, max are copied
      if (typeof originalBN.isBN === 'function') SafeBN.isBN = originalBN.isBN;
      if (typeof originalBN.min === 'function') SafeBN.min = originalBN.min;
      if (typeof originalBN.max === 'function') SafeBN.max = originalBN.max;
      
      // Ensure prototype has _bn property
      if (!Object.getOwnPropertyDescriptor(SafeBN.prototype, '_bn')) {
        Object.defineProperty(SafeBN.prototype, '_bn', {
          get: function() { return this; },
          set: function() { /* Allow setting but ignore */ },
          configurable: true,
          enumerable: false
        });
      }
      
      // Replace the constructor with a type assertion to unknown first to avoid TypeScript errors
      window.BN = SafeBN as unknown as typeof window.BN;
      
      console.log('Patched BN constructor with safety wrapper');
    } catch (e) {
      console.log('Error patching BN constructor:', e);
    }
  }
  
  // Recursively patch existing instances
  function patchExistingInstances(obj: any, depth: number = 0, visited: Set<any> = new Set()): void {
    // Prevent infinite recursion
    if (depth > 3 || !obj || visited.has(obj)) return;
    visited.add(obj);
    
    try {
      // Check if this is an object
      if (typeof obj === 'object') {
        // Check if this looks like a BN instance
        if (obj.negative !== undefined && obj.words && Array.isArray(obj.words)) {
          // Ensure _bn property exists
          if (!obj._bn) {
            Object.defineProperty(obj, '_bn', {
              value: obj,
              configurable: true,
              enumerable: false,
              writable: true
            });
          }
        }
        
        // Recursively check properties (with limited depth)
        if (depth < 2) {
          try {
            Object.keys(obj).forEach(function(key) {
              try {
                const value = obj[key];
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
  
  // Apply the safety net immediately
  if (typeof window !== 'undefined') {
    // Apply immediately
    setupGlobalSafetyNet();
    
    // Also apply after a short delay
    setTimeout(setupGlobalSafetyNet, 100);
    
    // And apply when the document is loaded
    if (document.readyState === 'complete') {
      setTimeout(setupGlobalSafetyNet, 500);
    } else {
      window.addEventListener('load', function() {
        setTimeout(setupGlobalSafetyNet, 500);
      });
    }
    
    // Apply emergency fix on demand
    window.__fixBNProperties = applyEmergencyFix;
  }
})();
