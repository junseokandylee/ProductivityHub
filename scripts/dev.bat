@echo off
REM Development script for Windows

echo 🚀 Starting Political Productivity Hub Development Environment

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if .NET is installed
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ .NET is not installed. Please install .NET 9 first.
    exit /b 1
)

REM Check if environment file exists
if not exist .env (
    if exist .env.example (
        echo 📋 Creating .env file from .env.example
        copy .env.example .env
        echo ⚠️  Please update the .env file with your actual configuration values.
    ) else (
        echo ❌ No .env or .env.example file found. Please create one.
        exit /b 1
    )
)

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm run install:all
) else if not exist frontend\node_modules (
    echo 📦 Installing dependencies...
    npm run install:all
)

REM Start development servers
echo 🔧 Starting development servers...
npm run dev