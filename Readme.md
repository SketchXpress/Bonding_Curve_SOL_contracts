# SketchXpress SOL Contracts

A Solana blockchain project implementing a bonding curve token system with NFT functionality.

## Overview

This project implements an exponential bonding curve system on Solana, allowing users to:

- Create bonding curve pools with customizable parameters
- Buy and sell tokens following the bonding curve pricing model
- Create and trade NFTs within the ecosystem
- Manage user accounts and track owned assets

The system uses mathematical principles to determine token prices based on market capitalization, creating a self-regulating token economy.

## Project Structure

The project consists of three main components:

1. **Solana Smart Contracts**: Rust-based programs using the Anchor framework
2. **NextJS Frontend**: Modern React-based frontend with TypeScript
3. **Simple HTML/JS Frontend**: Alternative lightweight implementation

### Smart Contracts

The contracts are located in the `programs/bonding-curve-system` directory and implement the following functionality:

- **Pool Management**: Create and manage bonding curve pools
- **Token Operations**: Buy and sell tokens with dynamic pricing
- **NFT Functionality**: Create and trade NFTs
- **User Management**: Create user accounts and track owned assets

### Frontend Implementations

#### NextJS Frontend

The NextJS frontend (`nextjs-frontend` directory) provides a modern, responsive interface for interacting with the contracts. It uses:

- React hooks for state management
- Solana wallet adapter for wallet connections
- Anchor framework for contract interactions
- TypeScript for type safety

#### Simple Frontend

The simple frontend (`simple-frontend` directory) offers a lightweight alternative using vanilla JavaScript and HTML.

## Technical Details

### Bonding Curve Implementation

The project implements an exponential bonding curve with the following characteristics:

- **Price Calculation**: `price = base_price * e^(growth_factor * current_market_cap)`
- **Buy Cost**: Calculated using the average price during the purchase
- **Sell Amount**: Calculated using the average price during the sale
- **Platform Fee**: 5% of total transaction cost
- **Threshold Detection**: Special handling when market cap crosses $69k

The implementation uses Taylor series approximation for efficient on-chain calculation of the exponential function.

### NFT Functionality

The NFT system allows:

- Creating NFTs with customizable metadata
- Trading NFTs between users
- Tracking ownership through user accounts

## Setup and Installation

### Prerequisites

- Solana CLI tools
- Node.js and npm/yarn
- Rust and Cargo

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/SketchXpress/Bonding_Curve_SOL_contracts.git
   cd Bonding_Curve_SOL_contracts
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the program:
   ```
   anchor build
   ```

### Running the NextJS Frontend

1. Navigate to the NextJS frontend directory:

   ```
   cd nextjs-frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Running the Simple Frontend

1. Navigate to the simple frontend directory:

   ```
   cd simple-frontend
   ```

2. Open `index.html` in your browser

## Usage Guide

### Creating a Pool

1. Connect your wallet
2. Navigate to the "Create Pool" section
3. Enter the base price and growth factor parameters
4. Submit the transaction

### Buying Tokens

1. Connect your wallet
2. Navigate to the "Buy Tokens" section
3. Enter the amount of tokens to buy
4. Submit the transaction

### Creating an NFT

1. Connect your wallet
2. Navigate to the "Create NFT" section
3. Enter the NFT metadata (name, symbol, URI, seller fee)
4. Submit the transaction

### Buying an NFT

1. Connect your wallet
2. Navigate to the "Buy NFT" section
3. Enter the NFT mint address
4. Submit the transaction

## Development Notes

### Known Issues

- When creating NFTs, both the mint account and NFT data account must be created in a single transaction
- The IDL must be modified at runtime to correctly mark the NFT mint account as a signer

### Testing

Run the tests with:

```
anchor test
```

## License

[APACHE2 License](LICENSE)

## Contributing

Contributions are paused currently !
