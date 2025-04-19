// src/types/globals.d.ts
import type BN from 'bn.js';

declare global {
  interface Window {
    BN: typeof BN;
  }
}

export {};
