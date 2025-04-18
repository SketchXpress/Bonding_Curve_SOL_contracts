import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { createTokenMint } from '../services/tokens.js';

export async function createPool() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const basePrice = parseInt(document.getElementById('base-price').value);
    const growthFactor = parseInt(document.getElementById('growth-factor').value);
    
    // Create a new token mint
    const realTokenMint = await createTokenMint();
    
    // Find PDAs
    const [pool] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('bonding-pool'), realTokenMint.toBuffer()],
      program.programId
    );
    
    const [syntheticTokenMint] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('synthetic-mint'), realTokenMint.toBuffer()],
      program.programId
    );
    
    const [realTokenVault] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('token-vault'), realTokenMint.toBuffer()],
      program.programId
    );
    
    // Call the createPool instruction
    const tx = await program.methods
      .createPool(new anchor.BN(basePrice), new anchor.BN(growthFactor))
      .accounts({
        authority: wallet.publicKey,
        realTokenMint: realTokenMint,
        syntheticTokenMint: syntheticTokenMint,
        realTokenVault: realTokenVault,
        pool: pool,
        systemProgram: solanaWeb3.SystemProgram.programId,
        tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
        rent: solanaWeb3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    // Update UI
    updateResult('create-pool-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}<br>Pool: ${shortenAddress(pool.toString())}`);
    
    // Add to transaction history
    addTransaction('Create Pool', tx);
    
    return tx;
  } catch (error) {
    console.error('Create pool error:', error);
    updateResult('create-pool-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
