const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const fs = require('fs');

// Path to your deployed program's IDL
const idlPath = './target/idl/bonding_curve_system.json';

async function main() {
  console.log("Starting comprehensive contract testing...");
  
  // Connect to the Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the wallet keypair from the default Solana config
  const wallet = anchor.Wallet.local();
  console.log("Using wallet address:", wallet.publicKey.toString());
  
  // Get the wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  
  // Create a provider
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
  anchor.setProvider(provider);
  
  // Program ID from our deployment
  const programId = new PublicKey('85KVeJTCfHhLB6jfno5E41eHKBfzBxVZEADUHznnUfjG');
  console.log("Using program ID:", programId.toString());
  
  // Load the IDL
  let idl;
  try {
    idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    console.log("IDL loaded successfully");
  } catch (error) {
    console.error("Error loading IDL:", error);
    console.log("Using a minimal IDL for testing");
    idl = {
      "version": "0.1.0",
      "name": "bonding_curve_system",
      "instructions": [
        {
          "name": "createUser",
          "accounts": [
            {"name": "owner", "isMut": true, "isSigner": true},
            {"name": "userAccount", "isMut": true, "isSigner": false},
            {"name": "systemProgram", "isMut": false, "isSigner": false}
          ],
          "args": [
            {"name": "maxNfts", "type": "u8"}
          ]
        },
        {
          "name": "createPool",
          "accounts": [
            {"name": "authority", "isMut": true, "isSigner": true},
            {"name": "realTokenMint", "isMut": false, "isSigner": false},
            {"name": "syntheticTokenMint", "isMut": true, "isSigner": false},
            {"name": "realTokenVault", "isMut": true, "isSigner": false},
            {"name": "pool", "isMut": true, "isSigner": false},
            {"name": "systemProgram", "isMut": false, "isSigner": false},
            {"name": "tokenProgram", "isMut": false, "isSigner": false},
            {"name": "rent", "isMut": false, "isSigner": false}
          ],
          "args": [
            {"name": "basePrice", "type": "u64"},
            {"name": "growthFactor", "type": "u64"}
          ]
        }
      ]
    };
  }
  
  // Create the program interface
  const program = new anchor.Program(idl, programId);
  
  // Test results tracking
  const testResults = {
    createUser: { success: false, error: null, tx: null },
    createPool: { success: false, error: null, tx: null, poolAddress: null },
    buyToken: { success: false, error: null, tx: null },
    sellToken: { success: false, error: null, tx: null },
    createNft: { success: false, error: null, tx: null, nftMint: null },
    buyNft: { success: false, error: null, tx: null }
  };
  
  try {
    // Test 1: Create User
    console.log("\n--- Test 1: Create User ---");
    try {
      // Find user account PDA
      const [userAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        programId
      );
      console.log("User account PDA:", userAccount.toString());
      
      // Check if user account already exists
      const userAccountInfo = await connection.getAccountInfo(userAccount);
      
      if (userAccountInfo) {
        console.log("User account already exists, skipping creation");
        testResults.createUser.success = true;
      } else {
        console.log("Creating user account...");
        const tx = await program.methods
          .createUser(10) // Max NFTs = 10
          .accounts({
            owner: wallet.publicKey,
            userAccount: userAccount,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        console.log("User created successfully, transaction:", tx);
        testResults.createUser.success = true;
        testResults.createUser.tx = tx;
      }
    } catch (error) {
      console.error("Error in Create User test:", error);
      testResults.createUser.error = error.message;
    }
    
    // Test 2: Create Pool
    console.log("\n--- Test 2: Create Pool ---");
    try {
      // Create a new token mint for the pool
      console.log("Creating token mint for pool...");
      const realTokenMint = await createMint(
        connection,
        wallet.payer,
        wallet.publicKey,
        wallet.publicKey,
        6 // 6 decimals
      );
      console.log("Token mint created:", realTokenMint.toString());
      
      // Find pool PDA
      const [pool] = await PublicKey.findProgramAddress(
        [Buffer.from('bonding-pool'), realTokenMint.toBuffer()],
        programId
      );
      console.log("Pool PDA:", pool.toString());
      
      // Find synthetic token mint PDA
      const [syntheticTokenMint] = await PublicKey.findProgramAddress(
        [Buffer.from('synthetic-mint'), realTokenMint.toBuffer()],
        programId
      );
      console.log("Synthetic token mint PDA:", syntheticTokenMint.toString());
      
      // Find real token vault PDA
      const [realTokenVault] = await PublicKey.findProgramAddress(
        [Buffer.from('token-vault'), realTokenMint.toBuffer()],
        programId
      );
      console.log("Real token vault PDA:", realTokenVault.toString());
      
      // Create pool
      console.log("Creating pool...");
      const basePrice = new anchor.BN(1000000); // 1 SOL in lamports
      const growthFactor = new anchor.BN(3606); // Example growth factor
      
      const tx = await program.methods
        .createPool(basePrice, growthFactor)
        .accounts({
          authority: wallet.publicKey,
          realTokenMint: realTokenMint,
          syntheticTokenMint: syntheticTokenMint,
          realTokenVault: realTokenVault,
          pool: pool,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log("Pool created successfully, transaction:", tx);
      testResults.createPool.success = true;
      testResults.createPool.tx = tx;
      testResults.createPool.poolAddress = pool.toString();
      
      // Store the pool address and token mint for later tests
      const poolInfo = {
        poolAddress: pool.toString(),
        realTokenMint: realTokenMint.toString(),
        syntheticTokenMint: syntheticTokenMint.toString(),
        realTokenVault: realTokenVault.toString()
      };
      
      fs.writeFileSync('pool_info.json', JSON.stringify(poolInfo, null, 2));
      console.log("Pool info saved to pool_info.json");
      
    } catch (error) {
      console.error("Error in Create Pool test:", error);
      testResults.createPool.error = error.message;
    }
    
    // Print test results summary
    console.log("\n=== Test Results Summary ===");
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${test}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.tx) {
        console.log(`  Transaction: ${result.tx}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error("Error in main test function:", error);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
