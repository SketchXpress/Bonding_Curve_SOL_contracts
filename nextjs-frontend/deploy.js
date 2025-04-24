#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const crypto = require('crypto');

// Path to the project files - starting with current directory as default
let PROJECT_ROOT = process.cwd();
let ANCHOR_TOML_PATH = path.join(PROJECT_ROOT, 'Anchor.toml');
let LIB_RS_PATH = path.join(PROJECT_ROOT, 'programs/bonding-curve-system/src/lib.rs');

// Check if we're in the nextjs folder by looking for package.json with nextjs dependencies
let isInNextJsFolder = false;
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.dependencies && (packageJson.dependencies.next || packageJson.devDependencies?.next)) {
      isInNextJsFolder = true;
      PROJECT_ROOT = path.join(process.cwd(), '..');
      ANCHOR_TOML_PATH = path.join(PROJECT_ROOT, 'Anchor.toml');
      LIB_RS_PATH = path.join(PROJECT_ROOT, 'programs/bonding-curve-system/src/lib.rs');
    }
  }
} catch (error) {
  // Ignore errors, assume we're not in nextjs folder
}

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
    path: path.join(PROJECT_ROOT, 'nextjs-frontend/src/utils/constants.js'),
    pattern: /(export const PROGRAM_ID = ['"])([^'"]+)(['"];)/,
    replacement: '$1$2$3'
  },
  {
    path: path.join(PROJECT_ROOT, 'nextjs-frontend/src/utils/idl.ts'),
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
const logsDir = path.join(PROJECT_ROOT, 'logs');
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

// Log the current directory and file paths for debugging
log(`Current directory: ${process.cwd()}`);
log(`Project root: ${PROJECT_ROOT}`);
log(`Anchor.toml path: ${ANCHOR_TOML_PATH}`);
log(`lib.rs path: ${LIB_RS_PATH}`);

// Helper function to safely execute shell commands
function safeExecSync(command, options = {}) {
  try {
    return { 
      success: true, 
      output: execSync(command, { ...options, encoding: 'utf8' }).toString().trim() 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout ? error.stdout.toString().trim() : '',
      stderr: error.stderr ? error.stderr.toString().trim() : ''
    };
  }
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
    // Check Solana CLI version
    const solanaVersionResult = safeExecSync('solana --version');
    if (solanaVersionResult.success) {
      log(`Solana CLI: ${solanaVersionResult.output}`);
    } else {
      log(`Failed to get Solana CLI version: ${solanaVersionResult.error}`, 'warn');
    }
    
    // Check network configuration
    const networkResult = safeExecSync('solana config get json_rpc_url');
    if (networkResult.success) {
      const networkOutput = networkResult.output;
      const networkParts = networkOutput.split('=');
      if (networkParts.length > 1) {
        log(`Network: ${networkParts[1].trim()}`);
      } else {
        log(`Network: ${networkOutput}`);
      }
    } else {
      log(`Failed to get network configuration: ${networkResult.error}`, 'warn');
    }
    
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
          const programIdRegex = /export const PROGRAM_ID = ['"]([^'"]+)['"];/;
          if (programIdRegex.test(content)) {
            const newContent = content.replace(
              programIdRegex,
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
            // If PROGRAM_ID constant doesn't exist, add it
            const newContent = `${content}\n\n// Auto-generated by deployment script\nexport const PROGRAM_ID = '${programId}';\n`;
            fs.writeFileSync(file.path, newContent);
            log(`Added program ID to ${file.path}`, 'success');
            updatedCount++;
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
  
  try {
    // Create or update a central program ID file that can be imported by any frontend component
    const centralIdFile = path.join(PROJECT_ROOT, 'program-id.json');
    fs.writeFileSync(centralIdFile, JSON.stringify({ programId }, null, 2));
    log(`Created/updated central program ID file at ${centralIdFile}`, 'success');
    updatedCount++;
  } catch (error) {
    log(`Error creating central program ID file: ${error.message}`, 'error');
  }
  
  log(`Updated ${updatedCount} frontend files with program ID`, updatedCount > 0 ? 'success' : 'warn');
  return updatedCount > 0;
}

// Check wallet balance
function checkWalletBalance() {
  try {
    const balanceResult = safeExecSync('solana balance');
    if (balanceResult.success) {
      const balance = balanceResult.output;
      log(`Balance: ${balance}`);
      
      // Try to parse the balance as a number
      const balanceValue = parseFloat(balance.replace(/[^\d.-]/g, ''));
      if (!isNaN(balanceValue) && balanceValue < 1) {
        log('Warning: Low balance detected. Deployment may fail due to insufficient funds.', 'warn');
      }
    } else {
      log(`Failed to check balance: ${balanceResult.error}`, 'warn');
    }
    return true;
  } catch (error) {
    log(`Failed to check balance: ${error.message}`, 'warn');
    return false;
  }
}

// Function to set the default keypair in Solana config
function setDefaultKeypair(keypairPath) {
  try {
    log(`Setting default keypair in Solana config to ${keypairPath}...`);
    const configResult = safeExecSync(`solana config set --keypair ${keypairPath}`);
    if (configResult.success) {
      log(`Set default keypair in Solana config to ${keypairPath}`, 'success');
      return true;
    } else {
      log(`Failed to set default keypair in Solana config: ${configResult.error}`, 'warn');
      log(`Config output: ${configResult.output}`, 'warn');
      log(`Config stderr: ${configResult.stderr}`, 'warn');
      return false;
    }
  } catch (error) {
    log(`Error setting default keypair in Solana config: ${error.message}`, 'warn');
    return false;
  }
}

// Function to clean build artifacts
function cleanBuildArtifacts() {
  log('Cleaning build artifacts...');
  
  // First, clean Anchor build artifacts
  const anchorCleanResult = safeExecSync('anchor clean', { cwd: PROJECT_ROOT });
  if (!anchorCleanResult.success) {
    log(`Warning: Failed to clean Anchor artifacts: ${anchorCleanResult.error}`, 'warn');
    log(`Anchor clean output: ${anchorCleanResult.output}`, 'warn');
    log(`Anchor clean stderr: ${anchorCleanResult.stderr}`, 'warn');
  } else {
    log('Anchor artifacts cleaned successfully', 'success');
  }
  
  // Then, clean Cargo build artifacts
  const cargoCleanResult = safeExecSync('cargo clean', { cwd: PROJECT_ROOT });
  if (!cargoCleanResult.success) {
    log(`Warning: Failed to clean Cargo artifacts: ${cargoCleanResult.error}`, 'warn');
    log(`Cargo clean output: ${cargoCleanResult.output}`, 'warn');
    log(`Cargo clean stderr: ${cargoCleanResult.stderr}`, 'warn');
  } else {
    log('Cargo artifacts cleaned successfully', 'success');
  }
  
  // Remove target directory manually if needed
  const targetDir = path.join(PROJECT_ROOT, 'target');
  if (fs.existsSync(targetDir)) {
    try {
      log('Removing target directory manually...');
      safeExecSync(`rm -rf ${targetDir}`);
      log('Target directory removed successfully', 'success');
    } catch (error) {
      log(`Warning: Failed to remove target directory manually: ${error.message}`, 'warn');
    }
  }
  
  return true;
}

// Function to update program ID in lib.rs
function updateProgramIdInLibRs(programId) {
  try {
    log(`Updating program ID in ${LIB_RS_PATH}...`);
    
    if (!fs.existsSync(LIB_RS_PATH)) {
      log(`lib.rs not found at ${LIB_RS_PATH}`, 'error');
      return false;
    }
    
    let libRs = fs.readFileSync(LIB_RS_PATH, 'utf8');
    const programIdRegex = /(declare_id!\(")([^"]+)("\);)/;
    
    if (programIdRegex.test(libRs)) {
      const newLibRs = libRs.replace(
        programIdRegex,
        `$1${programId}$3`
      );
      
      if (libRs !== newLibRs) {
        fs.writeFileSync(LIB_RS_PATH, newLibRs);
        log(`Updated program ID in ${LIB_RS_PATH}`, 'success');
        return true;
      } else {
        log(`Program ID already up to date in ${LIB_RS_PATH}`, 'info');
        return true;
      }
    } else {
      log(`Could not find program ID declaration in ${LIB_RS_PATH}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to update program ID in lib.rs: ${error.message}`, 'error');
    return false;
  }
}

// Function to update program ID in Anchor.toml
function updateProgramIdInAnchorToml(programId) {
  try {
    log(`Updating program ID in ${ANCHOR_TOML_PATH}...`);
    
    if (!fs.existsSync(ANCHOR_TOML_PATH)) {
      log(`Anchor.toml not found at ${ANCHOR_TOML_PATH}`, 'error');
      return false;
    }
    
    let anchorToml = fs.readFileSync(ANCHOR_TOML_PATH, 'utf8');
    const programIdRegex = /(bonding_curve_system\s*=\s*")([^"]+)(")/;
    
    if (programIdRegex.test(anchorToml)) {
      const newAnchorToml = anchorToml.replace(
        programIdRegex,
        `$1${programId}$3`
      );
      
      if (anchorToml !== newAnchorToml) {
        fs.writeFileSync(ANCHOR_TOML_PATH, newAnchorToml);
        log(`Updated program ID in ${ANCHOR_TOML_PATH}`, 'success');
        return true;
      } else {
        log(`Program ID already up to date in ${ANCHOR_TOML_PATH}`, 'info');
        return true;
      }
    } else {
      log(`Could not find program ID declaration in ${ANCHOR_TOML_PATH}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to update program ID in Anchor.toml: ${error.message}`, 'error');
    return false;
  }
}

// Function to build the program
function buildProgram() {
  log('Building the program with Anchor...');
  const buildResult = safeExecSync('anchor build', { cwd: PROJECT_ROOT });
  
  if (!buildResult.success) {
    log(`Failed to build program: ${buildResult.error}`, 'error');
    log(`Build output: ${buildResult.output}`, 'error');
    log(`Build stderr: ${buildResult.stderr}`, 'error');
    return false;
  }
  
  log('Program built successfully', 'success');
  return true;
}

// Function to recover SOL from failed deployment
function recoverSolFromFailedDeployment(deployOutput) {
  log('Checking for recoverable SOL from failed deployment...');
  
  // Extract seed phrase from deployment output
  const seedPhraseMatch = deployOutput.match(/following 12-word seed phrase:\s*={10,}\s*([\w\s]+)\s*={10,}/);
  if (!seedPhraseMatch || !seedPhraseMatch[1]) {
    log('No seed phrase found in deployment output', 'warn');
    return false;
  }
  
  const bufferSeedPhrase = seedPhraseMatch[1].trim();
  log(`Found buffer seed phrase: ${bufferSeedPhrase}`, 'success');
  
  // Create a temporary directory for the buffer keypair
  const tempDir = path.join(PROJECT_ROOT, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  const bufferKeypairPath = path.join(tempDir, 'buffer-keypair.json');
  
  // Recover the buffer keypair - using a temporary file for the seed phrase
  log('Recovering buffer keypair...');
  const seedPhrasePath = path.join(tempDir, 'seed-phrase.txt');
  fs.writeFileSync(seedPhrasePath, bufferSeedPhrase);
  
  // Use the file instead of echo to avoid pipe issues
  const recoverResult = safeExecSync(`solana-keygen recover -o ${bufferKeypairPath} < ${seedPhrasePath}`);
  
  // Clean up the seed phrase file
  try {
    fs.unlinkSync(seedPhrasePath);
  } catch (error) {
    log(`Warning: Failed to clean up seed phrase file: ${error.message}`, 'warn');
  }
  
  if (!recoverResult.success) {
    log(`Failed to recover buffer keypair: ${recoverResult.error}`, 'error');
    log(`Recover output: ${recoverResult.output}`, 'error');
    log(`Recover stderr: ${recoverResult.stderr}`, 'error');
    
    // Try alternative recovery method
    log('Trying alternative recovery method...', 'warn');
    
    // Create a script file to recover the keypair
    const recoverScriptPath = path.join(tempDir, 'recover.sh');
    const recoverScript = `#!/bin/bash
echo "${bufferSeedPhrase}" | solana-keygen recover --force -o ${bufferKeypairPath}
`;
    fs.writeFileSync(recoverScriptPath, recoverScript, { mode: 0o755 });
    
    const altRecoverResult = safeExecSync(`bash ${recoverScriptPath}`);
    
    // Clean up the script file
    try {
      fs.unlinkSync(recoverScriptPath);
    } catch (error) {
      log(`Warning: Failed to clean up recovery script: ${error.message}`, 'warn');
    }
    
    if (!altRecoverResult.success) {
      log(`Alternative recovery method also failed: ${altRecoverResult.error}`, 'error');
      log(`Alternative recover output: ${altRecoverResult.output}`, 'error');
      log(`Alternative recover stderr: ${altRecoverResult.stderr}`, 'error');
      return false;
    }
  }
  
  // Check if the keypair file was created
  if (!fs.existsSync(bufferKeypairPath)) {
    log('Buffer keypair file was not created', 'error');
    return false;
  }
  
  // Try to read the keypair file to get the public key
  let bufferAddress = '';
  try {
    const keypairData = JSON.parse(fs.readFileSync(bufferKeypairPath, 'utf8'));
    const bufferKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    bufferAddress = bufferKeypair.publicKey.toString();
    log(`Extracted buffer address from keypair: ${bufferAddress}`, 'success');
  } catch (error) {
    log(`Failed to extract buffer address from keypair: ${error.message}`, 'error');
    return false;
  }
  
  if (!bufferAddress) {
    log('Could not determine buffer address', 'error');
    return false;
  }
  
  // Close the buffer account to recover SOL
  log(`Closing buffer account ${bufferAddress} to recover SOL...`);
  const closeResult = safeExecSync(`solana program close ${bufferAddress} --keypair ${bufferKeypairPath}`);
  
  if (!closeResult.success) {
    log(`Failed to close buffer account: ${closeResult.error}`, 'error');
    log(`Close output: ${closeResult.output}`, 'error');
    log(`Close stderr: ${closeResult.stderr}`, 'error');
    
    // Try alternative method with buffer signer
    log('Trying alternative method to close buffer account...', 'warn');
    const altCloseResult = safeExecSync(`solana program close --buffer ${bufferKeypairPath}`);
    
    if (!altCloseResult.success) {
      log(`Alternative method also failed: ${altCloseResult.error}`, 'error');
      log(`Alternative close output: ${altCloseResult.output}`, 'error');
      log(`Alternative close stderr: ${altCloseResult.stderr}`, 'error');
      return false;
    }
    
    log('Successfully closed buffer account using alternative method', 'success');
    
    // Extract recovered amount from output
    const recoveredAmountMatch = altCloseResult.output.match(/Closed ([\d.]+) SOL/);
    if (recoveredAmountMatch && recoveredAmountMatch[1]) {
      log(`Recovered ${recoveredAmountMatch[1]} SOL`, 'success');
    }
    
    return true;
  }
  
  log('Successfully closed buffer account', 'success');
  
  // Extract recovered amount from output
  const recoveredAmountMatch = closeResult.output.match(/Closed ([\d.]+) SOL/);
  if (recoveredAmountMatch && recoveredAmountMatch[1]) {
    log(`Recovered ${recoveredAmountMatch[1]} SOL`, 'success');
  }
  
  return true;
}

// Function to deploy the program
function deployProgram(keypairPath) {
  log(`Deploying the program with Anchor using keypair at ${keypairPath}...`);
  
  // First, try with explicit provider.wallet
  const deployResult = safeExecSync(`anchor deploy --provider.wallet ${keypairPath}`, { cwd: PROJECT_ROOT });
  
  if (!deployResult.success) {
    log(`Failed to deploy program: ${deployResult.error}`, 'error');
    log(`Deploy output: ${deployResult.output}`, 'error');
    log(`Deploy stderr: ${deployResult.stderr}`, 'error');
    
    // Check if we can recover SOL from failed deployment
    if ((deployResult.output && deployResult.output.includes('seed phrase')) || 
        (deployResult.stderr && deployResult.stderr.includes('seed phrase'))) {
      log('Detected failed deployment with recoverable SOL', 'warn');
      const outputToUse = deployResult.output || deployResult.stderr;
      recoverSolFromFailedDeployment(outputToUse);
    }
    
    // Try alternative deployment method if the first one fails
    log('Trying alternative deployment method...', 'warn');
    const altDeployResult = safeExecSync(`ANCHOR_WALLET=${keypairPath} anchor deploy`, { cwd: PROJECT_ROOT });
    
    if (!altDeployResult.success) {
      log(`Alternative deployment also failed: ${altDeployResult.error}`, 'error');
      log(`Alternative deploy output: ${altDeployResult.output}`, 'error');
      log(`Alternative deploy stderr: ${altDeployResult.stderr}`, 'error');
      
      // Check if we can recover SOL from failed deployment
      if ((altDeployResult.output && altDeployResult.output.includes('seed phrase')) || 
          (altDeployResult.stderr && altDeployResult.stderr.includes('seed phrase'))) {
        log('Detected failed deployment with recoverable SOL', 'warn');
        const outputToUse = altDeployResult.output || altDeployResult.stderr;
        recoverSolFromFailedDeployment(outputToUse);
      }
      
      // Try with solana program deploy as a last resort
      log('Trying direct Solana program deploy as last resort...', 'warn');
      const programPath = path.join(PROJECT_ROOT, 'target/deploy/bonding_curve_system.so');
      const solanaProgramDeployResult = safeExecSync(`solana program deploy --keypair ${keypairPath} ${programPath}`, { cwd: PROJECT_ROOT });
      
      if (!solanaProgramDeployResult.success) {
        log(`Solana program deploy also failed: ${solanaProgramDeployResult.error}`, 'error');
        log(`Solana program deploy output: ${solanaProgramDeployResult.output}`, 'error');
        log(`Solana program deploy stderr: ${solanaProgramDeployResult.stderr}`, 'error');
        
        // Check if we can recover SOL from failed deployment
        if ((solanaProgramDeployResult.output && solanaProgramDeployResult.output.includes('seed phrase')) || 
            (solanaProgramDeployResult.stderr && solanaProgramDeployResult.stderr.includes('seed phrase'))) {
          log('Detected failed deployment with recoverable SOL', 'warn');
          const outputToUse = solanaProgramDeployResult.output || solanaProgramDeployResult.stderr;
          recoverSolFromFailedDeployment(outputToUse);
        }
        
        return false;
      }
      
      log('Program deployed successfully using Solana program deploy', 'success');
      
      // Extract program ID from the output
      const programIdMatch = solanaProgramDeployResult.output.match(/Program Id: ([a-zA-Z0-9]{32,44})/);
      if (programIdMatch && programIdMatch[1]) {
        const newProgramId = programIdMatch[1];
        log(`New program ID from deployment: ${newProgramId}`, 'success');
        
        // Update program ID in files
        updateProgramIdInLibRs(newProgramId);
        updateProgramIdInAnchorToml(newProgramId);
        updateFrontendFiles(newProgramId);
      }
      
      return true;
    }
    
    log('Program deployed successfully using alternative method', 'success');
    return true;
  }
  
  log('Program deployed successfully', 'success');
  return true;
}

// Function to get the program ID from a deployed program
function getDeployedProgramId() {
  try {
    // First try to get from Anchor.toml
    const programIdFromAnchor = getProgramIdFromAnchorToml();
    if (programIdFromAnchor) {
      return programIdFromAnchor;
    }
    
    // Then try to get from lib.rs
    const programIdFromLibRs = getProgramIdFromLibRs();
    if (programIdFromLibRs) {
      return programIdFromLibRs;
    }
    
    // If both fail, try to list programs owned by the keypair
    log('Trying to find program ID by listing programs owned by the keypair...');
    const listProgramsResult = safeExecSync('solana program show --programs');
    if (listProgramsResult.success) {
      const output = listProgramsResult.output;
      const lines = output.split('\n');
      
      // Look for a line that contains "bonding_curve_system" or similar
      for (const line of lines) {
        if (line.includes('bonding') || line.includes('curve')) {
          const parts = line.split(/\s+/);
          // The program ID is usually the first part
          if (parts.length > 0 && parts[0].match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)) {
            log(`Found potential program ID from listing: ${parts[0]}`, 'success');
            return parts[0];
          }
        }
      }
    }
    
    // If all else fails, return a default
    log('Could not determine program ID from any source, using default', 'warn');
    return '6c3sjni7sr87CsDz3sHWHS1W7mnzSMpozAL9pwnpGsCS';
  } catch (error) {
    log(`Error getting deployed program ID: ${error.message}`, 'error');
    return '6c3sjni7sr87CsDz3sHWHS1W7mnzSMpozAL9pwnpGsCS';
  }
}

// Function to check for and recover SOL from any failed deployments
function checkForRecoverableSOL() {
  log('Checking for any recoverable SOL from previous failed deployments...');
  
  // Look for log files that might contain seed phrases
  if (!fs.existsSync(logsDir)) {
    log('Logs directory does not exist, skipping SOL recovery check', 'warn');
    return false;
  }
  
  const logFiles = fs.readdirSync(logsDir).filter(file => file.startsWith('deploy-') && file.endsWith('.log'));
  
  let recoveredAny = false;
  
  for (const logFile of logFiles) {
    try {
      const logContent = fs.readFileSync(path.join(logsDir, logFile), 'utf8');
      
      // Check if this log contains a seed phrase
      if (logContent.includes('seed phrase') && logContent.includes('==========')) {
        log(`Found potential recoverable SOL in log file: ${logFile}`, 'info');
        
        // Extract seed phrase from log
        const seedPhraseMatch = logContent.match(/following 12-word seed phrase:\s*={10,}\s*([\w\s]+)\s*={10,}/);
        if (seedPhraseMatch && seedPhraseMatch[1]) {
          const bufferSeedPhrase = seedPhraseMatch[1].trim();
          log(`Attempting to recover SOL using seed phrase from ${logFile}...`, 'info');
          
          // Create a temporary directory for the buffer keypair
          const tempDir = path.join(PROJECT_ROOT, 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }
          
          const bufferKeypairPath = path.join(tempDir, `buffer-keypair-${Date.now()}.json`);
          
          // Recover the buffer keypair - using a temporary file for the seed phrase
          const seedPhrasePath = path.join(tempDir, `seed-phrase-${Date.now()}.txt`);
          fs.writeFileSync(seedPhrasePath, bufferSeedPhrase);
          
          // Use the file instead of echo to avoid pipe issues
          const recoverResult = safeExecSync(`solana-keygen recover -o ${bufferKeypairPath} < ${seedPhrasePath}`);
          
          // Clean up the seed phrase file
          try {
            fs.unlinkSync(seedPhrasePath);
          } catch (error) {
            log(`Warning: Failed to clean up seed phrase file: ${error.message}`, 'warn');
          }
          
          if (!recoverResult.success) {
            log(`Failed to recover buffer keypair from ${logFile}: ${recoverResult.error}`, 'warn');
            
            // Try alternative recovery method
            log('Trying alternative recovery method...', 'warn');
            
            // Create a script file to recover the keypair
            const recoverScriptPath = path.join(tempDir, `recover-${Date.now()}.sh`);
            const recoverScript = `#!/bin/bash
echo "${bufferSeedPhrase}" | solana-keygen recover --force -o ${bufferKeypairPath}
`;
            fs.writeFileSync(recoverScriptPath, recoverScript, { mode: 0o755 });
            
            const altRecoverResult = safeExecSync(`bash ${recoverScriptPath}`);
            
            // Clean up the script file
            try {
              fs.unlinkSync(recoverScriptPath);
            } catch (error) {
              log(`Warning: Failed to clean up recovery script: ${error.message}`, 'warn');
            }
            
            if (!altRecoverResult.success) {
              log(`Alternative recovery method also failed for ${logFile}: ${altRecoverResult.error}`, 'warn');
              continue;
            }
          }
          
          // Check if the keypair file was created
          if (!fs.existsSync(bufferKeypairPath)) {
            log(`Buffer keypair file was not created for ${logFile}`, 'warn');
            continue;
          }
          
          // Try to read the keypair file to get the public key
          let bufferAddress = '';
          try {
            const keypairData = JSON.parse(fs.readFileSync(bufferKeypairPath, 'utf8'));
            const bufferKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
            bufferAddress = bufferKeypair.publicKey.toString();
            log(`Extracted buffer address from keypair: ${bufferAddress}`, 'success');
          } catch (error) {
            log(`Failed to extract buffer address from keypair in ${logFile}: ${error.message}`, 'warn');
            continue;
          }
          
          if (!bufferAddress) {
            log(`Could not determine buffer address from ${logFile}`, 'warn');
            continue;
          }
          
          // Close the buffer account to recover SOL
          log(`Closing buffer account ${bufferAddress} to recover SOL...`);
          const closeResult = safeExecSync(`solana program close ${bufferAddress} --keypair ${bufferKeypairPath}`);
          
          if (!closeResult.success) {
            log(`Failed to close buffer account from ${logFile}: ${closeResult.error}`, 'warn');
            
            // Try alternative method with buffer signer
            log('Trying alternative method to close buffer account...', 'warn');
            const altCloseResult = safeExecSync(`solana program close --buffer ${bufferKeypairPath}`);
            
            if (!altCloseResult.success) {
              log(`Alternative method also failed for ${logFile}: ${altCloseResult.error}`, 'warn');
              continue;
            }
            
            log('Successfully closed buffer account using alternative method', 'success');
            
            // Extract recovered amount from output
            const recoveredAmountMatch = altCloseResult.output.match(/Closed ([\d.]+) SOL/);
            if (recoveredAmountMatch && recoveredAmountMatch[1]) {
              log(`Recovered ${recoveredAmountMatch[1]} SOL from ${logFile}`, 'success');
              recoveredAny = true;
            }
            
            continue;
          }
          
          log(`Successfully closed buffer account from ${logFile}`, 'success');
          
          // Extract recovered amount from output
          const recoveredAmountMatch = closeResult.output.match(/Closed ([\d.]+) SOL/);
          if (recoveredAmountMatch && recoveredAmountMatch[1]) {
            log(`Recovered ${recoveredAmountMatch[1]} SOL from ${logFile}`, 'success');
            recoveredAny = true;
          }
        }
      }
    } catch (error) {
      log(`Error processing log file ${logFile}: ${error.message}`, 'warn');
    }
  }
  
  if (!recoveredAny) {
    log('No recoverable SOL found from previous deployments', 'info');
  }
  
  return recoveredAny;
}

// Main function
async function main() {
  log(`${colors.bright}${colors.cyan}=== Bonding Curve SOL Contracts Deployment Script ===${colors.reset}`);
  log(`Log file: ${logFile}`);
  
  // Step 0: Check for and recover any SOL from previous failed deployments
  log('Step 0/7: Checking for recoverable SOL from previous deployments...');
  checkForRecoverableSOL();
  
  // Step 1: Derive keypair from seed phrase
  log('Step 1/7: Deriving keypair from seed phrase...');
  let keypair;
  try {
    keypair = deriveKeypairFromSeedPhrase(SEED_PHRASE);
  } catch (error) {
    log('Failed to derive keypair from seed phrase. Exiting.', 'error');
    process.exit(1);
  }
  
  // Step 2: Save keypair to Ubuntu path (this is where Anchor looks for it)
  log('Step 2/7: Setting up wallet...');
  const ubuntuKeypairPath = '/home/ubuntu/.config/solana/id.json';
  if (!saveKeypairToFile(keypair, ubuntuKeypairPath)) {
    log(`Failed to save keypair to ${ubuntuKeypairPath}. Exiting.`, 'error');
    process.exit(1);
  }
  
  // Also save to root location as backup
  const rootKeypairPath = '/root/.config/solana/id.json';
  if (!saveKeypairToFile(keypair, rootKeypairPath)) {
    log(`Failed to save keypair to ${rootKeypairPath}. Continuing anyway.`, 'warn');
  }
  
  // Set the default keypair in Solana config
  setDefaultKeypair(ubuntuKeypairPath);
  
  // Check environment
  if (!checkEnvironment()) {
    log('Environment check failed. Please fix the issues and try again.', 'error');
    process.exit(1);
  }
  
  // Check wallet balance
  checkWalletBalance();
  
  // Step 3: Clean build artifacts
  log('Step 3/7: Cleaning build artifacts...');
  cleanBuildArtifacts();
  
  // Step 4: Get program ID (before cleaning, in case we need to preserve it)
  log('Step 4/7: Getting program ID...');
  const programId = getDeployedProgramId();
  log(`Using program ID: ${programId}`);
  
  // Update program ID in all files to ensure consistency
  log('Updating program ID in all files...');
  updateProgramIdInLibRs(programId);
  updateProgramIdInAnchorToml(programId);
  
  // Step 5: Build the program
  log('Step 5/7: Building the program...');
  if (!buildProgram()) {
    log('Failed to build program. Exiting.', 'error');
    process.exit(1);
  }
  
  // Step 6: Deploy the program
  log('Step 6/7: Deploying the program...');
  if (!deployProgram(ubuntuKeypairPath)) {
    log('Failed to deploy program. Exiting.', 'error');
    process.exit(1);
  }
  
  // Step 7: Get the final program ID (in case it changed during deployment)
  log('Step 7/7: Getting final program ID and updating frontend...');
  const finalProgramId = getDeployedProgramId();
  log(`Final program ID: ${finalProgramId}`);
  
  // Update frontend files with the program ID
  const frontendUpdateSuccess = updateFrontendFiles(finalProgramId);
  if (frontendUpdateSuccess) {
    log('Frontend files successfully updated with program ID', 'success');
  } else {
    log('No frontend files were updated. Please check the logs for details.', 'warn');
  }
  
  log(`${colors.bright}${colors.green}Deployment process completed successfully!${colors.reset}`, 'success');
  log(`Program ID: ${colors.bright}${finalProgramId}${colors.reset}`);
  log(`Log file saved to: ${logFile}`);
}

// Run the main function
main().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
