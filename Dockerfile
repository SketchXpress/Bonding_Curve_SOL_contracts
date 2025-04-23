FROM ubuntu:22.04
# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
# Set up environment variables
ENV PATH="/root/.cargo/bin:/root/.local/share/solana/install/active_release/bin:${PATH}"
ENV RUST_VERSION=1.81.0
ENV SOLANA_VERSION=1.18.26
ENV ANCHOR_VERSION=0.29.0
ENV NODE_VERSION=20.x
# Set Docker environment flag
ENV DOCKER_ENVIRONMENT=true

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    git \
    python3 \
    python3-pip \
    wget \
    gnupg \
    ca-certificates \
    # Add these dependencies for node-gyp
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_VERSION} \
    && . $HOME/.cargo/env \
    && rustup component add rustfmt clippy

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v${SOLANA_VERSION}/install)" \
    && solana --version

# Install Anchor Framework
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v${ANCHOR_VERSION} anchor-cli --force \
    && anchor --version

# Create working directory
WORKDIR /app

# Copy project files
COPY . .

# Make scripts executable
RUN chmod +x anchor_cli_demo.sh test_cli.sh test_detailed.sh verify_contract.sh

# Set up Solana config for devnet
RUN mkdir -p /root/.config/solana \
    && solana-keygen new --no-bip39-passphrase -o /root/.config/solana/id.json --force \
    && solana config set --url devnet

# Build and setup NextJS frontend
WORKDIR /app/nextjs-frontend

# Install dependencies with proper environment for native modules
RUN npm install

# Add specific rebuild step for bigint-buffer
COPY nextjs-frontend/rebuild-native-modules.sh /app/nextjs-frontend/
RUN chmod +x /app/nextjs-frontend/rebuild-native-modules.sh
RUN /app/nextjs-frontend/rebuild-native-modules.sh

# Build the Next.js application
RUN npm run build

# Expose ports (NextJS typically uses 3000)
EXPOSE 8080 3000

# Default command to run NextJS and provide helpful information
CMD ["bash", "-c", "cd /app/nextjs-frontend && npm run start & echo 'NextJS frontend available at http://localhost:3000' && echo 'Solana Bonding Curve Development Environment' && echo 'Available commands:' && echo '  - anchor build: Build the program' && echo '  - anchor test: Run tests' && echo '  - anchor deploy: Deploy to devnet' && echo '  - solana airdrop 2: Get SOL for testing' && bash"]
