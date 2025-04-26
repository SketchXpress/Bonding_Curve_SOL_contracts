#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');

// Path to the project files - starting with current directory as default
let PROJECT_ROOT = process.cwd();
let ANCHOR_TOML_PATH = path.join(PROJECT_ROOT, 'Anchor.toml');
let LIB_RS_PATH = path.join(PROJECT_ROOT, 'programs/bonding-curve-system/src/lib.rs');

// Seed phrase for keypair recovery
const SEED_PHRASE = "focus chuckle bullet elbow proud image kid isolate pen fly tray false";

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

// Expected public key for verification
const EXPECTED_PUBLIC_KEY = "HVupsJz2rFZB4BEN7FY1jcfvck4UZPTT8S4znnbGtjh9";
const WALLET_KEYPAIR_PATH = "/home/ubuntu/.config/solana/id.json";

// Configuration
const COMMAND_TIMEOUT = 300000; // 5 minutes timeout for commands
const PROGRAM_NAME = "bonding_curve_system"; // Program name for anchor deploy command

// Program keypair configuration
const KEYPAIRS_DIR = path.join(PROJECT_ROOT, 'keypairs');
const PROGRAM_KEYPAIR_PATH = path.join(KEYPAIRS_DIR, `${PROGRAM_NAME}-keypair.json`);

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
  },
  {
    path: path.join(PROJECT_ROOT, 'nextjs-frontend/src/contexts/AnchorContextProvider.tsx'),
    pattern: /(const PROGRAM_ID = ['"])([^'"]+)(['"];)/,
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
log(`Program keypair path: ${PROGRAM_KEYPAIR_PATH}`);
log(`Wallet keypair path: ${WALLET_KEYPAIR_PATH}`);

// Helper function to safely execute shell commands with timeout
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

// Function to execute a command with interactive input
function execInteractiveCommand(command, inputs = []) {
  return new Promise((resolve, reject) => {
    log(`Executing interactive command: ${command}`);
    
    // Spawn the command as a child process
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    // Collect stdout
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text); // Show output to user
      
      // Check if we need to provide input
      for (const input of inputs) {
        if (text.includes(input.prompt)) {
          child.stdin.write(input.response + '\n');
          log(`Provided input: ${input.response}`, 'info');
        }
      }
    });
    
    // Collect stderr
    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text); // Show errors to user
    });
    
    // Handle process completion
    child.on('close', (code) => {
      if (code === 0) {
        log(`Command succeeded with exit code ${code}`, 'success');
        resolve({ success: true, output, code });
      } else {
        log(`Command failed with exit code ${code}`, 'error');
        resolve({ success: false, output, errorOutput, code });
      }
    });
    
    // Handle process errors
    child.on('error', (error) => {
      log(`Command error: ${error.message}`, 'error');
      reject(error);
    });
  });
}

// Function to recover wallet keypair from seed phrase
async function recoverWalletKeypair() {
  try {
    log('Recovering wallet keypair using hardcoded seed phrase...');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(WALLET_KEYPAIR_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Backup existing keypair if it exists
    if (fs.existsSync(WALLET_KEYPAIR_PATH)) {
      const backupPath = `${WALLET_KEYPAIR_PATH}.backup-${new Date().getTime()}`;
      fs.copyFileSync(WALLET_KEYPAIR_PATH, backupPath);
      log(`Backed up existing keypair to ${backupPath}`, 'success');
    }
    
    // Convert mnemonic to seed
    const seed = bip39.mnemonicToSeedSync(SEED_PHRASE, "");
    
    // Create keypair from seed
    const keypair = Keypair.fromSeed(seed.slice(0, 32));
    
    // Save keypair to file
    const secretKey = Array.from(keypair.secretKey);
    fs.writeFileSync(WALLET_KEYPAIR_PATH, JSON.stringify(secretKey), { mode: 0o600 });
    
    log(`Successfully recovered wallet keypair to ${WALLET_KEYPAIR_PATH}`, 'success');
    log(`Recovered wallet public key: ${keypair.publicKey.toString()}`, 'success');
    
    if (keypair.publicKey.toString() === EXPECTED_PUBLIC_KEY) {
      log('Public key matches expected value', 'success');
    } else {
      log(`Warning: Recovered public key ${keypair.publicKey.toString()} does not match expected public key ${EXPECTED_PUBLIC_KEY}`, 'warn');
    }
    
    return true;
  } catch (error) {
    log(`Failed to recover wallet keypair: ${error.message}`, 'error');
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

// Function to extract keypair from base58 string
function extractKeypairFromBase58(base58ProgramId) {
  try {
    log(`Attempting to extract keypair for program ID: ${base58ProgramId}...`);
    
    // First, check if we can get the keypair from solana
    const result = execCommand(`solana address -k ${PROGRAM_KEYPAIR_PATH} 2>/dev/null || echo "not_found"`);
    
    if (result.success && result.output !== "not_found" && result.output === base58ProgramId) {
      log(`Found matching program keypair at ${PROGRAM_KEYPAIR_PATH}`, 'success');
      return true;
    }
    
    log(`No matching keypair found at ${PROGRAM_KEYPAIR_PATH} or it doesn't match the program ID`, 'warn');
    log(`You need to provide the original keypair file for program ID: ${base58ProgramId}`, 'warn');
    log(`Please ensure the keypair file is at: ${PROGRAM_KEYPAIR_PATH}`, 'warn');
    
    return false;
  } catch (error) {
    log(`Failed to extract keypair: ${error.message}`, 'error');
    return false;
  }
}

// Function to create or get program keypair
function getOrCreateProgramKeypair() {
  try {
    log('Getting or creating program keypair...');
    
    // Create keypairs directory if it doesn't exist
    if (!fs.existsSync(KEYPAIRS_DIR)) {
      fs.mkdirSync(KEYPAIRS_DIR, { recursive: true });
      log(`Created keypairs directory at ${KEYPAIRS_DIR}`, 'success');
    }
    
    // First, try to get the program ID from Anchor.toml and lib.rs
    const anchorProgramId = getProgramIdFromAnchorToml();
    const libRsProgramId = getProgramIdFromLibRs();
    
    // If both exist and match, use that program ID
    if (anchorProgramId && libRsProgramId && anchorProgramId === libRsProgramId) {
      log(`Found matching program ID in both Anchor.toml and lib.rs: ${anchorProgramId}`, 'success');
      
      // Check if we have a keypair file for this program ID
      if (fs.existsSync(PROGRAM_KEYPAIR_PATH)) {
        // Verify the keypair matches the program ID
        const keypairResult = execCommand(`solana-keygen verify ${anchorProgramId} ${PROGRAM_KEYPAIR_PATH}`);
        if (keypairResult.success) {
          log(`Verified program keypair at ${PROGRAM_KEYPAIR_PATH} matches program ID ${anchorProgramId}`, 'success');
          
          // Read the keypair file
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using existing program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: anchorProgramId, isNew: false };
        } else {
          log(`Program keypair at ${PROGRAM_KEYPAIR_PATH} does not match program ID ${anchorProgramId}`, 'warn');
          log('This may cause deployment issues due to authority mismatch', 'warn');
          log('Attempting to extract keypair from program ID...', 'info');
          
          // Try to extract the keypair from the program ID
          if (extractKeypairFromBase58(anchorProgramId)) {
            // Read the keypair file after extraction
            const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
            const secretKey = Uint8Array.from(JSON.parse(keypairData));
            const keypair = Keypair.fromSecretKey(secretKey);
            
            log(`Using extracted program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
            return { keypair, programId: anchorProgramId, isNew: false };
          } else {
            log('Failed to extract keypair from program ID', 'error');
            log('Will generate a new keypair, but this will change the program ID', 'warn');
            log('This may cause issues with existing deployed programs', 'warn');
            
            // Generate a new keypair
            const keypair = Keypair.generate();
            const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
            fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
            
            log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
            log('WARNING: This will change your program ID and may break existing deployments', 'warn');
            
            return { keypair, programId: keypair.publicKey.toString(), isNew: true };
          }
        }
      } else {
        log(`Program keypair not found at ${PROGRAM_KEYPAIR_PATH}`, 'warn');
        log('Attempting to extract keypair from program ID...', 'info');
        
        // Try to extract the keypair from the program ID
        if (extractKeypairFromBase58(anchorProgramId)) {
          // Read the keypair file after extraction
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using extracted program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: anchorProgramId, isNew: false };
        } else {
          log('Failed to extract keypair from program ID', 'error');
          log('Will generate a new keypair, but this will change the program ID', 'warn');
          log('This may cause issues with existing deployed programs', 'warn');
          
          // Generate a new keypair
          const keypair = Keypair.generate();
          const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
          fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
          
          log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          log('WARNING: This will change your program ID and may break existing deployments', 'warn');
          
          return { keypair, programId: keypair.publicKey.toString(), isNew: true };
        }
      }
    } else {
      // Program IDs don't match or one is missing
      if (anchorProgramId && libRsProgramId) {
        log(`Program ID mismatch: Anchor.toml has ${anchorProgramId}, lib.rs has ${libRsProgramId}`, 'warn');
        log('Using program ID from Anchor.toml', 'info');
        
        // Try to extract the keypair from the program ID
        if (extractKeypairFromBase58(anchorProgramId)) {
          // Read the keypair file after extraction
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using extracted program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: anchorProgramId, isNew: false };
        } else {
          log('Failed to extract keypair from program ID', 'error');
          log('Will generate a new keypair, but this will change the program ID', 'warn');
          log('This may cause issues with existing deployed programs', 'warn');
          
          // Generate a new keypair
          const keypair = Keypair.generate();
          const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
          fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
          
          log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          log('WARNING: This will change your program ID and may break existing deployments', 'warn');
          
          return { keypair, programId: keypair.publicKey.toString(), isNew: true };
        }
      } else if (anchorProgramId) {
        log(`Program ID found only in Anchor.toml: ${anchorProgramId}`, 'warn');
        
        // Try to extract the keypair from the program ID
        if (extractKeypairFromBase58(anchorProgramId)) {
          // Read the keypair file after extraction
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using extracted program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: anchorProgramId, isNew: false };
        } else {
          log('Failed to extract keypair from program ID', 'error');
          log('Will generate a new keypair, but this will change the program ID', 'warn');
          log('This may cause issues with existing deployed programs', 'warn');
          
          // Generate a new keypair
          const keypair = Keypair.generate();
          const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
          fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
          
          log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          log('WARNING: This will change your program ID and may break existing deployments', 'warn');
          
          return { keypair, programId: keypair.publicKey.toString(), isNew: true };
        }
      } else if (libRsProgramId) {
        log(`Program ID found only in lib.rs: ${libRsProgramId}`, 'warn');
        
        // Try to extract the keypair from the program ID
        if (extractKeypairFromBase58(libRsProgramId)) {
          // Read the keypair file after extraction
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using extracted program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: libRsProgramId, isNew: false };
        } else {
          log('Failed to extract keypair from program ID', 'error');
          log('Will generate a new keypair, but this will change the program ID', 'warn');
          log('This may cause issues with existing deployed programs', 'warn');
          
          // Generate a new keypair
          const keypair = Keypair.generate();
          const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
          fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
          
          log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          log('WARNING: This will change your program ID and may break existing deployments', 'warn');
          
          return { keypair, programId: keypair.publicKey.toString(), isNew: true };
        }
      } else {
        log('No program ID found in Anchor.toml or lib.rs', 'warn');
        
        // Check if we have an existing keypair file
        if (fs.existsSync(PROGRAM_KEYPAIR_PATH)) {
          log(`Using existing program keypair at ${PROGRAM_KEYPAIR_PATH}`, 'info');
          
          // Read the keypair file
          const keypairData = fs.readFileSync(PROGRAM_KEYPAIR_PATH, 'utf8');
          const secretKey = Uint8Array.from(JSON.parse(keypairData));
          const keypair = Keypair.fromSecretKey(secretKey);
          
          log(`Using existing program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: keypair.publicKey.toString(), isNew: false };
        } else {
          log(`Program keypair not found at ${PROGRAM_KEYPAIR_PATH}`, 'warn');
          log('Generating new program keypair...', 'info');
          
          // Generate a new keypair
          const keypair = Keypair.generate();
          const keypairJson = JSON.stringify(Array.from(keypair.secretKey));
          fs.writeFileSync(PROGRAM_KEYPAIR_PATH, keypairJson, { mode: 0o600 });
          
          log(`Generated new program keypair with public key: ${keypair.publicKey.toString()}`, 'success');
          return { keypair, programId: keypair.publicKey.toString(), isNew: true };
        }
      }
    }
  } catch (error) {
    log(`Failed to get or create program keypair: ${error.message}`, 'error');
    throw error;
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
            
            // Also update the metadata address if it exists
            const updatedContent = newContent.replace(
              /"address": "([^"]+)"/,
              `"address": "${programId}"`
            );
            
            if (content !== updatedContent) {
              fs.writeFileSync(file.path, updatedContent);
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
        // For AnchorContextProvider.tsx
        else if (file.path.includes('AnchorContextProvider.tsx')) {
          const programIdRegex = /const PROGRAM_ID = ['"]([^'"]+)['"];/;
          if (programIdRegex.test(content)) {
            const newContent = content.replace(
              programIdRegex,
              `const PROGRAM_ID = '${programId}';`
            );
            
            if (content !== newContent) {
              fs.writeFileSync(file.path, newContent);
              log(`Updated program ID in ${file.path}`, 'success');
              updatedCount++;
            } else {
              log(`Program ID already up to date in ${file.path}`, 'info');
            }
          } else {
            log(`Could not find PROGRAM_ID constant in ${file.path}`, 'warn');
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
function setDefaultKeypair() {
  try {
    log(`Setting default keypair to ${WALLET_KEYPAIR_PATH}...`);
    const result = execCommand(`solana config set --keypair ${WALLET_KEYPAIR_PATH}`);
    if (result.success) {
      log('Successfully set default keypair', 'success');
      return true;
    } else {
      log(`Failed to set default keypair: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to set default keypair: ${error.message}`, 'error');
    return false;
  }
}

// Update Anchor.toml with program keypair configuration
function updateAnchorToml(programId) {
  try {
    log(`Updating Anchor.toml with program ID ${programId}...`);
    
    if (!fs.existsSync(ANCHOR_TOML_PATH)) {
      log(`Anchor.toml not found at ${ANCHOR_TOML_PATH}`, 'error');
      return false;
    }
    
    let anchorToml = fs.readFileSync(ANCHOR_TOML_PATH, 'utf8');
    
    // Ensure program ID section exists with proper format
    const programsDevnetSection = `[programs.devnet]\nbonding_curve_system = "${programId}"`;
    
    // Ensure workspace keypairs section exists
    const workspaceKeypairsSection = `[workspace.program-keypairs]\nbonding_curve_system = "${PROGRAM_KEYPAIR_PATH}"`;
    
    // Check if sections exist and update them
    if (anchorToml.includes('[programs.devnet]')) {
      anchorToml = anchorToml.replace(
        /(\[programs\.devnet\][^\[]*bonding_curve_system\s*=\s*)"([^"]+)"/,
        `$1"${programId}"`
      );
    } else {
      anchorToml += `\n${programsDevnetSection}\n`;
    }
    
    if (anchorToml.includes('[workspace.program-keypairs]')) {
      anchorToml = anchorToml.replace(
        /(\[workspace\.program-keypairs\][^\[]*bonding_curve_system\s*=\s*)"([^"]+)"/,
        `$1"${PROGRAM_KEYPAIR_PATH}"`
      );
    } else {
      anchorToml += `\n${workspaceKeypairsSection}\n`;
    }
    
    fs.writeFileSync(ANCHOR_TOML_PATH, anchorToml);
    log('Successfully updated Anchor.toml', 'success');
    return true;
  } catch (error) {
    log(`Failed to update Anchor.toml: ${error.message}`, 'error');
    return false;
  }
}

// Update lib.rs with program ID
function updateLibRs(programId) {
  try {
    log(`Updating lib.rs with program ID ${programId}...`);
    
    if (!fs.existsSync(LIB_RS_PATH)) {
      log(`lib.rs not found at ${LIB_RS_PATH}`, 'error');
      return false;
    }
    
    // Read the file content
    const libRs = fs.readFileSync(LIB_RS_PATH, 'utf8');
    
    // Define the regex pattern for the program ID
    const programIdRegex = /(declare_id!\(")([^"]+)("\);)/;
    
    // Check if the pattern exists in the file
    if (programIdRegex.test(libRs)) {
      // Get the current program ID
      const match = libRs.match(programIdRegex);
      const currentProgramId = match[2];
      
      // Log the current program ID for debugging
      log(`Current program ID in lib.rs: ${currentProgramId}`, 'info');
      log(`New program ID to set: ${programId}`, 'info');
      
      // Only update if the program ID is different
      if (currentProgramId !== programId) {
        // Create the new content with the updated program ID
        const newLibRs = libRs.replace(
          programIdRegex,
          `$1${programId}$3`
        );
        
        // Write the updated content back to the file
        fs.writeFileSync(LIB_RS_PATH, newLibRs);
        log('Updated program ID in lib.rs', 'success');
        
        // Verify the update
        const verifyContent = fs.readFileSync(LIB_RS_PATH, 'utf8');
        const verifyMatch = verifyContent.match(programIdRegex);
        if (verifyMatch && verifyMatch[2] === programId) {
          log('Verified program ID update in lib.rs', 'success');
        } else {
          log('Failed to verify program ID update in lib.rs', 'error');
        }
        
        return true;
      } else {
        log('Program ID already up to date in lib.rs', 'info');
        return true;
      }
    } else {
      log('Could not find declare_id! macro in lib.rs', 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to update lib.rs: ${error.message}`, 'error');
    return false;
  }
}

// Build the program
function buildProgram() {
  try {
    log('Building program...');
    const result = execCommand('anchor build', { cwd: PROJECT_ROOT });
    if (result.success) {
      log('Successfully built program', 'success');
      return true;
    } else {
      log(`Failed to build program: ${result.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to build program: ${error.message}`, 'error');
    return false;
  }
}

// Deploy the program
function deployProgram() {
  try {
    log('Deploying program...');
    const result = execCommand('anchor deploy', { cwd: PROJECT_ROOT });
    if (result.success) {
      log('Successfully deployed program', 'success');
      
      // Extract program ID from deployment output
      const programIdMatch = result.output.match(/Program Id: ([A-Za-z0-9]+)/);
      if (programIdMatch) {
        const deployedProgramId = programIdMatch[1];
        log(`Deployed program ID: ${deployedProgramId}`, 'success');
        return deployedProgramId;
      } else {
        log('Could not find program ID in deployment output', 'warn');
        return null;
      }
    } else {
      log(`Failed to deploy program: ${result.error}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Failed to deploy program: ${error.message}`, 'error');
    return null;
  }
}

// Build the frontend
function buildFrontend() {
  try {
    log('Building frontend...');
    const frontendDir = path.join(PROJECT_ROOT, 'nextjs-frontend');
    
    if (!fs.existsSync(frontendDir)) {
      log(`Frontend directory not found at ${frontendDir}`, 'error');
      return false;
    }
    
    // Install dependencies if needed
    if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
      log('Installing frontend dependencies...', 'info');
      const installResult = execCommand('npm install', { cwd: frontendDir });
      if (!installResult.success) {
        log(`Failed to install frontend dependencies: ${installResult.error}`, 'error');
        return false;
      }
    }
    
    // Build the frontend
    const buildResult = execCommand('npm run build', { cwd: frontendDir });
    if (buildResult.success) {
      log('Successfully built frontend', 'success');
      return true;
    } else {
      log(`Failed to build frontend: ${buildResult.error}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Failed to build frontend: ${error.message}`, 'error');
    return false;
  }
}

// Restart the frontend server
function restartFrontendServer() {
  try {
    log('Restarting frontend server...');
    const frontendDir = path.join(PROJECT_ROOT, 'nextjs-frontend');
    
    // Check if we're in a Docker container
    const isInDocker = fs.existsSync('/.dockerenv');
    log(`Running in Docker: ${isInDocker}`, 'info');
    
    // Kill any existing Next.js processes
    try {
      log('Killing existing Next.js processes...', 'info');
      execCommand('pkill -f "node.*next"');
    } catch (error) {
      // Ignore errors, as there might not be any processes to kill
      log('No existing Next.js processes found or failed to kill them', 'info');
    }
    
    // Start the frontend server
    log('Starting frontend server...', 'info');
    
    if (isInDocker) {
      // In Docker, use nohup to keep the process running after the script exits
      const startCommand = `cd ${frontendDir} && nohup npm run dev > /app/frontend.log 2>&1 &`;
      const startResult = execCommand(startCommand);
      
      if (startResult.success) {
        log('Successfully started frontend server in Docker container', 'success');
        log('Frontend logs will be available at /app/frontend.log', 'info');
        return true;
      } else {
        log(`Failed to start frontend server: ${startResult.error}`, 'error');
        return false;
      }
    } else {
      // Outside Docker, use spawn to start the process in the background
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const child = spawn(npm, ['run', 'dev'], {
        cwd: frontendDir,
        detached: true,
        stdio: 'ignore'
      });
      
      // Unref the child process so it can run independently
      child.unref();
      
      log('Successfully started frontend server', 'success');
      return true;
    }
  } catch (error) {
    log(`Failed to restart frontend server: ${error.message}`, 'error');
    return false;
  }
}

// Main function
async function main() {
  try {
    log('Starting deployment process...', 'info');
    
    // Check environment
    if (!checkEnvironment()) {
      log('Environment check failed', 'error');
      process.exit(1);
    }
    
    // Recover wallet keypair from seed phrase
    if (!await recoverWalletKeypair()) {
      log('Failed to recover wallet keypair', 'error');
      process.exit(1);
    }
    
    // Set default keypair
    if (!setDefaultKeypair()) {
      log('Failed to set default keypair', 'error');
      process.exit(1);
    }
    
    // Check wallet balance
    if (!checkWalletBalance()) {
      log('Failed to check wallet balance', 'error');
      process.exit(1);
    }
    
    // Get or create program keypair
    const { keypair, programId, isNew } = getOrCreateProgramKeypair();
    log(`Using program ID: ${programId}`, 'success');
    
    // Update Anchor.toml with program ID and keypair configuration
    if (!updateAnchorToml(programId)) {
      log('Failed to update Anchor.toml', 'error');
      process.exit(1);
    }
    
    // Update lib.rs with program ID
    if (!updateLibRs(programId)) {
      log('Failed to update lib.rs', 'error');
      process.exit(1);
    }
    
    // Update frontend files with program ID
    if (!updateFrontendFiles(programId)) {
      log('Failed to update frontend files', 'error');
      process.exit(1);
    }
    
    // Build the program
    if (!buildProgram()) {
      log('Failed to build program', 'error');
      process.exit(1);
    }
    
    // Deploy the program
    const deployedProgramId = deployProgram();
    if (!deployedProgramId) {
      log('Failed to deploy program', 'error');
      process.exit(1);
    }
    
    // Verify deployed program ID matches expected program ID
    if (deployedProgramId !== programId) {
      log(`Warning: Deployed program ID ${deployedProgramId} does not match expected program ID ${programId}`, 'warn');
      
      // Update files with the deployed program ID
      log(`Updating files with deployed program ID ${deployedProgramId}...`, 'info');
      
      if (!updateAnchorToml(deployedProgramId)) {
        log('Failed to update Anchor.toml with deployed program ID', 'error');
      }
      
      if (!updateLibRs(deployedProgramId)) {
        log('Failed to update lib.rs with deployed program ID', 'error');
      }
      
      if (!updateFrontendFiles(deployedProgramId)) {
        log('Failed to update frontend files with deployed program ID', 'error');
      }
    }
    
    // Build the frontend
    if (!buildFrontend()) {
      log('Failed to build frontend', 'error');
      process.exit(1);
    }
    
    // Restart the frontend server
    if (!restartFrontendServer()) {
      log('Failed to restart frontend server', 'error');
      process.exit(1);
    }
    
    log('Deployment process completed successfully!', 'success');
    log(`Program ID: ${deployedProgramId || programId}`, 'success');
    log('Frontend server has been restarted', 'success');
    
    // Close the log stream
    logStream.end();
  } catch (error) {
    log(`Deployment process failed: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    
    // Close the log stream
    logStream.end();
    
    process.exit(1);
  }
}

// Run the main function
main();
