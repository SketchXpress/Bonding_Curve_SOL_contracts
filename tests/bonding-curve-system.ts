import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { BondingCurveSystem } from '../target/types/bonding_curve_system';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { assert } from 'chai';

describe('bonding-curve-system', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BondingCurveSystem as Program<BondingCurveSystem>;
  
  // Test accounts
  const authority = Keypair.generate();
  const user = Keypair.generate();
  let realTokenMint: PublicKey;
  let syntheticTokenMint: PublicKey;
  let realTokenVault: PublicKey;
  let pool: PublicKey;
  let userAccount: PublicKey;
  let userRealTokenAccount: PublicKey;
  let userSyntheticTokenAccount: PublicKey;

  // Constants for testing
  const BASE_PRICE = new anchor.BN(1_000_000); // 1 USDC
  const GROWTH_FACTOR = new anchor.BN(3606); // 0.00003606 * 100_000_000_000
  const MAX_NFTS = 5;

  before(async () => {
    // Airdrop SOL to authority and user
    await provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Create real token mint (simulating USDC)
    realTokenMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6 // 6 decimals like USDC
    );
    
    // Derive PDAs
    [pool] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding-pool"), realTokenMint.toBuffer()],
      program.programId
    );
    
    [syntheticTokenMint] = await PublicKey.findProgramAddress(
      [Buffer.from("synthetic-mint"), realTokenMint.toBuffer()],
      program.programId
    );
    
    [realTokenVault] = await PublicKey.findProgramAddress(
      [Buffer.from("token-vault"), realTokenMint.toBuffer()],
      program.programId
    );
    
    [userAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("user-account"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it('Initialize a bonding curve pool', async () => {
    await program.methods
      .createPool(BASE_PRICE, GROWTH_FACTOR)
      .accounts({
        authority: authority.publicKey,
        realTokenMint: realTokenMint,
        syntheticTokenMint: syntheticTokenMint,
        realTokenVault: realTokenVault,
        pool: pool,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
    
    // Verify pool was created with correct parameters
    const poolAccount = await program.account.bondingCurvePool.fetch(pool);
    assert.equal(poolAccount.authority.toString(), authority.publicKey.toString());
    assert.equal(poolAccount.realTokenMint.toString(), realTokenMint.toString());
    assert.equal(poolAccount.syntheticTokenMint.toString(), syntheticTokenMint.toString());
    assert.equal(poolAccount.realTokenVault.toString(), realTokenVault.toString());
    assert.equal(poolAccount.basePrice.toNumber(), BASE_PRICE.toNumber());
    assert.equal(poolAccount.growthFactor.toNumber(), GROWTH_FACTOR.toNumber());
    assert.equal(poolAccount.currentMarketCap.toNumber(), 0);
    assert.equal(poolAccount.totalSupply.toNumber(), 0);
    assert.equal(poolAccount.pastThreshold, false);
  });

  it('Create a user account', async () => {
    await program.methods
      .createUser(MAX_NFTS)
      .accounts({
        owner: user.publicKey,
        userAccount: userAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    
    // Verify user account was created
    const userAccountData = await program.account.userAccount.fetch(userAccount);
    assert.equal(userAccountData.owner.toString(), user.publicKey.toString());
    assert.equal(userAccountData.realSolBalance.toNumber(), 0);
    assert.equal(userAccountData.syntheticSolBalance.toNumber(), 0);
    assert.equal(userAccountData.ownedNfts.length, 0);
  });

  it('Buy tokens with bonding curve', async () => {
    // Create user's real token account and mint some tokens
    userRealTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      user,
      realTokenMint,
      user.publicKey
    );
    
    // Mint 1000 USDC to user
    await mintTo(
      provider.connection,
      authority,
      realTokenMint,
      userRealTokenAccount,
      authority,
      1000_000_000 // 1000 USDC with 6 decimals
    );
    
    // Create user's synthetic token account
    userSyntheticTokenAccount = await getAssociatedTokenAddress(
      syntheticTokenMint,
      user.publicKey
    );
    
    // Buy 10 synthetic tokens
    const buyAmount = new anchor.BN(10_000_000); // 10 tokens with 6 decimals
    
    await program.methods
      .buyToken(buyAmount)
      .accounts({
        buyer: user.publicKey,
        pool: pool,
        realTokenVault: realTokenVault,
        syntheticTokenMint: syntheticTokenMint,
        buyerSyntheticTokenAccount: userSyntheticTokenAccount,
        buyerRealTokenAccount: userRealTokenAccount,
        userAccount: userAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
    
    // Verify pool and user state after purchase
    const poolAccount = await program.account.bondingCurvePool.fetch(pool);
    assert.isAbove(poolAccount.currentMarketCap.toNumber(), 0);
    assert.equal(poolAccount.totalSupply.toNumber(), buyAmount.toNumber());
    
    const userAccountData = await program.account.userAccount.fetch(userAccount);
    assert.equal(userAccountData.syntheticSolBalance.toNumber(), buyAmount.toNumber());
  });

  // Additional tests would be added for sell_token, create_nft, and buy_nft
});
