export const PROGRAM_ID = 'BW2b1MZTDYoX2BQBUqgCjZmq6brmLb4GUUcgoL4YaKro';

export const IDL ={
  "version": "0.1.0",
  "name": "bonding_curve_system",
  "instructions": [
    {
      "name": "createPool",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "realTokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "syntheticTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenVault",
          "isMut": true,
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
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "basePrice",
          "type": "u64"
        },
        {
          "name": "growthFactor",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createUser",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
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
          "name": "maxNfts",
          "type": "u8"
        }
      ]
    },
    {
      "name": "buyToken",
      "accounts": [
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "syntheticTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerSyntheticTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellToken",
      "accounts": [
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "syntheticTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerSyntheticTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createNft",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEditionAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "sellerFeeBasisPoints",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createNftData",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "sellerFeeBasisPoints",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createMasterEdition",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEditionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "buyNft",
      "accounts": [
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "buyerAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sellerNftTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyerNftTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "migrateToTensor",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "realTokenMint",
          "isMut": false,
          "isSigner": false
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
      "name": "NFTData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "collectionId",
            "type": "publicKey"
          },
          {
            "name": "isMutable",
            "type": "bool"
          },
          {
            "name": "primarySaleHappened",
            "type": "bool"
          },
          {
            "name": "sellerFeeBasisPoints",
            "type": "u16"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "lastPrice",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "BondingCurvePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "realTokenMint",
            "type": "publicKey"
          },
          {
            "name": "syntheticTokenMint",
            "type": "publicKey"
          },
          {
            "name": "realTokenVault",
            "type": "publicKey"
          },
          {
            "name": "currentMarketCap",
            "type": "u64"
          },
          {
            "name": "basePrice",
            "type": "u64"
          },
          {
            "name": "growthFactor",
            "type": "u64"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "totalBurned",
            "type": "u64"
          },
          {
            "name": "totalDistributed",
            "type": "u64"
          },
          {
            "name": "tensorMigrationTimestamp",
            "type": "i64"
          },
          {
            "name": "priceHistory",
            "type": {
              "array": ["u64", 10]
            }
          },
          {
            "name": "pastThreshold",
            "type": "u8"
          },
          {
            "name": "priceHistoryIdx",
            "type": "u8"
          },
          {
            "name": "migratedToTensor",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UserAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "realSolBalance",
            "type": "u64"
          },
          {
            "name": "syntheticSolBalance",
            "type": "u64"
          },
          {
            "name": "ownedNfts",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6001,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "InvalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6003,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6004,
      "name": "InvalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6005,
      "name": "InvalidPool",
      "msg": "Invalid pool"
    },
    {
      "code": 6006,
      "name": "InvalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6007,
      "name": "NFTAlreadySold",
      "msg": "NFT already sold"
    },
    {
      "code": 6008,
      "name": "InsufficientPoolBalance",
      "msg": "Insufficient pool balance"
    },
    {
      "code": 6009,
      "name": "BelowThreshold",
      "msg": "Market cap below threshold"
    }
  ],
  "metadata": {
    "address": "BW2b1MZTDYoX2BQBUqgCjZmq6brmLb4GUUcgoL4YaKro"
  }
}
;

export default IDL;


BW2b1MZTDYoX2BQBUqgCjZmq6brmLb4GUUcgoL4YaKro