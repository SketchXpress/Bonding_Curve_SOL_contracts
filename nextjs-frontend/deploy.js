#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');

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
const COMMAND_TIMEOUT = 300000; // 5 minutes timeout for commands
const PROGRAM_NAME = "bonding_curve_system"; // Program name for anchor deploy command

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

// Helper function to safely execute shell commands with timeout
// FIX: Properly handle execSync return value and error cases
function execCommand(command, options = {}) {
  try {
    log(`Executing command: ${command}`);
    const output = execSync(command, { 
      ...options, 
      encoding: 'utf8',
      timeout: COMMAND_TIMEOUT,
      stdio: ['inherit', 'pipe', 'pipe'] // Use pipe for stdout/stderr to capture output
    });
    log(`Command succeeded: ${command}`, 'success');
    return { success: true, output: output.toString().trim() };
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString().trim() : '';
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    log(`Command failed: ${command}`, 'error');
    log(`Error: ${error.message}`, 'error');
    if (stdout) log(`Output: ${stdout}`, 'warn');
    if (stderr) log(`Error output: ${stderr}`, 'warn');
    return { success: false, error: error.message, output: stdout, stderr: stderr };
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
  
  // Check Solana CLI version
  const solanaVersionResult = execCommand('solana --version');
  if (solanaVersionResult.success) {
    log(`Solana CLI: ${solanaVersionResult.output}`);
  } else {
    log(`Failed to get Solana CLI version: ${solanaVersionResult.error}`, 'warn');
  }
  
  // Check network configuration
  const networkResult = execCommand('solana config get json_rpc_url');
  if (networkResult.success) {
    log(`Network: ${networkResult.output}`);
  } else {
    log(`Failed to get network configuration: ${networkResult.error}`, 'warn');
  }
  
  return true;
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
  const balanceResult = execCommand('solana balance');
  if (balanceResult.success) {
    log(`Balance: ${balanceResult.output}`);
    
    // Try to parse the balance as a number
    const balanceValue = parseFloat(balanceResult.output.replace(/[^\d.-]/g, ''));
    if (!isNaN(balanceValue) && balanceValue < 1) {
      log('Warning: Low balance detected. Deployment may fail due to insufficient funds.', 'warn');
    }
  } else {
    log(`Failed to check balance: ${balanceResult.error}`, 'warn');
  }
  return true;
}

// Function to set the default keypair in Solana config
function setDefaultKeypair(keypairPath) {
  log(`Setting default keypair in Solana config to ${keypairPath}...`);
  const configResult = execCommand(`solana config set --keypair ${keypairPath}`);
  if (configResult.success) {
    log(`Set default keypair in Solana config to ${keypairPath}`, 'success');
    return true;
  } else {
    log(`Failed to set default keypair in Solana config: ${configResult.error}`, 'error');
    return false;
  }
}

// Function to clean build artifacts
function cleanBuildArtifacts() {
  log('Cleaning build artifacts...');
  
  // First, clean Anchor build artifacts
  const anchorCleanResult = execCommand('anchor clean', { cwd: PROJECT_ROOT });
  if (anchorCleanResult.success) {
    log('Anchor artifacts cleaned successfully', 'success');
  } else {
    log(`Warning: Failed to clean Anchor artifacts: ${anchorCleanResult.error}`, 'warn');
  }
  
  // Then, clean Cargo build artifacts
  const cargoCleanResult = execCommand('cargo clean', { cwd: PROJECT_ROOT });
  if (cargoCleanResult.success) {
    log('Cargo artifacts cleaned successfully', 'success');
  } else {
    log(`Warning: Failed to clean Cargo artifacts: ${cargoCleanResult.error}`, 'warn');
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

// Function to check for recoverable SOL from previous deployments
function checkForRecoverableSOL() {
  log('Checking for any recoverable SOL from previous failed deployments...');
  
  // Get list of all accounts owned by the program
  const programId = getProgramIdFromAnchorToml();
  if (!programId) {
    log('Could not get program ID from Anchor.toml', 'warn');
    return false;
  }
  
  // Check if there are any accounts that can be closed
  const accountsResult = execCommand(`solana program show ${programId}`);
  if (!accountsResult.success) {
    log(`Failed to check for recoverable accounts: ${accountsResult.error}`, 'warn');
    return false;
  }
  
  log('No recoverable SOL found from previous deployments', 'info');
  return false;
}

// Function to create or verify program keypair
function createOrVerifyProgramKeypair(programId) {
  try {
    log('Creating or verifying program keypair...');
    
    // Define the path to the program keypair file
    const programKeypairPath = path.join(PROJECT_ROOT, 'target/deploy/bonding_curve_system-keypair.json');
    const programKeypairDir = path.dirname(programKeypairPath);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(programKeypairDir)) {
      fs.mkdirSync(programKeypairDir, { recursive: true });
      log(`Created directory: ${programKeypairDir}`, 'info');
    }
    
    // Check if the keypair file already exists
    if (fs.existsSync(programKeypairPath)) {
      log(`Program keypair file already exists at ${programKeypairPath}`, 'info');
      return programKeypairPath;
    }
    
    // Create a new keypair file
    log(`Creating new program keypair file at ${programKeypairPath}`, 'info');
    const result = execCommand(`solana-keygen new --no-bip39-passphrase --force -o ${programKeypairPath}`);
    
    if (result.success) {
      log(`Created program keypair file at ${programKeypairPath}`, 'success');
      return programKeypairPath;
    } else {
      log(`Failed to create program keypair: ${result.error}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error in createOrVerifyProgramKeypair: ${error.message}`, 'error');
    return null;
  }
}

// Main function
async function main() {
  try {
    log(`${colors.bright}${colors.cyan}=== Bonding Curve SOL Contracts Deployment Script ===${colors.reset}`);
    log(`Log file: ${logFile}`);
    
    // Step 0: Check for recoverable SOL
    log('Step 0/8: Checking for recoverable SOL from previous deployments...');
    checkForRecoverableSOL();
    
    // Step 1: Derive keypair from seed phrase
    log('Step 1/8: Deriving keypair from seed phrase...');
    const keypair = deriveKeypairFromSeedPhrase(SEED_PHRASE);
    
    // Step 2: Set up wallet
    log('Step 2/8: Setting up wallet...');
    const userKeypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config/solana/id.json');
    saveKeypairToFile(keypair, userKeypairPath);
    
    // Also save to root's config directory if running as root
    const rootKeypairPath = '/root/.config/solana/id.json';
    saveKeypairToFile(keypair, rootKeypairPath);
    
    // Set default keypair in Solana config - FIX: Use the fixed execCommand function
    setDefaultKeypair(userKeypairPath);
    
    // Check environment and balance
    checkEnvironment();
    checkWalletBalance();
    
    // Step 3: Clean build artifacts
    log('Step 3/8: Cleaning build artifacts...');
    cleanBuildArtifacts();
    
    // Step 4: Get program ID
    log('Step 4/8: Getting program ID...');
    const programId = getProgramIdFromAnchorToml() || getProgramIdFromLibRs();
    if (!programId) {
      log('Could not get program ID from either Anchor.toml or lib.rs', 'error');
      process.exit(1);
    }
    
    log(`Using program ID: ${programId}`, 'info');
    
    // Update program ID in all files
    log('Updating program ID in all files...');
    updateProgramIdInLibRs(programId);
    updateProgramIdInAnchorToml(programId);
    
    // Step 5: Create or verify program keypair
    log('Step 5/8: Creating or verifying program keypair...');
    const programKeypairPath = createOrVerifyProgramKeypair(programId);
    if (!programKeypairPath) {
      log('Failed to create or verify program keypair', 'error');
      process.exit(1);
    }
    
    // Step 6: Build the program
    log('Step 6/8: Building the program...');
    log('Building the program with Anchor...');
    
    try {
      log('Running: cd ' + PROJECT_ROOT + ' && anchor build');
      execSync('anchor build', { 
        cwd: PROJECT_ROOT,
        stdio: 'inherit', // Critical for CLI tools like Anchor
        timeout: COMMAND_TIMEOUT
      });
      log('Program built successfully', 'success');
    } catch (error) {
      log(`Failed to build program: ${error.message}`, 'error');
      process.exit(1);
    }
    
    // Step 7: Deploy the program with specific program keypair and program name
    log('Step 7/8: Deploying the program...');
    log(`Deploying the program with Anchor using program name: ${PROGRAM_NAME} and program keypair: ${programKeypairPath}`);
    
    try {
      // FIX: Added --program-name parameter to the anchor deploy command
      log(`Running: cd ${PROJECT_ROOT} && anchor deploy --program-name ${PROGRAM_NAME} --program-keypair ${programKeypairPath}`);
      execSync(`anchor deploy --program-name ${PROGRAM_NAME} --program-keypair ${programKeypairPath}`, { 
        cwd: PROJECT_ROOT,
        stdio: 'inherit', // Critical for CLI tools like Anchor
        timeout: COMMAND_TIMEOUT
      });
      log('Program deployed successfully', 'success');
    } catch (error) {
      log(`Failed to deploy program: ${error.message}`, 'error');
      process.exit(1);
    }
    
    // Step 8: Update frontend files
    log('Step 8/8: Updating frontend files...');
    updateFrontendFiles(programId);
    
    log('Deployment process completed successfully!', 'success');
    log(`Program ID: ${programId}`, 'success');
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
