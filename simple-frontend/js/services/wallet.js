// services/wallet.js
import { getConnection } from './program.js';
import { updateStatus, updateWalletUI } from '../utils/dom.js';

let wallet = null;

export async function connectWallet() {
  try {
    if (!window.solana) {
      throw new Error('Phantom wallet not found');
    }

    // Connect to wallet
    const response = await window.solana.connect();
    wallet = response;
    
    // Update UI and status
    updateWalletUI(wallet);
    updateStatus('Wallet connected successfully!', 'success');
    
    return wallet;
  } catch (error) {
    console.error('Connection error:', error);
    updateStatus('Failed to connect wallet: ' + error.message, 'error');
    throw error;
  }
}

export function getWallet() {
  return wallet;
}
