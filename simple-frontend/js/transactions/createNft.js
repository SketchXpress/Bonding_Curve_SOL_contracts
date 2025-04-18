import { getProgram } from '../services/program.js';
import { getWallet } from '../services/wallet.js';
import { updateStatus, updateResult, addTransaction } from '../utils/dom.js';
import { shortenAddress } from '../utils/format.js';
import { createTokenMint } from '../services/tokens.js';

export async function createNft() {
  try {
    const program = getProgram();
    if (!program) throw new Error('Program not initialized');
    
    const wallet = getWallet();
    const nftName = document.getElementById('nft-name').value;
    const nftSymbol = document.getElementById('nft-symbol').value;
    const nftUri = document.getElementById('nft-uri').value;
    const sellerFeeBasisPoints = parseInt(document.getElementById('seller-fee').value);
    
    // Create NFT mint
    const nftMint = await createTokenMint(0); // 0 decimals for NFT
    
    // Find user account PDA
    const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Find NFT data PDA
    const [nftData] = await solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('nft-data'), nftMint.toBuffer()],
      program.programId
    );
    
    // Call the createNft instruction
    const tx = await program.methods
      .createNft(
        nftName,
        nftSymbol,
        nftUri,
        sellerFeeBasisPoints
      )
      .accounts({
        creator: wallet.publicKey,
        nftMint: nftMint,
        nftData: nftData,
        userAccount: userAccount,
        systemProgram: solanaWeb3.SystemProgram.programId,
        tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
        rent: solanaWeb3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    // Update UI
    updateResult('create-nft-result', 
      `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}<br>NFT Mint: ${shortenAddress(nftMint.toString())}`);
    
    // Add to transaction history
    addTransaction('Create NFT', tx);
    
    return tx;
  } catch (error) {
    console.error('Create NFT error:', error);
    updateResult('create-nft-result', 
      `<span class="error">Error:</span> ${error.message}`);
  }
}
