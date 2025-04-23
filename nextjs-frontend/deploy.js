#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const crypto = require('crypto');

// Path to the Bonding_Curve_SOL_contracts repository
const BONDING_CURVE_REPO_PATH = '/home/ubuntu/Bonding_Curve_SOL_contracts';
const ANCHOR_TOML_PATH = path.join(BONDING_CURVE_REPO_PATH, 'Anchor.toml');
const LIB_RS_PATH = path.join(BONDING_CURVE_REPO_PATH, 'programs/bonding-curve-system/src/lib.rs');

// Seed phrase for keypair recovery
const SEED_PHRASE = "focus chuckle bullet elbow proud image kid isolate pen fly tray false";
const EXPECTED_PUBLIC_KEY = "HVupsJz2rFZB4BEN7FY1jcfvck4UZPTT8S4znnbGtjh9";

// Configuration
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000; // 2 seconds
const MAX_BACKOFF_MS = 60000; // 1 minute
const JITTER_FACTOR = 0.2; // 20% random jitter to avoid thundering herd

// Frontend files to update with program ID
const FRONTEND_FILES = [
  {
    path: path.join(__dirname, 'src/utils/constants.js'),
    pattern: /(export const PROGRAM_ID = ['"])([^'"]+)(['"];)/,
    replacement: '$1$2$3'
  },
  {
    path: path.join(__dirname, 'src/utils/idl.ts'),
    pattern: /(export const PROGRAM_ID = ['"])([^'"]+)(['"];)/,
    replacement: '$1$2$3'
  }
];

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(logsDir, `deploy-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Helper function to log to both console and file
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  let coloredPrefix = '';
  
  switch (level) {
    case 'error':
      coloredPrefix = `${colors.red}[ERROR]${colors.reset}`;
      break;
    case 'warn':
      coloredPrefix = `${colors.yellow}[WARN]${colors.reset}`;
      break;
    case 'success':
      coloredPrefix = `${colors.green}[SUCCESS]${colors.reset}`;
      break;
    case 'info':
    default:
      coloredPrefix = `${colors.blue}[INFO]${colors.reset}`;
      break;
  }
  
  console.log(`${coloredPrefix} ${message}`);
  logStream.write(`[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
}

// Function to derive keypair from seed phrase
function deriveKeypairFromSeedPhrase(seedPhrase) {
  try {
    log('Deriving keypair from seed phrase...');
    
    // Convert seed phrase to seed buffer
    const seed = bip39.mnemonicToSeedSync(seedPhrase).slice(0, 32);
    
    // Create keypair from seed
    const keypair = Keypair.fromSeed(seed);
    
    log(`Derived public key: ${keypair.publicKey.toString()}`, 'success');
    
    // Verify the derived public key matches the expected one
    if (EXPECTED_PUBLIC_KEY && keypair.publicKey.toString() !== EXPECTED_PUBLIC_KEY) {
      log(`Warning: Derived public key ${keypair.publicKey.toString()} does not match expected public key ${EXPECTED_PUBLIC_KEY}`, 'warn');
    }
    
    return keypair;
  } catch (error) {
    log(`Failed to derive keypair: ${error.message}`, 'error');
    throw error;
  }
}

// Function to save keypair to file
function saveKeypairToFile(keypair, filePath) {
  try {
    log(`Saving keypair to ${filePath}...`);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Convert keypair to JSON format expected by Solana CLI
    const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
    
    // Write to file
    fs.writeFileSync(filePath, keypairJson, { mode: 0o600 }); // Set restrictive permissions
    
    log(`Keypair saved to ${filePath}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to save keypair: ${error.message}`, 'error');
    return false;
  }
}

// Function to get program ID from Anchor.toml
function getProgramIdFromAnchorToml() {
  try {
    log(`Reading program ID from ${ANCHOR_TOML_PATH}...`);
    
    if (!fs.existsSync(ANCHOR_TOML_PATH)) {
      log(`Anchor.toml not found at ${ANCHOR_TOML_PATH}`, 'error');
      return null;
    }
    
    const anchorToml = fs.readFileSync(ANCHOR_TOML_PATH, 'utf8');
    const programIdMatch = anchorToml.match(/bonding_curve_system\s*=\s*"([^"]+)"/);
    
    if (!programIdMatch) {
      log('Could not find program ID in Anchor.toml', 'error');
      return null;
    }
    
    const programId = programIdMatch[1];
    log(`Found program ID in Anchor.toml: ${programId}`, 'success');
    return programId;
  } catch (error) {
    log(`Failed to read program ID from Anchor.toml: ${error.message}`, 'error');
    return null;
  }
}

// Function to get program ID from lib.rs
function getProgramIdFromLibRs() {
  try {
    log(`Reading program ID from ${LIB_RS_PATH}...`);
    
    if (!fs.existsSync(LIB_RS_PATH)) {
      log(`lib.rs not found at ${LIB_RS_PATH}`, 'error');
      return null;
    }
    
    const libRs = fs.readFileSync(LIB_RS_PATH, 'utf8');
    const programIdMatch = libRs.match(/declare_id!\("([^"]+)"\);/);
    
    if (!programIdMatch) {
      log('Could not find program ID in lib.rs', 'error');
      return null;
    }
    
    const programId = programIdMatch[1];
    log(`Found program ID in lib.rs: ${programId}`, 'success');
    return programId;
  } catch (error) {
    log(`Failed to read program ID from lib.rs: ${error.message}`, 'error');
    return null;
  }
}

// Check if Solana is installed and configured
function checkEnvironment() {
  log('Checking environment...');
  
  try {
    const solanaVersion = execSync('solana --version').toString().trim();
    log(`Solana CLI: ${solanaVersion}`);
    
    const network = execSync('solana config get json_rpc_url').toString().trim();
    log(`Network: ${network.split('=')[1].trim()}`);
    
    return true;
  } catch (error) {
    log(`Environment check failed: ${error.message}`, 'error');
    return false;
  }
}

// Update frontend files with the program ID
function updateFrontendFiles(programId) {
  log('Updating frontend files with program ID...');
  
  let updatedCount = 0;
  
  for (const file of FRONTEND_FILES) {
    try {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        
        // For constants.js
        if (file.path.includes('constants.js')) {
          const newContent = content.replace(
            /export const PROGRAM_ID = ['"]([^'"]+)['"];/,
            `export const PROGRAM_ID = '${programId}';`
          );
          
          if (content !== newContent) {
            fs.writeFileSync(file.path, newContent);
            log(`Updated program ID in ${file.path}`, 'success');
            updatedCount++;
          } else {
            log(`Program ID already up to date in ${file.path}`, 'info');
          }
        }
        // For idl.ts - check if it has a PROGRAM_ID constant
        else if (file.path.includes('idl.ts')) {
          // First check if there's a PROGRAM_ID export
          const programIdExportMatch = content.match(/export const PROGRAM_ID/);
          
          if (programIdExportMatch) {
            // If it exists, update it
            const newContent = content.replace(
              /export const PROGRAM_ID = ['"]([^'"]+)['"];/,
              `export const PROGRAM_ID = '${programId}';`
            );
            
            if (content !== newContent) {
              fs.writeFileSync(file.path, newContent);
              log(`Updated program ID in ${file.path}`, 'success');
              updatedCount++;
            } else {
              log(`Program ID already up to date in ${file.path}`, 'info');
            }
          } else {
            // If it doesn't exist, add it at the end of the file
            const newContent = `${content}\n\n// Auto-generated by deployment script\nexport const PROGRAM_ID = '${programId}';\n`;
            fs.writeFileSync(file.path, newContent);
            log(`Added program ID to ${file.path}`, 'success');
            updatedCount++;
          }
        }
      } else {
        log(`File not found: ${file.path}`, 'warn');
      }
    } catch (error) {
      log(`Error updating ${file.path}: ${error.message}`, 'error');
    }
  }
  
  // Create or update a central program ID file that can be imported by any frontend component
  const centralIdFile = path.join(__dirname, 'program-id.json');
  fs.writeFileSync(centralIdFile, JSON.stringify({ programId }, null, 2));
  log(`Created/updated central program ID file at ${centralIdFile}`, 'success');
  updatedCount++;
  
  log(`Updated ${updatedCount} frontend files with program ID`, 'success');
  return updatedCount > 0;
}

// Main function
async function main() {
  log(`${colors.bright}${colors.cyan}=== Bonding Curve SOL Contracts Deployment Script ===${colors.reset}`);
  log(`Log file: ${logFile}`);
  
  // Derive keypair from seed phrase
  let keypair;
  try {
    keypair = deriveKeypairFromSeedPhrase(SEED_PHRASE);
  } catch (error) {
    log('Failed to derive keypair from seed phrase. Exiting.', 'error');
    process.exit(1);
  }
  
  // Save keypair to file
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config/solana/id.json');
  if (!saveKeypairToFile(keypair, keypairPath)) {
    log('Failed to save keypair to file. Exiting.', 'error');
    process.exit(1);
  }
  
  // Check environment
  if (!checkEnvironment()) {
    log('Environment check failed. Please fix the issues and try again.', 'error');
    process.exit(1);
  }
  
  // Check wallet balance
  try {
    const balance = execSync('solana balance').toString().trim();
    log(`Balance: ${balance}`);
    
    if (parseFloat(balance) < 1) {
      log('Warning: Low balance detected. Deployment may fail due to insufficient funds.', 'warn');
    }
  } catch (error) {
    log(`Failed to check balance: ${error.message}`, 'warn');
  }
  
  // Get program ID from Anchor.toml and lib.rs
  const programIdFromAnchor = getProgramIdFromAnchorToml();
  const programIdFromLibRs = getProgramIdFromLibRs();
  
  // Use program ID from lib.rs if available, otherwise from Anchor.toml
  const programId = programIdFromLibRs || programIdFromAnchor;
  
  if (!programId) {
    log('Could not determine program ID from either Anchor.toml or lib.rs. Exiting.', 'error');
    process.exit(1);
  }
  
  // Check if program IDs match
  if (programIdFromAnchor && programIdFromLibRs && programIdFromAnchor !== programIdFromLibRs) {
    log(`Warning: Program ID mismatch between Anchor.toml (${programIdFromAnchor}) and lib.rs (${programIdFromLibRs})`, 'warn');
  }
  
  // Update frontend files with the program ID
  const frontendUpdateSuccess = updateFrontendFiles(programId);
  if (frontendUpdateSuccess) {
    log('Frontend files successfully updated with program ID', 'success');
  } else {
    log('No frontend files were updated. Please check the logs for details.', 'warn');
  }
  
  log(`${colors.bright}${colors.green}Keypair recovery and frontend synchronization completed successfully!${colors.reset}`, 'success');
  log(`Program ID: ${colors.bright}${programId}${colors.reset}`);
  log(`Log file saved to: ${logFile}`);
}

// Run the main function
main().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
