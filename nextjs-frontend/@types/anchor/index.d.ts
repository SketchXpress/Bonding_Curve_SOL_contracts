declare module '@project-serum/anchor' {
  import { Connection, PublicKey } from '@solana/web3.js';
  
  export class Program<IDL = any> {
    constructor(idl: IDL, programId: PublicKey, provider: AnchorProvider);
    account: {
      [key: string]: {
        fetch(address: PublicKey): Promise<any>;
      };
    };
    methods: {
      [key: string]: (args?: any) => {
        accounts(accounts: any): {
          instruction(): Promise<any>;
        };
      };
    };
    provider: AnchorProvider;
  }

  export class AnchorProvider {
    constructor(connection: Connection, wallet: { publicKey: PublicKey }, opts: { commitment: string });
    static local(): AnchorProvider;
    connection: Connection;
    wallet: { publicKey: PublicKey };
  }

  export interface Idl {
    version: string;
    name: string;
    instructions: IdlInstruction[];
    accounts: IdlAccount[];
    types: IdlType[];
  }

  export interface IdlInstruction {
    name: string;
    accounts: IdlAccount[];
    args: IdlField[];
  }

  export interface IdlAccount {
    name: string;
    isMut: boolean;
    isSigner: boolean;
  }

  export interface IdlField {
    name: string;
    type: string | IdlType;
  }

  export interface IdlType {
    kind: string;
    fields?: IdlField[];
    variants?: IdlType[];
  }
}
