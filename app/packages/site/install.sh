#!/bin/bash
set -e

echo "🚀 Installing dependencies for FHE DCA Bot site..."

# Clean any existing installation
echo "🧹 Cleaning existing installation..."
rm -rf node_modules
rm -f pnpm-lock.yaml

# Install all dependencies (including devDependencies)
echo "📦 Installing all dependencies..."
pnpm install --prod=false

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."

# Check ethers specifically
if [ -d "node_modules/ethers" ]; then
    echo "✅ ethers package found"
    echo "📋 ethers version: $(node -p "require('./node_modules/ethers/package.json').version")"
else
    echo "❌ ethers package missing - installing directly..."
    pnpm add ethers@^6.15.0 --prod=false
fi

# Check other critical packages
for pkg in "next" "react" "react-dom"; do
    if [ -d "node_modules/$pkg" ]; then
        echo "✅ $pkg package found"
    else
        echo "❌ $pkg package missing"
        exit 1
    fi
done

# List installed packages for debugging
echo "📋 Installed packages:"
ls -la node_modules/ | head -10

echo "✅ Installation complete!"
