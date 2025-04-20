// src/types/global.d.ts
import type BN from 'bn.js';

declare global {
  interface Window {
    BN: typeof BN & {
      prototype: BN & {
        _bn?: BN;
        _bnValue?: BN;
      };
    };
    solana?: Record<string, unknown>;
  }
}

// Extend BN interface to include _bn property
declare module 'bn.js' {
  interface BN {
    _bn?: BN;
    _bnValue?: BN;
  }
}

export {};
