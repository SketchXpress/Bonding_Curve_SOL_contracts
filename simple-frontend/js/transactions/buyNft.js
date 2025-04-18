import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { getOrCreateAssociatedTokenAccount } from '../services/tokens.js';

export async function buyNft() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const nftMintAddress = document.getElementById('nft-mint').value;
    if (!nftMintAddress) throw new Error('NFT mint address is required');
    
    const nftMint = new solanaWeb3.PublicKey(nftMintAddress);
    
    // Find NFT data PDA
    const [nftData] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('nft-data'), nftMint.toBuffer()],
      program.programId
    );
    
    // Get NFT data to find seller
    const nftDataAccount = await program.account.nftData.fetch(nftData);
    
    // Find buyer and seller account PDAs
    const [buyerAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    const [sellerAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), nftDataAccount.owner.toBuffer()],
      program.programId
    );
    
    // Create or get token accounts
    const buyerNftTokenAccount = await getOrCreateAssociatedTokenAccount(nftMint);
    
    // Get seller's token account
    const sellerNftTokenAccount = await anchor.spl.getAssociatedTokenAddress(
      nftMint,
      nftDataAccount.owner
    );
    
    // Call the buyNft instruction
    const tx = await program.methods
      .buyNft()
      .accounts({
        buyer: wallet.publicKey,
        buyerAccount: buyerAccount,
        sellerAccount: sellerAccount,
        nftData: nftData,
        nftMint: nftMint,
        sellerNftTokenAccount: sellerNftTokenAccount,
        buyerNftTokenAccount: buyerNftTokenAccount,
        tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
        systemProgram: solanaWeb3.SystemProgram.programId,
      })
      .rpc();
    
    // Update UI
    updateResult('buy-nft-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`);
    
    // Add to transaction history
    addTransaction('Buy NFT', tx);
    
    return tx;
  } catch (error) {
    console.error('Buy NFT error:', error);
    updateResult('buy-nft-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
