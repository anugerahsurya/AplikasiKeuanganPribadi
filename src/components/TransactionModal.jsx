import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { CAT_ICONS } from '../utils/format';
import CategoryIcon from './CategoryIcon';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, onSave, editingTx, accounts = [], savings = [] }) {
  const [type, setType] = useState('expense'); // 'income' | 'expense' | 'transfer'
  const [category, setCategory] = useState('Makanan');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  // Synchronize when editingTx or modal state changes
  useEffect(() => {
    if (isOpen) {
      if (editingTx) {
        setType(editingTx.type);
        setCategory(editingTx.category);
        setItemName(editingTx.item_name);
        setAmount(editingTx.amount.toString());
        setNotes(editingTx.notes || '');
        setFromId(editingTx.account_from_id ? `account:${editingTx.account_from_id}` : '');
        setToId(editingTx.account_to_id ? `account:${editingTx.account_to_id}` : '');
      } else {
        // Reset to default
        setType('expense');
        setCategory('Makanan');
        setItemName('');
        setAmount('');
        setNotes('');
        setFromId('');
        setToId('');
      }
    }
  }, [isOpen, editingTx]);

  // Adjust category if type is transfer
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'transfer') {
      setCategory('Pindah Dana');
    } else if (category === 'Pindah Dana') {
      setCategory('Makanan');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Keterangan transaksi harus diisi.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('Jumlah harus lebih dari 0.');
      return;
    }

    const data = {
      item_name: itemName.trim(),
      amount: parseFloat(amount),
      type,
      category,
      notes: notes.trim() || null,
      account_from_id: null,
      account_to_id: null,
    };

    // Parse source/destination accounts
    if (type === 'expense' || type === 'transfer') {
      if (fromId.startsWith('account:')) {
        data.account_from_id = parseInt(fromId.split(':')[1]);
      }
    }
    if (type === 'income' || type === 'transfer') {
      if (toId.startsWith('account:')) {
        data.account_to_id = parseInt(toId.split(':')[1]);
      }
    }

    onSave(data, editingTx?.id);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      title={editingTx ? 'Edit Transaksi' : 'Tambah Transaksi'} 
      onClose={onClose}
      width="560px"
    >
      <form onSubmit={handleSubmit}>
        {/* Tipe Transaksi */}
        <div className="form-group">
          <label className="form-label">Tipe Transaksi</label>
          <div className="cat-tabs">
            <button
              type="button"
              className={`cat-tab ${type === 'expense' ? 'active' : ''}`}
              onClick={() => handleTypeChange('expense')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowDownLeft size={14} />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              className={`cat-tab ${type === 'income' ? 'active' : ''}`}
              onClick={() => handleTypeChange('income')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowUpRight size={14} />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              className={`cat-tab ${type === 'transfer' ? 'active' : ''}`}
              onClick={() => handleTypeChange('transfer')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Pindah Dana</span>
            </button>
          </div>
        </div>

        {/* Kategori Kegiatan */}
        {type !== 'transfer' && (
          <div className="form-group">
            <label className="form-label">Kategori Kegiatan</label>
            <div className="cat-tabs" style={{ maxHeight: '135px', overflowY: 'auto', padding: '4px' }}>
              {Object.keys(CAT_ICONS).filter(cat => cat !== 'Pindah Dana').map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-tab ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                  style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CategoryIcon category={cat} size={14} />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keterangan */}
        <div className="form-group">
          <label className="form-label">Keterangan / Nama Barang</label>
          <input
            type="text"
            className="form-control"
            placeholder="cth: Makan siang, Bensin, Gaji bulanan"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />
        </div>

        {/* Jumlah */}
        <div className="form-group">
          <label className="form-label">Jumlah (Rp)</label>
          <input
            type="number"
            className="form-control"
            placeholder="0"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Dynamic Account Select Fields */}
        <div className="grid grid-2" style={{ gap: '16px', margin: '8px 0' }}>
          {(type === 'expense' || type === 'transfer') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sumber Dana (Dari)</label>
              <select
                className="form-control"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                required
              >
                <option value="">— Pilih Rekening —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={`account:${acc.id}`}>
                    {acc.name} ({acc.category}) — Rp {acc.balance.toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'income' || type === 'transfer') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tujuan Dana (Ke)</label>
              <select
                className="form-control"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                required
              >
                <option value="">— Pilih Rekening —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={`account:${acc.id}`}>
                    {acc.name} ({acc.category}) — Rp {acc.balance.toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Catatan */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label">Catatan Tambahan (Opsional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Catatan tambahan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary">
            {editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
