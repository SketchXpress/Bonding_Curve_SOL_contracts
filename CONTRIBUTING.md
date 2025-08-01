# Contributing to SketchXpress Bonding Curve System

Thank you for your interest in contributing to the SketchXpress Bonding Curve System! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** for frontend development
- **Rust 1.70+** for smart contract development
- **Solana CLI 1.18+** for blockchain interactions
- **Anchor Framework 0.29+** for contract development
- **Git** for version control

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/Bonding_Curve_SOL_contracts.git
   cd Bonding_Curve_SOL_contracts
   ```

2. **Install dependencies**
   ```bash
   # Install contract dependencies
   anchor build
   
   # Install frontend dependencies
   cd nextjs-frontend
   npm install
   ```

3. **Set up local environment**
   ```bash
   # Configure Solana CLI for devnet
   solana config set --url devnet
   
   # Generate a new keypair if needed
   solana-keygen new
   ```

## 📋 Development Workflow

### Branch Naming Convention

- **Feature branches**: `feature/description-of-feature`
- **Bug fixes**: `fix/description-of-bug`
- **Documentation**: `docs/description-of-update`
- **Performance**: `perf/description-of-optimization`

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(contract): add dynamic bidding system
fix(frontend): resolve wallet connection issue
docs(readme): update installation instructions
```

## 🧪 Testing Guidelines

### Smart Contract Testing

```bash
# Run all contract tests
anchor test

# Run specific test file
anchor test tests/bonding-curve-system.ts

# Run tests with detailed output
anchor test --verbose
```

**Test Requirements:**
- All new features must include comprehensive tests
- Tests should cover both success and failure cases
- Mock external dependencies appropriately
- Aim for >90% code coverage

### Frontend Testing

```bash
cd nextjs-frontend

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Testing Standards:**
- Component tests for all UI components
- Hook tests for custom React hooks
- Integration tests for critical user flows
- End-to-end tests for major features

## 🎨 Code Style Guidelines

### Rust (Smart Contracts)

- Follow [Rust style guidelines](https://doc.rust-lang.org/1.0.0/style/)
- Use `cargo fmt` for formatting
- Address all `cargo clippy` warnings
- Add comprehensive documentation with `///` comments

```rust
/// Creates a new bonding curve pool for an NFT collection
/// 
/// # Arguments
/// * `ctx` - The transaction context
/// * `args` - Pool creation parameters
/// 
/// # Returns
/// * `Result<()>` - Success or error result
pub fn create_pool(ctx: Context<CreatePool>, args: CreatePoolArgs) -> Result<()> {
    // Implementation
}
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for code formatting
- Prefer functional components with hooks

```typescript
interface MintNftProps {
  collectionMint: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
}

export const MintNftCard: React.FC<MintNftProps> = ({
  collectionMint,
  onSuccess,
  onError
}) => {
  // Component implementation
};
```

## 🔐 Security Guidelines

### Smart Contract Security

- **Never use `unwrap()`** - Always handle errors gracefully
- **Validate all inputs** - Check account ownership and data integrity
- **Use checked arithmetic** - Prevent integer overflow/underflow
- **Implement access controls** - Verify caller permissions

```rust
// ✅ Good: Proper error handling
let pool = ctx.accounts.pool.load()?;
let new_supply = pool.current_supply.checked_add(1)
    .ok_or(ErrorCode::MathOverflow)?;

// ❌ Bad: Using unwrap
let pool = ctx.accounts.pool.load().unwrap();
let new_supply = pool.current_supply + 1;
```

### Frontend Security

- **Validate all user inputs** - Sanitize and validate before processing
- **Handle wallet disconnection** - Graceful error handling
- **Secure key management** - Never expose private keys
- **Rate limiting** - Prevent spam transactions

## 📦 Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run all tests**
   ```bash
   # Contract tests
   anchor test
   
   # Frontend tests
   cd nextjs-frontend && npm run test
   ```

3. **Check code quality**
   ```bash
   # Rust formatting and linting
   cargo fmt --check
   cargo clippy -- -D warnings
   
   # TypeScript linting
   cd nextjs-frontend && npm run lint
   ```

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Testing verification** on testnet if applicable
4. **Documentation review** for user-facing changes

## 🐛 Bug Reports

### Before Reporting

- Search existing issues to avoid duplicates
- Test on the latest version
- Gather relevant information (logs, screenshots, etc.)

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 91]
- Wallet: [e.g., Phantom 1.0]
- Version: [e.g., 1.0.0]
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the desired feature.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Your proposed solution to the problem.

**Alternatives Considered**
Alternative solutions you've considered.

**Additional Context**
Any other context or screenshots.
```

## 📚 Documentation Standards

### Code Documentation

- **Functions**: Document purpose, parameters, return values, and examples
- **Types**: Document struct fields and their purposes
- **Modules**: Provide overview and usage examples

### User Documentation

- **Clear instructions** with step-by-step guides
- **Screenshots** for UI-related documentation
- **Code examples** for developer resources
- **Troubleshooting** sections for common issues

## 🏆 Recognition

Contributors are recognized in several ways:

- **Contributors section** in README
- **Release notes** mention significant contributions
- **Discord role** for active contributors
- **Beta access** to new features

## 📞 Getting Help

### Development Support

- **Discord**: Join our development channel
- **GitHub Discussions**: For design discussions
- **Issues**: For specific bugs or feature requests

### Mentorship Program

New contributors can request mentorship for:
- Smart contract development
- Frontend development
- Testing strategies
- Code review process

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to SketchXpress! Together, we're building the future of NFT marketplaces on Solana. 🚀
