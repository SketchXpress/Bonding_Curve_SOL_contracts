# SketchXpress SOL Contracts

A Solana blockchain project implementing an **NFT-Only Bonding Curve AMM** with **Token-Owned Escrow (TOE)**, dynamic pricing, and Tensor marketplace integration.

---

## Overview

This project implements a novel NFT liquidity system using an exponential bonding curve combined with a Token-Owned Escrow (TOE) mechanism. It eliminates the need for separate fungible tokens, embedding liquidity directly within each NFT.

Key aspects include:

- **NFT-Only Liquidity**: All value is captured within the NFTs and their associated SOL escrows.
- **Dynamic NFT Pricing**: Prices increase algorithmically with supply based on the bonding curve (`price = base_price * growth_factor^supply`).
- **Token-Owned Escrow (TOE)**: Each minted NFT has a dedicated Program Derived Address (PDA) account that escrows its SOL value.
- **Direct SOL Interaction**: Users mint NFTs by depositing SOL directly into the TOE and sell NFTs by burning them to retrieve SOL from the TOE.
- **Tensor Migration**: Collections can migrate to the Tensor marketplace upon reaching a specific liquidity threshold (e.g., 690 SOL total escrowed).
- **Simplified Economics**: Focuses on mint fees and standard Metaplex creator royalties.

---

## Key Features

- **Bonding Curve Pools**: Create NFT collections with customizable `base_price` and `growth_factor`.
- **NFT Minting with TOE**: Mint NFTs at the current curve price; the SOL (minus protocol fee) is locked into the NFT's dedicated escrow (TOE).
- **NFT Selling (Burning)**: Sell NFTs back to the pool by burning them; the SOL locked in the TOE is returned to the seller.
- **Metaplex Compatibility**: Uses Metaplex standards for NFT creation and metadata.
- **Tensor Integration**: Designed for seamless migration to Tensor for secondary market trading.

---

## Project Structure

### 1. Smart Contracts (`programs/bonding-curve-system`)

- **`state/pool.rs`**: Defines the `BondingCurvePool` account holding curve parameters, supply, collection info, etc.
- **`state/nft_escrow.rs`**: Defines the `NftEscrow` account (TOE) linked to each NFT, holding its SOL value.
- **`instructions/create_pool.rs`**: Logic for initializing a new bonding curve pool.
- **`instructions/mint_nft.rs`**: Logic for minting an NFT, creating its metadata/master edition via Metaplex, calculating the price, and funding its TOE.
- **`instructions/sell_nft.rs`**: Logic for burning an NFT via Metaplex and returning SOL from its TOE.
- **`instructions/migrate_to_tensor.rs`**: Logic to freeze the pool and potentially interact with Tensor (basic structure provided).

### 2. Frontend Implementations

- **NextJS Frontend** (`nextjs-frontend`): Updates added to reflect the TOE model.

### 3. Testing & Migration

- **Tests** (`tests/`): Require significant updates to match the new NFT-Only TOE system.
- **Tensor Sync**: Migration logic based on `total_escrowed` SOL in the pool.

---

## Technical Details

### Bonding Curve Implementation

- **Price Formula**: `price = base_price * growth_factor^supply` (Note: `growth_factor` is often represented as a fixed-point number, e.g., 1.2 might be 1_200_000).
- **Supply Adjustments**:
  - **Minting**: Increases `current_supply` -> price rises for the _next_ mint.
  - **Selling (Burning)**: Decreases `current_supply` -> price drops for the _next_ mint.

### Token-Owned Escrow (TOE)

- Each NFT mint address is used as a seed (along with a prefix) to derive a unique PDA (`NftEscrow` account).
- When an NFT is minted, the calculated SOL price (minus fees) is transferred directly into this escrow PDA.
- When the NFT is sold back to the pool (burned), the SOL is transferred out of the escrow PDA back to the seller, and the escrow account is closed.

### NFT Functionality

- **Metadata Standards**: Metaplex-compatible (Token Metadata program).
- **Creation**: Handled within the `mint_nft` instruction using CPIs to the Metaplex program.
- **Burning**: Handled within the `sell_nft` instruction using CPIs to the Metaplex program.

### Threshold Detection (Tensor Migration)

- **Migration Trigger**: Based on `total_escrowed` SOL across all `NftEscrow` accounts associated with the pool (e.g., `pool.total_escrowed >= 690_000_000` lamports).
- **Post-Migration**: The pool's `is_active` flag is set to `false`, preventing further mints/sells via the bonding curve.

---

## Setup & Installation

### Prerequisites

- Solana CLI
- Node.js, npm/yarn
- Rust, Cargo
- Anchor CLI (Install via `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest`)

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/SketchXpress/Bonding_Curve_SOL_contracts.git
   cd Bonding_Curve_SOL_contracts
   ```
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Build the program:
   ```bash
   anchor build
   ```

---

## Usage Guide

### Creating a Pool

1. Define parameters:
   - `collection_mint`: The mint address of the Metaplex collection.
   - `base_price`: Initial NFT price in lamports (e.g., 1,000,000 for 0.001 SOL).
   - `growth_factor`: Fixed-point growth rate (e.g., 120000 for 1.2x).
2. Call the `create_pool` instruction.

### Minting NFTs

1. Select a pool.
2. Call the `mint_nft` instruction, providing NFT metadata (name, symbol, uri) and paying the current curve price + protocol fee.
3. SOL (net of fee) is locked in the new NFT's TOE, and the NFT is minted to the user's wallet.

### Selling NFTs

1. Call the `sell_nft` instruction with the NFT you own.
2. The contract verifies ownership, calculates the sell price (based on `current_supply - 1`), burns the NFT, and transfers the SOL from the TOE to the seller.

### Migrating to Tensor

1. When `pool.total_escrowed` reaches the threshold (e.g., 690 SOL), call `migrate_to_tensor`.
2. The pool becomes inactive.
3. Further trading occurs on secondary marketplaces like Tensor.

---

## Economic Model

| Action             | Fees/Penalties             | Recipient      |
| ------------------ | -------------------------- | -------------- |
| **Mint**           | 1% of price (configurable) | Pool Creator   |
| **Secondary Sale** | Standard Metaplex Royalty  | NFT Creator(s) |
| **Sell (Burn)**    | 5% of penalty              | Pool Creator   |

_Note: Secondary sales happen on external marketplaces (like Tensor after migration) and are subject to Metaplex royalties._

---

## Testing

```bash
# Requires updated tests reflecting the TOE model
anchor test
```

**Key Tests Needed**:

- Pool creation.
- `mint_nft` price calculation and TOE funding.
- `sell_nft` price calculation, NFT burning, and TOE withdrawal.
- Fee calculation and distribution.
- Migration threshold and pool freezing.

---

## License

Apache-2.0

---

## Contributing

Contributions are currently paused.

---
