import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { getOrCreateAssociatedTokenAccount } from '../services/tokens.js';

export async function sellToken() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const sellAmount = parseInt(document.getElementById('sell-amount').value);
    
    // Get pool information (this would need to be provided or stored)
    // For demo purposes, we'll assume these values
    const poolAddress = prompt("Enter pool address:");
    if (!poolAddress) throw new Error("Pool address is required");
    
    const pool = new solanaWeb3.PublicKey(poolAddress);
    
    // Get pool account data to find other accounts
    const poolAccount = await program.account.bondingCurvePool.fetch(pool);
    
    // Create or get token accounts
    const sellerRealTokenAccount = await getOrCreateAssociatedTokenAccount(
      poolAccount.realTokenMint
    );
    
    const sellerSyntheticTokenAccount = await getOrCreateAssociatedTokenAccount(
      poolAccount.syntheticTokenMint
    );
    
    // Find user account PDA
    const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Call the sellToken instruction
    const tx = await program.methods
      .sellToken(new anchor.BN(sellAmount))
      .accounts({
        seller: wallet.publicKey,
        pool: pool,
        realTokenVault: poolAccount.realTokenVault,
        syntheticTokenMint: poolAccount.syntheticTokenMint,
        sellerSyntheticTokenAccount: sellerSyntheticTokenAccount,
        sellerRealTokenAccount: sellerRealTokenAccount,
        userAccount: userAccount,
        tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    // Update UI
    updateResult('sell-token-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`);
    
    // Add to transaction history
    addTransaction('Sell Token', tx);
    
    return tx;
  } catch (error) {
    console.error('Sell token error:', error);
    updateResult('sell-token-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
