import * as anchor from '@coral-xyz/anchor';
import { getConnection } from './program.js';
import { getWallet } from './wallet.js';

export async function createTokenMint(decimals = 6) {
  const wallet = getWallet();
  const connection = getConnection();
  
  const mint = solanaWeb3.Keypair.generate();
  
  // Create mint account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    anchor.spl.MintLayout.span
  );
  
  const createMintAccountIx = solanaWeb3.SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports,
    space: anchor.spl.MintLayout.span,
    programId: anchor.spl.TOKEN_PROGRAM_ID,
  });
  
  // Initialize mint
  const initMintIx = anchor.spl.createInitializeMintInstruction(
    mint.publicKey,
    decimals,
    wallet.publicKey,
    wallet.publicKey
  );
  
  // Send transaction
  const tx = new solanaWeb3.Transaction().add(
    createMintAccountIx,
    initMintIx
  );
  
  await solanaWeb3.sendAndConfirmTransaction(
    connection,
    tx,
    [wallet, mint]
  );
  
  return mint.publicKey;
}

export async function getOrCreateAssociatedTokenAccount(mint) {
  const wallet = getWallet();
  const connection = getConnection();
  
  const associatedTokenAddress = await anchor.spl.getAssociatedTokenAddress(
    mint,
    wallet.publicKey
  );
  
  // Check if account exists
  const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
  
  if (!accountInfo) {
    // Create account if it doesn't exist
    const createATAIx = anchor.spl.createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedTokenAddress,
      wallet.publicKey,
      mint
    );
    
    const tx = new solanaWeb3.Transaction().add(createATAIx);
    await solanaWeb3.sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log('Created new token account:', associatedTokenAddress.toString());
  }
  
  return associatedTokenAddress;
}
