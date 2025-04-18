// services/program.js
import { PROGRAM_ID, SOLANA_NETWORK } from '../config/constants.js';
import { idl } from '../idl.js';
import { getWallet } from './wallet.js';

let connection = null;
let provider = null;
let program = null;

// Initialize connection to Solana network
export function getConnection() {
  if (!connection) {
    connection = new solanaWeb3.Connection(SOLANA_NETWORK);
  }
  return connection;
}

// Get provider, creating it if necessary
export function getProvider() {
  if (!provider) {
    const wallet = window.solana; // Phantom wallet adapter
    
    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    
    provider = new anchor.AnchorProvider(
      getConnection(),
      wallet,
      { commitment: 'processed' }
    );
    
    // Set this as the default provider
    anchor.setProvider(provider);
  }
  return provider;
}

// Initialize and get program
export function getProgram() {
  if (!program) {
    const provider = getProvider();
    
    if (!idl) {
      throw new Error('Program IDL not loaded');
    }
    
    program = new anchor.Program(
      idl,
      new solanaWeb3.PublicKey(PROGRAM_ID),
      provider
    );
  }
  return program;
}

// Initialize everything
export function initialize() {
  try {
    // Initialize connection to Solana network
    getConnection();
    
    // Check if Phantom wallet is available
    if (window.solana && window.solana.isPhantom) {
      console.log('Phantom wallet found!');
      return true;
    } else {
      console.error('Phantom wallet not found');
      return false;
    }
  } catch (error) {
    console.error('Initialization error:', error);
    throw error;
  }
}
