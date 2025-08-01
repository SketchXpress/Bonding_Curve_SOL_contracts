import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa');

export const IDL = {
  "address": "Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa",
  "version": "0.1.0",
  "name": "bonding_curve_system",
  "docs": [
    "SketchXpress Bonding Curve System",
    "Revolutionary NFT marketplace with dynamic pricing"
  ],
  "instructions": [
    {
      "name": "createPool",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collectionMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePoolArgs"
          }
        }
      ]
    },
    {
      "name": "distributeCollectionFees",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "The payer for transaction fees"
          ]
        },
        {
          "name": "collectionMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Collection mint"
          ]
        },
        {
          "name": "collectionDistribution",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Collection distribution account"
          ]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "NftHolderFeeClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "holder",
            "type": "publicKey"
          },
          {
            "name": "distributionRound",
            "type": "u32"
          },
          {
            "name": "amountClaimed",
            "type": "u64"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "CollectionDistribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collection",
            "docs": [
              "The collection this distribution is for"
            ],
            "type": "publicKey"
          },
          {
            "name": "totalNfts",
            "docs": [
              "Total number of NFTs in the collection"
            ],
            "type": "u32"
          },
          {
            "name": "accumulatedFees",
            "docs": [
              "Total accumulated fees for distribution"
            ],
            "type": "u64"
          },
          {
            "name": "lastDistribution",
            "docs": [
              "Last distribution timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "totalDistributed",
            "docs": [
              "Total amount distributed so far"
            ],
            "type": "u64"
          },
          {
            "name": "distributionCount",
            "docs": [
              "Number of distributions made"
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "BondingCurvePool",
      "docs": [
        "Bonding curve pool - main account"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collection",
            "docs": [
              "Collection this pool belongs to"
            ],
            "type": "publicKey"
          },
          {
            "name": "config",
            "docs": [
              "Pool configuration"
            ],
            "type": {
              "defined": "PoolConfig"
            }
          },
          {
            "name": "state",
            "docs": [
              "Current pool state"
            ],
            "type": {
              "defined": "PoolState"
            }
          },
          {
            "name": "stats",
            "docs": [
              "Pool statistics"
            ],
            "type": {
              "defined": "PoolStats"
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CreatePoolArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basePrice",
            "type": "u64"
          },
          {
            "name": "growthFactor",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PoolConfig",
      "docs": [
        "Pool configuration - immutable settings"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basePrice",
            "docs": [
              "Starting price in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "growthFactor",
            "docs": [
              "Growth factor (basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "maxSupply",
            "docs": [
              "Maximum supply"
            ],
            "type": "u32"
          },
          {
            "name": "migrationThreshold",
            "docs": [
              "Market cap threshold for migration"
            ],
            "type": "u64"
          },
          {
            "name": "creator",
            "docs": [
              "Creator of the pool"
            ],
            "type": "publicKey"
          },
          {
            "name": "protocolFee",
            "docs": [
              "Protocol fee in basis points"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "PoolState",
      "docs": [
        "Pool state - mutable state"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isActive",
            "docs": [
              "Whether pool is active"
            ],
            "type": "bool"
          },
          {
            "name": "currentSupply",
            "docs": [
              "Current supply of NFTs"
            ],
            "type": "u32"
          },
          {
            "name": "isMigrated",
            "docs": [
              "Whether migrated to Tensor"
            ],
            "type": "bool"
          },
          {
            "name": "migratedAt",
            "docs": [
              "Migration timestamp"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Pool creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "isMigratedToTensor",
            "docs": [
              "Whether specifically migrated to Tensor"
            ],
            "type": "bool"
          },
          {
            "name": "tensorMigrationTimestamp",
            "docs": [
              "Tensor migration timestamp"
            ],
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "PoolStats",
      "docs": [
        "Pool statistics - tracking metrics"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalEscrowed",
            "docs": [
              "Total SOL escrowed"
            ],
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "docs": [
              "Total volume traded"
            ],
            "type": "u64"
          },
          {
            "name": "marketCap",
            "docs": [
              "Current market cap"
            ],
            "type": "u64"
          },
          {
            "name": "totalTrades",
            "docs": [
              "Total number of trades"
            ],
            "type": "u32"
          },
          {
            "name": "lastTradeAt",
            "docs": [
              "Last trade timestamp"
            ],
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    }
  ],
  "events": [],
  "errors": []
} as const;
