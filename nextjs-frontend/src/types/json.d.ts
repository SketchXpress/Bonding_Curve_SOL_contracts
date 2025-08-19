declare module '*/bonding_curve_system.json' {
  const value: {
    version: string;
    name: string;
    instructions: any[];
    accounts: any[];
    types: any[];
  };
  export default value;
}

declare module '*/constants.json' {
  const value: {
    programId: string;
    networkConfig: {
      devnet: {
        url: string;
        wsUrl: string;
      };
      mainnet: {
        url: string;
        wsUrl: string;
      };
    };
    feeConfig: {
      platformFeePercentage: number;
      creatorFeePercentage: number;
      holderFeePercentage: number;
    };
    defaultPoolConfig: {
      basePrice: number;
      growthFactor: number;
      bidPremiumPercentage: number;
    };
    migrationThreshold: number;
  };
  export default value;
}
