import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { PublicKey } from '../utils/solana-crypto.js';

export async function createUser() {
  try {
    console.log("createUser function called with real implementation");
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    console.log("Wallet:", wallet);
    const maxNfts = parseInt(document.getElementById('max-nfts').value);
    console.log("Max NFTs:", maxNfts);
    
    // Use our browser-compatible implementation to find the user account PDA
    console.log("Finding user account PDA with program ID:", program.programId.toString());
    
    // Convert the wallet public key to our custom PublicKey type if needed
    let walletPublicKey = wallet.publicKey;
    if (!(walletPublicKey instanceof PublicKey)) {
      walletPublicKey = new PublicKey(walletPublicKey.toString());
    }
    
    // Convert program ID to our custom PublicKey type if needed
    let programId = program.programId;
    if (!(programId instanceof PublicKey)) {
      programId = new PublicKey(programId.toString());
    }
    
    // Find user account PDA using our browser-compatible implementation
    const [userAccount, bump] = await PublicKey.findProgramAddress(
      [new TextEncoder().encode('user-account'), walletPublicKey.toBuffer()],
      programId
    );
    
    console.log("User account PDA found:", userAccount.toString(), "with bump:", bump);
    
    // Call the createUser instruction
    console.log("Calling program.methods.createUser with maxNfts:", maxNfts);
    const tx = await program.methods
      .createUser(maxNfts)
      .accounts({
        owner: wallet.publicKey,
        userAccount: new solanaWeb3.PublicKey(userAccount.toString()), // Convert back to solanaWeb3.PublicKey
        systemProgram: solanaWeb3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("Transaction successful:", tx);
    
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
