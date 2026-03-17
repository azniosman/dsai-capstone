#!/usr/bin/env node
/**
 * JWT Token Generation Script for Production
 * 
 * Usage:
 *   node scripts/generate-jwt-secrets.js           # Generate new secrets
 *   node scripts/generate-jwt-secrets.js --save    # Generate and save to .env
 *   node scripts/generate-jwt-secrets.js --token   # Generate admin token (requires email)
 * 
 * Requirements:
 *   - Node.js 18+
 *   - No external dependencies (uses built-in crypto module)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  jwtSecretLength: 64,        // 64 chars = 256 bits of entropy
  refreshTokenSecretLength: 64,
  internalTokenLength: 64,
  tokenExpiry: {
    access: '24h',            // Access token validity
    refresh: '7d',            // Refresh token validity
  },
};

/**
 * Generate a cryptographically secure random string
 */
function generateSecret(length) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate JWT secrets
 */
function generateSecrets() {
  console.log('🔐 Generating JWT Secrets...\n');
  
  const secrets = {
    JWT_SECRET: generateSecret(CONFIG.jwtSecretLength),
    REFRESH_TOKEN_SECRET: generateSecret(CONFIG.refreshTokenSecretLength),
    INTERNAL_AUTOMATION_TOKEN: generateSecret(CONFIG.internalTokenLength),
  };
  
  console.log('Generated Secrets:');
  console.log('==================\n');
  
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}:`);
    console.log(`  ${value}`);
    console.log(`  Length: ${value.length} characters (${value.length * 4} bits)\n`);
  });
  
  return secrets;
}

/**
 * Save secrets to .env file
 */
function saveToEnv(secrets, envFile = '.env') {
  const envPath = path.join(process.cwd(), envFile);
  let envContent = '';
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  // Update or add secrets
  Object.entries(secrets).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`✓ Updated ${key} in ${envFile}`);
    } else {
      envContent += `\n${key}=${value}`;
      console.log(`✓ Added ${key} to ${envFile}`);
    }
  });
  
  // Write updated content
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`\n✓ Secrets saved to ${envFile}`);
  console.log('⚠️  IMPORTANT: Secure this file and never commit it to version control!\n');
}

/**
 * Generate JWT token (for testing/automation)
 */
function generateToken(email, secrets) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username: email,
    sub: '1',  // Admin user ID
    type: 'access',
    iat: now,
    exp: now + 86400,  // 24 hours
  };
  
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secrets.JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');
  
  return `${signatureInput}.${signature}`;
}

/**
 * Verify JWT token
 */
function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    
    // Verify signature
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf-8'));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
JWT Token Generation Script
===========================

Usage:
  node scripts/generate-jwt-secrets.js [options]

Options:
  --save, -s          Save generated secrets to .env file
  --token, -t         Generate admin access token (use with --email)
  --email, -e         Email for token generation (default: admin@skillbridge.com)
  --verify, -v        Verify a JWT token (use with --token-value)
  --token-value       Token value to verify
  --help, -h          Show this help message

Examples:
  # Generate new secrets
  node scripts/generate-jwt-secrets.js

  # Generate and save to .env
  node scripts/generate-jwt-secrets.js --save

  # Generate admin token
  node scripts/generate-jwt-secrets.js --token --email admin@skillbridge.com

  # Verify a token
  node scripts/generate-jwt-secrets.js --verify --token-value "eyJhbG..."

Security Notes:
  - Store secrets securely (AWS Secrets Manager, HashiCorp Vault, etc.)
  - Never commit secrets to version control
  - Rotate secrets regularly (recommended: every 90 days)
  - Use different secrets for each environment (dev, staging, prod)
`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  // Show help if no args or --help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }
  
  // Load existing secrets from .env if available
  const envPath = path.join(process.cwd(), '.env');
  let existingSecrets = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && key.includes('SECRET') || key.includes('TOKEN')) {
        existingSecrets[key.trim()] = value.trim();
      }
    });
  }
  
  // Generate secrets
  if (!args.includes('--token') && !args.includes('--verify')) {
    const secrets = generateSecrets();
    
    // Save if requested
    if (args.includes('--save') || args.includes('-s')) {
      saveToEnv(secrets);
    }
    
    console.log('\n📋 Environment Variables for Production:');
    console.log('========================================\n');
    console.log('Add these to your secrets manager or environment:');
    console.log(`export JWT_SECRET="${secrets.JWT_SECRET}"`);
    console.log(`export REFRESH_TOKEN_SECRET="${secrets.REFRESH_TOKEN_SECRET}"`);
    console.log(`export INTERNAL_AUTOMATION_TOKEN="${secrets.INTERNAL_AUTOMATION_TOKEN}"`);
    console.log('');
    return;
  }
  
  // Generate token
  if (args.includes('--token') || args.includes('-t')) {
    const emailIndex = args.findIndex(a => a === '--email' || a === '-e');
    const email = emailIndex > -1 ? args[emailIndex + 1] : 'admin@skillbridge.com';
    
    const secrets = existingSecrets.JWT_SECRET 
      ? { JWT_SECRET: existingSecrets.JWT_SECRET }
      : generateSecrets();
    
    const token = generateToken(email, secrets);
    
    console.log('\n🎫 Generated JWT Token:');
    console.log('=====================\n');
    console.log(token);
    console.log('');
    console.log('Usage:');
    console.log(`  curl -H "Authorization: Bearer ${token}" http://localhost:8000/api/production-assurance/health`);
    console.log('');
    console.log('⚠️  This token expires in 24 hours');
    console.log('');
    return;
  }
  
  // Verify token
  if (args.includes('--verify') || args.includes('-v')) {
    const tokenIndex = args.findIndex(a => a === '--token-value');
    const token = tokenIndex > -1 ? args[tokenIndex + 1] : null;
    
    if (!token) {
      console.error('❌ Error: --token-value is required for verification');
      showUsage();
      process.exit(1);
    }
    
    const secret = existingSecrets.JWT_SECRET;
    if (!secret) {
      console.error('❌ Error: JWT_SECRET not found in .env file');
      process.exit(1);
    }
    
    const result = verifyToken(token, secret);
    
    if (result.valid) {
      console.log('\n✅ Token is VALID\n');
      console.log('Payload:');
      console.log(JSON.stringify(result.payload, null, 2));
      console.log('');
    } else {
      console.log('\n❌ Token is INVALID\n');
      console.log(`Error: ${result.error}`);
      console.log('');
    }
    return;
  }
}

// Run main function
main();
