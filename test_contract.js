const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function main() {
  console.log("Starting contract function tests...");
  
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
  const programId = new PublicKey('AbfPoZwRvZnmDUUZjKucjyagWghGyRnCci5rG5hAwQq9');
  console.log("Using program ID:", programId.toString());
  
  try {
    // Find user account PDA
    const [userAccount] = await PublicKey.findProgramAddress(
      [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
      programId
    );
    console.log("User account PDA:", userAccount.toString());
    
    // Test 1: Create User
    console.log("\n--- Test 1: Create User ---");
    try {
      // Check if user account already exists
      const userAccountInfo = await connection.getAccountInfo(userAccount);
      if (userAccountInfo) {
        console.log("User account already exists, skipping creation");
      } else {
        console.log("Creating user account...");
        // We would need the IDL to create the program instance and call the createUser instruction
        console.log("Cannot create user without IDL, but PDA calculation works");
      }
    } catch (error) {
      console.error("Error in Create User test:", error);
    }
    
    // Test 2: Create Pool (simulation only)
    console.log("\n--- Test 2: Create Pool (simulation) ---");
    try {
      // Generate a mock token mint
      const mockTokenMint = Keypair.generate();
      console.log("Mock token mint:", mockTokenMint.publicKey.toString());
      
      // Find pool PDA
      const [pool] = await PublicKey.findProgramAddress(
        [Buffer.from('bonding-pool'), mockTokenMint.publicKey.toBuffer()],
        programId
      );
      console.log("Pool PDA:", pool.toString());
      
      // Find synthetic token mint PDA
      const [syntheticTokenMint] = await PublicKey.findProgramAddress(
        [Buffer.from('synthetic-mint'), mockTokenMint.publicKey.toBuffer()],
        programId
      );
      console.log("Synthetic token mint PDA:", syntheticTokenMint.toString());
      
      // Find real token vault PDA
      const [realTokenVault] = await PublicKey.findProgramAddress(
        [Buffer.from('token-vault'), mockTokenMint.publicKey.toBuffer()],
        programId
      );
      console.log("Real token vault PDA:", realTokenVault.toString());
      
      console.log("Pool PDA calculation successful");
    } catch (error) {
      console.error("Error in Create Pool test:", error);
    }
    
    console.log("\nAll PDA calculations successful. Frontend integration should work if these PDAs match what's expected by the contract.");
    console.log("For full testing, we would need the complete IDL and to execute actual transactions.");
    
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
