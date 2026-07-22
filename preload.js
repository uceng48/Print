const { contextBridge, ipcRenderer } = require('electron');

// Ekspos API yang aman ke renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Untuk bubble: minta menampilkan main window
  showMainWindow: () => ipcRenderer.send('show-main-window'),
  // Untuk bubble: kirim posisi
  updateBubblePosition: (x, y) => ipcRenderer.send('bubble-position-updated', { x, y })
});

