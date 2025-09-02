#!/bin/bash

# Development script for Unix-like systems (Linux, macOS)
echo "🚀 Starting Political Productivity Hub Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET is not installed. Please install .NET 9 first."
    exit 1
fi

# Check if environment file exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📋 Creating .env file from .env.example"
        cp .env.example .env
        echo "⚠️  Please update the .env file with your actual configuration values."
    else
        echo "❌ No .env or .env.example file found. Please create one."
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Start development servers
echo "🔧 Starting development servers..."
npm run dev