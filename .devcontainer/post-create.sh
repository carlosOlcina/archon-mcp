#!/usr/bin/env bash
set -euo pipefail

echo "============================================="
echo " Configuring Archon MCP Development Environment"
echo "============================================="

echo "[1/3] Installing Node.js workspace dependencies with pnpm..."
pnpm install

echo "[2/3] Verifying Rust toolchain..."
rustc --version
cargo --version
cargo clippy --version
rustfmt --version

echo "[3/3] Precompiling Rust workspace metadata..."
cargo check

echo "============================================="
echo " Archon MCP DevContainer ready for development!"
echo "============================================="
