export const PROGRAM_ID = 'AfWjSFSNxYJeXxPTfJvRynbYXnmFrMRaN2UXgr2LTrt7';

export const NETWORK_CONFIG = {
  devnet: {
    url: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com',
  },
  mainnet: {
    url: 'https://api.mainnet-beta.solana.com',
    wsUrl: 'wss://api.mainnet-beta.solana.com',
  },
};

export const DEFAULT_NETWORK = 'devnet';

export const FEE_CONFIG = {
  PLATFORM_FEE_PERCENTAGE: 4, // 4%
  CREATOR_FEE_PERCENTAGE: 95, // 95%
  HOLDER_FEE_PERCENTAGE: 1, // 1%
};

export const DEFAULT_POOL_CONFIG = {
  BASE_PRICE: 0.01, // SOL
  GROWTH_FACTOR: 0.1, // 10%
  BID_PREMIUM_PERCENTAGE: 5, // 5%
};

export const MIGRATION_THRESHOLD = 690; // SOL
