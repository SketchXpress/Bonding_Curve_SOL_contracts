import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE');

export const IDL = {
  "address": "ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE",
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
      "name": "createCollectionNft",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collectionMint",
          "isMut": true,
          "isSigner": true
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
          "isMut": true,
          "isSigner": false,
          "docs": [
            "It will be created by the AssociatedToken program if it doesn't exist."
          ]
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
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
          "name": "args",
          "type": {
            "defined": "CreateCollectionNftArgs"
          }
        }
      ]
    },
    {
      "name": "mintNft",
      "accounts": [
        {
          "name": "minter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "bondingCurvePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "minterTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "minterTracker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
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
          "name": "args",
          "type": {
            "defined": "MintNftArgs"
          }
        }
      ]
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
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "BuyNftArgs"
          }
        }
      ]
    },
    {
      "name": "sellNft",
      "accounts": [
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerNftTokenAccount",
          "isMut": true,
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
          "name": "collectionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collectionMetadata",
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
      "name": "listForBids",
      "accounts": [
        {
          "name": "lister",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The NFT mint to list for bids"
          ]
        },
        {
          "name": "pool",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The bonding curve pool for dynamic pricing"
          ]
        },
        {
          "name": "collectionMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Collection mint for the NFT"
          ]
        },
        {
          "name": "listerTokenAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Lister's token account (must own the NFT)"
          ]
        },
        {
          "name": "bidListing",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The bid listing account to be created"
          ]
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ListForBidsArgs"
          }
        }
      ]
    },
    {
      "name": "placeBid",
      "accounts": [
        {
          "name": "bidder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "bidListing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bid",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Escrow account to hold bid funds (system account for SOL)"
          ]
        },
        {
          "name": "bondingCurvePool",
          "isMut": false,
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
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "PlaceBidArgs"
          }
        }
      ]
    },
    {
      "name": "acceptBid",
      "accounts": [
        {
          "name": "currentHolder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "bidListing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bid",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "minterTracker",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "bidderTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "bidEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sellerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creatorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "platformFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collectionDistribution",
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
          "name": "args",
          "type": {
            "defined": "AcceptBidArgs"
          }
        }
      ]
    },
    {
      "name": "cancelBid",
      "accounts": [
        {
          "name": "bidder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The NFT mint the bid was for"
          ]
        },
        {
          "name": "bidListing",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The bid listing for this NFT"
          ]
        },
        {
          "name": "bid",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The bid account to be cancelled"
          ]
        },
        {
          "name": "bidEscrow",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Escrow account holding the bid amount"
          ]
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
            "defined": "CancelBidArgs"
          }
        }
      ]
    },
    {
      "name": "cancelListing",
      "accounts": [
        {
          "name": "lister",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The NFT mint that was listed"
          ]
        },
        {
          "name": "bidListing",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "The bid listing account to cancel"
          ]
        },
        {
          "name": "listerTokenAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "Lister's token account (to verify they still own the NFT)"
          ]
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
        }
      ],
      "args": []
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
          "name": "collectionMint",
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
      "name": "BidListing",
      "docs": [
        "Account for managing NFT bid listings with dynamic pricing"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "docs": [
              "The NFT mint being listed for bids"
            ],
            "type": "publicKey"
          },
          {
            "name": "lister",
            "docs": [
              "The owner who listed the NFT"
            ],
            "type": "publicKey"
          },
          {
            "name": "minBid",
            "docs": [
              "Minimum bid amount (dynamically updated based on bonding curve)"
            ],
            "type": "u64"
          },
          {
            "name": "highestBid",
            "docs": [
              "Current highest bid amount"
            ],
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "docs": [
              "Pubkey of the highest bidder"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "totalBids",
            "docs": [
              "Total number of bids placed"
            ],
            "type": "u32"
          },
          {
            "name": "status",
            "docs": [
              "Current status of the listing"
            ],
            "type": {
              "defined": "BidListingStatus"
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Timestamp when listing was created"
            ],
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "docs": [
              "Timestamp when listing expires (0 = no expiry)"
            ],
            "type": "i64"
          },
          {
            "name": "lastPriceUpdate",
            "docs": [
              "Last time the minimum bid was updated based on bonding curve"
            ],
            "type": "i64"
          },
          {
            "name": "bondingCurvePriceAtListing",
            "docs": [
              "Bonding curve price when the listing was created"
            ],
            "type": "u64"
          },
          {
            "name": "currentBondingCurvePrice",
            "docs": [
              "Current bonding curve price (updated periodically)"
            ],
            "type": "u64"
          },
          {
            "name": "requiredPremiumBp",
            "docs": [
              "Premium percentage required above bonding curve (basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Bid",
      "docs": [
        "Individual bid state - clean and focused"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidId",
            "docs": [
              "Unique bid identifier"
            ],
            "type": "u64"
          },
          {
            "name": "details",
            "docs": [
              "Bid details"
            ],
            "type": {
              "defined": "BidDetails"
            }
          },
          {
            "name": "timing",
            "docs": [
              "Bid timing"
            ],
            "type": {
              "defined": "BidTiming"
            }
          },
          {
            "name": "outcome",
            "docs": [
              "Bid status and outcome"
            ],
            "type": {
              "defined": "BidOutcome"
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
      "name": "MinterTracker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "docs": [
              "The NFT mint this tracker is for"
            ],
            "type": "publicKey"
          },
          {
            "name": "originalMinter",
            "docs": [
              "The original minter of the NFT"
            ],
            "type": "publicKey"
          },
          {
            "name": "mintedAt",
            "docs": [
              "Timestamp when NFT was minted"
            ],
            "type": "i64"
          },
          {
            "name": "collection",
            "docs": [
              "Collection this NFT belongs to"
            ],
            "type": "publicKey"
          },
          {
            "name": "totalRevenueEarned",
            "docs": [
              "Total revenue earned by original minter from this NFT"
            ],
            "type": "u64"
          },
          {
            "name": "saleCount",
            "docs": [
              "Number of times this NFT has been sold via bidding"
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
      "name": "NftEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "lamports",
            "type": "u64"
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
            "name": "totalNftsBought",
            "type": "u64"
          },
          {
            "name": "totalNftsSold",
            "type": "u64"
          },
          {
            "name": "totalVolumeBought",
            "type": "u64"
          },
          {
            "name": "totalVolumeSold",
            "type": "u64"
          },
          {
            "name": "totalFeesPaid",
            "type": "u64"
          },
          {
            "name": "totalFeesEarned",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AcceptBidArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "BuyNftArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxPrice",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "CancelBidArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CreateCollectionNftArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
          }
        ]
      }
    },
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
      "name": "DistributeCollectionFeesArgs",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "ListForBidsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minBid",
            "type": "u64"
          },
          {
            "name": "durationHours",
            "type": {
              "option": "u32"
            }
          }
        ]
      }
    },
    {
      "name": "MigrateToTensorArgs",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "MintNftArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
          }
        ]
      }
    },
    {
      "name": "PlaceBidArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "BidDetails",
      "docs": [
        "Bid details - core bid information"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "docs": [
              "NFT being bid on"
            ],
            "type": "publicKey"
          },
          {
            "name": "bidder",
            "docs": [
              "Address of the bidder"
            ],
            "type": "publicKey"
          },
          {
            "name": "amount",
            "docs": [
              "Bid amount in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "premiumBp",
            "docs": [
              "Premium over bonding curve price (basis points)"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "BidTiming",
      "docs": [
        "Bid timing - when bid was created and expires"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createdAt",
            "docs": [
              "When bid was created"
            ],
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "docs": [
              "When bid expires"
            ],
            "type": "i64"
          },
          {
            "name": "duration",
            "docs": [
              "Duration in seconds"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "BidOutcome",
      "docs": [
        "Bid outcome - status and resolution"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "docs": [
              "Current bid status"
            ],
            "type": {
              "defined": "BidStatus"
            }
          },
          {
            "name": "acceptedAt",
            "docs": [
              "When bid was accepted (if applicable)"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "cancelledAt",
            "docs": [
              "When bid was cancelled (if applicable)"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "cancellationReason",
            "docs": [
              "Reason for cancellation (if applicable)"
            ],
            "type": {
              "option": {
                "defined": "CancellationReason"
              }
            }
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
    },
    {
      "name": "RevenueDistribution",
      "docs": [
        "Revenue distribution configuration for the bidding system"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minterPercentage",
            "docs": [
              "Percentage to original minter (basis points, e.g., 9500 = 95%)"
            ],
            "type": "u16"
          },
          {
            "name": "platformPercentage",
            "docs": [
              "Percentage to platform (basis points, e.g., 400 = 4%)"
            ],
            "type": "u16"
          },
          {
            "name": "collectionPercentage",
            "docs": [
              "Percentage to collection holders (basis points, e.g., 100 = 1%)"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "DynamicPricingConfig",
      "docs": [
        "Dynamic pricing configuration"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minimumPremiumBp",
            "docs": [
              "Minimum premium above bonding curve price (basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "bidIncrementBp",
            "docs": [
              "Required increment above current highest bid (basis points)"
            ],
            "type": "u16"
          },
          {
            "name": "maxBidDuration",
            "docs": [
              "Maximum bid duration in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "minBidDuration",
            "docs": [
              "Minimum bid duration in seconds"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "BondingCurveParams",
      "docs": [
        "Bonding curve parameters"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basePrice",
            "docs": [
              "Base price for the first NFT"
            ],
            "type": "u64"
          },
          {
            "name": "growthFactor",
            "docs": [
              "Growth factor (basis points, e.g., 1100 = 10% growth)"
            ],
            "type": "u16"
          },
          {
            "name": "maxSupply",
            "docs": [
              "Maximum supply before migration"
            ],
            "type": "u32"
          },
          {
            "name": "migrationThreshold",
            "docs": [
              "Market cap threshold for migration (in lamports)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CollectionMetadata",
      "docs": [
        "Collection metadata for fee distribution"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "docs": [
              "Collection name"
            ],
            "type": "string"
          },
          {
            "name": "symbol",
            "docs": [
              "Collection symbol"
            ],
            "type": "string"
          },
          {
            "name": "description",
            "docs": [
              "Collection description"
            ],
            "type": "string"
          },
          {
            "name": "image",
            "docs": [
              "Collection image URI"
            ],
            "type": "string"
          },
          {
            "name": "externalUrl",
            "docs": [
              "External URL"
            ],
            "type": {
              "option": "string"
            }
          },
          {
            "name": "creator",
            "docs": [
              "Collection creator"
            ],
            "type": "publicKey"
          },
          {
            "name": "royaltyBp",
            "docs": [
              "Royalty percentage (basis points)"
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "CancellationReason",
      "docs": [
        "Cancellation reason enumeration"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "UserCancelled"
          },
          {
            "name": "Expired"
          },
          {
            "name": "ListingCancelled"
          },
          {
            "name": "HigherBidAccepted"
          },
          {
            "name": "SystemCancelled"
          }
        ]
      }
    },
    {
      "name": "BidListingStatus",
      "docs": [
        "Status of a bid listing"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Accepted"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Expired"
          }
        ]
      }
    },
    {
      "name": "BidStatus",
      "docs": [
        "Status of an individual bid"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Accepted"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Expired"
          },
          {
            "name": "Outbid"
          }
        ]
      }
    },
    {
      "name": "MarketPosition",
      "docs": [
        "Market position relative to bonding curve"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "BelowCurve"
          },
          {
            "name": "AtCurve"
          },
          {
            "name": "AboveCurve"
          }
        ]
      }
    },
    {
      "name": "LogLevel",
      "docs": [
        "Debug logging levels"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Trace"
          },
          {
            "name": "Debug"
          },
          {
            "name": "Info"
          },
          {
            "name": "Warn"
          },
          {
            "name": "Error"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "BidCancelled",
      "fields": [
        {
          "name": "bidId",
          "type": "u64",
          "index": false
        },
        {
          "name": "nftMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "bidder",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "CollectionFeesDistributed",
      "fields": [
        {
          "name": "collection",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalDistributed",
          "type": "u64",
          "index": false
        },
        {
          "name": "perNftAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "totalNfts",
          "type": "u32",
          "index": false
        },
        {
          "name": "distributionCount",
          "type": "u32",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "NftHolderPayout",
      "fields": [
        {
          "name": "nftMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "holder",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ListingCreatedEvent",
      "fields": [
        {
          "name": "nftMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "lister",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "minBid",
          "type": "u64",
          "index": false
        },
        {
          "name": "bondingCurvePrice",
          "type": "u64",
          "index": false
        },
        {
          "name": "premiumPercentage",
          "type": "u64",
          "index": false
        },
        {
          "name": "expiresAt",
          "type": "i64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "NftSale",
      "fields": [
        {
          "name": "seller",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "nftMint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "pool",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "salePrice",
          "type": "u64",
          "index": false
        },
        {
          "name": "sellFee",
          "type": "u64",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 12000,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 12001,
      "name": "InsufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 12002,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 12003,
      "name": "InvalidAccount",
      "msg": "Invalid account"
    },
    {
      "code": 12004,
      "name": "AccountNotInitialized",
      "msg": "Account not initialized"
    },
    {
      "code": 12005,
      "name": "InvalidAccountOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 12006,
      "name": "InvalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 12007,
      "name": "MathError",
      "msg": "Math error"
    },
    {
      "code": 12008,
      "name": "ValueTooLow",
      "msg": "Value too low"
    },
    {
      "code": 12009,
      "name": "ValueTooHigh",
      "msg": "Value too high"
    },
    {
      "code": 12020,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 12021,
      "name": "MathUnderflow",
      "msg": "Math underflow"
    },
    {
      "code": 12022,
      "name": "DivisionByZero",
      "msg": "Division by zero"
    },
    {
      "code": 12030,
      "name": "PoolInactive",
      "msg": "Pool inactive"
    },
    {
      "code": 12031,
      "name": "AlreadyMigrated",
      "msg": "Already migrated"
    },
    {
      "code": 12032,
      "name": "MaxSupplyReached",
      "msg": "Max supply reached"
    },
    {
      "code": 12033,
      "name": "ThresholdNotMet",
      "msg": "Threshold not met"
    },
    {
      "code": 12040,
      "name": "InvalidNftMint",
      "msg": "Invalid NFT mint"
    },
    {
      "code": 12041,
      "name": "NftNotOwned",
      "msg": "NFT not owned"
    },
    {
      "code": 12042,
      "name": "CannotOperateOnOwnNft",
      "msg": "Cannot operate on own NFT"
    },
    {
      "code": 12043,
      "name": "NFTAlreadySold",
      "msg": "NFT already sold"
    },
    {
      "code": 12044,
      "name": "InsufficientNftBalance",
      "msg": "Insufficient NFT balance"
    },
    {
      "code": 12050,
      "name": "BidTooHigh",
      "msg": "Bid too high"
    },
    {
      "code": 12051,
      "name": "BidMustExceedBondingCurve",
      "msg": "Bid must exceed bonding curve"
    },
    {
      "code": 12052,
      "name": "InsufficientBidIncrement",
      "msg": "Insufficient bid increment"
    },
    {
      "code": 12053,
      "name": "ListingExpired",
      "msg": "Bid listing expired"
    },
    {
      "code": 12054,
      "name": "InvalidBidAmount",
      "msg": "Invalid bid amount"
    },
    {
      "code": 12055,
      "name": "BidNotFound",
      "msg": "Bid not found"
    },
    {
      "code": 12056,
      "name": "UnauthorizedBidCancellation",
      "msg": "Unauthorized bid cancellation"
    },
    {
      "code": 12057,
      "name": "CannotCancelBid",
      "msg": "Cannot cancel bid"
    },
    {
      "code": 12058,
      "name": "BidTooLow",
      "msg": "Bid too low"
    },
    {
      "code": 12059,
      "name": "BidExpired",
      "msg": "Bid expired"
    },
    {
      "code": 12060,
      "name": "CannotBidOnOwnNft",
      "msg": "Cannot bid on own NFT"
    },
    {
      "code": 12061,
      "name": "BidBelowBondingCurve",
      "msg": "Bid below bonding curve"
    },
    {
      "code": 12062,
      "name": "InsufficientPremium",
      "msg": "Insufficient premium"
    },
    {
      "code": 12070,
      "name": "EscrowNotEmpty",
      "msg": "Escrow not empty"
    },
    {
      "code": 12071,
      "name": "InsufficientEscrowBalance",
      "msg": "Insufficient escrow balance"
    },
    {
      "code": 12072,
      "name": "InvalidRevenueSplit",
      "msg": "Invalid revenue split"
    },
    {
      "code": 12090,
      "name": "DurationTooShort",
      "msg": "Duration too short"
    },
    {
      "code": 12091,
      "name": "DurationTooLong",
      "msg": "Duration too long"
    },
    {
      "code": 12092,
      "name": "InvalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 12100,
      "name": "EmptyString",
      "msg": "Empty string"
    },
    {
      "code": 12101,
      "name": "StringTooLong",
      "msg": "String too long"
    },
    {
      "code": 12110,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 12111,
      "name": "InsufficientAccountSpace",
      "msg": "Insufficient account space"
    },
    {
      "code": 12120,
      "name": "AdvancedBidValidation",
      "msg": "Advanced bid validation"
    },
    {
      "code": 12130,
      "name": "PriceExceedsMaximum",
      "msg": "Price exceeds maximum allowed"
    },
    {
      "code": 12140,
      "name": "InvalidListingStatus",
      "msg": "Invalid listing status"
    },
    {
      "code": 12141,
      "name": "UnauthorizedLister",
      "msg": "Unauthorized lister"
    },
    {
      "code": 12142,
      "name": "CannotCancelWithActiveBids",
      "msg": "Cannot cancel listing with active bids"
    },
    {
      "code": 12150,
      "name": "InvalidDuration",
      "msg": "Invalid duration"
    },
    {
      "code": 12151,
      "name": "Expired",
      "msg": "Expired"
    },
    {
      "code": 12160,
      "name": "InvalidPercentage",
      "msg": "Invalid percentage"
    }
  ]
} as const;
