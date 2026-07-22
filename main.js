const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let bubbleWindow;

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico') // jika ada
  });

  mainWindow.loadFile('index.html');

  // Jika bubble diklik, tampilkan main window
  ipcMain.on('show-main-window', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Saat main window ditutup, tutup juga bubble
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (bubbleWindow) {
      bubbleWindow.close();
      bubbleWindow = null;
    }
  });
}

function createBubbleWindow() {
  // Ambil ukuran layar
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  bubbleWindow = new BrowserWindow({
    width: 70,
    height: 70,
    x: width - 90,      // pojok kanan bawah
    y: height - 90,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,   // tidak muncul di taskbar
    resizable: false,
    show: false,         // akan ditampilkan setelah siap
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  bubbleWindow.loadFile('bubble.html');

  bubbleWindow.once('ready-to-show', () => {
    bubbleWindow.show();
  });

  // Saat bubble ditutup, jangan tutup main window
  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createBubbleWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    createBubbleWindow();
  }
});