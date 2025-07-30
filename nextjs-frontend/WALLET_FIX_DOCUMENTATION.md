# Wallet Provider Duplicate Key Error Fix

## Problem Description
The application was experiencing a React key duplication error specifically when connecting Phantom wallet:
```
Encountered two children with the same key, `MetaMask`. Keys should be unique so that components maintain their identity across updates.
```

## Root Cause Analysis
The issue was caused by **duplicate wallet registrations** happening in two ways:

1. **Manual Registration**: We were manually including `PhantomWalletAdapter` in our wallets array
2. **Automatic Standard Wallet Detection**: Phantom wallet automatically registers itself as a standard wallet when the browser extension is present

This created duplicate entries for wallets, especially affecting MetaMask integration within Solflare, leading to React key conflicts.

## Solution Implemented

### 1. Removed Nested Wallet Providers
- **Before**: `_app.tsx` had its own wallet provider setup AND individual pages wrapped content with `WalletContextProvider`
- **After**: Only `WalletContextProvider` is used, eliminating nested providers

### 2. Removed Manual PhantomWalletAdapter Registration
- **Before**: 
  ```tsx
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);
  ```
- **After**:
  ```tsx
  const wallets = useMemo(() => [
    new SolflareWalletAdapter(),
  ], []);
  ```

### 3. Rely on Standard Wallet Auto-Detection
- Phantom wallet is now automatically detected and registered as a standard wallet
- This prevents duplicate registrations and resolves key conflicts
- Modern wallet adapters support standard wallet detection out of the box

## File Changes Made

### `src/pages/_app.tsx`
- Removed all wallet-related imports and setup
- Simplified to only handle BN patching and render `GlobalPatcher`
- Removed `ConnectionProvider`, `WalletProvider`, and `WalletModalProvider` from this file

### `src/contexts/WalletContextProvider.tsx` 
- Removed `PhantomWalletAdapter` import
- Updated wallets array to only include `SolflareWalletAdapter`
- Added comments explaining the approach
- Kept dynamic import with SSR disabled for client-side wallet detection

## Benefits of This Approach

✅ **Eliminates Duplicate Keys**: No more React key conflicts  
✅ **Modern Standard**: Uses wallet-standard auto-detection  
✅ **Better Performance**: Reduces bundle size by not manually importing all adapters  
✅ **Future-Proof**: New wallets that support standard detection work automatically  
✅ **Cleaner Code**: Single source of truth for wallet providers  

## How It Works Now

1. **Standard Wallet Detection**: When the page loads, the wallet adapter library automatically detects installed wallet extensions
2. **Auto-Registration**: Compatible wallets (like Phantom) are automatically registered
3. **Manual Adapters**: Non-standard wallets (like Solflare) are manually added to the wallets array
4. **Unified Provider**: All wallets are available through a single `WalletContextProvider`

## Testing
- ✅ Server starts without errors
- ✅ Page loads successfully  
- ✅ No React key duplication warnings
- ✅ BN patches work correctly
- ✅ Wallet detection works for both standard and manual adapters

## Future Considerations
- Monitor for new wallet adapters that might need manual registration
- Consider removing `SolflareWalletAdapter` if it gains standard wallet support
- Keep an eye on wallet-standard specification updates
