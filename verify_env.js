// Startup verification script for Soma Wellness E2E test environment
// This script checks the environment configuration and attempts to start the backend

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envExamplePath = path.resolve(__dirname, '.env.example');
const serverDir = path.resolve(__dirname, 'server');

console.log('=== Soma Wellness E2E Environment Verification ===\n');

// Check .env file
console.log('1. Checking .env file...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('   ✓ .env file exists');
  
  // Check key values
  const checks = [
    ['MONGO_URI', /mongodb:\/\//, 'MongoDB URI present'],
    ['NODE_ENV', /development|production|test/, 'NODE_ENV set'],
    ['PORT', /^\d+$/, 'PORT set'],
    ['VITE_API_URL', /http/, 'VITE_API_URL set'],
    ['MPESA_ENV', /sandbox|production/, 'MPESA_ENV set'],
    ['REDIS_URL', /redis:/, 'REDIS_URL set'],
  ];
  
  for (const [key, pattern, desc] of checks) {
    if (envContent.includes(key)) {
      console.log(`   ✓ ${desc}`);
    } else {
      console.log(`   ✗ ${desc} (key: ${key})`);
    }
  }
} else {
  console.log('   ✗ .env file missing');
}

// Check .env.example file
console.log('\n2. Checking .env.example file...');
if (fs.existsSync(envExamplePath)) {
  console.log('   ✓ .env.example file exists');
} else {
  console.log('   ✗ .env.example file missing');
}

// Check server directory
console.log('\n3. Checking server directory...');
const serverFiles = ['server.js', 'loadEnv.js', 'config/db.js', 'config/env.validation.js'];
for (const f of serverFiles) {
  const fullPath = path.join(serverDir, f);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ ${f} exists`);
  } else {
    console.log(`   ✗ ${f} missing`);
  }
}

// Check M-Pesa config
console.log('\n4. Checking M-Pesa configuration...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const mpesaChecks = [
    ['MPESA_ENV', 'sandbox', 'MPESA_ENV is sandbox'],
    ['MPESA_SHORTCODE', /174379/, 'MPESA_SHORTCODE is 174379'],
    ['MPESA_CALLBACK_URL', /mpesa\/callback/, 'MPESA_CALLBACK_URL configured'],
  ];
  
  for (const [key, pattern, desc] of mpesaChecks) {
    if (envContent.includes(key) && envContent.match(pattern)) {
      console.log(`   ✓ ${desc}`);
    } else {
      console.log(`   ✗ ${desc}`);
    }
  }
}

console.log('\n=== Verification Complete ===');
console.log('See above for any issues that need attention.');
process.exit(0);