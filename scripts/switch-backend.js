#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Quick backend switcher for development
 * Usage: node scripts/switch-backend.js [local|remote]
 * 
 * Examples:
 *   node scripts/switch-backend.js local    # Switch to local backend
 *   node scripts/switch-backend.js remote   # Switch to remote/Railway backend
 */


const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');

const BACKENDS = {
  local: {
    name: 'Local Backend',
    url: 'http://localhost:5001/api',
    description: 'Using local backend at http://localhost:5001'
  },
  remote: {
    name: 'Remote Backend (Railway)',
    url: 'https://werehouse-production-f4f4.up.railway.app/api',
    description: 'Using Railway production backend'
  }
};

function getCurrentEnv() {
  if (!fs.existsSync(envLocalPath)) {
    return null;
  }
  return fs.readFileSync(envLocalPath, 'utf-8');
}

function switchBackend(targetBackend) {
  const backend = BACKENDS[targetBackend.toLowerCase()];
  
  if (!backend) {
    console.error('❌ Invalid backend. Choose: local or remote');
    process.exit(1);
  }

  let envContent = getCurrentEnv() || '';
  
  // Build the new content with proper commenting
  const lines = envContent.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle NEXT_PUBLIC_API_URL lines
    if (line.includes('NEXT_PUBLIC_API_URL=')) {
      const isLocal = line.includes('http://localhost:5001');
      const isRemote = line.includes('werehouse-production');
      
      if (isLocal && targetBackend.toLowerCase() === 'local') {
        // This is the line we want, uncomment it
        newLines.push('NEXT_PUBLIC_API_URL=http://localhost:5001/api');
      } else if (isRemote && targetBackend.toLowerCase() === 'remote') {
        // This is the line we want, uncomment it
        newLines.push('NEXT_PUBLIC_API_URL=https://werehouse-production-f4f4.up.railway.app/api');
      } else {
        // This is not the line we want, comment it out
        if (!line.startsWith('#')) {
          newLines.push('# ' + line);
        } else {
          newLines.push(line);
        }
      }
    } else {
      newLines.push(line);
    }
  }
  
  fs.writeFileSync(envLocalPath, newLines.join('\n'));

  console.log(`
✅ Backend switched to: ${backend.name}
📍 ${backend.description}

⚠️  Restart your dev server for changes to take effect:
   npm run dev
  `);
}

function showStatus() {
  const envContent = getCurrentEnv() || '';
  const match = envContent.match(/^NEXT_PUBLIC_API_URL=(.+)$/m);
  
  if (!match) {
    console.log('⚠️  No active backend configured');
    return;
  }

  const currentUrl = match[1];
  const currentBackend = currentUrl.includes('localhost') ? 'local' : 'remote';
  const backend = BACKENDS[currentBackend];

  console.log(`
📌 Current Backend: ${backend.name}
📍 URL: ${currentUrl}
  `);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--status' || command === '-s') {
  showStatus();
} else {
  switchBackend(command);
}
