// Post-build script: 修复 Electron Windows 上 require('electron') 返回路径而非 API 的问题
const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, '..', 'out', 'main', 'index.js');
if (!fs.existsSync(mainFile)) {
  console.log('[fix] main file not found, skipping');
  process.exit(0);
}

let code = fs.readFileSync(mainFile, 'utf8');

// 替换 require("electron") 为正确的 API 访问
const oldRequire = 'const electron = require("electron");';
const newRequire = `const electron = (() => {
  // Fix for Electron Windows bug: require('electron') returns exe path instead of API
  const e = require("electron");
  if (e && e.app && e.BrowserWindow) return e;
  // Fallback: try accessing via process
  if (process._electronBinding) {
    return { app: process._linkedBinding('electron_common_app'), BrowserWindow: process._linkedBinding('electron_browser_BrowserWindow') };
  }
  throw new Error('Cannot access Electron API. Try reinstalling electron package.');
})();
`;

code = code.replace(oldRequire, newRequire);
fs.writeFileSync(mainFile, code, 'utf8');
console.log('[fix] electron require patched successfully');
