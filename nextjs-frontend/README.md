# Random SOL Contracts - NextJS Frontend

This repository contains a NextJS implementation of the frontend for the Random SOL Contracts project. The frontend provides a user interface for interacting with Solana smart contracts, specifically the bonding curve system.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Key Components](#key-components)
- [Wallet Integration](#wallet-integration)
- [Contract Integration](#contract-integration)
- [Transaction Hooks](#transaction-hooks)
- [UI Components](#ui-components)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)

## Overview

This NextJS frontend replaces the original simple HTML/JS implementation with a modern, TypeScript-based React application. It provides real implementations for all the mock functionality in the original code, including:

- Wallet connection using Solana wallet adapters
- Anchor program integration for contract interactions
- UI components for all contract functions
- Transaction history tracking

## Folder Structure

```
nextjs-frontend/
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages
│   │   └── page.tsx        # Main application page
│   ├── components/         # React components
│   │   ├── BuyNftCard.tsx
│   │   ├── BuyTokenCard.tsx
│   │   ├── CreateNftCard.tsx
│   │   ├── CreatePoolCard.tsx
│   │   ├── CreateUserCard.tsx
│   │   ├── SellTokenCard.tsx
│   │   ├── TransactionHistory.tsx
│   │   └── WalletSection.tsx
│   ├── contexts/           # React context providers
│   │   ├── AnchorContextProvider.tsx
│   │   └── WalletContextProvider.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useNftTransactions.ts
│   │   ├── useTransactionIntegration.ts
│   │   └── useTransactions.ts
│   ├── types/              # TypeScript type definitions
│   │   └── anchor.d.ts
│   └── utils/              # Utility functions and constants
│       └── idl.ts          # Anchor IDL for contract interaction
├── .eslintrc.json          # ESLint configuration
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Key Components

### Wallet Integration

The wallet integration is handled by the `WalletContextProvider.tsx` which uses the Solana wallet adapter libraries to connect to various Solana wallets:

```typescript
// src/contexts/WalletContextProvider.tsx
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Available wallet adapters
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
```

This provider makes wallet functionality available throughout the application.

### Contract Integration

The `AnchorContextProvider.tsx` handles the integration with the Solana smart contracts using Anchor:

```typescript
// src/contexts/AnchorContextProvider.tsx
// Create the program with the IDL
const program = new Program(IDL, new PublicKey(PROGRAM_ID), provider);
```

This provider initializes the Anchor program with the IDL and makes it available to all components.

### Transaction Hooks

Custom hooks in the `hooks` directory provide functionality for interacting with the smart contracts:

- `useTransactions.ts` - Hooks for token-related transactions (buy, sell, create user, create pool)
- `useNftTransactions.ts` - Hooks for NFT-related transactions (create, buy)
- `useTransactionIntegration.ts` - Integration between UI components and transaction hooks

Example hook:

```typescript
// src/hooks/useTransactions.ts
export const useBuyToken = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const buyToken = async (poolAddress: string, amount: number) => {
    // Implementation details...
  };

  return { buyToken, loading, error, txSignature };
};
```

### UI Components

The `components` directory contains React components for each contract function:

- `WalletSection.tsx` - Wallet connection UI
- `CreateUserCard.tsx` - UI for creating a user account
- `CreatePoolCard.tsx` - UI for creating a bonding curve pool
- `BuyTokenCard.tsx` - UI for buying tokens
- `SellTokenCard.tsx` - UI for selling tokens
- `CreateNftCard.tsx` - UI for creating NFTs
- `BuyNftCard.tsx` - UI for buying NFTs
- `TransactionHistory.tsx` - UI for displaying transaction history

## Getting Started

To get started with the NextJS frontend:

1. Clone the repository:

   ```
   git clone https://github.com/mrarejimmyz/Random-_SOL_contracts.git
   ```

2. Navigate to the NextJS frontend directory:

   ```
   cd Random-_SOL_contracts/nextjs-frontend
   ```

3. Install dependencies:

   ```
   npm install
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- A Solana wallet (Phantom, Solflare, etc.)

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Deployment

To deploy the NextJS frontend:

1. Build the application:

   ```
   npm run build
   ```

2. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)

For local testing, you can start the production server:

```
npm run start
```

## Contract Integration Details

The frontend integrates with the Solana smart contracts using Anchor. The contract functions are wrapped in custom hooks that handle the transaction lifecycle, including loading states and error handling.

### Program ID

The Solana program ID is defined in `AnchorContextProvider.tsx`:

```typescript
const PROGRAM_ID = "DPgH4G6CpH6wr7TTu75ModTWyQg5muPqnNqMrRQQryx1";
```

### IDL

The Anchor IDL is imported from `utils/idl.ts` and used to initialize the Anchor program.

### Account Types

TypeScript type definitions for the Anchor program accounts are defined in `types/anchor.d.ts`.

## Improvements Over Original Implementation

This NextJS implementation improves upon the original simple frontend in several ways:

1. **Modern Framework**: Uses NextJS with TypeScript for better type safety and developer experience
2. **Component-Based Architecture**: Organized into reusable React components
3. **Real Wallet Integration**: Uses Solana wallet adapter for real wallet connections
4. **Proper Error Handling**: Includes loading states and error messages
5. **Responsive Design**: Uses Tailwind CSS for responsive UI
6. **Type Safety**: TypeScript throughout the codebase
7. **State Management**: React hooks and context for state management
8. **Code Organization**: Clear separation of concerns with hooks, contexts, and components
