import React, { useState, useEffect } from 'react';
import { Plus, Trash2, PiggyBank, ArrowDownRight } from 'lucide-react';
import { getSavings, addSaving, deleteSaving, getAccounts, addTransaction } from '../services/db';
import { fmtRp } from '../utils/format';
import Modal from '../components/Modal';

export default function Savings({ onToast, refreshTrigger, triggerRefresh }) {
  const [savings, setSavings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  
  // Withdraw States
  const [selectedSaving, setSelectedSaving] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');

  useEffect(() => {
    setSavings(getSavings());
    setAccounts(getAccounts());
  }, [refreshTrigger]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast('Nama tabungan harus diisi.', 'error');
      return;
    }

    try {
      const numBalance = parseFloat(balance) || 0;
      await addSaving({
        name: name.trim(),
        balance: numBalance
      });

      onToast(`Tabungan "${name}" berhasil dibuat! 🐷`);
      setName('');
      setBalance('');
      setIsAddModalOpen(false);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal membuat tabungan.', 'error');
    }
  };

  const handleDelete = async (id, savName) => {
    if (!window.confirm(`Hapus tabungan "${savName}"? Semua saldo tersimpan akan dihapus.`)) return;

    try {
      await deleteSaving(id);
      onToast('Tabungan berhasil dihapus.');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menghapus tabungan.', 'error');
    }
  };

  const openWithdrawModal = (sav) => {
    setSelectedSaving(sav);
    setWithdrawAmount('');
    setTargetAccountId('');
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      onToast('Jumlah pencairan harus lebih dari 0.', 'error');
      return;
    }
    if (Number(withdrawAmount) > selectedSaving.balance) {
      onToast('Saldo tabungan tidak mencukupi.', 'error');
      return;
    }
    if (!targetAccountId) {
      onToast('Pilih rekening tujuan pencairan.', 'error');
      return;
    }

    try {
      const accId = parseInt(targetAccountId);
      const accName = accounts.find(a => a.id === accId)?.name || '';

      // Create transfer transaction: savings -> account
      await addTransaction({
        item_name: `Cairkan tabungan: ${selectedSaving.name} ➔ ${accName}`,
        amount: parseFloat(withdrawAmount),
        type: 'transfer',
        category: 'Pindah Dana',
        account_from_id: null,
        account_to_id: accId,
        savings_from_id: selectedSaving.id,
        savings_to_id: null,
        notes: 'Pencairan tabungan',
      });

      onToast(`Dana berhasil dicairkan ke rekening ${accName}! 🎉`);
      setIsWithdrawModalOpen(false);
      setSelectedSaving(null);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal mencairkan tabungan.', 'error');
    }
  };

  return (
    <div className="page active">
      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Tambah Tabungan</span>
        </button>
      </div>

      {/* Grid List */}
      {savings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
              <PiggyBank size={40} />
            </div>
            <p>Belum ada target tabungan yang dibuat.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAddModalOpen(true)} style={{ marginTop: '12px' }}>
              Mulai Menabung
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {savings.map(sav => (
            <div key={sav.id} className="saving-card" style={{
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
                  backgroundColor: 'hsl(var(--color-success) / 0.1)', 
                  color: 'hsl(var(--color-success))',
                  margin: 0
                }}>
                  <PiggyBank size={20} />
                </div>
                <span className="badge badge-saving">Tabungan</span>
              </div>

              <div style={{ marginTop: '8px' }}>
                <div className="account-card-balance" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {fmtRp(sav.balance)}
                </div>
                <div className="account-card-name" style={{ fontSize: '13.5px', color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>
                  {sav.name}
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border) / 0.5)', paddingTop: '12px' }}>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => openWithdrawModal(sav)}
                  disabled={sav.balance <= 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowDownRight size={14} />
                  <span>Cairkan</span>
                </button>
                
                <button 
                  className="btn btn-sm btn-ghost" 
                  onClick={() => handleDelete(sav.id, sav.name)}
                  style={{ color: 'hsl(var(--color-danger))', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Saving Modal */}
      <Modal isOpen={isAddModalOpen} title="Buat Celengan Tabungan" onClose={() => setIsAddModalOpen(false)}>
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Tabungan / Impian</label>
            <input
              type="text"
              className="form-control"
              placeholder="cth: Liburan, Beli Gadget, Dana Darurat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* Withdraw Saving Modal */}
      <Modal isOpen={isWithdrawModalOpen} title="Cairkan Tabungan" onClose={() => setIsWithdrawModalOpen(false)}>
        {selectedSaving && (
          <form onSubmit={handleWithdrawSubmit}>
            <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
              Dana akan ditransfer keluar dari tabungan ini dan dimasukkan ke salah satu rekening aktif Anda.
            </p>
            
            <div className="form-group">
              <label className="form-label">Nama Tabungan</label>
              <input type="text" className="form-control" value={selectedSaving.name} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Saldo Tersedia</label>
              <input type="text" className="form-control" value={fmtRp(selectedSaving.balance)} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah Dicairkan (Rp)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                min="1"
                max={selectedSaving.balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rekening Tujuan</label>
              <select
                className="form-control"
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                required
              >
                <option value="">— Pilih Rekening Tujuan —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.category}) — {fmtRp(acc.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setIsWithdrawModalOpen(false)}>Batal</button>
              <button type="submit" className="btn btn-success">Cairkan Sekarang</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
