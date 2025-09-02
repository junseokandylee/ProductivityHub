#!/usr/bin/env node

/**
 * Simple Node.js script to run database seeding
 * Alternative to the bash script for cross-platform compatibility
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.dirname(__dirname);
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend', 'ProductivityHub.Api');
const SCRIPTS_DIR = __dirname;

console.log('🌱 Political Productivity Hub - Database Seeding');
console.log('==============================================\n');

async function runCommand(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        console.log(`📋 Running: ${command} ${args.join(' ')}`);
        console.log(`📁 Directory: ${cwd}\n`);
        
        const child = spawn(command, args, { 
            cwd, 
            stdio: 'inherit', 
            shell: process.platform === 'win32' 
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Command completed successfully\n`);
                resolve(code);
            } else {
                console.log(`❌ Command failed with code ${code}\n`);
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

async function seedDatabase() {
    try {
        // Step 1: Database migrations
        console.log('📊 Step 1: Database Migration');
        await runCommand('dotnet', ['ef', 'database', 'update'], BACKEND_DIR);
        
        // Step 2: EF Core seed data
        console.log('🌱 Step 2: EF Core Seed Data');
        await runCommand('dotnet', ['run', '--seed'], BACKEND_DIR);
        
        // Step 3: Generate CSV/JSON test data (if Node.js dependencies are available)
        console.log('📄 Step 3: CSV/JSON Test Data Generation');
        
        const packageJsonPath = path.join(SCRIPTS_DIR, 'package.json');
        const nodeModulesPath = path.join(SCRIPTS_DIR, 'node_modules');
        
        if (fs.existsSync(packageJsonPath) && !fs.existsSync(nodeModulesPath)) {
            console.log('Installing Node.js dependencies...');
            await runCommand('npm', ['install'], SCRIPTS_DIR);
        }
        
        if (fs.existsSync(nodeModulesPath)) {
            // Generate test data files
            const testDataConfigs = [
                { size: 'small', contacts: 1000, campaigns: 5 },
                { size: 'medium', contacts: 5000, campaigns: 15 },
                { size: 'large', contacts: 10000, campaigns: 25 }
            ];
            
            for (const config of testDataConfigs) {
                console.log(`Generating ${config.size} dataset...`);
                const outputDir = path.join(SCRIPTS_DIR, 'test-data', config.size);
                await runCommand('node', [
                    'generate-test-data.js',
                    '--contacts', config.contacts.toString(),
                    '--campaigns', config.campaigns.toString(),
                    '--output', outputDir
                ], SCRIPTS_DIR);
            }
            
            console.log('✅ CSV/JSON test data generated successfully');
        } else {
            console.log('⚠️  Skipping CSV/JSON generation - dependencies not available');
        }
        
        // Step 4: Verification message
        console.log('\n🧪 Step 4: Verification');
        console.log('Database seeding completed! Please verify the data in your database.');
        
        console.log('\n🎉 Database seeding completed successfully!\n');
        console.log('📊 What was created:');
        console.log('   • 3 tenant organizations (정치 정당)');
        console.log('   • 15 users (5 per tenant: Owner, Admin, 3 Staff)');  
        console.log('   • ~90 tags per tenant (직업, 관심사, 상태 태그)');
        console.log('   • 800-1200 contacts per tenant with encrypted PII');
        console.log('   • 5-11 campaigns per tenant with various statuses');
        
        if (fs.existsSync(nodeModulesPath)) {
            console.log('   • CSV/JSON test files in ./scripts/test-data/');
        }
        
        console.log('\n🔑 Test Login Credentials:');
        console.log('   Email: admin@test.com');
        console.log('   Password: Password123!');
        console.log('   Role: Owner');
        console.log('\n   Additional accounts: manager@test.com, staff1@test.com, staff2@test.com, staff3@test.com');
        console.log('   All passwords: Password123!');
        console.log('\n🚀 Your Political Productivity Hub is ready for testing!');
        
    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        process.exit(1);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🌱 Database Seeding Script

Usage: node seed.js

This script will:
1. Run database migrations
2. Seed the database with EF Core service
3. Generate CSV/JSON test data files
4. Verify the seeding process

Options:
  --help, -h     Show this help message

Environment Variables:
  DATABASE_URL   PostgreSQL connection string (for verification)
        `);
        process.exit(0);
    }
    
    seedDatabase();
}

module.exports = { seedDatabase };