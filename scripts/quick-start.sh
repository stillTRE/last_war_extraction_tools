#!/bin/bash

# Quick Start Script for Last War Screenshot Extractor
# This script helps you get up and running quickly

set -e

echo "Last War Screenshot Extractor - Quick Start"
echo "============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18.0.0 or higher."
    exit 1
fi

echo "Node.js $NODE_VERSION detected"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo "Dependencies installed"
else
    echo "Dependencies already installed"
fi

# Ask for API key
echo ""
echo "AI Provider Configuration"
echo "========================="
echo "You need an API key from OpenAI or Anthropic to use this tool."
echo ""

# Choose provider
echo "Available providers:"
echo "  1. OpenAI (GPT-4 Vision, recommended for accuracy)"
echo "  2. Anthropic (Claude 3)"
echo ""

read -p "Choose provider (1-2) [default: 1]: " -r
echo ""

case $REPLY in
    2)
        PROVIDER="anthropic"
        MODEL="claude-3-opus-20240229"
        ;;
    *)
        PROVIDER="openai"
        MODEL="gpt-4-vision-preview"
        ;;
esac

read -p "Enter your API key for $PROVIDER: " API_KEY
echo ""

# Check if sample directory structure exists
if [ ! -d "screenshots" ]; then
    echo "Creating sample directory structure..."
    ./scripts/create-sample-structure.sh
else
    echo "Screenshots directory already exists"
fi

echo ""
echo "Quick Start Complete!"
echo "======================="
echo ""
echo "Your configuration:"
echo "  Provider: $PROVIDER"
echo "  Model: $MODEL"
echo ""
echo "Next steps:"
echo "1. Add your Last War screenshots to the screenshots/week1 directory"
echo "   - Organize by day (Monday/, Tuesday/, etc.)"
echo "   - Include Weekly/ folder for final rankings"
echo ""
echo "2. Run the extraction with your API key:"
echo "   npm run extract -- screenshots/week1 --provider $PROVIDER --apiKey $API_KEY"
echo ""
echo "3. Check your results in the output/ directory"
echo ""
echo "Need help? Check the README.simple.md file for detailed instructions."
echo ""
echo "Happy ranking! 🏆"
