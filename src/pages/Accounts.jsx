import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Landmark, Smartphone, AlertCircle } from 'lucide-react';
import { getAccounts, addAccount, deleteAccount } from '../services/db';
import { fmtRp } from '../utils/format';
import Modal from '../components/Modal';

export default function Accounts({ onToast, refreshTrigger, triggerRefresh }) {
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bank');
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isModalOpen) setIsSubmitting(false);
  }, [isModalOpen]);

  useEffect(() => {
    setAccounts(getAccounts());
  }, [refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) {
      onToast('Nama rekening harus diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const numBalance = parseFloat(balance) || 0;
      await addAccount({
        name: name.trim(),
        category,
        balance: numBalance
      });

      onToast(`Rekening "${name}" berhasil ditambahkan! 🎉`);
      setName('');
      setBalance('');
      setCategory('Bank');
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menambahkan rekening.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, accName) => {
    if (!window.confirm(`Hapus rekening "${accName}"? Semua riwayat saldo terkait akan terpengaruh.`)) return;

    try {
      await deleteAccount(id);
      onToast('Rekening berhasil dihapus.');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menghapus rekening.', 'error');
    }
  };

  const banks = accounts.filter(a => a.category === 'Bank');
  const ewallets = accounts.filter(a => a.category === 'E-Wallet');

  const renderGrid = (list, type) => {
    if (list.length === 0) {
      return (
        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
              {type === 'Bank' ? <Landmark size={40} /> : <Smartphone size={40} />}
            </div>
            <p>Belum ada rekening {type} yang ditambahkan.</p>
          </div>
        </div>
      );
    }

    return list.map(acc => (
      <div key={acc.id} className="account-card" style={{ 
        backgroundColor: 'hsl(var(--bg-card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="stat-icon" style={{ 
            backgroundColor: type === 'Bank' ? 'hsl(var(--color-accent) / 0.1)' : 'hsl(var(--color-warning) / 0.1)',
            color: type === 'Bank' ? 'hsl(var(--color-accent))' : 'hsl(var(--color-warning))',
            margin: 0
          }}>
            {type === 'Bank' ? <Landmark size={20} /> : <Smartphone size={20} />}
          </div>
          <span className={`badge ${type === 'Bank' ? 'badge-bank' : 'badge-ewallet'}`}>
            {acc.category}
          </span>
        </div>
        
        <div style={{ marginTop: '8px' }}>
          <div className="account-card-balance" style={{ fontSize: '20px', fontWeight: 700 }}>
            {fmtRp(acc.balance)}
          </div>
          <div className="account-card-name" style={{ fontSize: '13.5px', color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>
            {acc.name}
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid hsl(var(--border) / 0.5)', paddingTop: '12px' }}>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => handleDelete(acc.id, acc.name)}
            style={{ color: 'hsl(var(--color-danger))', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="page active">
      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Tambah Rekening</span>
        </button>
      </div>

      {/* Info warning */}
      <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'hsl(var(--color-accent) / 0.05)', borderColor: 'hsl(var(--color-accent) / 0.2)' }}>
        <AlertCircle size={20} style={{ color: 'hsl(var(--color-accent))', flexShrink: 0 }} />
        <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))' }}>
          Disini Anda dapat memisahkan tempat penyimpanan uang Anda (seperti rekening bank fisik, e-wallet, dompet tunai). 
          Saldo akan otomatis menyesuaikan ketika transaksi dicatat.
        </p>
      </div>

      {/* Bank Section */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'hsl(var(--color-accent-light))', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Landmark size={18} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Rekening Bank</span>
        </h2>
        <div className="grid grid-3">
          {renderGrid(banks, 'Bank')}
        </div>
      </div>

      {/* E-Wallet Section */}
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'hsl(var(--color-warning))', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={18} style={{ color: 'hsl(var(--color-warning))' }} />
          <span>Dompet Digital & E-Wallet</span>
        </h2>
        <div className="grid grid-3">
          {renderGrid(ewallets, 'E-Wallet')}
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal isOpen={isModalOpen} title="Tambah Rekening Baru" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Rekening</label>
            <input
              type="text"
              className="form-control"
              placeholder="cth: BCA, Mandiri, GoPay, OVO, Tunai"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Bank">Bank</option>
              <option value="E-Wallet">E-Wallet</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Saldo Awal (Rp)</label>
            <input
              type="number"
              className="form-control"
              placeholder="0"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
