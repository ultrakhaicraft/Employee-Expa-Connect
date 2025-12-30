#!/usr/bin/env node

/**
 * Script to create .env file from example
 * Usage: node create-env.js
 */

const fs = require('fs');
const path = require('path');

const envContent = `# API Configuration
VITE_API_BASE_URL=https://localhost:7002
VITE_API_TIMEOUT=30000

# TrackAsia Maps Configuration
VITE_TRACKASIA_API_KEY=******
VITE_TRACKASIA_BASE_URL=https://maps.track-asia.com

# Gemini AI Configuration (Optional)
VITE_GEMINI_API_KEY=******

# Environment
VITE_APP_ENV=development

# Feature Flags
VITE_ENABLE_ENHANCED_AI=true
VITE_ENABLE_REAL_TIME_UPDATES=true
VITE_ENABLE_ANALYTICS=false

# App Configuration
VITE_APP_NAME=BEESRS
VITE_APP_VERSION=1.0.0
`;

const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('📍 Location:', envPath);
  console.log('');
  console.log('Options:');
  console.log('1. Delete the existing .env and run this script again');
  console.log('2. Manually update your .env file');
  console.log('3. Rename existing .env to .env.backup and run this script again');
  process.exit(0);
}

// Create .env file
try {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env file created successfully!');
  console.log('📍 Location:', envPath);
  console.log('');
  console.log('🔑 Configuration:');
  console.log('  - Backend API: https://localhost:7002');
  console.log('  - TrackAsia: Configured ✓');
  console.log('  - Gemini AI: Configured ✓');
  console.log('');
  console.log('📚 Next steps:');
  console.log('  1. Review your .env file');
  console.log('  2. Update VITE_API_BASE_URL if backend runs on different port');
  console.log('  3. Run: npm run dev');
  console.log('');
  console.log('📖 For more info, see: ENV_SETUP_GUIDE.md');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.log('');
  console.log('💡 Manual setup:');
  console.log('  1. Create a file named ".env" in this directory');
  console.log('  2. Copy content from env.config.example.txt');
  console.log('  3. Or refer to ENV_SETUP_GUIDE.md');
  process.exit(1);
}











































































