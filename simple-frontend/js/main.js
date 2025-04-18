// main.js
import { initialize, initializeProgram } from './services/program.js';
import { connectWallet, getWalletBalance } from './services/wallet.js';
import { 
  initializeDom, 
  enableFunctionButtons, 
  updateStatus,
  updateWalletUI
} from './utils/dom.js';
import { createUser } from './transactions/createUser.js';
import { createPool } from './transactions/createPool.js';
import { buyToken } from './transactions/buyToken.js';
import { sellToken } from './transactions/sellToken.js';
import { createNft } from './transactions/createNft.js';
import { buyNft } from './transactions/buyNft.js';

// Add debug logging
console.log("main.js module loaded");

// Function to set up all event listeners
function setupEventListeners() {
  console.log("Setting up event listeners");
  
  // Get button elements
  const connectWalletBtn = document.getElementById('connect-wallet');
  const createUserBtn = document.getElementById('create-user-btn');
  const createPoolBtn = document.getElementById('create-pool-btn');
  const buyTokenBtn = document.getElementById('buy-token-btn');
  const sellTokenBtn = document.getElementById('sell-token-btn');
  const createNftBtn = document.getElementById('create-nft-btn');
  const buyNftBtn = document.getElementById('buy-nft-btn');
  
  if (!connectWalletBtn) {
    console.error("Connect wallet button not found!");
    return;
  }
  
  console.log("Connect wallet button found, adding event listener");
  
  // Connect wallet button
  connectWalletBtn.addEventListener('click', async () => {
    console.log("Connect wallet button clicked");
    
    try {
      // Get wallet connection result
      const result = await connectWallet();
      console.log("Wallet connection result:", result);
      
      if (result.success) {
        // Update status with success message
        updateStatus(result.message, 'success');
        
        // Get wallet balance
        const balance = await getWalletBalance();
        console.log("Wallet balance:", balance);
        
        // Update UI with wallet and balance
        updateWalletUI(result.wallet, balance);
        
        // Initialize program
        initializeProgram();
        
        // Enable function buttons
        enableFunctionButtons();
      } else {
        // Show error message if connection failed
        updateStatus('Failed to connect wallet: ' + result.error, 'error');
      }
    } catch (error) {
      console.error("Error in wallet connection:", error);
      updateStatus('Error connecting wallet: ' + error.message, 'error');
    }
  });
  
  // Function buttons
  if (createUserBtn) createUserBtn.addEventListener('click', createUser);
  if (createPoolBtn) createPoolBtn.addEventListener('click', createPool);
  if (buyTokenBtn) buyTokenBtn.addEventListener('click', buyToken);
  if (sellTokenBtn) sellTokenBtn.addEventListener('click', sellToken);
  if (createNftBtn) createNftBtn.addEventListener('click', createNft);
  if (buyNftBtn) buyNftBtn.addEventListener('click', buyNft);
  
  // Disable function buttons until wallet is connected
  if (createUserBtn) createUserBtn.disabled = true;
  if (createPoolBtn) createPoolBtn.disabled = true;
  if (buyTokenBtn) buyTokenBtn.disabled = true;
  if (sellTokenBtn) sellTokenBtn.disabled = true;
  if (createNftBtn) createNftBtn.disabled = true;
  if (buyNftBtn) buyNftBtn.disabled = true;
  
  console.log("All event listeners set up successfully");
}

// Initialize when DOM is loaded
console.log("Adding DOMContentLoaded event listener");
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded event fired");
  
  // Initialize DOM references
  initializeDom();
  
  // Initialize program connection
  initialize();
  
  // Set up event listeners
  setupEventListeners();
});

// Backup initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log("Document already loaded, initializing immediately");
  setTimeout(() => {
    initializeDom();
    initialize();
    setupEventListeners();
  }, 100);
}
