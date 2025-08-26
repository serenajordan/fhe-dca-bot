#!/bin/bash
set -e

echo "🔧 Installing site package dependencies..."

# Navigate to the site package
cd app/packages/site

# Remove any existing node_modules to ensure clean install
echo "🧹 Cleaning existing node_modules..."
rm -rf node_modules
rm -f pnpm-lock.yaml

# Install dependencies specifically for the site package
echo "📦 Installing dependencies for site package..."
pnpm install

# Verify ethers is installed
if [ -d "node_modules/ethers" ]; then
    echo "✅ ethers package found in site package"
    ls -la node_modules/ethers
else
    echo "❌ ethers package not found in site package"
    echo "📦 Installing ethers directly..."
    pnpm add ethers@^6.13.2
fi

# Double-check all required dependencies
echo "🔍 Verifying all required dependencies..."
if [ -d "node_modules/next" ]; then
    echo "✅ next package found"
else
    echo "❌ next package missing"
fi

if [ -d "node_modules/react" ]; then
    echo "✅ react package found"
else
    echo "❌ react package missing"
fi

if [ -d "node_modules/react-dom" ]; then
    echo "✅ react-dom package found"
else
    echo "❌ react-dom package missing"
fi

echo "✅ Site package installation complete"
