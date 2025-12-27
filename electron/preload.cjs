// Preload script for Electron
// This runs in a sandboxed environment with access to Node.js APIs

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific electron features without exposing the entire API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  secure: {
    encrypt: (data) => ipcRenderer.invoke('secure-encrypt', data),
    decrypt: (data) => ipcRenderer.invoke('secure-decrypt', data),
  }
});
