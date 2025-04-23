// This file will contain the IDL for the bonding curve system program
// We'll extract this from the original repository

export const PROGRAM_ID = '6c3sjni7sr87CsDz3sHWHS1W7mnzSMpozAL9pwnpGsCS';

export const IDL = {
  version: "0.1.0",
  name: "bonding_curve_system",
  instructions: [
    {
      name: "createUser",
      accounts: [
        {
          name: "owner",
          isMut: true,
          isSigner: true
        },
        {
          name: "userAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "maxNfts",
          type: "u8"
        }
      ]
    },
    {
      name: "createPool",
      accounts: [
        {
          name: "authority",
          isMut: true,
          isSigner: true
        },
        {
          name: "realTokenMint",
          isMut: false,
          isSigner: false
        },
        {
          name: "syntheticTokenMint",
          isMut: true,
          isSigner: false
        },
        {
          name: "realTokenVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "basePrice",
          type: "u64"
        },
        {
          name: "growthFactor",
          type: "u64"
        }
      ]
    },
    {
      name: "buyToken",
      accounts: [
        {
          name: "buyer",
          isMut: true,
          isSigner: true
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false
        },
        {
          name: "realTokenVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "syntheticTokenMint",
          isMut: true,
          isSigner: false
        },
        {
          name: "buyerSyntheticTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "buyerRealTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "sellToken",
      accounts: [
        {
          name: "seller",
          isMut: true,
          isSigner: true
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false
        },
        {
          name: "realTokenVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "syntheticTokenMint",
          isMut: true,
          isSigner: false
        },
        {
          name: "sellerSyntheticTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "sellerRealTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "userAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "createNft",
      accounts: [
        {
          name: "creator",
          isMut: true,
          isSigner: true
        },
        {
          name: "nftMint",
          isMut: true,
          isSigner: false
        },
        {
          name: "nftData",
          isMut: true,
          isSigner: false
        },
        {
          name: "userAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "name",
          type: "string"
        },
        {
          name: "symbol",
          type: "string"
        },
        {
          name: "uri",
          type: "string"
        },
        {
          name: "sellerFeeBasisPoints",
          type: "u16"
        }
      ]
    },
    {
      name: "buyNft",
      accounts: [
        {
          name: "buyer",
          isMut: true,
          isSigner: true
        },
        {
          name: "buyerAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "sellerAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "nftData",
          isMut: true,
          isSigner: false
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false
        },
        {
          name: "sellerNftTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "buyerNftTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "UserAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "maxNfts",
            type: "u8"
          },
          {
            name: "nftsCreated",
            type: "u8"
          },
          {
            name: "nftsOwned",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "BondingCurvePool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "realTokenMint",
            type: "publicKey"
          },
          {
            name: "syntheticTokenMint",
            type: "publicKey"
          },
          {
            name: "realTokenVault",
            type: "publicKey"
          },
          {
            name: "basePrice",
            type: "u64"
          },
          {
            name: "growthFactor",
            type: "u64"
          },
          {
            name: "supply",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "NftData",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey"
          },
          {
            name: "mint",
            type: "publicKey"
          },
          {
            name: "name",
            type: "string"
          },
          {
            name: "symbol",
            type: "string"
          },
          {
            name: "uri",
            type: "string"
          },
          {
            name: "sellerFeeBasisPoints",
            type: "u16"
          },
          {
            name: "price",
            type: "u64"
          },
          {
            name: "forSale",
            type: "bool"
          }
        ]
      }
    }
  ],
  errors: [
    {
      code: 6000,
      name: "MaxNftsExceeded",
      msg: "Maximum number of NFTs exceeded"
    },
    {
      code: 6001,
      name: "NftNotForSale",
      msg: "NFT is not for sale"
    },
    {
      code: 6002,
      name: "InsufficientFunds",
      msg: "Insufficient funds to complete purchase"
    }
  ]
};

export default IDL;
