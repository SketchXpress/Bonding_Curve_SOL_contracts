import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';

export async function createUser() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const maxNfts = parseInt(document.getElementById('max-nfts').value);
    
    // Find user account PDA
    const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Call the createUser instruction
    const tx = await program.methods
      .createUser(maxNfts)
      .accounts({
        owner: wallet.publicKey,
        userAccount: userAccount,
        systemProgram: solanaWeb3.SystemProgram.programId,
      })
      .rpc();
    
    // Update UI
    updateResult('create-user-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`);
    
    // Add to transaction history
    addTransaction('Create User', tx);
    
    return tx;
  } catch (error) {
    console.error('Create user error:', error);
    updateResult('create-user-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
