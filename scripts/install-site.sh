#!/bin/bash
set -e

echo "🔧 Installing site package dependencies..."

# Navigate to the site package
cd app/packages/site

# Install dependencies specifically for the site package
echo "📦 Installing dependencies for site package..."
pnpm install

# Verify ethers is installed
if [ -d "node_modules/ethers" ]; then
    echo "✅ ethers package found in site package"
else
    echo "❌ ethers package not found in site package"
    echo "📦 Installing ethers directly..."
    pnpm add ethers@^6.13.2
fi

echo "✅ Site package installation complete"
