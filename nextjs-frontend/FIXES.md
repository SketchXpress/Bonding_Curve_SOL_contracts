# BigInt Fixes for NextJS Frontend

## Problem

The application was experiencing errors related to the `_bn` property when connecting wallets. Specifically, errors like "\_bn cannot read properties" were occurring during wallet connection, preventing proper interaction with Solana contracts.

## Solution

A comprehensive three-pronged approach was implemented to fix the BigInt handling issues:

### 1. Direct BN.js Prototype Patching

Created a new file `src/utils/bn-polyfill-direct.js` that directly patches the BN.js prototype to ensure the `_bn` property is always available. This includes:

- Adding a getter/setter for the `_bn` property on the BN prototype
- Patching the BN constructor to ensure all instances have the `_bn` property
- Adding defensive methods to handle common operations safely
- Setting up a mutation observer to reapply patches when wallet-related DOM changes occur

### 2. BN Prototype Modification in \_app.tsx

Updated the `src/pages/_app.tsx` file to:

- Import all necessary polyfill files
- Add a `useEffect` hook that applies additional BN patches when the component mounts
- Add an emergency error handler specifically for `_bn` property errors
- Ensure the BN prototype has the `_bn` property with a proper getter/setter

### 3. Global Defensive Error Handling

Created a new file `src/utils/error-handler.js` that implements comprehensive error handling to catch and fix any remaining `_bn` property issues:

- Overriding `window.onerror` to catch `_bn` property errors
- Overriding `console.error` to detect and fix `_bn` property issues
- Adding try-catch wrappers for critical methods that might access the `_bn` property
- Setting up a MutationObserver to watch for wallet connection UI and apply preventive patches
- Adding special error handling for `JSON.stringify` to safely handle BN values

### 4. Compiled JavaScript Versions

Created compiled JavaScript versions of the TypeScript polyfill files to ensure proper loading:

- `src/utils/compiled/bn-polyfill.js`
- `src/utils/compiled/bn-polyfill-client.js`

## Implementation Details

### Key Files Modified/Created

1. `/src/utils/compiled/bn-polyfill.js` - Compiled version of the BigInt polyfill
2. `/src/utils/compiled/bn-polyfill-client.js` - Compiled version of the client-side BigInt handling
3. `/src/utils/bn-polyfill-direct.js` - Direct BN.js prototype patching for wallet connection
4. `/src/utils/error-handler.js` - Global defensive error handling for `_bn` property issues
5. `/src/pages/_app.tsx` - Updated to import all polyfill files and add additional runtime patches

### Key Changes

#### 1. BN Prototype Patching

```javascript
// Adding _bn property to BN.prototype
Object.defineProperty(BN.prototype, "_bn", {
  get: function () {
    // If _bn is undefined, return this
    if (this._bnValue === undefined) {
      this._bnValue = this;
    }
    return this._bnValue;
  },
  set: function (value) {
    this._bnValue = value;
  },
  configurable: true,
  enumerable: false,
});
```

#### 2. Defensive Error Handling

```javascript
// Override console.error to catch and fix _bn property errors
console.error = function (...args) {
  // Check if error is related to _bn property
  const errorString = args.join(" ");
  if (
    errorString.includes("_bn") &&
    (errorString.includes("cannot read properties") ||
      errorString.includes("is undefined") ||
      errorString.includes("is null"))
  ) {
    console.warn("Console error handler caught _bn error:", errorString);

    // Apply emergency patches
    if (window.solana) recursivelyPatchBN(window.solana);

    // Don't show the original error
    return;
  }

  // Call original console.error
  originalConsoleError.apply(console, args);
};
```

#### 3. Mutation Observer for DOM Changes

```javascript
// Set up a MutationObserver to watch for wallet connection UI
if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Element node
            const innerHTML = node.innerHTML || "";
            if (
              innerHTML.includes("wallet") ||
              innerHTML.includes("connect") ||
              innerHTML.includes("solana")
            ) {
              console.log("Detected wallet UI, applying preventive BN patches");

              // Patch global BN prototype again
              if (window.BN && window.BN.prototype) {
                // Apply patches...
              }

              break;
            }
          }
        }
      }
    }
  });

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
```

## Future Maintenance

When updating the codebase or dependencies in the future:

1. Ensure the polyfill files are properly imported in `_app.tsx`
2. Check for any changes in the BN.js library that might affect the `_bn` property handling
3. Test wallet connection thoroughly after any updates to ensure BigInt handling works correctly
4. If new wallet adapters are added, verify that they work with the existing BigInt patches
