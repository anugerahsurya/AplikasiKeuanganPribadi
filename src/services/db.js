/* ==========================================================================
   ITUANG UNIFIED DATABASE WRAPPER (src/services/db.js)
   ========================================================================== */

import * as googleSheets from './googleSheets';

const LOCAL_STORAGE_KEY = 'ituang_offline_db';
const DB_MODE_KEY = 'ituang_database_mode'; // 'local' or 'googlesheets'

// Default categories
const DEFAULT_BUDGET_CATEGORIES = [
  'Makanan', 'Transportasi', 'Belanja', 'Hiburan',
  'Kesehatan', 'Pendidikan', 'Tagihan', 'Gaji',
  'Investasi', 'Lainnya'
];

// In-memory cache
let dbState = {
  accounts: [],
  savings: [],
  transactions: [],
  budgets: [],
  memos: []
};

// ── Helpers ──────────────────────────────────────────────────────────

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      dbState = JSON.parse(raw);
    } else {
      initializeEmptyState();
    }
  } catch (e) {
    initializeEmptyState();
  }
}

function saveLocal() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbState));
}

function initializeEmptyState() {
  dbState = {
    accounts: [],
    savings: [],
    transactions: [],
    budgets: DEFAULT_BUDGET_CATEGORIES.map((cat, idx) => ({
      id: idx + 1,
      category: cat,
      amount: 0,
      is_default: 1,
      created_at: new Date().toISOString()
    })),
    memos: []
  };
  saveLocal();
}

/**
 * Trigger background sync to Google Sheets if enabled
 */
async function triggerSheetsSync() {
  if (getDbMode() === 'googlesheets' && googleSheets.isLoggedIn()) {
    try {
      await googleSheets.syncAllToGoogleSheets(dbState);
    } catch (e) {
      console.error('Failed to sync to Google Sheets:', e);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────

export function getDbMode() {
  return localStorage.getItem(DB_MODE_KEY) || 'local';
}

export function setDbMode(mode) {
  if (mode === 'googlesheets' || mode === 'local') {
    localStorage.setItem(DB_MODE_KEY, mode);
  }
}

/**
 * Initializes the database.
 * If mode is Google Sheets and logged in, syncs data from Google Sheets first.
 */
export async function initializeDb() {
  loadLocal();

  if (getDbMode() === 'googlesheets' && googleSheets.isLoggedIn()) {
    try {
      const sheetsData = await googleSheets.syncAllFromGoogleSheets();
      
      // Merge: if Google Sheets has data, overwrite local state
      if (sheetsData && (sheetsData.accounts.length > 0 || sheetsData.transactions.length > 0)) {
        dbState = sheetsData;
        saveLocal();
      } else {
        // If Google Sheets is empty, upload local data to start it off
        await triggerSheetsSync();
      }
    } catch (e) {
      console.error('Error initializing with Google Sheets:', e);
    }
  }
}

/**
 * Force sync from Google Sheets
 */
export async function syncFromSheets() {
  if (googleSheets.isLoggedIn()) {
    const sheetsData = await googleSheets.syncAllFromGoogleSheets();
    if (sheetsData) {
      dbState = sheetsData;
      saveLocal();
      return true;
    }
  }
  return false;
}

/**
 * Force sync to Google Sheets
 */
export async function syncToSheets() {
  if (googleSheets.isLoggedIn()) {
    await googleSheets.syncAllToGoogleSheets(dbState);
    return true;
  }
  return false;
}

// ── ACCOUNTS ──────────────────────────────────────────────────────────

export function getAccounts() {
  return [...dbState.accounts].sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
}

export async function addAccount({ name, category, balance }) {
  const id = dbState.accounts.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  const newAccount = {
    id,
    name,
    category, // 'Bank' or 'E-Wallet'
    balance: Number(balance) || 0,
    created_at: new Date().toISOString()
  };
  
  dbState.accounts.push(newAccount);
  saveLocal();
  await triggerSheetsSync();
  return newAccount;
}

export async function deleteAccount(id) {
  dbState.accounts = dbState.accounts.filter(a => a.id !== id);
  saveLocal();
  await triggerSheetsSync();
  return { changes: 1 };
}

export async function updateAccountBalance(id, balance) {
  const acc = dbState.accounts.find(a => a.id === id);
  if (acc) {
    acc.balance = Number(balance);
    saveLocal();
    await triggerSheetsSync();
    return { changes: 1 };
  }
  return { changes: 0 };
}

// ── SAVINGS ───────────────────────────────────────────────────────────

export function getSavings() {
  return [...dbState.savings].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function addSaving({ name, balance }) {
  const id = dbState.savings.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  const newSaving = {
    id,
    name,
    balance: Number(balance) || 0,
    created_at: new Date().toISOString()
  };
  
  dbState.savings.push(newSaving);
  saveLocal();
  await triggerSheetsSync();
  return newSaving;
}

export async function deleteSaving(id) {
  dbState.savings = dbState.savings.filter(s => s.id !== id);
  saveLocal();
  await triggerSheetsSync();
  return { changes: 1 };
}

export async function updateSavingBalance(id, balance) {
  const sav = dbState.savings.find(s => s.id === id);
  if (sav) {
    sav.balance = Number(balance);
    saveLocal();
    await triggerSheetsSync();
    return { changes: 1 };
  }
  return { changes: 0 };
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────

export function getTransactionsByPeriod(year, month) {
  const targetYear = Number(year);
  const targetMonth = Number(month);

  const txs = dbState.transactions.filter(t => {
    if (!t.created_at) return false;
    const d = new Date(t.created_at);
    return d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
  });

  // Attach account/saving names for UI backwards compatibility
  return txs.map(t => {
    const accFrom = dbState.accounts.find(a => a.id === t.account_from_id);
    const accTo = dbState.accounts.find(a => a.id === t.account_to_id);
    const savFrom = dbState.savings.find(s => s.id === t.savings_from_id);
    const savTo = dbState.savings.find(s => s.id === t.savings_to_id);

    return {
      ...t,
      account_from_name: accFrom ? accFrom.name : null,
      account_from_category: accFrom ? accFrom.category : null,
      account_to_name: accTo ? accTo.name : null,
      account_to_category: accTo ? accTo.category : null,
      savings_from_name: savFrom ? savFrom.name : null,
      savings_to_name: savTo ? savTo.name : null
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getAllTransactions() {
  return dbState.transactions.map(t => {
    const accFrom = dbState.accounts.find(a => a.id === t.account_from_id);
    const accTo = dbState.accounts.find(a => a.id === t.account_to_id);
    const savFrom = dbState.savings.find(s => s.id === t.savings_from_id);
    const savTo = dbState.savings.find(s => s.id === t.savings_to_id);

    return {
      ...t,
      account_from_name: accFrom ? accFrom.name : null,
      account_to_name: accTo ? accTo.name : null,
      savings_from_name: savFrom ? savFrom.name : null,
      savings_to_name: savTo ? savTo.name : null
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function addTransaction(data) {
  const id = dbState.transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const {
    item_name, amount, type, category,
    account_from_id, account_to_id,
    savings_from_id, savings_to_id,
    notes, created_at, exclude_from_quota
  } = data;

  const numAmount = Number(amount);
  const now = created_at || new Date().toISOString();

  const newTx = {
    id,
    item_name,
    amount: numAmount,
    type, // 'income' | 'expense' | 'transfer'
    category,
    account_from_id: account_from_id ? Number(account_from_id) : null,
    account_to_id: account_to_id ? Number(account_to_id) : null,
    savings_from_id: savings_from_id ? Number(savings_from_id) : null,
    savings_to_id: savings_to_id ? Number(savings_to_id) : null,
    notes: notes || null,
    created_at: now,
    exclude_from_quota: exclude_from_quota ? 1 : 0
  };

  dbState.transactions.push(newTx);

  // Update Balances
  if (type === 'expense') {
    if (account_from_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_from_id));
      if (acc) acc.balance -= numAmount;
    }
    if (savings_from_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_from_id));
      if (sav) sav.balance -= numAmount;
    }
  } else if (type === 'income') {
    if (account_to_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_to_id));
      if (acc) acc.balance += numAmount;
    }
    if (savings_to_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_to_id));
      if (sav) sav.balance += numAmount;
    }
  } else if (type === 'transfer') {
    if (account_from_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_from_id));
      if (acc) acc.balance -= numAmount;
    }
    if (savings_from_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_from_id));
      if (sav) sav.balance -= numAmount;
    }
    if (account_to_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_to_id));
      if (acc) acc.balance += numAmount;
    }
    if (savings_to_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_to_id));
      if (sav) sav.balance += numAmount;
    }
  }

  saveLocal();
  await triggerSheetsSync();
  return newTx;
}

export async function deleteTransaction(id) {
  const txIndex = dbState.transactions.findIndex(t => t.id === id);
  if (txIndex === -1) return { changes: 0 };

  const tx = dbState.transactions[txIndex];
  const { amount, type, account_from_id, account_to_id, savings_from_id, savings_to_id } = tx;
  const numAmount = Number(amount);

  // Reverse Balances
  if (type === 'expense') {
    if (account_from_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_from_id));
      if (acc) acc.balance += numAmount;
    }
    if (savings_from_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_from_id));
      if (sav) sav.balance += numAmount;
    }
  } else if (type === 'income') {
    if (account_to_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_to_id));
      if (acc) acc.balance -= numAmount;
    }
    if (savings_to_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_to_id));
      if (sav) sav.balance -= numAmount;
    }
  } else if (type === 'transfer') {
    if (account_from_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_from_id));
      if (acc) acc.balance += numAmount;
    }
    if (savings_from_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_from_id));
      if (sav) sav.balance += numAmount;
    }
    if (account_to_id) {
      const acc = dbState.accounts.find(a => a.id === Number(account_to_id));
      if (acc) acc.balance -= numAmount;
    }
    if (savings_to_id) {
      const sav = dbState.savings.find(s => s.id === Number(savings_to_id));
      if (sav) sav.balance -= numAmount;
    }
  }

  // Remove the transaction
  dbState.transactions.splice(txIndex, 1);

  saveLocal();
  await triggerSheetsSync();
  return { changes: 1 };
}

export async function updateTransactionsDate(ids, newDate) {
  let updatedCount = 0;
  dbState.transactions = dbState.transactions.map(t => {
    if (ids.includes(t.id)) {
      updatedCount++;
      let finalDate;
      try {
        const origDate = new Date(t.created_at);
        const nextDate = new Date(newDate);
        nextDate.setHours(origDate.getHours(), origDate.getMinutes(), origDate.getSeconds(), origDate.getMilliseconds());
        finalDate = nextDate.toISOString();
      } catch (e) {
        finalDate = new Date(newDate).toISOString();
      }
      return { ...t, created_at: finalDate };
    }
    return t;
  });

  if (updatedCount > 0) {
    saveLocal();
    await triggerSheetsSync();
    return { changes: updatedCount };
  }
  return { changes: 0 };
}

// ── DASHBOARD SUMMARY ──────────────────────────────────────────────────

export function getDashboardSummary(year, month) {
  const targetYear = Number(year);
  const targetMonth = Number(month);

  const txs = dbState.transactions.filter(t => {
    if (!t.created_at) return false;
    const d = new Date(t.created_at);
    return d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
  });

  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const transfer = txs.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  return {
    income,
    expense,
    transfer,
    net: income - expense
  };
}

export function getMonthlyChart() {
  const monthlyData = {};

  dbState.transactions.forEach(t => {
    if (!t.created_at) return;
    const d = new Date(t.created_at);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[period]) {
      monthlyData[period] = { period, income: 0, expense: 0 };
    }

    if (t.type === 'income') {
      monthlyData[period].income += t.amount;
    } else if (t.type === 'expense') {
      monthlyData[period].expense += t.amount;
    }
  });

  // Sort and limit to 12
  return Object.values(monthlyData)
    .sort((a, b) => (a.period || '').localeCompare(b.period || ''))
    .slice(-12);
}

export function getCategoryBreakdown(year, month) {
  const targetYear = Number(year);
  const targetMonth = Number(month);

  const breakdown = {};

  dbState.transactions.forEach(t => {
    if (!t.created_at) return;
    const d = new Date(t.created_at);
    if (d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth) {
      if (t.type === 'income' || t.type === 'expense') {
        const key = `${t.category}_${t.type}`;
        if (!breakdown[key]) {
          breakdown[key] = { category: t.category, type: t.type, total: 0 };
        }
        breakdown[key].total += t.amount;
      }
    }
  });

  return Object.values(breakdown).sort((a, b) => b.total - a.total);
}

// ── BUDGETS ───────────────────────────────────────────────────────────

export function getBudgets() {
  return [...dbState.budgets].sort((a, b) => b.is_default - a.is_default || (a.category || '').localeCompare(b.category || ''));
}

export async function addBudget({ category, amount }) {
  const id = dbState.budgets.reduce((max, b) => Math.max(max, b.id), 0) + 1;
  const newBudget = {
    id,
    category,
    amount: Number(amount) || 0,
    is_default: 0,
    created_at: new Date().toISOString()
  };

  dbState.budgets.push(newBudget);
  saveLocal();
  await triggerSheetsSync();
  return newBudget;
}

export async function updateBudget({ id, amount }) {
  const b = dbState.budgets.find(item => item.id === id);
  if (b) {
    b.amount = Number(amount);
    saveLocal();
    await triggerSheetsSync();
    return { changes: 1 };
  }
  return { changes: 0 };
}

export async function deleteBudget(id) {
  // Only delete custom budgets (is_default === 0)
  dbState.budgets = dbState.budgets.filter(b => !(b.id === id && b.is_default === 0));
  saveLocal();
  await triggerSheetsSync();
  return { changes: 1 };
}

export function getBudgetProgress(year, month) {
  const spentMap = {};
  
  // Calculate expenses for this period
  const targetYear = Number(year);
  const targetMonth = Number(month);

  dbState.transactions.forEach(t => {
    if (!t.created_at || t.type !== 'expense') return;
    const d = new Date(t.created_at);
    if (d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth) {
      const catKey = (t.category || '').toString().trim().toLowerCase();
      spentMap[catKey] = (spentMap[catKey] || 0) + t.amount;
    }
  });

  return dbState.budgets.map(b => {
    const catKey = (b.category || '').toString().trim().toLowerCase();
    const spent = spentMap[catKey] || 0;
    const remaining = b.amount - spent;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return {
      ...b,
      spent,
      remaining,
      pct
    };
  }).sort((a, b) => b.is_default - a.is_default || (a.category || '').localeCompare(b.category || ''));
}

// ── MEMOS ─────────────────────────────────────────────────────────────

export function getMemos() {
  return [...dbState.memos];
}

export async function addMemo({ title, content, color, date }) {
  const id = dbState.memos.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const newMemo = {
    id,
    title,
    content,
    color: color || '#7aab8a',
    date: date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  };

  dbState.memos.unshift(newMemo);
  saveLocal();
  await triggerSheetsSync();
  return newMemo;
}

export async function updateMemo({ id, title, content, color }) {
  const m = dbState.memos.find(item => item.id === id);
  if (m) {
    m.title = title;
    m.content = content;
    m.color = color;
    saveLocal();
    await triggerSheetsSync();
    return m;
  }
  return null;
}

export async function deleteMemo(id) {
  dbState.memos = dbState.memos.filter(m => m.id !== id);
  saveLocal();
  await triggerSheetsSync();
  return { changes: 1 };
}

export async function importDatabase(data) {
  if (!data) return false;
  
  dbState = {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    savings: Array.isArray(data.savings) ? data.savings : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    memos: Array.isArray(data.memos) ? data.memos : []
  };
  
  // ensure fallback budget defaults
  if (dbState.budgets.length === 0) {
    dbState.budgets = DEFAULT_BUDGET_CATEGORIES.map((cat, idx) => ({
      id: idx + 1,
      category: cat,
      amount: 0,
      is_default: 1,
      created_at: new Date().toISOString()
    }));
  }
  
  saveLocal();
  await triggerSheetsSync();
  return true;
}

export async function mergeDbWithCloud() {
  if (googleSheets.isLoggedIn()) {
    const sheetsData = await googleSheets.syncAllFromGoogleSheets();
    if (sheetsData) {
      await mergeLocalAndCloud(sheetsData);
      return true;
    }
  }
  throw new Error('Google Authentication required.');
}

async function mergeLocalAndCloud(sheetsData) {
  if (!sheetsData) return false;

  // 1. Merge Accounts
  const mergedAccounts = [];
  const localAccountMap = {}; // oldLocalId -> newId
  const sheetsAccountMap = {}; // oldSheetsId -> newId

  // Helper to find account by name
  const findAccountByName = (list, name) => {
    if (!name) return null;
    const searchName = name.toString().trim().toLowerCase();
    return list.find(a => a.name && a.name.toString().trim().toLowerCase() === searchName);
  };

  // Start with local accounts
  dbState.accounts.forEach(localAcc => {
    const existing = findAccountByName(mergedAccounts, localAcc.name);
    if (existing) {
      localAccountMap[localAcc.id] = existing.id;
      if (existing.balance === 0 && localAcc.balance !== 0) {
        existing.balance = localAcc.balance;
      }
    } else {
      const newId = mergedAccounts.length + 1;
      const newAcc = {
        id: newId,
        name: (localAcc.name || '').toString().trim(),
        category: localAcc.category,
        balance: localAcc.balance,
        created_at: localAcc.created_at || new Date().toISOString()
      };
      mergedAccounts.push(newAcc);
      localAccountMap[localAcc.id] = newId;
    }
  });

  // Merge sheets accounts
  sheetsData.accounts.forEach(sheetsAcc => {
    const existing = findAccountByName(mergedAccounts, sheetsAcc.name);
    if (existing) {
      sheetsAccountMap[sheetsAcc.id] = existing.id;
      if (existing.balance === 0 && sheetsAcc.balance !== 0) {
        existing.balance = sheetsAcc.balance;
      }
    } else {
      const newId = mergedAccounts.length + 1;
      const newAcc = {
        id: newId,
        name: (sheetsAcc.name || '').toString().trim(),
        category: sheetsAcc.category,
        balance: sheetsAcc.balance,
        created_at: sheetsAcc.created_at || new Date().toISOString()
      };
      mergedAccounts.push(newAcc);
      sheetsAccountMap[sheetsAcc.id] = newId;
    }
  });

  // 2. Merge Savings
  const mergedSavings = [];
  const localSavingMap = {}; // oldLocalId -> newId
  const sheetsSavingMap = {}; // oldSheetsId -> newId

  const findSavingByName = (list, name) => {
    if (!name) return null;
    const searchName = name.toString().trim().toLowerCase();
    return list.find(s => s.name && s.name.toString().trim().toLowerCase() === searchName);
  };

  dbState.savings.forEach(localSav => {
    const existing = findSavingByName(mergedSavings, localSav.name);
    if (existing) {
      localSavingMap[localSav.id] = existing.id;
      if (existing.balance === 0 && localSav.balance !== 0) {
        existing.balance = localSav.balance;
      }
    } else {
      const newId = mergedSavings.length + 1;
      const newSav = {
        id: newId,
        name: (localSav.name || '').toString().trim(),
        balance: localSav.balance,
        created_at: localSav.created_at || new Date().toISOString()
      };
      mergedSavings.push(newSav);
      localSavingMap[localSav.id] = newId;
    }
  });

  sheetsData.savings.forEach(sheetsSav => {
    const existing = findSavingByName(mergedSavings, sheetsSav.name);
    if (existing) {
      sheetsSavingMap[sheetsSav.id] = existing.id;
      if (existing.balance === 0 && sheetsSav.balance !== 0) {
        existing.balance = sheetsSav.balance;
      }
    } else {
      const newId = mergedSavings.length + 1;
      const newSav = {
        id: newId,
        name: (sheetsSav.name || '').toString().trim(),
        balance: sheetsSav.balance,
        created_at: sheetsSav.created_at || new Date().toISOString()
      };
      mergedSavings.push(newSav);
      sheetsSavingMap[sheetsSav.id] = newId;
    }
  });

  // 3. Merge Budgets
  const mergedBudgets = [];
  const findBudgetByCategory = (list, category) => {
    if (!category) return null;
    const searchCat = category.toString().trim().toLowerCase();
    return list.find(b => b.category && b.category.toString().trim().toLowerCase() === searchCat);
  };

  dbState.budgets.forEach(localB => {
    const existing = findBudgetByCategory(mergedBudgets, localB.category);
    if (!existing) {
      mergedBudgets.push({
        id: mergedBudgets.length + 1,
        category: (localB.category || '').toString().trim(),
        amount: localB.amount,
        is_default: localB.is_default,
        created_at: localB.created_at || new Date().toISOString()
      });
    }
  });

  sheetsData.budgets.forEach(sheetsB => {
    const existing = findBudgetByCategory(mergedBudgets, sheetsB.category);
    if (existing) {
      if (existing.amount === 0 && sheetsB.amount !== 0) {
        existing.amount = sheetsB.amount;
      }
    } else {
      mergedBudgets.push({
        id: mergedBudgets.length + 1,
        category: (sheetsB.category || '').toString().trim(),
        amount: sheetsB.amount,
        is_default: sheetsB.is_default,
        created_at: sheetsB.created_at || new Date().toISOString()
      });
    }
  });

  // 4. Merge Memos
  const mergedMemos = [];
  const findMemoByTitleAndContent = (list, title, content) => {
    const searchTitle = (title || '').toString().trim().toLowerCase();
    const searchContent = (content || '').toString().trim().toLowerCase();
    return list.find(m => 
      (m.title || '').toString().trim().toLowerCase() === searchTitle && 
      (m.content || '').toString().trim().toLowerCase() === searchContent
    );
  };

  dbState.memos.forEach(localM => {
    const existing = findMemoByTitleAndContent(mergedMemos, localM.title, localM.content);
    if (!existing) {
      mergedMemos.push({
        id: mergedMemos.length + 1,
        title: (localM.title || '').toString().trim(),
        content: (localM.content || '').toString().trim(),
        color: localM.color,
        date: localM.date
      });
    }
  });

  sheetsData.memos.forEach(sheetsM => {
    const existing = findMemoByTitleAndContent(mergedMemos, sheetsM.title, sheetsM.content);
    if (!existing) {
      mergedMemos.push({
        id: mergedMemos.length + 1,
        title: (sheetsM.title || '').toString().trim(),
        content: (sheetsM.content || '').toString().trim(),
        color: sheetsM.color,
        date: sheetsM.date
      });
    }
  });

  // 5. Merge & Deduplicate Transactions
  const mergedTransactions = [];
  const transactionKeys = new Set();

  const getTxKey = (t) => {
    const time = t.created_at ? new Date(t.created_at).toISOString().slice(0, 16) : '';
    return `${t.type}_${t.amount}_${(t.category || '').trim().toLowerCase()}_${(t.item_name || '').trim().toLowerCase()}_${time}`;
  };

  const processTx = (tx, accountMap, savingMap) => {
    const key = getTxKey(tx);
    if (transactionKeys.has(key)) return;

    transactionKeys.add(key);
    const newTxId = mergedTransactions.length + 1;

    // Remap account/saving IDs
    const newAccountFrom = tx.account_from_id ? accountMap[tx.account_from_id] || null : null;
    const newAccountTo = tx.account_to_id ? accountMap[tx.account_to_id] || null : null;
    const newSavingFrom = tx.savings_from_id ? savingMap[tx.savings_from_id] || null : null;
    const newSavingTo = tx.savings_to_id ? savingMap[tx.savings_to_id] || null : null;

    mergedTransactions.push({
      id: newTxId,
      item_name: tx.item_name,
      amount: Number(tx.amount) || 0,
      type: tx.type,
      category: tx.category,
      account_from_id: newAccountFrom,
      account_to_id: newAccountTo,
      savings_from_id: newSavingFrom,
      savings_to_id: newSavingTo,
      notes: tx.notes || null,
      created_at: tx.created_at,
      exclude_from_quota: tx.exclude_from_quota ? 1 : 0
    });
  };

  // Add local transactions
  dbState.transactions.forEach(tx => {
    processTx(tx, localAccountMap, localSavingMap);
  });

  // Add sheets transactions
  sheetsData.transactions.forEach(tx => {
    processTx(tx, sheetsAccountMap, sheetsSavingMap);
  });

  // Update state and save
  dbState = {
    accounts: mergedAccounts,
    savings: mergedSavings,
    transactions: mergedTransactions,
    budgets: mergedBudgets,
    memos: mergedMemos
  };

  saveLocal();
  await triggerSheetsSync();
  return true;
}
