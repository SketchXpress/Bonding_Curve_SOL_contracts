# Scripts Directory

This directory contains utility scripts for development, testing, and deployment of the SketchXpress Bonding Curve System.

## 📁 Script Categories

### 🔧 Setup Scripts

#### `setup-wallet.sh`
Sets up a new Solana wallet for development.

```bash
# Create new wallet and fund with devnet SOL
./scripts/setup-wallet.sh
```

**Features:**
- Generates new keypair
- Configures Solana CLI for devnet
- Requests airdrop for testing

### 🏗️ Build & Deploy Scripts

#### `anchor_cli_demo.sh`
Demonstrates Anchor CLI commands for development workflow.

```bash
# Show Anchor development workflow
./scripts/anchor_cli_demo.sh
```

**Includes:**
- Project initialization
- Building contracts
- Testing procedures
- Deployment commands

#### `verify_contract.sh`
Verifies deployed contract on Solana blockchain.

```bash
# Verify contract deployment
./scripts/verify_contract.sh <program_id>
```

**Verification Steps:**
- Checks program existence on blockchain
- Validates program authority
- Confirms IDL match

### 🧪 Testing Scripts

#### `test_cli.sh`
Runs comprehensive CLI-based tests.

```bash
# Execute all CLI tests
./scripts/test_cli.sh
```

**Test Coverage:**
- Contract deployment
- Instruction execution
- Error handling
- Performance benchmarks

#### `test_detailed.sh`
Detailed testing with verbose output and coverage reporting.

```bash
# Run detailed tests with coverage
./scripts/test_detailed.sh
```

**Features:**
- Detailed test output
- Code coverage reporting
- Performance metrics
- Error analysis

#### `test_comprehensive.js`
JavaScript-based comprehensive test suite.

```bash
# Run comprehensive JavaScript tests
node scripts/test_comprehensive.js
```

**Test Areas:**
- Smart contract interactions
- Frontend integration
- End-to-end workflows
- Error scenarios

#### `test_connection.js`
Tests Solana network connectivity and RPC endpoints.

```bash
# Test network connections
node scripts/test_connection.js
```

**Connection Tests:**
- RPC endpoint availability
- Network latency measurements
- Wallet connectivity
- Program accessibility

#### `test_contract.js`
Focused contract functionality testing.

```bash
# Test specific contract functions
node scripts/test_contract.js
```

**Contract Tests:**
- Instruction execution
- Account state management
- Error code validation
- Security checks

#### `test_minimal_mint.js`
Minimal NFT minting test for debugging.

```bash
# Test basic minting functionality
node scripts/test_minimal_mint.js
```

**Minimal Tests:**
- Basic minting workflow
- Account creation
- Transaction confirmation
- Error isolation

### 🐍 Python Utilities

#### `derive_pda.py`
Python utility for deriving Program Derived Addresses (PDAs).

```bash
# Derive PDA for given seeds
python scripts/derive_pda.py --seeds "pool" "collection_mint"
```

**Capabilities:**
- PDA derivation with custom seeds
- Bump seed calculation
- Address validation
- Batch PDA generation

**Usage Examples:**
```python
# Derive pool PDA
python derive_pda.py --program-id ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE --seeds pool collection_mint_address

# Derive escrow PDA
python derive_pda.py --program-id ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE --seeds escrow nft_mint_address
```

## 🚀 Usage Guide

### Development Workflow

1. **Initial Setup**
   ```bash
   # Set up development environment
   ./scripts/setup-wallet.sh
   ```

2. **Build and Test**
   ```bash
   # Run comprehensive tests
   ./scripts/test_detailed.sh
   ```

3. **Deploy and Verify**
   ```bash
   # Deploy to devnet
   anchor deploy
   
   # Verify deployment
   ./scripts/verify_contract.sh $PROGRAM_ID
   ```

### Testing Workflow

1. **Quick Tests**
   ```bash
   # Fast connectivity check
   node scripts/test_connection.js
   
   # Basic contract test
   node scripts/test_contract.js
   ```

2. **Comprehensive Testing**
   ```bash
   # Full test suite
   ./scripts/test_detailed.sh
   
   # End-to-end tests
   node scripts/test_comprehensive.js
   ```

3. **Debugging**
   ```bash
   # Minimal test for debugging
   node scripts/test_minimal_mint.js
   ```

### Utility Operations

1. **PDA Derivation**
   ```bash
   # Calculate required PDAs
   python scripts/derive_pda.py --help
   ```

2. **Contract Verification**
   ```bash
   # Verify program deployment
   ./scripts/verify_contract.sh ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE
   ```

## 🔧 Configuration

### Environment Variables

Scripts may use these environment variables:

```bash
# Solana Configuration
export SOLANA_URL="https://api.devnet.solana.com"
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="~/.config/solana/id.json"

# Program Configuration
export PROGRAM_ID="ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE"

# Testing Configuration
export TEST_TIMEOUT="60000"
export TEST_VERBOSE="true"
```

### Script Dependencies

Make sure these tools are installed:

- **Solana CLI** (1.18+)
- **Anchor CLI** (0.29+)
- **Node.js** (18+)
- **Python** (3.8+)
- **jq** (for JSON processing)

## 📊 Output Examples

### Successful Test Output

```bash
$ ./scripts/test_detailed.sh

🚀 Starting comprehensive test suite...

✅ Network connectivity: PASSED
✅ Wallet configuration: PASSED
✅ Contract deployment: PASSED
✅ Pool creation: PASSED
✅ NFT minting: PASSED
✅ Secondary trading: PASSED
✅ Bidding system: PASSED

📊 Test Summary:
- Total tests: 47
- Passed: 47
- Failed: 0
- Duration: 2m 15s
- Coverage: 94.2%
```

### PDA Derivation Output

```bash
$ python scripts/derive_pda.py --seeds pool collection_mint

📍 PDA Derivation Results:
Program ID: ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE
Seeds: ["pool", "collection_mint"]

✅ Derived PDA: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
✅ Bump Seed: 254
✅ Is on curve: false
```

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

2. **Missing Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Python dependencies
   pip install solana base58
   ```

3. **Network Issues**
   ```bash
   # Test network connectivity
   node scripts/test_connection.js
   ```

4. **Wallet Issues**
   ```bash
   # Reset wallet configuration
   ./scripts/setup-wallet.sh
   ```

### Debug Mode

Enable verbose output for debugging:

```bash
# Enable debug mode
export DEBUG=true

# Run tests with debug output
./scripts/test_detailed.sh
```

## 📝 Script Maintenance

### Adding New Scripts

1. **Create script file** in appropriate category
2. **Add executable permissions**
3. **Update this README**
4. **Add to CI/CD pipeline** if needed

### Best Practices

- **Use meaningful names** that describe the script's purpose
- **Include help text** with usage instructions
- **Handle errors gracefully** with appropriate exit codes
- **Log operations** for debugging and monitoring
- **Test thoroughly** before committing

---

For more information about specific scripts, check the inline documentation within each script file.
