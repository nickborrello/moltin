#!/usr/bin/env bun
import 'dotenv/config';

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'MOLTBOOK_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_VARS = [
  'MOLTBOOK_API_URL',
  'MOLTBOOK_TIMEOUT',
  'MOLTBOOK_MAX_RETRIES',
  'PERFORMANCE_LOG',
  'NODE_ENV',
];

interface ValidationResult {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

function log(message: string, type: 'info' | 'error' | 'warn' | 'success' = 'info') {
  const prefix = { info: 'ℹ', error: '✗', warn: '⚠', success: '✓' };
  console.log(`${prefix[type]} ${message}`);
}

function validateRequired() {
  log('Checking required environment variables...', 'info');
  
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    
    if (!value) {
      results.push({ name: varName, status: 'error', message: 'Missing required environment variable' });
      log(`  ${varName}: Missing`, 'error');
      continue;
    }
    
    const placeholders = ['your_', 'placeholder', 'example'];
    const isPlaceholder = placeholders.some(p => value.toLowerCase().includes(p));
    
    if (isPlaceholder) {
      results.push({ name: varName, status: 'error', message: 'Contains placeholder value - must be set to real value' });
      log(`  ${varName}: Still contains placeholder`, 'error');
      continue;
    }
    
    results.push({ name: varName, status: 'ok', message: 'Present and configured' });
    log(`  ${varName}: OK`, 'success');
  }
}

function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return;
  
  if (secret.length < 32) {
    results.push({ name: 'JWT_SECRET', status: 'error', message: `Secret too short (${secret.length} chars). Minimum 32 characters required.` });
    log(`  JWT_SECRET: Too short (${secret.length} chars, need 32+)`, 'error');
  } else {
    results.push({ name: 'JWT_SECRET', status: 'ok', message: `Sufficient length (${secret.length} chars)` });
    log(`  JWT_SECRET: OK (${secret.length} chars)`, 'success');
  }
}

function validateUrls() {
  const urlVars = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'MOLTBOOK_API_URL'];
  
  for (const varName of urlVars) {
    const value = process.env[varName];
    
    if (!value) {
      if (varName === 'MOLTBOOK_API_URL') continue;
      continue;
    }
    
    try {
      const url = new URL(value);
      
      if (varName === 'NEXT_PUBLIC_APP_URL' && !['http:', 'https:'].includes(url.protocol)) {
        results.push({ name: varName, status: 'error', message: 'Invalid protocol - must be http or https' });
        log(`  ${varName}: Invalid protocol`, 'error');
        continue;
      }
      
      if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !url.hostname.includes('supabase')) {
        results.push({ name: varName, status: 'warning', message: 'URL does not contain "supabase" - verify this is correct' });
        log(`  ${varName}: Warning - check URL`, 'warn');
        continue;
      }
      
      results.push({ name: varName, status: 'ok', message: 'Valid URL format' });
      log(`  ${varName}: OK`, 'success');
    } catch {
      results.push({ name: varName, status: 'error', message: 'Invalid URL format' });
      log(`  ${varName}: Invalid URL format`, 'error');
    }
  }
}

function validateDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  
  try {
    const url = new URL(dbUrl);
    
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      results.push({ name: 'DATABASE_URL', status: 'error', message: 'Invalid protocol - must be postgresql:// or postgres://' });
      log(`  DATABASE_URL: Invalid protocol`, 'error');
      return;
    }
    
    if (!url.host) {
      results.push({ name: 'DATABASE_URL', status: 'error', message: 'Missing host component' });
      log(`  DATABASE_URL: Missing host`, 'error');
      return;
    }
    
    results.push({ name: 'DATABASE_URL', status: 'ok', message: 'Valid PostgreSQL connection string' });
    log(`  DATABASE_URL: OK`, 'success');
  } catch {
    results.push({ name: 'DATABASE_URL', status: 'error', message: 'Invalid connection string format' });
    log(`  DATABASE_URL: Invalid format`, 'error');
  }
}

function validateOptional() {
  log('Checking optional environment variables...', 'info');
  
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    
    if (value) {
      results.push({ name: varName, status: 'ok', message: `Set to: ${value}` });
      log(`  ${varName}: ${value}`, 'info');
    } else {
      results.push({ name: varName, status: 'ok', message: 'Not set (optional)' });
      log(`  ${varName}: Not set (optional)`, 'info');
    }
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  log('Summary', 'info');
  console.log('='.repeat(50));
  
  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const ok = results.filter(r => r.status === 'ok');
  
  console.log(`\nTotal: ${results.length} | ✓ OK: ${ok.length} | ⚠ Warnings: ${warnings.length} | ✗ Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) console.log(`  - ${error.name}: ${error.message}`);
  }
  
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) console.log(`  - ${warning.name}: ${warning.message}`);
  }
}

console.log('\n🔍 Environment Variable Validation\n');

validateRequired();
validateJwtSecret();
validateUrls();
validateDatabaseUrl();
validateOptional();

printSummary();

const errors = results.filter(r => r.status === 'error');

if (errors.length > 0) {
  console.log('\n❌ Validation FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ All validations PASSED\n');
  process.exit(0);
}
