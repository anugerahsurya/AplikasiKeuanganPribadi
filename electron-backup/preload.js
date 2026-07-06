const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Auth
  hasUsers:              ()     => ipcRenderer.invoke('auth-has-users'),
  register:              (data) => ipcRenderer.invoke('auth-register', data),
  login:                 (data) => ipcRenderer.invoke('auth-login', data),
  checkBiometric:        ()     => ipcRenderer.invoke('auth-check-biometric'),
  loginFingerprint:      ()     => ipcRenderer.invoke('auth-fingerprint'),
  getFingerprintPref:    (u)    => ipcRenderer.invoke('auth-get-fingerprint-pref', u),
  setFingerprintPref:    (data) => ipcRenderer.invoke('auth-set-fingerprint-pref', data),

  // Accounts
  getAccounts:           ()     => ipcRenderer.invoke('accounts-get-all'),
  addAccount:            (data) => ipcRenderer.invoke('accounts-add', data),
  deleteAccount:         (id)   => ipcRenderer.invoke('accounts-delete', id),
  updateAccountBalance:  (data) => ipcRenderer.invoke('accounts-update-balance', data),

  // Savings
  getSavings:       ()     => ipcRenderer.invoke('savings-get-all'),
  addSaving:        (data) => ipcRenderer.invoke('savings-add', data),
  deleteSaving:     (id)   => ipcRenderer.invoke('savings-delete', id),

  // Transactions
  getTransactionsByPeriod: (data) => ipcRenderer.invoke('transactions-get-by-period', data),
  getAllTransactions:       ()     => ipcRenderer.invoke('transactions-get-all'),
  addTransaction:          (data) => ipcRenderer.invoke('transactions-add', data),
  deleteTransaction:       (id)   => ipcRenderer.invoke('transactions-delete', id),

  // Dashboard
  getDashboardSummary:    (data) => ipcRenderer.invoke('dashboard-summary', data),
  getMonthlyChart:        ()     => ipcRenderer.invoke('dashboard-monthly-chart'),
  getCategoryBreakdown:   (data) => ipcRenderer.invoke('dashboard-category-breakdown', data),

  // Budgets
  getBudgets:             ()     => ipcRenderer.invoke('budgets-get-all'),
  addBudget:              (data) => ipcRenderer.invoke('budgets-add', data),
  updateBudget:           (data) => ipcRenderer.invoke('budgets-update', data),
  updateBudgetByCategory: (data) => ipcRenderer.invoke('budgets-update-by-category', data),
  deleteBudget:           (id)   => ipcRenderer.invoke('budgets-delete', id),
  getBudgetProgress:      (data) => ipcRenderer.invoke('budgets-get-progress', data),
});
