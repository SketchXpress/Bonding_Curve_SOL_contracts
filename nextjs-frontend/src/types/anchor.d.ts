import { Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// Extend the AccountNamespace interface to include our custom account types
declare module '@coral-xyz/anchor' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface AccountNamespace<_IDL extends Idl> {
    bondingCurvePool: {
      fetch(address: PublicKey): Promise<Record<string, unknown>>;
    };
    nftData: {
      fetch(address: PublicKey): Promise<Record<string, unknown>>;
    };
  }
}
