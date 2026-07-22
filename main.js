const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let bubbleWindow = null;
let ocrProcess = null;

// ============================================================
//  FUNGSI UNTUK MENJALANKAN SERVER OCR (PaddleOCR)
// ============================================================
function startOcrServer() {
  // Cari file server_ocr.exe di beberapa kemungkinan lokasi
  let ocrPath = path.join(process.resourcesPath, 'server_ocr.exe');
  if (!fs.existsSync(ocrPath)) {
    ocrPath = path.join(__dirname, 'resources', 'server_ocr.exe');
  }
  if (!fs.existsSync(ocrPath)) {
    ocrPath = path.join(__dirname, 'server_ocr.exe');
  }

  if (fs.existsSync(ocrPath)) {
    console.log(`🚀 Menjalankan server OCR dari: ${ocrPath}`);

    // Spawn proses dengan windowsHide agar tidak muncul jendela CMD
    ocrProcess = spawn(ocrPath, [], {
      stdio: 'ignore',      // matikan output ke konsol
      detached: false,
      windowsHide: true     // penting agar tidak muncul jendela hitam
    });

    // Log jika proses mati (misal crash)
    ocrProcess.on('exit', (code, signal) => {
      console.log(`⚠️ Server OCR berhenti (kode: ${code}, sinyal: ${signal})`);
      ocrProcess = null;
    });

    ocrProcess.on('error', (err) => {
      console.error('❌ Gagal menjalankan server OCR:', err);
      ocrProcess = null;
    });

    // Beri waktu untuk model dimuat (kira-kira 5-8 detik)
    // Bisa ditambah dengan pengecekan berkala ke endpoint /ocr
    console.log('⏳ Menunggu server OCR siap... (5 detik)');
    // Opsional: lakukan pengecekan setiap 2 detik sampai respon OK
    // Namun untuk kesederhanaan, kita hanya beri jeda.
    // Pengguna bisa menekan tombol "Cek" di UI setelah beberapa saat.
  } else {
    console.warn('⚠️ server_ocr.exe tidak ditemukan! OCR tidak akan berfungsi.');
  }
}

// ============================================================
//  FUNGSI UNTUK MEMATIKAN SERVER OCR
// ============================================================
function stopOcrServer() {
  if (ocrProcess) {
    console.log('🛑 Menghentikan server OCR...');
    ocrProcess.kill();
    ocrProcess = null;
  }
}

// ============================================================
//  MEMBUAT WINDOW UTAMA
// ============================================================
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

  // Jika main window ditutup, tutup juga bubble dan hentikan server
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (bubbleWindow) {
      bubbleWindow.close();
      bubbleWindow = null;
    }
    // Server OCR akan dihentikan di event 'will-quit' atau 'window-all-closed'
  });

  // Opsional: buka DevTools untuk debugging (komentari jika tidak perlu)
  // mainWindow.webContents.openDevTools();
}

// ============================================================
//  MEMBUAT BUBBLE WINDOW (IKON MELAYANG)
// ============================================================
function createBubbleWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  bubbleWindow = new BrowserWindow({
    width: 70,
    height: 70,
    x: width - 90,
    y: height - 90,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
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

  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
  });
}

// ============================================================
//  IPC HANDLER UNTUK MENAMPILKAN MAIN WINDOW DARI BUBBLE
// ============================================================
ipcMain.on('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// ============================================================
//  LIFECYCLE APP
// ============================================================
app.whenReady().then(() => {
  // 1. Jalankan server OCR terlebih dahulu
  startOcrServer();

  // 2. Setelah server mulai, buat window (bisa langsung atau ditunda)
  //    Karena server butuh beberapa detik, kita beri jeda 2 detik agar
  //    model mulai dimuat, tetapi window tetap muncul.
  setTimeout(() => {
    createMainWindow();
    createBubbleWindow();
  }, 2000);
});

// Saat semua window ditutup (kecuali macOS)
app.on('window-all-closed', () => {
  stopOcrServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Saat aplikasi akan keluar (pastikan server mati)
app.on('will-quit', () => {
  stopOcrServer();
});

// Untuk macOS: aktifkan kembali jika di-click dock
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    createBubbleWindow();
  }
});
