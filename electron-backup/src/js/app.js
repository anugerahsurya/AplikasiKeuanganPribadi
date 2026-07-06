// ═══════════════════════════════════════════════════════
// ITUANG — Main Application Controller (app.js)
// ═══════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────
const state = {
  currentPage: 'overview',
  period: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  accounts: [],
  savings: [],
  transactions: [],
  allTransactions: [],
  txFilter: 'all',
  // Modal state
  txType: 'expense',
  txCat: 'Makanan',
  editingTxId: null,
  // Savings withdraw
  withdrawSavId: null,
  // Memo
  memos: [],
  editingMemoId: null,
  memoColor: '#7aab8a',
  // Charts
  chartMonthly: null,
  chartCategory: null,
  chartBudgetDash: null,
  chartBudgetMain: null,
  // Budgets
  budgets: [],
  // Daily quota (Rp per day)
  DAILY_QUOTA: 100000,
};

const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

const CAT_ICONS = {
  'Makanan': '🍜', 'Transportasi': '🚗', 'Belanja': '🛍️',
  'Hiburan': '🎮', 'Kesehatan': '🏥', 'Pendidikan': '📚',
  'Tagihan': '🧾', 'Gaji': '💼', 'Investasi': '📈',
  'Pindah Dana': '🔄', 'Lainnya': '📦',
};

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadMemos();
  loadData();
});

async function loadData() {
  state.accounts = await api.getAccounts();
  state.savings  = await api.getSavings();
  state.budgets  = await api.getBudgets();
  renderCurrentPage();
}

// ── Navigation ────────────────────────────────────────────
function navigate(page) {
  state.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  const titles = {
    overview:     'Ringkasan Bulanan',
    transactions: 'Semua Transaksi',
    dashboard:    'Dashboard Keuangan',
    accounts:     'Tempat Saldo',
    savings:      'Tabungan',
    budgeting:    'Budgeting',
    memo:         'Catatan Keuangan',
  };
  document.getElementById('topbar-title').textContent = titles[page] || '';

  renderCurrentPage();
}

async function renderCurrentPage() {
  switch (state.currentPage) {
    case 'overview':     await renderOverview(); break;
    case 'transactions': await renderTransactions(); break;
    case 'dashboard':    await renderDashboard(); break;
    case 'accounts':     renderAccounts(); break;
    case 'savings':      renderSavings(); break;
    case 'budgeting':    await renderBudgeting(); break;
    case 'memo':         renderMemos(); break;
  }
}

// ── Refresh ───────────────────────────────────────────────
async function refreshCurrentPage() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.classList.add('spinning');

  try {
    state.accounts = await api.getAccounts();
    state.savings  = await api.getSavings();
    state.budgets  = await api.getBudgets();
    await renderCurrentPage();
    toast('Data berhasil diperbarui! 🔄');
  } catch (e) {
    toast('Gagal refresh data.', 'error');
  } finally {
    setTimeout(() => {
      if (btn) btn.classList.remove('spinning');
    }, 700);
  }
}

// ── Period ────────────────────────────────────────────────
function changePeriod(dir) {
  state.period.month += dir;
  if (state.period.month > 12) { state.period.month = 1;  state.period.year++; }
  if (state.period.month < 1)  { state.period.month = 12; state.period.year--; }
  renderCurrentPage();
}

function getPeriodLabel() {
  return `${MONTHS[state.period.month - 1]} ${state.period.year}`;
}

// ── Format ────────────────────────────────────────────────
function fmtRp(n) {
  const num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

function fmtDate(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const cont = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  cont.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-fade-out');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ═══════════════════════════════════════════════════════
// DAILY QUOTA CALCULATION
// ═══════════════════════════════════════════════════════
function calcDailyQuota(transactions) {
  const now   = new Date();
  const isCurrentPeriod =
    state.period.year === now.getFullYear() &&
    state.period.month === (now.getMonth() + 1);

  let daysElapsed;
  if (isCurrentPeriod) {
    daysElapsed = now.getDate();
  } else {
    daysElapsed = new Date(state.period.year, state.period.month, 0).getDate();
  }

  const totalQuota   = state.DAILY_QUOTA * daysElapsed;
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);

  const remaining = totalQuota - totalExpense;
  return { totalQuota, totalExpense, remaining, daysElapsed };
}

// ═══════════════════════════════════════════════════════
// OVERVIEW PAGE
// ═══════════════════════════════════════════════════════
async function renderOverview() {
  document.getElementById('period-display').textContent = getPeriodLabel();
  const dashDisp = document.getElementById('dash-period-display');
  if (dashDisp) dashDisp.textContent = getPeriodLabel();

  const summary = await api.getDashboardSummary({ year: state.period.year, month: state.period.month });
  state.transactions = await api.getTransactionsByPeriod({ year: state.period.year, month: state.period.month });
  state.accounts = await api.getAccounts();

  const quota = calcDailyQuota(state.transactions);
  let quotaClass, quotaStatus, quotaIcon;
  if (quota.remaining >= state.DAILY_QUOTA) {
    quotaClass = 'ok'; quotaStatus = 'Aman'; quotaIcon = '🟢';
  } else if (quota.remaining >= 0) {
    quotaClass = 'warn'; quotaStatus = 'Hati-hati'; quotaIcon = '🟡';
  } else {
    quotaClass = 'danger'; quotaStatus = 'Melebihi Kuota!'; quotaIcon = '🔴';
  }

  const sumEl = document.getElementById('overview-summary');
  sumEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--success-bg)">💰</div>
      <div class="stat-label">Total Pemasukan</div>
      <div class="stat-value" style="color:var(--success)">${fmtRp(summary.income)}</div>
      <div class="stat-sub">${getPeriodLabel()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--danger-bg)">💸</div>
      <div class="stat-label">Total Pengeluaran</div>
      <div class="stat-value" style="color:var(--danger)">${fmtRp(summary.expense)}</div>
      <div class="stat-sub">${getPeriodLabel()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:${summary.net >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'}">📊</div>
      <div class="stat-label">Selisih (Net)</div>
      <div class="stat-value" style="color:${summary.net >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${summary.net >= 0 ? '+' : ''}${fmtRp(summary.net)}
      </div>
      <div class="stat-sub">Pemasukan - Pengeluaran</div>
    </div>
    <div class="quota-card quota-${quotaClass === 'ok' ? 'ok' : quotaClass === 'warn' ? 'warn' : 'danger'}">
      <div class="stat-icon" style="background:${quotaClass === 'ok' ? 'var(--success-bg)' : quotaClass === 'warn' ? 'var(--warning-bg)' : 'var(--danger-bg)'}">📅</div>
      <div class="stat-label">
        Kuota Harian
        <span class="quota-indicator ${quotaClass}">${quotaIcon} ${quotaStatus}</span>
      </div>
      <div class="stat-value" style="color:${quotaClass === 'ok' ? 'var(--success)' : quotaClass === 'warn' ? 'var(--warning)' : 'var(--danger)'}">
        ${quota.remaining >= 0 ? '' : '-'}${fmtRp(Math.abs(quota.remaining))}
      </div>
      <div class="stat-sub">
        ${quota.daysElapsed} hari × ${fmtRp(state.DAILY_QUOTA)} = ${fmtRp(quota.totalQuota)} kuota
      </div>
    </div>
  `;

  const accEl = document.getElementById('overview-accounts');
  if (state.accounts.length === 0) {
    accEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏦</div><p>Belum ada rekening</p></div>`;
  } else {
    accEl.innerHTML = state.accounts.map(acc => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${acc.category==='Bank' ? 'rgba(122,171,138,0.1)' : 'rgba(212,168,75,0.1)'}">
          ${acc.category === 'Bank' ? '🏦' : '📱'}
        </div>
        <div class="stat-label">${escHtml(acc.name)} <span class="badge ${acc.category==='Bank'?'badge-bank':'badge-ewallet'}">${acc.category}</span></div>
        <div class="stat-value">${fmtRp(acc.balance)}</div>
      </div>
    `).join('');
  }

  renderTxList(state.transactions, 'overview-transactions');
  const countEl = document.getElementById('tx-count');
  if (countEl) countEl.textContent = `${state.transactions.length} transaksi`;
}

// ═══════════════════════════════════════════════════════
// TRANSACTION LIST (shared renderer)
// ═══════════════════════════════════════════════════════
function renderTxList(txs, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const filtered = state.txFilter !== 'all' && containerId !== 'overview-transactions'
    ? txs.filter(t => t.type === state.txFilter)
    : txs;

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Belum ada transaksi untuk periode ini</p>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map(tx => {
    const amtSign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔';
    const platform = getPlatformLabel(tx);
    const icon = CAT_ICONS[tx.category] || '📦';
    return `
      <div class="tx-item">
        <div class="tx-icon ${tx.type}">${icon}</div>
        <div class="tx-info">
          <div class="tx-name">${escHtml(tx.item_name)}</div>
          <div class="tx-meta">
            <span class="badge badge-${tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer'}">${
              tx.type === 'income' ? 'Masuk' : tx.type === 'expense' ? 'Keluar' : 'Transfer'
            }</span>
            &nbsp;${escHtml(tx.category)}
            ${platform ? `&nbsp;·&nbsp;${platform}` : ''}
            &nbsp;·&nbsp;${fmtDate(tx.created_at)}
          </div>
        </div>
        <div class="tx-amount ${tx.type}">${amtSign} ${fmtRp(tx.amount)}</div>
        <div class="tx-actions">
          <button class="tx-btn tx-edit" onclick="openEditTxModal(${tx.id})" title="Edit">✏️</button>
          <button class="tx-btn tx-delete" onclick="deleteTx(${tx.id})" title="Hapus">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function getPlatformLabel(tx) {
  const parts = [];
  if (tx.account_from_name) parts.push(`dari ${tx.account_from_name}`);
  else if (tx.savings_from_name) parts.push(`dari ${tx.savings_from_name}`);
  if (tx.account_to_name) parts.push(`ke ${tx.account_to_name}`);
  else if (tx.savings_to_name) parts.push(`ke ${tx.savings_to_name}`);
  return parts.join(', ');
}

// ═══════════════════════════════════════════════════════
// ALL TRANSACTIONS PAGE
// ═══════════════════════════════════════════════════════
async function renderTransactions() {
  state.allTransactions = await api.getAllTransactions();
  renderTxList(
    state.txFilter === 'all' ? state.allTransactions : state.allTransactions.filter(t => t.type === state.txFilter),
    'all-transactions'
  );
}

function setTxFilter(filter) {
  state.txFilter = filter;
  document.querySelectorAll('#tx-filter-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderTransactions();
}

async function deleteTx(id) {
  if (!confirm('Hapus transaksi ini? Saldo akan dikembalikan otomatis.')) return;
  await api.deleteTransaction(id);
  state.accounts = await api.getAccounts();
  state.savings  = await api.getSavings();
  toast('Transaksi berhasil dihapus.');
  renderCurrentPage();
}

// ── Open Edit Transaction Modal ───────────────────────
async function openEditTxModal(id) {
  let tx = null;
  const all = state.allTransactions.length ? state.allTransactions : await api.getAllTransactions();
  tx = all.find(t => t.id === id);
  if (!tx) {
    tx = state.transactions.find(t => t.id === id);
  }
  if (!tx) { toast('Transaksi tidak ditemukan.', 'error'); return; }

  state.editingTxId = id;
  state.txType = tx.type;
  state.txCat  = tx.category;

  document.getElementById('modal-tx-title').textContent = '✏️ Edit Transaksi';
  document.getElementById('btn-submit-tx').textContent = 'Simpan Perubahan';

  document.getElementById('tx-name').value   = tx.item_name;
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-notes').value  = tx.notes || '';

  document.querySelectorAll('[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === tx.type);
  });
  document.querySelectorAll('#tx-cat-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === tx.category);
  });

  renderPlatformFields();

  setTimeout(() => {
    if (tx.account_from_id && document.getElementById('tx-from')) {
      document.getElementById('tx-from').value = `account:${tx.account_from_id}`;
    }
    if (tx.account_to_id && document.getElementById('tx-to')) {
      document.getElementById('tx-to').value = `account:${tx.account_to_id}`;
    }
  }, 50);

  openModal('modal-tx');
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard() {
  document.getElementById('dash-period-display').textContent = getPeriodLabel();

  const [summary, monthlyData, catData, budgetProgress] = await Promise.all([
    api.getDashboardSummary({ year: state.period.year, month: state.period.month }),
    api.getMonthlyChart(),
    api.getCategoryBreakdown({ year: state.period.year, month: state.period.month }),
    api.getBudgetProgress({ year: state.period.year, month: state.period.month }),
  ]);

  // Summary cards
  const totalBalance = state.accounts.reduce((s, a) => s + a.balance, 0);
  document.getElementById('dash-summary-cards').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(122,171,138,0.1)">💳</div>
      <div class="stat-label">Total Saldo</div>
      <div class="stat-value">${fmtRp(totalBalance)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--success-bg)">📥</div>
      <div class="stat-label">Pemasukan</div>
      <div class="stat-value" style="color:var(--success)">${fmtRp(summary.income)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--danger-bg)">📤</div>
      <div class="stat-label">Pengeluaran</div>
      <div class="stat-value" style="color:var(--danger)">${fmtRp(summary.expense)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:${summary.net >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'}">📊</div>
      <div class="stat-label">Net Cashflow</div>
      <div class="stat-value" style="color:${summary.net >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${summary.net >= 0 ? '+' : ''}${fmtRp(summary.net)}
      </div>
    </div>
  `;

  // Monthly bar chart
  const monthCtx = document.getElementById('chart-monthly')?.getContext('2d');
  if (monthCtx) {
    if (state.chartMonthly) state.chartMonthly.destroy();
    state.chartMonthly = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(d => d.period),
        datasets: [
          {
            label: 'Pemasukan',
            data: monthlyData.map(d => d.income),
            backgroundColor: 'rgba(76,175,125,0.7)',
            borderRadius: 6,
          },
          {
            label: 'Pengeluaran',
            data: monthlyData.map(d => d.expense),
            backgroundColor: 'rgba(224,92,92,0.7)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#96a89e', font: { family: 'Poppins', size: 11 } } },
          tooltip: { callbacks: { label: ctx => fmtRp(ctx.parsed.y) } },
        },
        scales: {
          x: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 }, callback: v => 'Rp ' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    });
  }

  // Category donut chart (expense only)
  const expCats = catData.filter(d => d.type === 'expense');
  const catCtx = document.getElementById('chart-category')?.getContext('2d');
  if (catCtx) {
    if (state.chartCategory) state.chartCategory.destroy();
    if (expCats.length > 0) {
      const COLORS = ['#7aab8a','#4caf7d','#4a9abe','#d4a84b','#e05c5c','#9b7fd4','#56967a','#06b6d4','#84cc16','#a78bfa','#fb7185'];
      state.chartCategory = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: expCats.map(d => d.category),
          datasets: [{
            data: expCats.map(d => d.total),
            backgroundColor: COLORS.slice(0, expCats.length),
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'right', labels: { color: '#96a89e', font: { family: 'Poppins', size: 11 }, boxWidth: 12, padding: 10 } },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmtRp(ctx.parsed)}` } },
          },
        },
      });
    } else {
      catCtx.canvas.parentElement.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><p>Belum ada data pengeluaran</p></div>`;
    }
  }

  // ── Budget progress chart on Dashboard ──────────────
  const dashBudgetWrap = document.getElementById('dash-budget-chart-wrap');
  const dashBudgetEmpty = document.getElementById('dash-budget-empty');
  const budgetCtxDash = document.getElementById('chart-budget-dash')?.getContext('2d');

  // Only show categories that have a budget set (amount > 0) OR have spending
  const activeBudgets = budgetProgress.filter(b => b.amount > 0 || b.spent > 0);

  if (activeBudgets.length === 0) {
    if (dashBudgetWrap) dashBudgetWrap.style.display = 'none';
    if (dashBudgetEmpty) dashBudgetEmpty.style.display = 'flex';
  } else {
    if (dashBudgetWrap) dashBudgetWrap.style.display = 'block';
    if (dashBudgetEmpty) dashBudgetEmpty.style.display = 'none';

    if (budgetCtxDash) {
      if (state.chartBudgetDash) state.chartBudgetDash.destroy();
      const labels    = activeBudgets.map(b => `${CAT_ICONS[b.category] || '📦'} ${b.category}`);
      const spentData = activeBudgets.map(b => b.spent);
      const limData   = activeBudgets.map(b => b.amount);
      const barColors = activeBudgets.map(b =>
        b.amount === 0 ? 'rgba(74,154,190,0.7)' :
        b.pct < 70 ? 'rgba(76,175,125,0.75)' :
        b.pct < 100 ? 'rgba(212,168,75,0.75)' :
        'rgba(224,92,92,0.75)'
      );

      state.chartBudgetDash = new Chart(budgetCtxDash, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Pengeluaran Aktual',
              data: spentData,
              backgroundColor: barColors,
              borderRadius: 6,
              order: 1,
            },
            {
              label: 'Batas Anggaran',
              data: limData,
              type: 'line',
              borderColor: 'rgba(122,171,138,0.5)',
              borderWidth: 2,
              borderDash: [5, 4],
              pointBackgroundColor: 'rgba(122,171,138,0.8)',
              pointRadius: 4,
              fill: false,
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#96a89e', font: { family: 'Poppins', size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${fmtRp(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 }, callback: v => 'Rp ' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }
  }

  // Category breakdown table
  const tblEl = document.getElementById('cat-breakdown-table');
  if (catData.length === 0) {
    tblEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>Belum ada transaksi</p></div>`;
  } else {
    const grouped = {};
    catData.forEach(d => {
      if (!grouped[d.category]) grouped[d.category] = { income: 0, expense: 0 };
      grouped[d.category][d.type] = d.total;
    });
    tblEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:8px 0;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Kategori</th>
            <th style="text-align:right;padding:8px 0;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Pemasukan</th>
            <th style="text-align:right;padding:8px 0;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Pengeluaran</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grouped).map(([cat, vals]) => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 0;font-size:13px;color:var(--text-primary);">
                ${CAT_ICONS[cat] || '📦'} ${escHtml(cat)}
              </td>
              <td style="text-align:right;padding:10px 0;font-size:13px;color:var(--success);">
                ${vals.income ? fmtRp(vals.income) : '—'}
              </td>
              <td style="text-align:right;padding:10px 0;font-size:13px;color:var(--danger);">
                ${vals.expense ? fmtRp(vals.expense) : '—'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// ═══════════════════════════════════════════════════════
// ACCOUNTS PAGE
// ═══════════════════════════════════════════════════════
function renderAccounts() {
  const banks    = state.accounts.filter(a => a.category === 'Bank');
  const ewallets = state.accounts.filter(a => a.category === 'E-Wallet');

  const renderCards = (list) => {
    if (list.length === 0) return `<div class="empty-state"><div class="empty-state-icon">➕</div><p>Belum ada data</p></div>`;
    return list.map(acc => `
      <div class="account-card">
        <div class="account-card-header">
          <div class="account-card-icon" style="background:${acc.category==='Bank'?'rgba(122,171,138,0.1)':'rgba(212,168,75,0.1)'}">
            ${acc.category==='Bank'?'🏦':'📱'}
          </div>
          <span class="badge ${acc.category==='Bank'?'badge-bank':'badge-ewallet'}">${acc.category}</span>
        </div>
        <div class="account-card-balance">${fmtRp(acc.balance)}</div>
        <div class="account-card-name">${escHtml(acc.name)}</div>
        <div class="account-card-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteAccount(${acc.id})">Hapus</button>
        </div>
      </div>
    `).join('');
  };

  document.getElementById('accounts-bank').innerHTML    = renderCards(banks);
  document.getElementById('accounts-ewallet').innerHTML = renderCards(ewallets);
}

function openAccountModal() {
  document.getElementById('acc-name').value    = '';
  document.getElementById('acc-balance').value = '';
  document.getElementById('acc-category').value = 'Bank';
  openModal('modal-account');
}

async function submitAccount() {
  const name     = document.getElementById('acc-name').value.trim();
  const category = document.getElementById('acc-category').value;
  const balance  = parseFloat(document.getElementById('acc-balance').value) || 0;
  if (!name) { toast('Nama rekening harus diisi.', 'error'); return; }
  await api.addAccount({ name, category, balance });
  state.accounts = await api.getAccounts();
  closeModal('modal-account');
  renderAccounts();
  toast(`Rekening "${name}" berhasil ditambahkan!`);
}

async function deleteAccount(id) {
  if (!confirm('Hapus rekening ini?')) return;
  await api.deleteAccount(id);
  state.accounts = await api.getAccounts();
  renderAccounts();
  toast('Rekening berhasil dihapus.');
}

// ═══════════════════════════════════════════════════════
// SAVINGS PAGE
// ═══════════════════════════════════════════════════════
function renderSavings() {
  const el = document.getElementById('savings-list');
  if (state.savings.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🐷</div><p>Belum ada tabungan</p></div>`;
    return;
  }
  el.innerHTML = state.savings.map(sav => `
    <div class="saving-card">
      <div class="account-card-header">
        <div class="account-card-icon" style="background:rgba(76,175,125,0.1)">🐷</div>
        <span class="badge badge-saving">Tabungan</span>
      </div>
      <div class="account-card-balance">${fmtRp(sav.balance)}</div>
      <div class="account-card-name">${escHtml(sav.name)}</div>
      <div class="account-card-actions">
        <button class="btn btn-sm btn-success" onclick="openWithdrawSavingModal(${sav.id})">💸 Cairkan</button>
        <button class="btn btn-sm btn-danger"  onclick="deleteSaving(${sav.id})">Hapus</button>
      </div>
    </div>
  `).join('');
}

function openSavingModal() {
  document.getElementById('sav-name').value    = '';
  document.getElementById('sav-balance').value = '';
  openModal('modal-saving');
}

async function submitSaving() {
  const name    = document.getElementById('sav-name').value.trim();
  const balance = parseFloat(document.getElementById('sav-balance').value) || 0;
  if (!name) { toast('Nama tabungan harus diisi.', 'error'); return; }
  await api.addSaving({ name, balance });
  state.savings = await api.getSavings();
  closeModal('modal-saving');
  renderSavings();
  toast(`Tabungan "${name}" berhasil ditambahkan!`);
}

async function deleteSaving(id) {
  if (!confirm('Hapus tabungan ini?')) return;
  await api.deleteSaving(id);
  state.savings = await api.getSavings();
  renderSavings();
  toast('Tabungan berhasil dihapus.');
}

// ── Cairkan Tabungan ──────────────────────────────────
function openWithdrawSavingModal(savId) {
  const sav = state.savings.find(s => s.id === savId);
  if (!sav) return;
  state.withdrawSavId = savId;

  document.getElementById('withdraw-sav-name').value    = sav.name;
  document.getElementById('withdraw-sav-balance').value = fmtRp(sav.balance);
  document.getElementById('withdraw-amount').value      = '';

  const accOpts = state.accounts.map(a =>
    `<option value="${a.id}">${escHtml(a.name)} (${a.category}) — ${fmtRp(a.balance)}</option>`
  ).join('');
  document.getElementById('withdraw-account').innerHTML =
    `<option value="">— Pilih rekening tujuan —</option>${accOpts}`;

  openModal('modal-saving-withdraw');
}

async function submitWithdrawSaving() {
  const savId     = state.withdrawSavId;
  const amount    = parseFloat(document.getElementById('withdraw-amount').value);
  const accountId = parseInt(document.getElementById('withdraw-account').value);

  if (!amount || amount <= 0) { toast('Jumlah harus lebih dari 0.', 'error'); return; }
  if (!accountId) { toast('Pilih rekening tujuan.', 'error'); return; }

  const sav = state.savings.find(s => s.id === savId);
  if (amount > sav.balance) { toast('Jumlah melebihi saldo tabungan.', 'error'); return; }

  const accName = state.accounts.find(a => a.id === accountId)?.name || '';

  await api.addTransaction({
    item_name:       `Cairkan tabungan ${sav.name} → ${accName}`,
    amount,
    type:            'transfer',
    category:        'Pindah Dana',
    account_from_id: null,
    account_to_id:   accountId,
    savings_from_id: savId,
    savings_to_id:   null,
    notes:           'Pencairan tabungan',
  });

  state.accounts = await api.getAccounts();
  state.savings  = await api.getSavings();
  closeModal('modal-saving-withdraw');
  toast(`Tabungan berhasil dicairkan ke ${accName}! 🎉`);
  renderCurrentPage();
}

// ═══════════════════════════════════════════════════════
// BUDGETING PAGE
// ═══════════════════════════════════════════════════════
async function renderBudgeting() {
  const periodDisp = document.getElementById('budget-period-display');
  if (periodDisp) periodDisp.textContent = getPeriodLabel();

  const progress = await api.getBudgetProgress({
    year: state.period.year,
    month: state.period.month,
  });
  state.budgets = await api.getBudgets();

  // ── Main budget bar chart ────────────────────────────
  const budgetMainCtx = document.getElementById('chart-budget-main')?.getContext('2d');
  if (budgetMainCtx) {
    if (state.chartBudgetMain) state.chartBudgetMain.destroy();

    const withBudget = progress.filter(b => b.amount > 0);

    if (withBudget.length === 0) {
      budgetMainCtx.canvas.parentElement.innerHTML = `
        <div class="empty-state" style="height:100%;justify-content:center;">
          <div class="empty-state-icon">🎯</div>
          <p>Belum ada anggaran yang ditetapkan. Klik kartu kategori untuk mengatur nominal.</p>
        </div>`;
    } else {
      const labels    = withBudget.map(b => `${CAT_ICONS[b.category] || '📦'} ${b.category}`);
      const spentData = withBudget.map(b => b.spent);
      const limData   = withBudget.map(b => b.amount);
      const barColors = withBudget.map(b =>
        b.pct < 70  ? 'rgba(76,175,125,0.8)' :
        b.pct < 100 ? 'rgba(212,168,75,0.8)' :
                      'rgba(224,92,92,0.85)'
      );

      state.chartBudgetMain = new Chart(budgetMainCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Pengeluaran Aktual',
              data: spentData,
              backgroundColor: barColors,
              borderRadius: 6,
              order: 1,
            },
            {
              label: 'Batas Anggaran',
              data: limData,
              type: 'line',
              borderColor: 'rgba(162,196,176,0.7)',
              borderWidth: 2,
              borderDash: [5, 4],
              pointBackgroundColor: 'rgba(122,171,138,0.9)',
              pointRadius: 5,
              fill: false,
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#96a89e', font: { family: 'Poppins', size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${fmtRp(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#526058', font: { family: 'Poppins', size: 11 }, callback: v => 'Rp ' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }
  }

  // ── Budget cards ────────────────────────────────────
  const cardsEl = document.getElementById('budget-cards');
  if (!cardsEl) return;

  if (progress.length === 0) {
    cardsEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🎯</div><p>Tidak ada kategori budget.</p></div>`;
    return;
  }

  cardsEl.innerHTML = progress.map(b => {
    const pct         = b.amount > 0 ? Math.min(b.pct, 100) : 0;
    const pctClass    = b.pct < 70 ? 'safe' : b.pct < 100 ? 'warn' : 'danger';
    const barClass    = pctClass;
    const isOver      = b.spent > b.amount && b.amount > 0;
    const icon        = CAT_ICONS[b.category] || '📦';
    const isDefault   = b.is_default === 1 || b.is_default === '1';

    return `
      <div class="budget-card${isOver ? ' over-budget' : ''}" onclick="openBudgetEditModal(${b.id}, '${escHtml(b.category)}', ${b.amount})">
        <div class="budget-card-actions">
          ${!isDefault ? `<button class="tx-btn tx-delete" onclick="event.stopPropagation();deleteBudgetCustom(${b.id})" title="Hapus">🗑</button>` : ''}
        </div>
        <div class="budget-card-header">
          <div class="budget-card-cat">
            <span>${icon}</span> ${escHtml(b.category)}
          </div>
          <span class="badge ${isDefault ? 'badge-budget' : 'badge-custom'}">${isDefault ? 'Default' : 'Kustom'}</span>
        </div>
        <div class="budget-card-meta">
          <span class="budget-card-spent" style="color:${isOver?'var(--danger)':'var(--text-primary)'}">${fmtRp(b.spent)} terpakai</span>
          <span class="budget-card-limit">${b.amount > 0 ? 'dari ' + fmtRp(b.amount) : 'Belum diset'}</span>
        </div>
        <div class="budget-progress-wrap">
          <div class="budget-progress-bar ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="budget-card-footer">
          <span class="budget-remaining ${b.remaining >= 0 ? 'positive' : 'negative'}">
            ${b.amount > 0
              ? (b.remaining >= 0 ? `Sisa ${fmtRp(b.remaining)}` : `Lebih ${fmtRp(Math.abs(b.remaining))}`)
              : 'Klik untuk set anggaran'}
          </span>
          ${b.amount > 0 ? `<span class="budget-pct ${pctClass}">${b.pct.toFixed(0)}%</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Open budget edit modal (set nominal) ─────────────
function openBudgetEditModal(id, category, currentAmount) {
  document.getElementById('budget-edit-id').value          = id;
  document.getElementById('budget-edit-category').value    = category;
  document.getElementById('budget-edit-cat-display').value = category;
  document.getElementById('budget-edit-amount').value      = currentAmount || '';
  document.getElementById('modal-budget-edit-title').textContent = `✏️ Atur Anggaran — ${category}`;
  openModal('modal-budget-edit');
}

async function submitBudgetEdit() {
  const id     = parseInt(document.getElementById('budget-edit-id').value);
  const amount = parseFloat(document.getElementById('budget-edit-amount').value) || 0;
  if (amount < 0) { toast('Nominal tidak boleh negatif.', 'error'); return; }
  await api.updateBudget({ id, amount });
  state.budgets = await api.getBudgets();
  closeModal('modal-budget-edit');
  toast('Anggaran berhasil disimpan! 🎯');
  renderBudgeting();
}

// ── Open add custom budget modal ─────────────────────
function openBudgetModal() {
  document.getElementById('budget-add-name').value   = '';
  document.getElementById('budget-add-amount').value = '';
  openModal('modal-budget-add');
}

async function submitBudgetAdd() {
  const category = document.getElementById('budget-add-name').value.trim();
  const amount   = parseFloat(document.getElementById('budget-add-amount').value) || 0;
  if (!category) { toast('Nama kategori harus diisi.', 'error'); return; }

  // Check duplicate
  const existing = state.budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
  if (existing) { toast('Kategori sudah ada.', 'error'); return; }

  await api.addBudget({ category, amount });
  state.budgets = await api.getBudgets();
  closeModal('modal-budget-add');
  toast(`Kategori "${category}" berhasil ditambahkan!`);
  renderBudgeting();
}

async function deleteBudgetCustom(id) {
  if (!confirm('Hapus kategori kustom ini?')) return;
  await api.deleteBudget(id);
  state.budgets = await api.getBudgets();
  toast('Kategori berhasil dihapus.');
  renderBudgeting();
}

// ═══════════════════════════════════════════════════════
// TRANSACTION MODAL
// ═══════════════════════════════════════════════════════
function openTxModal() {
  state.editingTxId = null;
  state.txType = 'expense';
  state.txCat  = 'Makanan';
  document.getElementById('tx-name').value   = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-notes').value  = '';
  document.getElementById('modal-tx-title').textContent  = 'Tambah Transaksi';
  document.getElementById('btn-submit-tx').textContent   = 'Simpan Transaksi';

  document.querySelectorAll('[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === 'expense');
  });
  document.querySelectorAll('#tx-cat-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === 'Makanan');
  });

  renderPlatformFields();
  openModal('modal-tx');
}

function setTxType(type) {
  state.txType = type;
  document.querySelectorAll('[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  if (type === 'transfer') {
    setTxCat('Pindah Dana');
  }
  renderPlatformFields();
}

function setTxCat(cat) {
  state.txCat = cat;
  document.querySelectorAll('#tx-cat-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
}

function renderPlatformFields() {
  const container = document.getElementById('tx-platform-fields');
  const accOpts = state.accounts.map(a =>
    `<option value="account:${a.id}">${escHtml(a.name)} (${a.category})</option>`
  ).join('');

  if (state.txType === 'expense') {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Sumber Dana (dari)</label>
        <select id="tx-from" class="form-control">
          <option value="">— Pilih rekening —</option>
          ${accOpts}
        </select>
      </div>
    `;
  } else if (state.txType === 'income') {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Tujuan Dana (ke)</label>
        <select id="tx-to" class="form-control">
          <option value="">— Pilih rekening —</option>
          ${accOpts}
        </select>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="grid grid-2">
        <div class="form-group">
          <label class="form-label">Dari (Sumber)</label>
          <select id="tx-from" class="form-control">
            <option value="">— Pilih rekening —</option>
            ${accOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ke (Tujuan)</label>
          <select id="tx-to" class="form-control">
            <option value="">— Pilih rekening —</option>
            ${accOpts}
          </select>
        </div>
      </div>
    `;
  }
}

function parseSelectPlatform(selectId) {
  const val = document.getElementById(selectId)?.value || '';
  if (!val) return {};
  const [type, id] = val.split(':');
  if (type === 'account') return { account_id: parseInt(id) };
  return {};
}

async function submitTransaction() {
  const item_name = document.getElementById('tx-name').value.trim();
  const amount    = parseFloat(document.getElementById('tx-amount').value);
  const notes     = document.getElementById('tx-notes').value.trim();

  if (!item_name) { toast('Nama transaksi harus diisi.', 'error'); return; }
  if (!amount || amount <= 0) { toast('Jumlah harus lebih dari 0.', 'error'); return; }

  const data = {
    item_name, amount,
    type:     state.txType,
    category: state.txCat,
    notes,
    account_from_id: null,
    account_to_id:   null,
    savings_from_id: null,
    savings_to_id:   null,
  };

  if (state.txType === 'expense' || state.txType === 'transfer') {
    const from = parseSelectPlatform('tx-from');
    if (from.account_id) data.account_from_id = from.account_id;
  }
  if (state.txType === 'income' || state.txType === 'transfer') {
    const to = parseSelectPlatform('tx-to');
    if (to.account_id) data.account_to_id = to.account_id;
  }

  if (state.editingTxId) {
    await api.deleteTransaction(state.editingTxId);
    await api.addTransaction(data);
    toast('Transaksi berhasil diperbarui! ✏️');
  } else {
    await api.addTransaction(data);
    toast('Transaksi berhasil disimpan! 🎉');
  }

  state.editingTxId = null;
  state.accounts = await api.getAccounts();
  state.savings  = await api.getSavings();
  closeModal('modal-tx');
  renderCurrentPage();
}

// ═══════════════════════════════════════════════════════
// MEMO / CATATAN KEUANGAN
// ═══════════════════════════════════════════════════════
const MEMO_STORAGE_KEY = 'ituang_memos';

function loadMemos() {
  try {
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    state.memos = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.memos = [];
  }
}

function saveMemos() {
  localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(state.memos));
}

function renderMemos() {
  const el = document.getElementById('memo-list');
  if (!el) return;
  if (state.memos.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📝</div>
        <p>Belum ada catatan. Klik "+ Catatan Baru" untuk membuat catatan keuangan.</p>
      </div>`;
    return;
  }
  el.innerHTML = state.memos.map(m => `
    <div class="memo-card">
      <div class="memo-dot" style="background:${escHtml(m.color || '#7aab8a')}"></div>
      <div class="memo-card-title">${escHtml(m.title)}</div>
      <div class="memo-card-content">${escHtml(m.content)}</div>
      <div class="memo-card-date">${m.date || ''}</div>
      <div class="memo-card-actions">
        <button class="tx-btn tx-edit" onclick="openEditMemoModal(${m.id})" title="Edit">✏️</button>
        <button class="tx-btn tx-delete" onclick="deleteMemo(${m.id})" title="Hapus">🗑</button>
      </div>
    </div>
  `).join('');
}

function openMemoModal() {
  state.editingMemoId = null;
  state.memoColor = '#7aab8a';
  document.getElementById('modal-memo-title').textContent = '📝 Catatan Baru';
  document.getElementById('btn-submit-memo').textContent  = 'Simpan Catatan';
  document.getElementById('memo-title-input').value   = '';
  document.getElementById('memo-content-input').value = '';
  document.querySelectorAll('#memo-color-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.color === '#7aab8a');
  });
  openModal('modal-memo');
}

function openEditMemoModal(id) {
  const memo = state.memos.find(m => m.id === id);
  if (!memo) return;
  state.editingMemoId = id;
  state.memoColor = memo.color || '#7aab8a';
  document.getElementById('modal-memo-title').textContent = '✏️ Edit Catatan';
  document.getElementById('btn-submit-memo').textContent  = 'Simpan Perubahan';
  document.getElementById('memo-title-input').value   = memo.title;
  document.getElementById('memo-content-input').value = memo.content;
  document.querySelectorAll('#memo-color-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.color === state.memoColor);
  });
  openModal('modal-memo');
}

function setMemoColor(color) {
  state.memoColor = color;
  document.querySelectorAll('#memo-color-tabs .cat-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.color === color);
  });
}

function submitMemo() {
  const title   = document.getElementById('memo-title-input').value.trim();
  const content = document.getElementById('memo-content-input').value.trim();
  if (!title) { toast('Judul catatan harus diisi.', 'error'); return; }

  const now = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  if (state.editingMemoId !== null) {
    const idx = state.memos.findIndex(m => m.id === state.editingMemoId);
    if (idx !== -1) {
      state.memos[idx] = { ...state.memos[idx], title, content, color: state.memoColor };
    }
    toast('Catatan berhasil diperbarui! ✏️');
  } else {
    const newId = Date.now();
    state.memos.unshift({ id: newId, title, content, color: state.memoColor, date: now });
    toast('Catatan berhasil disimpan! 📝');
  }

  saveMemos();
  closeModal('modal-memo');
  renderMemos();
}

function deleteMemo(id) {
  if (!confirm('Hapus catatan ini?')) return;
  state.memos = state.memos.filter(m => m.id !== id);
  saveMemos();
  renderMemos();
  toast('Catatan berhasil dihapus.');
}

// ═══════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── XSS helper ───────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
