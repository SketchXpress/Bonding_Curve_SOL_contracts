import { getWalletBalance } from '../services/wallet.js';
import { shortenAddress } from './format.js';

// UI Elements
let walletStatus;
let walletInfo;
let walletAddress;
let walletBalance;
let transactionList;

export function initializeDom() {
  // Get DOM elements
  walletStatus = document.getElementById('wallet-status');
  walletInfo = document.getElementById('wallet-info');
  walletAddress = document.getElementById('wallet-address');
  walletBalance = document.getElementById('wallet-balance');
  transactionList = document.getElementById('transaction-list');
}

export function updateStatus(message, type = '') {
  console.log(`Status (${type}):`, message);
}

export function updateResult(elementId, htmlContent) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = htmlContent;
  }
}

export async function updateWalletUI(wallet) {
  if (!wallet) return;
  
  walletStatus.textContent = 'Connected';
  walletStatus.classList.add('connected');
  walletAddress.textContent = shortenAddress(wallet.publicKey.toString());
  
  // Get and display balance
  const balance = await getWalletBalance();
  walletBalance.textContent = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
  
  // Show wallet info
  walletInfo.classList.remove('hidden');
}

export function enableFunctionButtons() {
  const buttons = [
    'create-user-btn',
    'create-pool-btn',
    'buy-token-btn',
    'sell-token-btn',
    'create-nft-btn',
    'buy-nft-btn'
  ];
  
  buttons.forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = false;
  });
}

export function addTransaction(type, signature) {
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
