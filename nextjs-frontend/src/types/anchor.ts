import { Program, AnchorProvider } from '@project-serum/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

export type BondingCurveSystemProgram = Program<BondingCurveSystem>;

export interface BondingCurveSystem {
  version: "0.1.0";
  name: "bonding_curve_system";
  instructions: [
    // Add instruction interfaces here from IDL
  ];
  accounts: [
    // Add account interfaces here from IDL
  ];
}
