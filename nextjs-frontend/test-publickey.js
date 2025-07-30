// Quick test script to verify PublicKey creation works without _bn errors
const { PublicKey } = require('@solana/web3.js');

try {
  console.log('Testing PublicKey creation...');
  const testKey = new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa');
  console.log('✅ PublicKey created successfully:', testKey.toBase58());
  
  // Test accessing _bn property
  try {
    const bn = testKey._bn;
    console.log('✅ _bn property accessible:', typeof bn);
  } catch (err) {
    console.log('❌ _bn property error:', err.message);
  }
  
} catch (error) {
  console.log('❌ PublicKey creation failed:', error.message);
}
