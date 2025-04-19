// /types/bn.js.d.ts
declare module 'bn.js' {
    export default class BN {
      constructor(number: number | string | BN | Buffer, base?: number, endian?: string);
      
      // Add static properties and methods
      static isBN(object: unknown): boolean;
      static max(left: BN, right: BN): BN;
      static min(left: BN, right: BN): BN;
      
      // Conversion methods
      toString(base?: number, length?: number): string;
      toNumber(): number;
      toJSON(): string;
      toArray(endian?: string, length?: number): number[];
      toBuffer(endian?: string, length?: number): Buffer;
      
      // Arithmetic operations
      add(b: BN): BN;
      sub(b: BN): BN;
      mul(b: BN): BN;
      div(b: BN): BN;
      mod(b: BN): BN;
      pow(b: BN): BN;
      abs(): BN;
      neg(): BN;
      
      // Bitwise operations
      and(b: BN): BN;
      or(b: BN): BN;
      xor(b: BN): BN;
      shln(b: number): BN;
      shrn(b: number): BN;
      
      // Comparison operations
      isZero(): boolean;
      isNeg(): boolean;
      eq(b: BN): boolean;
      lt(b: BN): boolean;
      lte(b: BN): boolean;
      gt(b: BN): boolean;
      gte(b: BN): boolean;
      
      // Other utility methods
      clone(): BN;
      invm(red: unknown): BN; // Instead of red: any
      gcd(b: BN): BN;
      egcd(b: BN): { a: BN; b: BN; gcd: BN };
      
      // For Solana-specific encoding
      toArrayLike(type: 'Buffer', endian?: string, length?: number): Buffer;
      fromTwos(width: number): BN;
      toTwos(width: number): BN;
    }
  }
  