#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000; // 2 seconds
const MAX_BACKOFF_MS = 60000; // 1 minute
const JITTER_FACTOR = 0.2; // 20% random jitter to avoid thundering herd

// Frontend files to update with program ID
const FRONTEND_FILES = [
  {
    path: path.join(__dirname, 'simple-frontend/js/config/constants.js'),
    pattern: /(export const PROGRAM_ID = ['"])([^'"]+)(['"];)/,
    replacement: '$1$2$3'
  },
  {
    path: path.join(__dirname, 'nextjs-frontend/src/utils/idl.ts'),
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

// Check if Solana is installed and configured
function checkEnvironment() {
  log('Checking environment...');
  
  try {
    const solanaVersion = execSync('solana --version').toString().trim();
    log(`Solana CLI: ${solanaVersion}`);
    
    const anchorVersion = execSync('anchor --version').toString().trim();
    log(`Anchor: ${anchorVersion}`);
    
    const network = execSync('solana config get json_rpc_url').toString().trim();
    log(`Network: ${network.split('=')[1].trim()}`);
    
    const wallet = execSync('solana config get keypair').toString().trim();
    log(`Wallet: ${wallet.split('=')[1].trim()}`);
    
    const balance = execSync('solana balance').toString().trim();
    log(`Balance: ${balance}`);
    
    if (parseFloat(balance) < 1) {
      log('Warning: Low balance detected. Deployment may fail due to insufficient funds.', 'warn');
    }
    
    return true;
  } catch (error) {
    log(`Environment check failed: ${error.message}`, 'error');
    return false;
  }
}

// Check network conditions before deployment
async function checkNetworkConditions() {
  log('Checking network conditions...');
  
  try {
    // Get current transaction count as a proxy for network congestion
    const txCount = execSync('solana transaction-count').toString().trim();
    log(`Current transaction count: ${txCount}`);
    
    // Get recent performance samples
    const perfSamples = JSON.parse(execSync('solana performance').toString().trim());
    const avgTps = perfSamples.reduce((sum, sample) => sum + sample.numTransactions / sample.samplePeriodSecs, 0) / perfSamples.length;
    
    log(`Average TPS: ${avgTps.toFixed(2)}`);
    
    if (avgTps < 1000) {
      log('Network appears to be congested. Consider increasing priority fee.', 'warn');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`Network check failed: ${error.message}`, 'warn');
    // Continue anyway, this is just advisory
    return true;
  }
}

// Build the program
function buildProgram() {
  log('Building program...');
  
  try {
    execSync('anchor build', { stdio: 'inherit' });
    log('Build successful', 'success');
    return true;
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    return false;
  }
}

// Deploy with retry logic and exponential backoff
async function deployWithRetry() {
  log('Starting deployment with retry logic...');
  
  let attempt = 0;
  let success = false;
  
  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    log(`Deployment attempt ${attempt}/${MAX_RETRIES}...`);
    
    try {
      // Add --skip-build since we already built
      execSync('anchor deploy --skip-build', { stdio: 'inherit' });
      log(`Deployment successful on attempt ${attempt}!`, 'success');
      success = true;
    } catch (error) {
      const errorMessage = error.message;
      log(`Deployment attempt ${attempt} failed: ${errorMessage}`, 'error');
      
      if (attempt < MAX_RETRIES) {
        // Calculate backoff with jitter
        const backoff = Math.min(
          INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1),
          MAX_BACKOFF_MS
        );
        const jitter = backoff * JITTER_FACTOR * (Math.random() * 2 - 1);
        const totalBackoff = Math.floor(backoff + jitter);
        
        log(`Retrying in ${(totalBackoff / 1000).toFixed(1)} seconds...`, 'info');
        await new Promise(resolve => setTimeout(resolve, totalBackoff));
      }
    }
  }
  
  if (!success) {
    log('All deployment attempts failed.', 'error');
    return false;
  }
  
  return true;
}

// Verify deployment and get program ID
function verifyDeployment() {
  log('Verifying deployment...');
  
  try {
    // Read program ID from Anchor.toml
    const anchorToml = fs.readFileSync(path.join(__dirname, 'Anchor.toml'), 'utf8');
    const programIdMatch = anchorToml.match(/bonding_curve_system\s*=\s*"([^"]+)"/);
    
    if (!programIdMatch) {
      log('Could not find program ID in Anchor.toml', 'error');
      return { success: false, programId: null };
    }
    
    const programId = programIdMatch[1];
    log(`Program ID: ${programId}`);
    
    // Check if program exists on-chain
    const programInfo = execSync(`solana program show ${programId}`).toString().trim();
    log('Program successfully deployed and verified on-chain', 'success');
    log(`Program info: ${programInfo}`);
    
    return { success: true, programId };
  } catch (error) {
    log(`Verification failed: ${error.message}`, 'error');
    return { success: false, programId: null };
  }
}

// Update frontend files with the new program ID
function updateFrontendFiles(programId) {
  log('Updating frontend files with new program ID...');
  
  let updatedCount = 0;
  
  for (const file of FRONTEND_FILES) {
    try {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        
        // For simple-frontend/js/config/constants.js
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
        // For nextjs-frontend/src/utils/idl.ts - check if it has a PROGRAM_ID constant
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
  
  // Create or update a central program ID file that can be imported by any frontend
  const centralIdFile = path.join(__dirname, 'program-id.json');
  fs.writeFileSync(centralIdFile, JSON.stringify({ programId }, null, 2));
  log(`Created/updated central program ID file at ${centralIdFile}`, 'success');
  updatedCount++;
  
  log(`Updated ${updatedCount} frontend files with new program ID`, 'success');
  return updatedCount > 0;
}

// Main deployment function
async function main() {
  log(`${colors.bright}${colors.cyan}=== Bonding Curve SOL Contracts Deployment Script ===${colors.reset}`);
  log(`Log file: ${logFile}`);
  
  // Check environment
  if (!checkEnvironment()) {
    log('Environment check failed. Please fix the issues and try again.', 'error');
    process.exit(1);
  }
  
  // Check network conditions
  const networkOk = await checkNetworkConditions();
  if (!networkOk) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Network conditions are not optimal. Continue anyway? (y/n): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      log('Deployment aborted by user.', 'info');
      process.exit(0);
    }
  }
  
  // Build program
  if (!buildProgram()) {
    log('Build failed. Please fix the issues and try again.', 'error');
    process.exit(1);
  }
  
  // Deploy with retry
  const deploySuccess = await deployWithRetry();
  if (!deploySuccess) {
    log('Deployment failed after multiple attempts.', 'error');
    process.exit(1);
  }
  
  // Verify deployment and get program ID
  const { success, programId } = verifyDeployment();
  if (!success) {
    log('Deployment verification failed.', 'error');
    process.exit(1);
  }
  
  // Update frontend files with the new program ID
  const frontendUpdateSuccess = updateFrontendFiles(programId);
  if (frontendUpdateSuccess) {
    log('Frontend files successfully updated with new program ID', 'success');
  } else {
    log('No frontend files were updated. Please check the logs for details.', 'warn');
  }
  
  log(`${colors.bright}${colors.green}Deployment and frontend synchronization completed successfully!${colors.reset}`, 'success');
  log(`Program ID: ${colors.bright}${programId}${colors.reset}`);
  log(`Log file saved to: ${logFile}`);
}

// Run the main function
main().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
