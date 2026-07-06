// Post-build script: copy sql.js WASM file into packaged app
const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const dst  = path.join(__dirname, '..', 'dist', 'Ituang-win32-x64', 'resources', 'app', 'node_modules', 'sql.js', 'dist');

if (!fs.existsSync(src)) {
  console.error('❌ WASM source not found:', src);
  process.exit(1);
}

fs.mkdirSync(dst, { recursive: true });
fs.copyFileSync(src, path.join(dst, 'sql-wasm.wasm'));
console.log('✅ sql-wasm.wasm copied to packaged app');
