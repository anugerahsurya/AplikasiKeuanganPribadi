const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.dbPath = path.join(this.userDataPath, 'ituang.db');
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    const initSqlJs = require('sql.js');
    // With --no-asar: __dirname = resources/app/, node_modules is right there
    // In dev: __dirname = project root
    const wasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

    this.SQL = await initSqlJs({
      locateFile: () => wasmPath,
    });

    // Load existing DB from disk or create new
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
    }

    this._createSchema();
    this._save();
  }


  _save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  _run(sql, params = []) {
    this.db.run(sql, params);
    this._save();
  }

  _get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  _all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  _createSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        use_fingerprint INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        account_from_id INTEGER,
        account_to_id INTEGER,
        savings_from_id INTEGER,
        savings_to_id INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);

    // Migrate: seed default budget categories if table is empty
    const existing = this._get('SELECT COUNT(*) AS cnt FROM budgets');
    if (!existing || existing.cnt === 0) {
      const defaults = [
        'Makanan', 'Transportasi', 'Belanja', 'Hiburan',
        'Kesehatan', 'Pendidikan', 'Tagihan', 'Gaji',
        'Investasi', 'Lainnya'
      ];
      for (const cat of defaults) {
        this.db.run(
          'INSERT OR IGNORE INTO budgets (category, amount, is_default) VALUES (?, 0, 1)',
          [cat]
        );
      }
    }

    this._save();
  }

  // ─── Auth / Users ─────────────────────────────────────────────

  /**
   * Returns true if at least one user is registered.
   */
  hasAnyUser() {
    const row = this._get('SELECT COUNT(*) AS cnt FROM users');
    return row && row.cnt > 0;
  }

  /**
   * Register a new user. Returns { success, user } or { success: false, message }.
   * Password is hashed with bcryptjs before storing.
   */
  async registerUser({ username, password, displayName, useFingerprint }) {
    // Check if username already taken
    const existing = this._get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return { success: false, message: 'Username sudah digunakan.' };
    }

    const hash = await bcrypt.hash(password, 12);
    this._run(
      'INSERT INTO users (username, display_name, password_hash, use_fingerprint) VALUES (?, ?, ?, ?)',
      [username, displayName, hash, useFingerprint ? 1 : 0]
    );
    const user = this._get('SELECT id, username, display_name, use_fingerprint FROM users WHERE id = last_insert_rowid()');
    return { success: true, user };
  }

  /**
   * Verify username + password. Returns { success, user } or { success: false, message }.
   */
  async loginUser({ username, password }) {
    const row = this._get('SELECT * FROM users WHERE username = ?', [username]);
    if (!row) {
      return { success: false, message: 'Username atau password salah.' };
    }
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return { success: false, message: 'Username atau password salah.' };
    }
    const { password_hash, ...user } = row;
    return { success: true, user };
  }

  /**
   * Get a user record by username (without password_hash).
   */
  getUserByUsername(username) {
    const row = this._get(
      'SELECT id, username, display_name, use_fingerprint, created_at FROM users WHERE username = ?',
      [username]
    );
    return row || null;
  }

  /**
   * Update fingerprint preference for a user.
   */
  updateFingerprintPreference(username, useFingerprint) {
    this._run(
      'UPDATE users SET use_fingerprint = ? WHERE username = ?',
      [useFingerprint ? 1 : 0, username]
    );
    return { success: true };
  }

  // ─── Accounts ────────────────────────────────────────────────
  getAccounts() {
    return this._all('SELECT * FROM accounts ORDER BY category, name');
  }

  addAccount({ name, category, balance }) {
    this._run(
      'INSERT INTO accounts (name, category, balance) VALUES (?, ?, ?)',
      [name, category, balance || 0]
    );
    const row = this._get('SELECT * FROM accounts WHERE id = last_insert_rowid()');
    return row;
  }

  deleteAccount(id) {
    this._run('DELETE FROM accounts WHERE id = ?', [id]);
    return { changes: 1 };
  }

  updateAccountBalance(id, balance) {
    this._run('UPDATE accounts SET balance = ? WHERE id = ?', [balance, id]);
    return { changes: 1 };
  }

  // ─── Savings ─────────────────────────────────────────────────
  getSavings() {
    return this._all('SELECT * FROM savings ORDER BY name');
  }

  addSaving({ name, balance }) {
    this._run('INSERT INTO savings (name, balance) VALUES (?, ?)', [name, balance || 0]);
    return this._get('SELECT * FROM savings WHERE id = last_insert_rowid()');
  }

  deleteSaving(id) {
    this._run('DELETE FROM savings WHERE id = ?', [id]);
    return { changes: 1 };
  }

  updateSavingBalance(id, balance) {
    this._run('UPDATE savings SET balance = ? WHERE id = ?', [balance, id]);
    return { changes: 1 };
  }

  // ─── Transactions ─────────────────────────────────────────────
  getTransactionsByPeriod(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;
    return this._all(`
      SELECT t.*,
        af.name AS account_from_name, af.category AS account_from_category,
        ato.name AS account_to_name, ato.category AS account_to_category,
        sf.name AS savings_from_name,
        st.name AS savings_to_name
      FROM transactions t
      LEFT JOIN accounts af  ON t.account_from_id = af.id
      LEFT JOIN accounts ato ON t.account_to_id   = ato.id
      LEFT JOIN savings  sf  ON t.savings_from_id = sf.id
      LEFT JOIN savings  st  ON t.savings_to_id   = st.id
      WHERE t.created_at BETWEEN ? AND ?
      ORDER BY t.created_at DESC
    `, [start, end]);
  }

  getAllTransactions() {
    return this._all(`
      SELECT t.*,
        af.name AS account_from_name,
        ato.name AS account_to_name,
        sf.name AS savings_from_name,
        st.name AS savings_to_name
      FROM transactions t
      LEFT JOIN accounts af  ON t.account_from_id = af.id
      LEFT JOIN accounts ato ON t.account_to_id   = ato.id
      LEFT JOIN savings  sf  ON t.savings_from_id = sf.id
      LEFT JOIN savings  st  ON t.savings_to_id   = st.id
      ORDER BY t.created_at DESC
    `);
  }

  addTransaction(data) {
    const {
      item_name, amount, type, category,
      account_from_id, account_to_id,
      savings_from_id, savings_to_id,
      notes
    } = data;

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Makassar' }).replace('T', ' ');

    this.db.run(`
      INSERT INTO transactions
        (item_name, amount, type, category,
         account_from_id, account_to_id,
         savings_from_id, savings_to_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item_name, amount, type, category,
      account_from_id || null,
      account_to_id   || null,
      savings_from_id || null,
      savings_to_id   || null,
      notes || null,
      now
    ]);

    // Update balances
    if (type === 'expense') {
      if (account_from_id) this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_from_id]);
      if (savings_from_id) this.db.run('UPDATE savings  SET balance = balance - ? WHERE id = ?', [amount, savings_from_id]);
    } else if (type === 'income') {
      if (account_to_id) this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_to_id]);
      if (savings_to_id) this.db.run('UPDATE savings  SET balance = balance + ? WHERE id = ?', [amount, savings_to_id]);
    } else if (type === 'transfer') {
      if (account_from_id) this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_from_id]);
      if (savings_from_id) this.db.run('UPDATE savings  SET balance = balance - ? WHERE id = ?', [amount, savings_from_id]);
      if (account_to_id)   this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_to_id]);
      if (savings_to_id)   this.db.run('UPDATE savings  SET balance = balance + ? WHERE id = ?', [amount, savings_to_id]);
    }

    this._save();
    const tx = this._get('SELECT * FROM transactions WHERE id = last_insert_rowid()');
    return tx;
  }

  deleteTransaction(id) {
    const tx = this._get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) return { changes: 0 };

    const { amount, type, account_from_id, account_to_id, savings_from_id, savings_to_id } = tx;

    // Reverse balance
    if (type === 'expense') {
      if (account_from_id) this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_from_id]);
      if (savings_from_id) this.db.run('UPDATE savings  SET balance = balance + ? WHERE id = ?', [amount, savings_from_id]);
    } else if (type === 'income') {
      if (account_to_id) this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_to_id]);
      if (savings_to_id) this.db.run('UPDATE savings  SET balance = balance - ? WHERE id = ?', [amount, savings_to_id]);
    } else if (type === 'transfer') {
      if (account_from_id) this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_from_id]);
      if (savings_from_id) this.db.run('UPDATE savings  SET balance = balance + ? WHERE id = ?', [amount, savings_from_id]);
      if (account_to_id)   this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_to_id]);
      if (savings_to_id)   this.db.run('UPDATE savings  SET balance = balance - ? WHERE id = ?', [amount, savings_to_id]);
    }

    this.db.run('DELETE FROM transactions WHERE id = ?', [id]);
    this._save();
    return { changes: 1 };
  }

  // ─── Dashboard ────────────────────────────────────────────────
  getDashboardSummary(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;
    const income   = this._get(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='income'   AND created_at BETWEEN ? AND ?`, [start, end]);
    const expense  = this._get(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='expense'  AND created_at BETWEEN ? AND ?`, [start, end]);
    const transfer = this._get(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='transfer' AND created_at BETWEEN ? AND ?`, [start, end]);
    return {
      income:   income   ? income.total   : 0,
      expense:  expense  ? expense.total  : 0,
      transfer: transfer ? transfer.total : 0,
      net: (income ? income.total : 0) - (expense ? expense.total : 0),
    };
  }

  getMonthlyChart() {
    return this._all(`
      SELECT
        strftime('%Y-%m', created_at) AS period,
        SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      GROUP BY period
      ORDER BY period ASC
      LIMIT 12
    `);
  }

  getCategoryBreakdown(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;
    return this._all(`
      SELECT category, type, SUM(amount) AS total
      FROM transactions
      WHERE created_at BETWEEN ? AND ?
        AND type IN ('income','expense')
      GROUP BY category, type
      ORDER BY total DESC
    `, [start, end]);
  }

  // ─── Budgets ──────────────────────────────────────────────────
  getBudgets() {
    return this._all('SELECT * FROM budgets ORDER BY is_default DESC, category ASC');
  }

  addBudget({ category, amount }) {
    this._run(
      'INSERT INTO budgets (category, amount, is_default) VALUES (?, ?, 0)',
      [category, amount || 0]
    );
    return this._get('SELECT * FROM budgets WHERE id = last_insert_rowid()');
  }

  updateBudget({ id, amount }) {
    this._run('UPDATE budgets SET amount = ? WHERE id = ?', [amount, id]);
    return { changes: 1 };
  }

  updateBudgetByCategory({ category, amount }) {
    this._run('UPDATE budgets SET amount = ? WHERE category = ?', [amount, category]);
    return { changes: 1 };
  }

  deleteBudget(id) {
    // Only allow deleting custom (non-default) budgets
    this._run('DELETE FROM budgets WHERE id = ? AND is_default = 0', [id]);
    return { changes: 1 };
  }

  getBudgetProgress(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;

    const budgets = this._all('SELECT * FROM budgets ORDER BY is_default DESC, category ASC');
    const actuals = this._all(`
      SELECT category, SUM(amount) AS spent
      FROM transactions
      WHERE type = 'expense'
        AND created_at BETWEEN ? AND ?
      GROUP BY category
    `, [start, end]);

    const actualMap = {};
    actuals.forEach(a => { actualMap[a.category] = a.spent; });

    return budgets.map(b => ({
      ...b,
      spent: actualMap[b.category] || 0,
      remaining: b.amount - (actualMap[b.category] || 0),
      pct: b.amount > 0 ? Math.min(((actualMap[b.category] || 0) / b.amount) * 100, 999) : 0,
    }));
  }
}

module.exports = Database;
