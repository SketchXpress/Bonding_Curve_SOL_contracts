const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');

async function testMinimalMint() {
    console.log('🧪 Testing Minimal NFT Mint...');
    
    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = anchor.Wallet.local();
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    
    const programId = new PublicKey('ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE');
    const program = new anchor.Program(require('./target/idl/bonding_curve_system.json'), programId, provider);
    
    // Create mint keypair
    const mintKeypair = Keypair.generate();
    console.log('💰 Mint address:', mintKeypair.publicKey.toString());
    
    // Derive metadata address
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
    );
    console.log('📋 Metadata address:', metadataAddress.toString());
    
    // Get user's ATA
    const userATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        provider.wallet.publicKey
    );
    console.log('🏦 User ATA:', userATA.toString());
    
    try {
        // Call mint_nft
        console.log('🚀 Calling mint_nft...');
        const tx = await program.methods
            .mintNft(
                'Test NFT',
                'TST',
                'https://example.com/test.json'
            )
            .accounts({
                user: provider.wallet.publicKey,
                mint: mintKeypair.publicKey,
                metadata: metadataAddress,
                userTokenAccount: userATA,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                metadataProgram: METADATA_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([mintKeypair])
            .rpc();
            
        console.log('✅ Transaction successful!');
        console.log('📄 TX:', tx);
        
        return { success: true, transaction: tx };
        
    } catch (error) {
        console.error('❌ Transaction failed:', error);
        
        // Check if it's the stack overflow error
        if (error.toString().includes('0x200005bc0') || error.toString().includes('0x200005da0')) {
            console.error('🔥 STACK OVERFLOW ERROR DETECTED at memory address!');
        }
        
        // Check for program ID errors
        if (error.toString().includes('InvalidProgramId')) {
            console.error('🚫 INVALID PROGRAM ID ERROR!');
        }
        
        return { success: false, error };
    }
}

// Run the test
testMinimalMint()
    .then((result) => {
        if (result.success) {
            console.log('🎉 MINIMAL MINT TEST PASSED!');
            process.exit(0);
        } else {
            console.log('💥 MINIMAL MINT TEST FAILED!');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('💥 Test setup failed:', error);
        process.exit(1);
    });
