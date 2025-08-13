FROM ubuntu:22.04
# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
# Set up environment variables
ENV PATH="/root/.cargo/bin:/root/.local/share/solana/install/active_release/bin:${PATH}"
ENV RUST_VERSION=1.82.0
ENV SOLANA_VERSION=1.18.17
ENV ANCHOR_VERSION=0.29.0
ENV NODE_VERSION=22.x
# Set Docker environment flag
ENV DOCKER_ENVIRONMENT=true
# Set default wallet paths for both users
ENV ANCHOR_WALLET=/root/.config/solana/id.json

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
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain nightly \
    && . $HOME/.cargo/env \
    && rustup component add rustfmt clippy \
    && rustup default nightly

# Install Solana CLI
RUN rm -rf /root/.local/share/solana/install && \
    mkdir -p /root/.local/share/solana/install/releases/${SOLANA_VERSION}/solana-release \
    && cd /root/.local/share/solana/install/releases/${SOLANA_VERSION} \
    && wget --no-check-certificate https://github.com/solana-labs/solana/releases/download/v${SOLANA_VERSION}/solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
    && tar -xjf solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
    && rm solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
    && rm -rf /root/.local/share/solana/install/active_release \
    && ln -s /root/.local/share/solana/install/releases/${SOLANA_VERSION}/solana-release /root/.local/share/solana/install/active_release \
    && export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Pre-install platform-tools to avoid build-time conflicts
RUN /root/.local/share/solana/install/active_release/bin/cargo-build-sbf --version \
    && /root/.local/share/solana/install/active_release/bin/cargo-build-sbf --force-tools-install --manifest-path=/dev/null 2>/dev/null || true


# Install Anchor Framework
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v${ANCHOR_VERSION} anchor-cli --force \
    && anchor --version

# Create working directory
WORKDIR /app

# Copy project files
COPY . .

# Make scripts executable
RUN chmod +x scripts/anchor_cli_demo.sh scripts/test_cli.sh scripts/test_detailed.sh scripts/verify_contract.sh scripts/setup-wallet.sh

# Set up Solana config for devnet (both root and ubuntu users)
RUN mkdir -p /root/.config/solana \
    && mkdir -p /home/ubuntu/.config/solana \
    && solana-keygen new --no-bip39-passphrase -o /root/.config/solana/id.json --force \
    && cp /root/.config/solana/id.json /home/ubuntu/.config/solana/id.json \
    && solana config set --url devnet \
    && echo 'export ANCHOR_WALLET=/root/.config/solana/id.json' >> /root/.bashrc \
    && echo 'export ANCHOR_WALLET=/home/ubuntu/.config/solana/id.json' >> /home/ubuntu/.bashrc 2>/dev/null || true \
    && chown -R 1000:1000 /home/ubuntu/.config 2>/dev/null || true

# Pre-build the Anchor project to ensure platform-tools are properly installed
RUN anchor build || echo "Initial build may fail, but platform-tools should be installed"

# Build and setup NextJS frontend
WORKDIR /app/nextjs-frontend

# Install dependencies with proper environment for native modules
COPY nextjs-frontend/package*.json ./
COPY nextjs-frontend/yarn.lock ./
RUN yarn install --ignore-engines

# Add and run rebuild script for native modules
COPY nextjs-frontend/rebuild-native-modules.sh ./
RUN chmod +x ./rebuild-native-modules.sh && \
    # Convert potential CRLF to LF
    sed -i 's/\r$//' ./rebuild-native-modules.sh && \
    # Run the rebuild script
    bash ./rebuild-native-modules.sh

# Copy the fix script and run it to ensure 'use client' is at the top of files
COPY fix-use-client.sh ./
RUN chmod +x ./fix-use-client.sh && \
    sed -i 's/\r$//' ./fix-use-client.sh && \
    bash ./fix-use-client.sh

# Build the Next.js application
RUN yarn build

# Expose ports (NextJS typically uses 3000)
EXPOSE 8080 3000

# Default command to run NextJS and provide helpful information
CMD ["bash", "-c", "cd /app && ./scripts/setup-wallet.sh && echo 'NextJS frontend available at http://localhost:3000' && echo 'Solana Bonding Curve Development Environment' && echo 'Available commands:' && echo '  - anchor build: Build the program' && echo '  - anchor test: Run tests' && echo '  - anchor deploy: Deploy to devnet' && echo '  - solana airdrop 2: Get SOL for testing' && echo '  - ./scripts/setup-wallet.sh: Setup wallet for current user' && echo 'Starting Next.js frontend...' && cd /app/nextjs-frontend && yarn start"]
