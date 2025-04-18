import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { getOrCreateAssociatedTokenAccount } from '../services/tokens.js';

export async function buyToken() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const buyAmount = parseInt(document.getElementById('buy-amount').value);
    
    // Get pool information (this would need to be provided or stored)
    // For demo purposes, we'll assume these values
    const poolAddress = prompt("Enter pool address:");
    if (!poolAddress) throw new Error("Pool address is required");
    
    const pool = new solanaWeb3.PublicKey(poolAddress);
    
    // Get pool account data to find other accounts
    const poolAccount = await program.account.bondingCurvePool.fetch(pool);
    
    // Create or get token accounts
    const buyerRealTokenAccount = await getOrCreateAssociatedTokenAccount(
      poolAccount.realTokenMint
    );
    
    const buyerSyntheticTokenAccount = await getOrCreateAssociatedTokenAccount(
      poolAccount.syntheticTokenMint
    );
    
    // Find user account PDA
    const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Call the buyToken instruction
    const tx = await program.methods
      .buyToken(new anchor.BN(buyAmount))
      .accounts({
        buyer: wallet.publicKey,
        pool: pool,
        realTokenVault: poolAccount.realTokenVault,
        syntheticTokenMint: poolAccount.syntheticTokenMint,
        buyerSyntheticTokenAccount: buyerSyntheticTokenAccount,
        buyerRealTokenAccount: buyerRealTokenAccount,
        userAccount: userAccount,
        tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    // Update UI
    updateResult('buy-token-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`);
    
    // Add to transaction history
    addTransaction('Buy Token', tx);
    
    return tx;
  } catch (error) {
    console.error('Buy token error:', error);
    updateResult('buy-token-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
