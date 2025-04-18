// services/wallet.js
import { getConnection } from './program.js';

// Avoid importing from dom.js to break circular dependency
// import { updateStatus, updateWalletUI } from '../utils/dom.js';

let wallet = null;

export async function connectWallet() {
  try {
    if (!window.solana) {
      throw new Error('Phantom wallet not found');
    }

    // Connect to wallet
    const response = await window.solana.connect();
    wallet = response;
    
    // Return result instead of calling UI functions directly
    return {
      success: true,
      wallet: response,
      message: 'Wallet connected successfully!'
    };
  } catch (error) {
    console.error('Connection error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function getWallet() {
  return wallet;
}

export async function getWalletBalance() {
  if (!wallet) return 0;
  
  try {
    const connection = getConnection();
    const balance = await connection.getBalance(wallet.publicKey);
    return balance; // Return raw balance in lamports
  } catch (error) {
    console.error('Balance fetch error:', error);
    return 0;
  }
}
