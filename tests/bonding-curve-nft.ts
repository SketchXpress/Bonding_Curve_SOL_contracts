import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { BondingCurveSystem } from '../target/types/bonding_curve_system';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { assert } from 'chai';

describe('bonding-curve-system-nft', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BondingCurveSystem as Program<BondingCurveSystem>;
  
  // Test accounts
  const creator = Keypair.generate();
  const buyer = Keypair.generate();
  let creatorAccount: PublicKey;
  let buyerAccount: PublicKey;
  let nftMint: PublicKey;
  let nftData: PublicKey;
  let creatorNftTokenAccount: PublicKey;
  let buyerNftTokenAccount: PublicKey;

  // Constants for testing
  const MAX_NFTS = 5;
  const NFT_NAME = "Test NFT";
  const NFT_SYMBOL = "TNFT";
  const NFT_URI = "https://example.com/metadata/test-nft.json";
  const SELLER_FEE_BASIS_POINTS = 500; // 5%

  before(async () => {
    // Airdrop SOL to creator and buyer
    await provider.connection.requestAirdrop(creator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Derive PDAs
    [creatorAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("user-account"), creator.publicKey.toBuffer()],
      program.programId
    );
    
    [buyerAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("user-account"), buyer.publicKey.toBuffer()],
      program.programId
    );
  });

  it('Create user accounts for creator and buyer', async () => {
    // Create creator account
    await program.methods
      .createUser(MAX_NFTS)
      .accounts({
        owner: creator.publicKey,
        userAccount: creatorAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    
    // Create buyer account
    await program.methods
      .createUser(MAX_NFTS)
      .accounts({
        owner: buyer.publicKey,
        userAccount: buyerAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
    
    // Verify accounts were created
    const creatorAccountData = await program.account.userAccount.fetch(creatorAccount);
    assert.equal(creatorAccountData.owner.toString(), creator.publicKey.toString());
    
    const buyerAccountData = await program.account.userAccount.fetch(buyerAccount);
    assert.equal(buyerAccountData.owner.toString(), buyer.publicKey.toString());
  });

  it('Create an NFT', async () => {
    // Create NFT mint
    nftMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      0 // 0 decimals for NFT
    );
    
    // Derive NFT data PDA
    [nftData] = await PublicKey.findProgramAddress(
      [Buffer.from("nft-data"), nftMint.toBuffer()],
      program.programId
    );
    
    // Create NFT
    await program.methods
      .createNft(
        NFT_NAME,
        NFT_SYMBOL,
        NFT_URI,
        SELLER_FEE_BASIS_POINTS
      )
      .accounts({
        creator: creator.publicKey,
        nftMint: nftMint,
        nftData: nftData,
        userAccount: creatorAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();
    
    // Verify NFT data
    const nftDataAccount = await program.account.nftData.fetch(nftData);
    assert.equal(nftDataAccount.creator.toString(), creator.publicKey.toString());
    assert.equal(nftDataAccount.owner.toString(), creator.publicKey.toString());
    assert.equal(nftDataAccount.name, NFT_NAME);
    assert.equal(nftDataAccount.symbol, NFT_SYMBOL);
    assert.equal(nftDataAccount.uri, NFT_URI);
    assert.equal(nftDataAccount.sellerFeeBasisPoints, SELLER_FEE_BASIS_POINTS);
    assert.equal(nftDataAccount.mint.toString(), nftMint.toString());
    assert.equal(nftDataAccount.primarySaleHappened, false);
    
    // Verify creator's owned NFTs
    const creatorAccountData = await program.account.userAccount.fetch(creatorAccount);
    assert.equal(creatorAccountData.ownedNfts.length, 1);
    assert.equal(creatorAccountData.ownedNfts[0].toString(), nftMint.toString());
  });

  it('Buy an NFT', async () => {
    // Create token accounts for creator and buyer
    creatorNftTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      nftMint,
      creator.publicKey
    );
    
    buyerNftTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      buyer,
      nftMint,
      buyer.publicKey
    );
    
    // Mint 1 NFT to creator
    await mintTo(
      provider.connection,
      creator,
      nftMint,
      creatorNftTokenAccount,
      creator,
      1 // NFTs have amount of 1
    );
    
    // Buy NFT
    await program.methods
      .buyNft()
      .accounts({
        buyer: buyer.publicKey,
        buyerAccount: buyerAccount,
        sellerAccount: creatorAccount,
        nftData: nftData,
        nftMint: nftMint,
        sellerNftTokenAccount: creatorNftTokenAccount,
        buyerNftTokenAccount: buyerNftTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
    
    // Verify NFT ownership transfer
    const nftDataAccount = await program.account.nftData.fetch(nftData);
    assert.equal(nftDataAccount.owner.toString(), buyer.publicKey.toString());
    assert.equal(nftDataAccount.primarySaleHappened, true);
    assert.isAbove(nftDataAccount.lastPrice.toNumber(), 0);
    
    // Verify buyer's owned NFTs
    const buyerAccountData = await program.account.userAccount.fetch(buyerAccount);
    assert.equal(buyerAccountData.ownedNfts.length, 1);
    assert.equal(buyerAccountData.ownedNfts[0].toString(), nftMint.toString());
    
    // Verify creator's owned NFTs
    const creatorAccountData = await program.account.userAccount.fetch(creatorAccount);
    assert.equal(creatorAccountData.ownedNfts.length, 0);
  });
});
