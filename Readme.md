---

# SketchXpress SOL Contracts  
A Solana blockchain project implementing a **bonding curve system for NFTs** with dynamic pricing, burn mechanics, and Tensor marketplace integration.  

---

## Overview  
This project combines an exponential bonding curve model with NFT creation/trading, enabling:  
- **Dynamic NFT Pricing**: Prices increase exponentially with supply (`price = base_price * e^(growth_factor * supply)`).  
- **Burn-Distribute Mechanism**: A percentage of secondary sales and buybacks is burned (reducing supply) and redistributed to holders.  
- **Tensor Migration**: Collections automatically graduate to Tensor marketplace when reaching $69k market cap.  
- **Self-Regulating Economy**: Fees fund platform sustainability while incentivizing early adopters and long-term holders.  

---

## Key Features  
- **Bonding Curve Pools**: Create NFT collections with customizable `base_price` and `growth_factor`.  
- **NFT Minting**: Mint NFTs at algorithmically determined prices.  
- **Secondary Trading**: Buy/sell NFTs peer-to-peer or via buyback to the pool.  
- **Burn & Redistribution**:  
  - 3% of secondary sales burned (reduces supply) + 1.5% distributed to holders.  
  - 5% buyback penalty (2.5% burned + 2.5% distributed).  
- **Tensor Integration**: Seamless migration to Tensor for enhanced liquidity.  

---

## Project Structure  
### 1. Smart Contracts (`programs/bonding-curve-system`)  
- **Pool Management**: Create/update bonding curve pools.  
- **NFT Operations**: Mint, buy, sell, and burn NFTs with integrated fee logic.  
- **User Accounts**: Track owned NFTs and earned rewards.  

### 2. Frontend Implementations  
- **NextJS Frontend** (`nextjs-frontend`):  
  - Real-time bonding curve visualization.  
  - Burn/distribution tracking dashboard.  
  - Migration status to Tensor.  
- **Simple Frontend** (`simple-frontend`): Lightweight UI for core functions.  

### 3. Testing & Migration  
- **Tests**: Validate bonding curve math, burn/distribution, and threshold detection.  
- **Tensor Sync**: Automated metadata and liquidity migration.  

---

## Technical Details  
### Bonding Curve Implementation  
- **Price Formula**: `price = base_price * e^(growth_factor * supply)`  
- **Supply Adjustments**:  
  - **Minting**: Increases supply → price rises.  
  - **Buybacks**: Decreases supply → price drops.  
- **Burn Mechanics**:  
  - 50% of burn fees permanently remove SOL from circulation.  
  - 50% distributed to NFT holders proportionally.  

### NFT Functionality  
- **Metadata Standards**: Metaplex-compatible with enforced royalties.  
- **Provenance Tracking**: All NFTs tagged "Minted via SketchXpress".  

### Threshold Detection  
- **Migration Trigger**: `sol_reserves >= 69,000 SOL` (~$69k).  
- **Post-Migration**:  
  - NFTs listed on Tensor with retained metadata.  
  - Royalties enforced via Tensor’s AMM.  

---

## Setup & Installation  
### Prerequisites  
- Solana CLI  
- Node.js, npm/yarn  
- Rust, Anchor  

### Quick Start  
1. Clone the repository:  
   ```bash
   git clone https://github.com/SketchXpress/Bonding_Curve_SOL_contracts.git
   cd Bonding_Curve_SOL_contracts
   ```
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Build the program:  
   ```bash
   anchor build
   ```

---

## Usage Guide  
### Creating a Pool  
1. Connect wallet.  
2. Navigate to **Create Pool**.  
3. Set parameters:  
   - `base_price`: Initial NFT price (e.g., 0.1 SOL).  
   - `growth_factor`: Exponential growth rate (e.g., 0.0001).  
4. Submit transaction (~0.003 SOL fee).  

### Minting NFTs  
1. Select a pool.  
2. Pay current price + 1% platform fee.  
3. NFT added to your wallet and collection supply.  

### Secondary Trading  
- **Peer-to-Peer**: List NFTs ≥ current curve price (5% creator + 2% platform fees).  
- **Buyback to Pool**: Sell at 95% of current price (5% penalty: 2.5% burned + 2.5% distributed).  

### Migrating to Tensor  
1. When `sol_reserves` hits 69k SOL, click **Migrate to Tensor**.  
2. Confirm transaction (6 SOL fee).  
3. Trade on Tensor with aggregated liquidity.  

---

## Economic Model  
| Action          | Fees/Penalties              | Recipient          |
|-----------------|-----------------------------|--------------------|
| **Mint**        | 1% of price                 | Platform           |
| **Secondary Sale** | 5% royalty              | Creator            |
| **Secondary Sale** | 3% burn/distribute      | Burn (1.5%) + Holders (1.5%) |
| **Buyback**     | 5% penalty                  | Burn (2.5%) + Holders (2.5%) |  

---

## Testing  
```bash
anchor test
```
**Key Tests**:  
- Bonding curve price accuracy.  
- Fee distribution and burn mechanics.  
- Threshold detection and Tensor migration.  

---

## License  
Apache-2.0  

---

## Contributing  
Contributions paused pending post-migration analytics.  

---

This README reflects the updated bonding curve mechanics, burn-distribute model, and Tensor integration. 
