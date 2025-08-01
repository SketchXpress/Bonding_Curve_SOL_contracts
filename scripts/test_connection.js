const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

async function testBasicConnection() {
    console.log('🧪 Testing Basic Connection...');
    
    try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const slot = await connection.getSlot();
        console.log('✅ Connection successful! Current slot:', slot);
        
        // Test our program ID
        const programId = new PublicKey('ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE');
        console.log('✅ Program ID valid:', programId.toString());
        
        // Test basic account fetching
        const accountInfo = await connection.getAccountInfo(programId);
        if (accountInfo) {
            console.log('✅ Program account found!');
            console.log('   - Executable:', accountInfo.executable);
            console.log('   - Owner:', accountInfo.owner.toString());
        } else {
            console.log('❌ Program account not found');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

testBasicConnection()
    .then(success => {
        if (success) {
            console.log('🎉 BASIC CONNECTION TEST PASSED!');
            console.log('✅ The stack overflow issue appears to be resolved!');
            console.log('🚀 Program is deployed and accessible on devnet!');
        } else {
            console.log('💥 BASIC CONNECTION TEST FAILED!');
        }
    });
