export const TEST_IDL = {
  "version": "0.1.0",
  "name": "bonding_curve_system",
  "instructions": [
    {
      "name": "createPool",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "basePrice",
          "type": "u64"
        }
      ]
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
          }
        ]
      }
    }
  ],
  "types": [],
  "events": [],
  "errors": []
} as const;
