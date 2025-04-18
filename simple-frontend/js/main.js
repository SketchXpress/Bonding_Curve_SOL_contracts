import { initialize, initializeProgram } from './services/program.js';
import { connectWallet } from './services/wallet.js';
import { initializeDom, enableFunctionButtons } from './utils/dom.js';
import { createUser } from './transactions/createUser.js';
import { createPool } from './transactions/createPool.js';
import { buyToken } from './transactions/buyToken.js';
import { sellToken } from './transactions/sellToken.js';
import { createNft } from './transactions/createNft.js';
import { buyNft } from './transactions/buyNft.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM references
  initializeDom();
  
  // Initialize program connection
  initialize();
  
  // Get button elements
  const connectWalletBtn = document.getElementById('connect-wallet');
  const createUserBtn = document.getElementById('create-user-btn');
  const createPoolBtn = document.getElementById('create-pool-btn');
  const buyTokenBtn = document.getElementById('buy-token-btn');
  const sellTokenBtn = document.getElementById('sell-token-btn');
  const createNftBtn = document.getElementById('create-nft-btn');
  const buyNftBtn = document.getElementById('buy-nft-btn');
  
  // Connect wallet button
  connectWalletBtn.addEventListener('click', async () => {
    await connectWallet();
    initializeProgram();
    enableFunctionButtons();
  });
  
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
