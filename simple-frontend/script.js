// Constants
const PROGRAM_ID = 'AvJTBKWtdp1Vr5KANbG3kW1aXnj32KekX8A7jXEwYYLT';
const NETWORK = 'devnet';
const SOLANA_NETWORK = 'https://api.devnet.solana.com';

// Global variables
let wallet = null;
let connection = null;
let program = null;

// DOM Elements (declare but don't initialize until DOM is loaded)
let connectWalletBtn;
let walletStatus;
let walletInfo;
let walletAddress;
let walletBalance;
let createUserBtn;
let createPoolBtn;
let buyTokenBtn;
let sellTokenBtn;
let createNftBtn;
let buyNftBtn;
let transactionList;

// Initialize
async function initialize() {
    try {
        // Initialize connection to Solana network
        connection = new solanaWeb3.Connection(SOLANA_NETWORK);
        
        // Check if Phantom wallet is available
        if (window.solana && window.solana.isPhantom) {
            console.log('Phantom wallet found!');
        } else {
            updateStatus('Phantom wallet not found. Please install it from https://phantom.app/', 'error');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        updateStatus('Failed to initialize: ' + error.message, 'error');
    }
}


// Connect wallet
async function connectWallet() {
    try {
        if (!window.solana) {
            throw new Error('Phantom wallet not found');
        }

        // Connect to wallet
        const response = await window.solana.connect();
        wallet = response;
        
        // Update UI
        walletStatus.textContent = 'Connected';
        walletStatus.classList.add('connected');
        walletAddress.textContent = shortenAddress(wallet.publicKey.toString());
        
        // Get and display balance
        await updateWalletBalance();
        
        // Show wallet info
        walletInfo.classList.remove('hidden');
        
        // Initialize Anchor program
        initializeProgram();
        
        // Enable function buttons
        enableFunctionButtons();
        
        // Update status
        updateStatus('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

// Initialize Anchor program
function initializeProgram() {
    try {
        // Create a provider
        const provider = new anchor.Provider(
            connection,
            wallet,
            { preflightCommitment: 'processed' }
        );
        
        // Initialize program
        program = new anchor.Program(PROGRAM_ID, provider);
        
        console.log('Program initialized');
    } catch (error) {
        console.error('Program initialization error:', error);
        updateStatus('Failed to initialize program: ' + error.message, 'error');
    }
}

// Update wallet balance
async function updateWalletBalance() {
    try {
        if (!wallet || !connection) return;
        
        const balance = await connection.getBalance(wallet.publicKey);
        walletBalance.textContent = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// Create User function
async function createUser() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const maxNfts = parseInt(document.getElementById('max-nfts').value);
        
        // Find user account PDA
        const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Call the createUser instruction
        const tx = await program.methods
            .createUser(maxNfts)
            .accounts({
                owner: wallet.publicKey,
                userAccount: userAccount,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        // Update UI
        document.getElementById('create-user-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`;
        
        // Add to transaction history
        addTransaction('Create User', tx);
        
        return tx;
    } catch (error) {
        console.error('Create user error:', error);
        document.getElementById('create-user-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Create Pool function
async function createPool() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const basePrice = new anchor.BN(document.getElementById('base-price').value);
        const growthFactor = new anchor.BN(document.getElementById('growth-factor').value);
        
        // Create a new token mint
        const realTokenMint = await createTokenMint();
        
        // Find PDAs
        const [pool] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('bonding-pool'), realTokenMint.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        const [syntheticTokenMint] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('synthetic-mint'), realTokenMint.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        const [realTokenVault] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('token-vault'), realTokenMint.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Call the createPool instruction
        const tx = await program.methods
            .createPool(basePrice, growthFactor)
            .accounts({
                authority: wallet.publicKey,
                realTokenMint: realTokenMint,
                syntheticTokenMint: syntheticTokenMint,
                realTokenVault: realTokenVault,
                pool: pool,
                systemProgram: solanaWeb3.SystemProgram.programId,
                tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
                rent: solanaWeb3.SYSVAR_RENT_PUBKEY,
            })
            .rpc();
        
        // Update UI
        document.getElementById('create-pool-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}<br>Pool: ${shortenAddress(pool.toString())}`;
        
        // Add to transaction history
        addTransaction('Create Pool', tx);
        
        return tx;
    } catch (error) {
        console.error('Create pool error:', error);
        document.getElementById('create-pool-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Buy Token function
async function buyToken() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const buyAmount = new anchor.BN(document.getElementById('buy-amount').value);
        
        // Get pool information (this would need to be provided or stored)
        // For demo purposes, we'll assume these values
        const poolAddress = prompt("Enter pool address:");
        if (!poolAddress) throw new Error("Pool address is required");
        
        const pool = new solanaWeb3.PublicKey(poolAddress);
        
        // Get pool account data to find other accounts
        const poolAccount = await program.account.bondingCurvePool.fetch(pool);
        
        // Create or get token accounts
        const buyerRealTokenAccount = await getOrCreateAssociatedTokenAccount(
            poolAccount.realTokenMint
        );
        
        const buyerSyntheticTokenAccount = await getOrCreateAssociatedTokenAccount(
            poolAccount.syntheticTokenMint
        );
        
        // Find user account PDA
        const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Call the buyToken instruction
        const tx = await program.methods
            .buyToken(buyAmount)
            .accounts({
                buyer: wallet.publicKey,
                pool: pool,
                realTokenVault: poolAccount.realTokenVault,
                syntheticTokenMint: poolAccount.syntheticTokenMint,
                buyerSyntheticTokenAccount: buyerSyntheticTokenAccount,
                buyerRealTokenAccount: buyerRealTokenAccount,
                userAccount: userAccount,
                tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
            })
            .rpc();
        
        // Update UI
        document.getElementById('buy-token-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`;
        
        // Add to transaction history
        addTransaction('Buy Token', tx);
        
        return tx;
    } catch (error) {
        console.error('Buy token error:', error);
        document.getElementById('buy-token-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Sell Token function
async function sellToken() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const sellAmount = new anchor.BN(document.getElementById('sell-amount').value);
        
        // Get pool information (this would need to be provided or stored)
        // For demo purposes, we'll assume these values
        const poolAddress = prompt("Enter pool address:");
        if (!poolAddress) throw new Error("Pool address is required");
        
        const pool = new solanaWeb3.PublicKey(poolAddress);
        
        // Get pool account data to find other accounts
        const poolAccount = await program.account.bondingCurvePool.fetch(pool);
        
        // Create or get token accounts
        const sellerRealTokenAccount = await getOrCreateAssociatedTokenAccount(
            poolAccount.realTokenMint
        );
        
        const sellerSyntheticTokenAccount = await getOrCreateAssociatedTokenAccount(
            poolAccount.syntheticTokenMint
        );
        
        // Find user account PDA
        const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Call the sellToken instruction
        const tx = await program.methods
            .sellToken(sellAmount)
            .accounts({
                seller: wallet.publicKey,
                pool: pool,
                realTokenVault: poolAccount.realTokenVault,
                syntheticTokenMint: poolAccount.syntheticTokenMint,
                sellerSyntheticTokenAccount: sellerSyntheticTokenAccount,
                sellerRealTokenAccount: sellerRealTokenAccount,
                userAccount: userAccount,
                tokenProgram: anchor.spl.TOKEN_PROGRAM_ID,
            })
            .rpc();
        
        // Update UI
        document.getElementById('sell-token-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`;
        
        // Add to transaction history
        addTransaction('Sell Token', tx);
        
        return tx;
    } catch (error) {
        console.error('Sell token error:', error);
        document.getElementById('sell-token-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Create NFT function
async function createNft() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const nftName = document.getElementById('nft-name').value;
        const nftSymbol = document.getElementById('nft-symbol').value;
        const nftUri = document.getElementById('nft-uri').value;
        const sellerFeeBasisPoints = parseInt(document.getElementById('seller-fee').value);
        
        // Create NFT mint
        const nftMint = await createTokenMint(0); // 0 decimals for NFT
        
        // Find user account PDA
        const [userAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Find NFT data PDA
        const [nftData] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('nft-data'), nftMint.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
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
        document.getElementById('create-nft-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}<br>NFT Mint: ${shortenAddress(nftMint.toString())}`;
        
        // Add to transaction history
        addTransaction('Create NFT', tx);
        
        return tx;
    } catch (error) {
        console.error('Create NFT error:', error);
        document.getElementById('create-nft-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Buy NFT function
async function buyNft() {
    try {
        if (!program) throw new Error('Program not initialized');
        
        const nftMintAddress = document.getElementById('nft-mint').value;
        if (!nftMintAddress) throw new Error('NFT mint address is required');
        
        const nftMint = new solanaWeb3.PublicKey(nftMintAddress);
        
        // Find NFT data PDA
        const [nftData] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('nft-data'), nftMint.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        // Get NFT data to find seller
        const nftDataAccount = await program.account.nftData.fetch(nftData);
        
        // Find buyer and seller account PDAs
        const [buyerAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
        );
        
        const [sellerAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from('user-account'), nftDataAccount.owner.toBuffer()],
            new solanaWeb3.PublicKey(PROGRAM_ID)
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
        document.getElementById('buy-nft-result').innerHTML = 
            `<span class="success">Success!</span><br>Transaction: ${shortenAddress(tx)}`;
        
        // Add to transaction history
        addTransaction('Buy NFT', tx);
        
        return tx;
    } catch (error) {
        console.error('Buy NFT error:', error);
        document.getElementById('buy-nft-result').innerHTML = 
            `<span class="error">Error:</span> ${error.message}`;
    }
}

// Helper function to create a token mint
async function createTokenMint(decimals = 6) {
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

// Helper function to get or create associated token account
async function getOrCreateAssociatedTokenAccount(mint) {
    const associatedTokenAddress = await anchor.spl.getAssociatedTokenAddress(
        mint,
        wallet.publicKey
    );
    
    try {
        // Check if account exists
        await connection.getAccountInfo(associatedTokenAddress);
    } catch (error) {
        // Create account if it doesn't exist
        const createATAIx = anchor.spl.createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            associatedTokenAddress,
            wallet.publicKey,
            mint
        );
        
        const tx = new solanaWeb3.Transaction().add(createATAIx);
        await solanaWeb3.sendAndConfirmTransaction(connection, tx, [wallet]);
    }
    
    return associatedTokenAddress;
}

// Helper function to shorten address for display
function shortenAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
}

// Helper function to update status
function updateStatus(message, type = '') {
    const statusElement = document.createElement('div');
    statusElement.textContent = message;
    if (type) statusElement.classList.add(type);
    
    // Show status somewhere
    console.log(`Status (${type}):`, message);
}

// Helper function to add transaction to history
function addTransaction(type, signature) {
    // Clear "No transactions" message if present
    if (transactionList.textContent.includes('No transactions yet')) {
        transactionList.innerHTML = '';
    }
    
    const date = new Date().toLocaleString();
    const txElement = document.createElement('div');
    txElement.classList.add('transaction-item');
    txElement.innerHTML = `
        <strong>${type}</strong> - ${date}<br>
        <a href="https://explorer.solana.com/tx/${signature}?cluster=devnet" target="_blank">
            ${shortenAddress(signature)}
        </a>
    `;
    
    transactionList.prepend(txElement);
}

// Helper function to enable function buttons
function enableFunctionButtons() {
    createUserBtn.disabled = false;
    createPoolBtn.disabled = false;
    buyTokenBtn.disabled = false;
    sellTokenBtn.disabled = false;
    createNftBtn.disabled = false;
    buyNftBtn.disabled = false;
}

// Event listeners - Move DOM element selection inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements after DOM is loaded
    connectWalletBtn = document.getElementById('connect-wallet');
    walletStatus = document.getElementById('wallet-status');
    walletInfo = document.getElementById('wallet-info');
    walletAddress = document.getElementById('wallet-address');
    walletBalance = document.getElementById('wallet-balance');
    createUserBtn = document.getElementById('create-user-btn');
    createPoolBtn = document.getElementById('create-pool-btn');
    buyTokenBtn = document.getElementById('buy-token-btn');
    sellTokenBtn = document.getElementById('sell-token-btn');
    createNftBtn = document.getElementById('create-nft-btn');
    buyNftBtn = document.getElementById('buy-nft-btn');
    transactionList = document.getElementById('transaction-list');
    
    // Initialize
    initialize();
    
    // Connect wallet button
    connectWalletBtn.addEventListener('click', connectWallet);
    
    // Function buttons
    createUserBtn.addEventListener('click', createUser);
    createPoolBtn.addEventListener('click', createPool);
    buyTokenBtn.addEventListener('click', buyToken);
    sellTokenBtn.addEventListener('click', sellToken);
    createNftBtn.addEventListener('click', createNft);
    buyNftBtn.addEventListener('click', buyNft);
    
    // Disable function buttons until wallet is connected
    createUserBtn.disabled = true;
    createPoolBtn.disabled = true;
    buyTokenBtn.disabled = true;
    sellTokenBtn.disabled = true;
    createNftBtn.disabled = true;
    buyNftBtn.disabled = true;
});