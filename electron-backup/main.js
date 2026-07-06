const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');

let mainWindow;
let db;

// Disable GPU acceleration — fixes invisible window on some Windows systems
app.disableHardwareAcceleration();

// ── Global error catcher ──────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err);
  if (mainWindow) {
    dialog.showErrorBox('Error Aplikasi', err.message || String(err));
  }
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d0f18',
    show: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open devtools if app crashes/fails to load (helps diagnose)
  mainWindow.webContents.on('did-fail-load', (event, errCode, errDesc) => {
    console.error('[PAGE LOAD FAIL]', errCode, errDesc);
  });
}

// ── App ready ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Create and show window immediately
  createWindow();

  // Then try to init DB in background
  try {
    const Database = require('./database');
    db = new Database();
    await db.initialize();
    console.log('[DB] Initialized successfully');
  } catch (err) {
    console.error('[DB ERROR]', err);
    dialog.showErrorBox(
      'Database Error',
      'Gagal inisialisasi database:\n\n' + (err.message || String(err))
    );
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Window Controls ──────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// ── Auth ────────────────────────────────────────────────────
// Check if any user has registered on this device
ipcMain.handle('auth-has-users', () => {
  if (!db) return false;
  return db.hasAnyUser();
});

// Register a new user account
ipcMain.handle('auth-register', async (_, data) => {
  if (!db) return { success: false, message: 'Database belum siap.' };
  return db.registerUser(data);
});

// Login: verify username + password against DB
ipcMain.handle('auth-login', async (_, { username, password }) => {
  if (!db) return { success: false, message: 'Database belum siap.' };
  return db.loginUser({ username, password });
});

// Get fingerprint preference for a username
ipcMain.handle('auth-get-fingerprint-pref', (_, username) => {
  if (!db) return { use_fingerprint: 0 };
  const user = db.getUserByUsername(username);
  return user ? { use_fingerprint: user.use_fingerprint } : { use_fingerprint: 0 };
});

// Update fingerprint preference for a username
ipcMain.handle('auth-set-fingerprint-pref', (_, { username, useFingerprint }) => {
  if (!db) return { success: false };
  return db.updateFingerprintPreference(username, useFingerprint);
});

// ── Biometric / Windows Hello ─────────────────────────────────
/**
 * Check if Windows Hello is available on this machine.
 * Uses PowerShell to query KeyCredentialManager.
 */
ipcMain.handle('auth-check-biometric', async () => {
  if (process.platform !== 'win32') return { available: false, reason: 'Hanya tersedia di Windows.' };

  return new Promise((resolve) => {
    const ps = `
      Add-Type -AssemblyName System.Runtime.WindowsRuntime
      $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
      $availabilityType = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
      $availOp = $availabilityType::CheckAvailabilityAsync()
      $asTaskGeneric = $asTask.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
      $task = $asTaskGeneric.Invoke($null, @($availOp))
      $task.Wait()
      Write-Output $task.Result
    `.trim();

    const proc = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      timeout: 8000,
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[BIOMETRIC CHECK ERROR]', err.message);
        resolve({ available: false, reason: 'Tidak dapat memeriksa dukungan biometrik.' });
        return;
      }
      const result = stdout.trim();
      console.log('[BIOMETRIC AVAILABILITY]', result);
      if (result === 'Available') {
        resolve({ available: true });
      } else if (result === 'DeviceBusy') {
        resolve({ available: false, reason: 'Sensor fingerprint sedang sibuk.' });
      } else if (result === 'DisabledByPolicy') {
        resolve({ available: false, reason: 'Biometrik dinonaktifkan oleh kebijakan sistem.' });
      } else if (result === 'NotConfiguredForUser') {
        resolve({ available: false, reason: 'Windows Hello belum dikonfigurasi untuk akun ini.' });
      } else {
        resolve({ available: false, reason: 'Perangkat tidak mendukung Windows Hello.' });
      }
    });
  });
});

/**
 * Trigger Windows Hello consent verification popup.
 */
ipcMain.handle('auth-fingerprint', async () => {
  if (process.platform !== 'win32') return { success: false, message: 'Hanya tersedia di Windows.' };

  return new Promise((resolve) => {
    const ps = `
      Add-Type -AssemblyName System.Runtime.WindowsRuntime
      $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
      $verifierType = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
      $verifyOp = $verifierType::RequestVerificationAsync("Ituang — Verifikasi Identitas")
      $asTaskGeneric = $asTask.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerificationResult])
      $task = $asTaskGeneric.Invoke($null, @($verifyOp))
      $task.Wait()
      Write-Output $task.Result
    `.trim();

    const proc = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      timeout: 30000,
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[BIOMETRIC ERROR]', err.message);
        resolve({ success: false, message: 'Gagal melakukan verifikasi biometrik.' });
        return;
      }
      const result = stdout.trim();
      console.log('[BIOMETRIC RESULT]', result);
      if (result === 'Verified') {
        resolve({ success: true });
      } else if (result === 'Canceled') {
        resolve({ success: false, message: 'Verifikasi dibatalkan.' });
      } else if (result === 'RetriesExhausted') {
        resolve({ success: false, message: 'Terlalu banyak percobaan gagal.' });
      } else {
        resolve({ success: false, message: `Verifikasi gagal: ${result}` });
      }
    });
  });
});

// ── DB guard: return empty array if db not ready ──────────────
function safeDb(fn, fallback = []) {
  try {
    if (!db) return fallback;
    return fn();
  } catch (e) {
    console.error('[DB OP ERROR]', e);
    return fallback;
  }
}

// ── Accounts ─────────────────────────────────────────────────
ipcMain.handle('accounts-get-all', () => safeDb(() => db.getAccounts()));
ipcMain.handle('accounts-add', (_, data) => db && db.addAccount(data));
ipcMain.handle('accounts-delete', (_, id) => db && db.deleteAccount(id));
ipcMain.handle('accounts-update-balance', (_, { id, balance }) => db && db.updateAccountBalance(id, balance));

// ── Savings ──────────────────────────────────────────────────
ipcMain.handle('savings-get-all', () => safeDb(() => db.getSavings()));
ipcMain.handle('savings-add', (_, data) => db && db.addSaving(data));
ipcMain.handle('savings-delete', (_, id) => db && db.deleteSaving(id));
ipcMain.handle('savings-update-balance', (_, { id, balance }) => db && db.updateSavingBalance(id, balance));

// ── Transactions ─────────────────────────────────────────────
ipcMain.handle('transactions-get-by-period', (_, { year, month }) =>
  safeDb(() => db.getTransactionsByPeriod(year, month))
);
ipcMain.handle('transactions-get-all', () => safeDb(() => db.getAllTransactions()));
ipcMain.handle('transactions-add', (_, data) => db && db.addTransaction(data));
ipcMain.handle('transactions-delete', (_, id) => db && db.deleteTransaction(id));

// ── Dashboard ────────────────────────────────────────────────
ipcMain.handle('dashboard-summary', (_, { year, month }) =>
  safeDb(() => db.getDashboardSummary(year, month), {})
);
ipcMain.handle('dashboard-monthly-chart', () => safeDb(() => db.getMonthlyChart()));
ipcMain.handle('dashboard-category-breakdown', (_, { year, month }) =>
  safeDb(() => db.getCategoryBreakdown(year, month))
);

// ── Budgets ──────────────────────────────────────────────────
ipcMain.handle('budgets-get-all', () => safeDb(() => db.getBudgets()));
ipcMain.handle('budgets-add', (_, data) => db && db.addBudget(data));
ipcMain.handle('budgets-update', (_, data) => db && db.updateBudget(data));
ipcMain.handle('budgets-update-by-category', (_, data) => db && db.updateBudgetByCategory(data));
ipcMain.handle('budgets-delete', (_, id) => db && db.deleteBudget(id));
ipcMain.handle('budgets-get-progress', (_, { year, month }) =>
  safeDb(() => db.getBudgetProgress(year, month))
);
