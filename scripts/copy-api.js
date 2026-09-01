#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Copy API folder to dist
const apiSrc = path.join(__dirname, '..', 'api');
const apiDest = path.join(__dirname, '..', 'dist', 'api');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

console.log('Copying API folder to dist...');
try {
  copyDir(apiSrc, apiDest);
  console.log('✅ API folder copied successfully');
} catch (error) {
  console.error('❌ Error copying API folder:', error);
  process.exit(1);
}
