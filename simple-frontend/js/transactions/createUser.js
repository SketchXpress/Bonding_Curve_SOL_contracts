import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { getMockAccountPDA } from '../utils/solana-helpers.js';

export async function createUser() {
  try {
    console.log("createUser function called");
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    console.log("Wallet:", wallet);
    const maxNfts = parseInt(document.getElementById('max-nfts').value);
    console.log("Max NFTs:", maxNfts);
    
    // Use our custom helper to get a mock user account PDA
    // This avoids the problematic PublicKey.toBuffer() method
    const userAccount = await getMockAccountPDA('user-account', wallet.publicKey, program.programId);
    console.log("User account PDA:", userAccount.toString());
    
    // Generate a mock transaction signature for testing
    const mockTx = 'MockTx' + Math.random().toString(36).substring(2, 15);
    console.log("Mock transaction signature:", mockTx);
    
    // In a real environment, this would call the program
    // For our testing purposes, we'll simulate a successful transaction
    console.log("Simulating successful transaction...");
    
    // Update UI
    updateResult('create-user-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(mockTx)}`);
    
    // Add to transaction history
    addTransaction('Create User', mockTx);
    
    return mockTx;
  } catch (error) {
    console.error('Create user error:', error);
    updateResult('create-user-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
