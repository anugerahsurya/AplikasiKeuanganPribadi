import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  Calendar, 
  CreditCard, 
  Landmark, 
  Smartphone, 
  History, 
  Inbox, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { getAccounts, getTransactionsByPeriod, addTransaction, deleteTransaction, getDashboardSummary, getSavings } from '../services/db';
import { fmtRp, fmtDate, MONTHS } from '../utils/format';
import TransactionModal from '../components/TransactionModal';
import CategoryIcon from '../components/CategoryIcon';

export default function Overview({ setCurrentPage, onToast, refreshTrigger, triggerRefresh }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [accounts, setAccounts] = useState([]);
  const [savings, setSavings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const DAILY_QUOTA = 100000; // Rp 100.000 / day

  useEffect(() => {
    loadData();
  }, [period, refreshTrigger]);

  const loadData = () => {
    const accs = getAccounts();
    const savs = getSavings();
    const txs = getTransactionsByPeriod(period.year, period.month);
    const sum = getDashboardSummary(period.year, period.month);
    
    setAccounts(accs);
    setSavings(savs);
    setTransactions(txs);
    setSummary(sum);
  };

  const handlePrevMonth = () => {
    setPeriod(prev => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      return { year: y, month: m };
    });
  };

  const handleNextMonth = () => {
    setPeriod(prev => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const getPeriodLabel = () => {
    return `${MONTHS[period.month - 1]} ${period.year}`;
  };

  // Quota calculation
  const getQuotaData = () => {
    const now = new Date();
    const isCurrentPeriod = period.year === now.getFullYear() && period.month === (now.getMonth() + 1);
    
    let daysElapsed;
    if (isCurrentPeriod) {
      daysElapsed = now.getDate();
    } else {
      daysElapsed = new Date(period.year, period.month, 0).getDate();
    }

    const totalQuota = DAILY_QUOTA * daysElapsed;
    const totalExpense = transactions
      .filter(t => t.type === 'expense' && t.exclude_from_quota !== 1 && t.exclude_from_quota !== '1' && t.exclude_from_quota !== true)
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = totalQuota - totalExpense;
    return { totalQuota, totalExpense, remaining, daysElapsed };
  };

  const quota = getQuotaData();
  
  let quotaClass = 'ok';
  let quotaStatus = 'Aman';
  let quotaIcon = '🟢';
  
  if (quota.remaining < 0) {
    quotaClass = 'danger';
    quotaStatus = 'Melebihi Kuota!';
    quotaIcon = '🔴';
  } else if (quota.remaining < DAILY_QUOTA) {
    quotaClass = 'warn';
    quotaStatus = 'Hati-Hati';
    quotaIcon = '🟡';
  }

  const handleSaveTransaction = async (data, id) => {
    try {
      if (id) {
        // Edit mode (delete old, add new to preserve balances)
        await deleteTransaction(id);
        await addTransaction(data);
        onToast('Transaksi berhasil diperbarui! ✏️');
      } else {
        // Add mode
        await addTransaction(data);
        onToast('Transaksi berhasil disimpan! 🎉');
      }
      setIsModalOpen(false);
      setEditingTx(null);
      triggerRefresh();
    } catch (e) {
      onToast('Gagal menyimpan transaksi.', 'error');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Hapus transaksi ini? Saldo rekening akan dikembalikan secara otomatis.')) return;
    try {
      await deleteTransaction(id);
      onToast('Transaksi berhasil dihapus.');
      triggerRefresh();
    } catch (e) {
      onToast('Gagal menghapus transaksi.', 'error');
    }
  };

  const handleEditClick = (tx) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  return (
    <div className="page active">

      {/* Period Navigator */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="period-nav" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', padding: '4px' }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrevMonth} style={{ padding: '8px' }}>
            <ChevronLeft size={16} />
          </button>
          <div className="period-display" style={{ fontWeight: 600, padding: '0 16px', minWidth: '120px', textAlign: 'center', fontSize: '14px' }}>
            {getPeriodLabel()}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleNextMonth} style={{ padding: '8px' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        
        <button className="btn btn-primary" onClick={() => { setEditingTx(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--color-success) / 0.1)', color: 'hsl(var(--color-success))' }}>
            <ArrowDownLeft size={20} />
          </div>
          <div className="stat-label">Total Pemasukan</div>
          <div className="stat-value" style={{ color: 'hsl(var(--color-success))' }}>{fmtRp(summary.income)}</div>
          <div className="stat-sub">{getPeriodLabel()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--color-danger) / 0.1)', color: 'hsl(var(--color-danger))' }}>
            <ArrowUpRight size={20} />
          </div>
          <div className="stat-label">Total Pengeluaran</div>
          <div className="stat-value" style={{ color: 'hsl(var(--color-danger))' }}>{fmtRp(summary.expense)}</div>
          <div className="stat-sub">{getPeriodLabel()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ 
            backgroundColor: summary.net >= 0 ? 'hsl(var(--color-success) / 0.1)' : 'hsl(var(--color-danger) / 0.1)',
            color: summary.net >= 0 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))'
          }}>
            <Scale size={20} />
          </div>
          <div className="stat-label">Selisih (Net)</div>
          <div className="stat-value" style={{ color: summary.net >= 0 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))' }}>
            {summary.net >= 0 ? '+' : ''}{fmtRp(summary.net)}
          </div>
          <div className="stat-sub">Pemasukan - Pengeluaran</div>
        </div>

        {/* Quota Card */}
        <div className={`quota-card quota-${quotaClass}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ 
              backgroundColor: quotaClass === 'ok' ? 'hsl(var(--color-success) / 0.15)' : quotaClass === 'warn' ? 'hsl(var(--color-warning) / 0.15)' : 'hsl(var(--color-danger) / 0.15)',
              color: quotaClass === 'ok' ? 'hsl(var(--color-success))' : quotaClass === 'warn' ? 'hsl(var(--color-warning))' : 'hsl(var(--color-danger))',
              marginBottom: 0
            }}>
              <Calendar size={20} />
            </div>
            <span className={`quota-indicator ${quotaClass}`} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: quotaClass === 'ok' ? 'hsl(var(--color-success))' : quotaClass === 'warn' ? 'hsl(var(--color-warning))' : 'hsl(var(--color-danger))' }}></span>
              {quotaStatus}
            </span>
          </div>
          <div className="stat-label">Kuota Harian Tersisa</div>
          <div className="stat-value" style={{ color: quotaClass === 'ok' ? 'hsl(var(--color-success))' : quotaClass === 'warn' ? 'hsl(var(--color-warning))' : 'hsl(var(--color-danger))' }}>
            {quota.remaining < 0 ? '-' : ''}{fmtRp(Math.abs(quota.remaining))}
          </div>
          <div className="stat-sub">
            {quota.daysElapsed} hari × {fmtRp(DAILY_QUOTA)} = {fmtRp(quota.totalQuota)} kuota
          </div>
        </div>
      </div>

      {/* Saldo Rekening Section */}
      <div>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Saldo Rekening</span>
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('accounts')} style={{ fontSize: '12px', fontWeight: 600 }}>
            Kelola Rekening →
          </button>
        </div>
        
        {accounts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
                <Landmark size={40} />
              </div>
              <p>Belum ada rekening aktif.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage('accounts')} style={{ marginTop: '12px' }}>
                Tambah Rekening Baru
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-4">
            {accounts.map(acc => (
              <div key={acc.id} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="stat-icon" style={{ 
                    backgroundColor: acc.category === 'Bank' ? 'hsl(var(--color-accent) / 0.1)' : 'hsl(var(--color-warning) / 0.1)',
                    color: acc.category === 'Bank' ? 'hsl(var(--color-accent))' : 'hsl(var(--color-warning))',
                    marginBottom: 0
                  }}>
                    {acc.category === 'Bank' ? <Landmark size={20} /> : <Smartphone size={20} />}
                  </div>
                  <span className={`badge ${acc.category === 'Bank' ? 'badge-bank' : 'badge-ewallet'}`}>
                    {acc.category}
                  </span>
                </div>
                <div className="stat-label" style={{ fontWeight: 600 }}>{acc.name}</div>
                <div className="stat-value" style={{ fontSize: '18px' }}>{fmtRp(acc.balance)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aktivitas Bulan Ini Section */}
      <div>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Aktivitas Transaksi</span>
          </h2>
          <span className="text-muted" style={{ fontSize: '12.5px' }}>{transactions.length} transaksi</span>
        </div>

        {transactions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
                <Inbox size={40} />
              </div>
              <p>Belum ada transaksi di bulan {getPeriodLabel()}.</p>
            </div>
          </div>
        ) : (
          <div className="tx-list">
            {transactions.map(tx => {
              const amtSign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔';
              
              // Platform description
              const parts = [];
              if (tx.account_from_name) parts.push(`dari ${tx.account_from_name}`);
              else if (tx.savings_from_name) parts.push(`dari ${tx.savings_from_name}`);
              if (tx.account_to_name) parts.push(`ke ${tx.account_to_name}`);
              else if (tx.savings_to_name) parts.push(`ke ${tx.savings_to_name}`);
              const platform = parts.join(', ');

              return (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-icon ${tx.type}`} style={{ color: tx.type === 'income' ? 'hsl(var(--color-success))' : tx.type === 'expense' ? 'hsl(var(--color-danger))' : 'hsl(var(--color-info))' }}>
                    <CategoryIcon category={tx.category} size={18} />
                  </div>
                  <div className="tx-info">
                    <div className="tx-name">{tx.item_name}</div>
                    <div className="tx-meta">
                      <span className={`badge badge-${tx.type}`}>
                        {tx.type === 'income' ? 'Masuk' : tx.type === 'expense' ? 'Keluar' : 'Transfer'}
                      </span>
                      {(tx.exclude_from_quota === 1 || tx.exclude_from_quota === '1' || tx.exclude_from_quota === true) && (
                        <span className="badge badge-nonquota" title="Transaksi ini dikecualikan dari kuota harian">Luar Kuota</span>
                      )}
                      <span>· {tx.category}</span>
                      {platform && <span>· {platform}</span>}
                      <span>· {fmtDate(tx.created_at)}</span>
                    </div>
                  </div>
                  <div className={`tx-amount ${tx.type}`} style={{ marginRight: '16px' }}>
                    {amtSign} {fmtRp(tx.amount)}
                  </div>
                  <div className="tx-actions">
                    <button className="tx-btn tx-edit" onClick={() => handleEditClick(tx)} title="Edit" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit3 size={14} />
                    </button>
                    <button className="tx-btn tx-delete" onClick={() => handleDeleteTransaction(tx.id)} title="Hapus" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-danger))' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTx(null); }}
        onSave={handleSaveTransaction}
        editingTx={editingTx}
        accounts={accounts}
        savings={savings}
      />
    </div>
  );
}
