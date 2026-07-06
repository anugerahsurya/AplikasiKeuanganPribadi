import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, FileDown, Search, Edit3, Trash2, Inbox } from 'lucide-react';
import { getAccounts, getAllTransactions, addTransaction, deleteTransaction } from '../services/db';
import { fmtRp, fmtDate } from '../utils/format';
import { getGoogleUser, isLoggedIn } from '../services/googleSheets';
import TransactionModal from '../components/TransactionModal';
import CategoryIcon from '../components/CategoryIcon';

export default function Transactions({ onToast, refreshTrigger, triggerRefresh }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTxs, setFilteredTxs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = () => {
    const allTxs = getAllTransactions();
    const accs = getAccounts();
    setTransactions(allTxs);
    setAccounts(accs);
    applyFilters(allTxs, filter, search);
  };

  useEffect(() => {
    applyFilters(transactions, filter, search);
  }, [filter, search, transactions]);

  const applyFilters = (list, typeFilter, searchQuery) => {
    let result = [...list];
    
    // Type Filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.item_name.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    setFilteredTxs(result);
  };

  const handleSaveTransaction = async (data, id) => {
    try {
      if (id) {
        await deleteTransaction(id);
        await addTransaction(data);
        onToast('Transaksi berhasil diperbarui! ✏️');
      } else {
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

  // PDF Export trigger using window.print()
  const handleExportPDF = () => {
    onToast('Menyiapkan dokumen rekap... 📑');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Calculate totals for report
  const reportIncome = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const reportExpense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const reportNet = reportIncome - reportExpense;

  const googleUser = getGoogleUser();
  const userName = isLoggedIn() && googleUser ? googleUser.name : 'Pengguna Lokal';

  return (
    <div className="page active">
      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-secondary" onClick={handleExportPDF} title="Download rekap PDF">
          <FileDown size={16} />
          <span>Unduh Rekap (PDF)</span>
        </button>
        <button className="btn btn-primary" onClick={() => { setEditingTx(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Tabs */}
          <div className="cat-tabs">
            {['all', 'income', 'expense', 'transfer'].map(t => (
              <button
                key={t}
                className={`cat-tab ${filter === t ? 'active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'Semua' : t === 'income' ? 'Pemasukan' : t === 'expense' ? 'Pengeluaran' : 'Transfer'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

        </div>
      </div>

      {/* Transaction List */}
      <div>
        {filteredTxs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
                <Inbox size={40} />
              </div>
              <p>Tidak ditemukan transaksi dengan filter tersebut.</p>
            </div>
          </div>
        ) : (
          <div className="tx-list">
            {filteredTxs.map(tx => {
              const amtSign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔';
              
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

      {/* ─── PRINT ONLY REPORT TEMPLATE (Hidden from screen view) ─── */}
      <div className="print-only-report">
        <div className="report-header">
          <div className="report-title-section">
            <h1>LAPORAN KEGIATAN KEUANGAN</h1>
            <p>Aplikasi Keuangan Pribadi Ituang</p>
          </div>
          <div className="report-meta-section">
            <div>Dibuat Oleh: <strong>{userName}</strong></div>
            <div>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div>Status Filter: {filter === 'all' ? 'Semua Tipe' : filter === 'income' ? 'Pemasukan' : filter === 'expense' ? 'Pengeluaran' : 'Transfer'}</div>
          </div>
        </div>

        <div className="report-summary-box">
          <h3>Ringkasan Laporan Keuangan</h3>
          <div className="report-summary-grid">
            <div className="report-sum-card" style={{ borderLeftColor: '#22c55e' }}>
              <div className="report-sum-label">Total Pemasukan</div>
              <div className="report-sum-val" style={{ color: '#16a34a' }}>{fmtRp(reportIncome)}</div>
            </div>
            <div className="report-sum-card" style={{ borderLeftColor: '#ef4444' }}>
              <div className="report-sum-label">Total Pengeluaran</div>
              <div className="report-sum-val" style={{ color: '#dc2626' }}>{fmtRp(reportExpense)}</div>
            </div>
            <div className="report-sum-card" style={{ borderLeftColor: '#3b82f6' }}>
              <div className="report-sum-label">Selisih Bersih (Net)</div>
              <div className="report-sum-val" style={{ color: reportNet >= 0 ? '#16a34a' : '#dc2626' }}>
                {reportNet >= 0 ? '+' : ''}{fmtRp(reportNet)}
              </div>
            </div>
          </div>
        </div>

        <h3>Daftar Detail Transaksi</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Keterangan</th>
              <th>Kategori</th>
              <th>Tipe</th>
              <th>Alur Dana</th>
              <th style={{ textAlign: 'right' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxs.map((tx, idx) => {
              const parts = [];
              if (tx.account_from_name) parts.push(`Dari: ${tx.account_from_name}`);
              else if (tx.savings_from_name) parts.push(`Dari: ${tx.savings_from_name}`);
              if (tx.account_to_name) parts.push(`Ke: ${tx.account_to_name}`);
              else if (tx.savings_to_name) parts.push(`Ke: ${tx.savings_to_name}`);
              const flow = parts.join(', ');

              return (
                <tr key={tx.id}>
                  <td>{idx + 1}</td>
                  <td>{new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <strong>{tx.item_name}</strong>
                    {tx.notes && <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>Notes: {tx.notes}</div>}
                  </td>
                  <td>{tx.category}</td>
                  <td style={{ fontWeight: 600, color: tx.type === 'income' ? '#16a34a' : tx.type === 'expense' ? '#dc2626' : '#2563eb' }}>
                    {tx.type === 'income' ? 'Masuk' : tx.type === 'expense' ? 'Keluar' : 'Transfer'}
                  </td>
                  <td style={{ fontSize: '11px', color: '#475569' }}>{flow || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}{fmtRp(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <div>Dokumen ini digenerate secara otomatis melalui aplikasi Ituang Web.</div>
          <div>Halaman 1 dari 1</div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTx(null); }}
        onSave={handleSaveTransaction}
        editingTx={editingTx}
        accounts={accounts}
      />
    </div>
  );
}
