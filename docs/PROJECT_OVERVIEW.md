# SketchXpress Bonding Curve System - Project Overview

## 🏗️ Architecture Overview

The SketchXpress Bonding Curve System is a comprehensive NFT marketplace built on Solana, featuring dynamic pricing through exponential bonding curves and token-owned escrow mechanisms.

## 📁 Project Structure

```
bonding-curve-sol-contracts/
├── 📁 programs/                    # Anchor smart contracts
│   └── 📁 bonding-curve-system/   # Main contract implementation
│       ├── 📁 src/
│       │   ├── 📁 instructions/   # Contract instructions
│       │   ├── 📁 state/         # Program state definitions
│       │   └── lib.rs            # Main program entry
│       └── Cargo.toml
├── 📁 nextjs-frontend/            # Web3 frontend application
│   ├── 📁 src/
│   │   ├── 📁 components/        # React components
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   ├── 📁 utils/            # Utility functions
│   │   └── 📁 contexts/         # React contexts
│   ├── 📁 app/                  # Next.js app directory
│   ├── package.json
│   └── next.config.js
├── 📁 tests/                      # Contract test suites
├── 📁 scripts/                    # Utility scripts
├── 📁 docs/                       # Documentation
├── 📁 migrations/                 # Deployment scripts
├── 📁 target/                     # Build artifacts
├── docker-compose.yml
├── Dockerfile
├── Anchor.toml
└── README.md
```

## 🔧 Core Components

### Smart Contract Layer (`programs/bonding-curve-system/`)

#### Key Instructions:
- **`create_pool`**: Initialize a new bonding curve pool for an NFT collection
- **`mint_nft`**: Mint NFT with dynamic pricing based on current supply
- **`buy_nft`**: Purchase NFT from secondary market with escrow
- **`sell_nft`**: List NFT for sale with minimum price validation
- **`place_bid`**: Place bids that must exceed bonding curve price + premium
- **`accept_bid`**: Accept highest valid bid
- **`migrate_to_tensor`**: Migrate collection to Tensor marketplace

#### State Management:
- **`Pool`**: Stores collection metadata, pricing parameters, statistics
- **`EscrowAccount`**: Manages SOL backing for each NFT
- **`BidAccount`**: Tracks active bids and bidding history

### Frontend Layer (`nextjs-frontend/`)

#### Core Components:
- **`CreatePoolCard`**: Interface for creating new NFT collections
- **`MintNftCard`**: Dynamic minting with real-time price display
- **`BuyNftCard`**: Purchase interface with escrow visualization
- **`SellNftCard`**: Listing interface with minimum price validation
- **`BidPlacementCard`**: Bidding interface with premium calculations
- **`PoolInfoCard`**: Real-time pool statistics and analytics

#### Custom Hooks:
- **`useCreatePool`**: Pool creation transaction handling
- **`useMintNft`**: NFT minting with collection integration
- **`useBuyNft`**: Purchase transactions with escrow management
- **`useSellNft`**: Listing transactions with validation
- **`useBidding`**: Bid placement and management

## 🎯 Business Logic

### Bonding Curve Mathematics

```typescript
// Exponential pricing formula
price = base_price * (1 + growth_factor) ^ supply

// Example with default parameters
base_price = 0.01 SOL
growth_factor = 0.1 (10% increase per mint)
```

### Revenue Distribution

- **95%** → NFT Minter (original creator)
- **4%** → Platform Fee
- **1%** → Collection Holders (distributed proportionally)

### Escrow Mechanism

Each NFT is backed by SOL in a token-owned escrow account:
- **Creation**: 50% of purchase price goes to escrow
- **Trading**: Escrow value increases with each transaction
- **Redemption**: Holders can claim proportional SOL value

### Migration Threshold

When collection reaches **690 SOL market cap**:
- Automatic migration to Tensor marketplace
- Preserved royalty structure
- Maintained collection metadata

## 🔄 User Flows

### Creator Journey
1. **Create Pool** → Set collection metadata and parameters
2. **Mint NFTs** → Dynamic pricing starts at base price
3. **Earn Royalties** → Receive 95% of all primary sales
4. **Monitor Growth** → Track collection statistics

### Buyer Journey
1. **Browse Collections** → View active pools and statistics
2. **Purchase NFTs** → Buy at current bonding curve price
3. **Place Bids** → Bid above curve price + premium
4. **Hold or Trade** → Benefit from escrow backing

### Trader Journey
1. **Market Analysis** → Analyze bonding curve trends
2. **Strategic Buying** → Purchase undervalued NFTs
3. **Listing Strategy** → Set competitive selling prices
4. **Profit Taking** → Realize gains through escrow mechanism

## 🛡️ Security Features

### Access Controls
- **Role-based permissions** for administrative functions
- **Multi-signature governance** for critical parameter changes
- **Owner-only operations** for sensitive instructions

### Economic Security
- **Minimum bid validation** ensures bids exceed curve price + premium
- **Escrow protection** guarantees intrinsic value for all NFTs
- **Fee validation** prevents manipulation of revenue distribution

### Technical Security
- **Reentrancy protection** on all state-changing functions
- **Integer overflow protection** using Rust's safe arithmetic
- **Account validation** prevents unauthorized access

## 📊 Analytics & Monitoring

### Pool Metrics
- **Total Volume**: Cumulative trading volume in SOL
- **Market Cap**: Current collection valuation
- **Average Price**: Moving average of recent transactions
- **Holder Count**: Number of unique NFT holders

### Platform Metrics
- **Active Pools**: Number of active collections
- **Daily Volume**: 24-hour trading volume
- **User Growth**: New wallet connections
- **Revenue Generated**: Platform fees collected

## 🚀 Future Roadmap

### Phase 1: Enhanced Analytics (Q1 2024)
- Advanced charting and metrics
- Portfolio tracking for holders
- Collection comparison tools

### Phase 2: Cross-Chain Integration (Q2 2024)
- Ethereum compatibility layer
- Cross-chain NFT transfers
- Multi-chain escrow system

### Phase 3: DAO Governance (Q3 2024)
- Community-driven parameter changes
- Proposal and voting system
- Revenue sharing with token holders

### Phase 4: Mobile Application (Q4 2024)
- Native iOS and Android apps
- Mobile wallet integration
- Push notifications for bids/sales

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for detailed information on:

- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

## 📞 Support & Community

- **Documentation**: Complete guides and API references
- **Discord**: Real-time community support
- **GitHub Issues**: Bug reports and feature requests
- **Twitter**: Latest updates and announcements

---

*This project is part of the SketchXpress ecosystem, connecting with our broader suite of creative tools and platforms.*
