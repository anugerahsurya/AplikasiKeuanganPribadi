import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { CAT_ICONS, fmtRp } from '../utils/format';
import CategoryIcon from './CategoryIcon';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { getBudgets } from '../services/db';

export default function TransactionModal({ isOpen, onClose, onSave, editingTx, accounts = [], savings = [], lifegoals = [] }) {
  const [type, setType] = useState('expense'); // 'income' | 'expense' | 'transfer'
  const [category, setCategory] = useState('Makanan');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [includeInQuota, setIncludeInQuota] = useState(true);
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLocalDateString = (d) => {
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzoffset).toISOString().slice(0, 10);
  };

  const [createdAt, setCreatedAt] = useState(() => getLocalDateString(new Date()));

  // Synchronize when editingTx or modal state changes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      // Load active categories from budgets, with fallback to default categories
      const budgets = getBudgets();
      const catList = budgets.length > 0 ? budgets.map(b => b.category) : Object.keys(CAT_ICONS).filter(cat => cat !== 'Pindah Dana');
      const uniqueCats = Array.from(new Set(catList));
      setCategories(uniqueCats);

      if (editingTx) {
        setType(editingTx.type);
        setCategory(editingTx.category);
        setItemName(editingTx.item_name);
        setAmount(editingTx.amount.toString());
        setNotes(editingTx.notes || '');
        
        const fId = editingTx.account_from_id ? `account:${editingTx.account_from_id}` : editingTx.savings_from_id ? `saving:${editingTx.savings_from_id}` : editingTx.lifegoal_from_id ? `lifegoal:${editingTx.lifegoal_from_id}` : '';
        setFromId(fId);

        const tId = editingTx.account_to_id ? `account:${editingTx.account_to_id}` : editingTx.savings_to_id ? `saving:${editingTx.savings_to_id}` : editingTx.lifegoal_to_id ? `lifegoal:${editingTx.lifegoal_to_id}` : '';
        setToId(tId);

        setCreatedAt(editingTx.created_at ? getLocalDateString(new Date(editingTx.created_at)) : getLocalDateString(new Date()));
        setIncludeInQuota(!(editingTx.exclude_from_quota === 1 || editingTx.exclude_from_quota === '1' || editingTx.exclude_from_quota === true));
      } else {
        // Reset to default
        setType('expense');
        setCategory('Makanan');
        setItemName('');
        setAmount('');
        setNotes('');
        setFromId('');
        setToId('');
        setCreatedAt(getLocalDateString(new Date()));
        setIncludeInQuota(true);
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

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === 'Investasi') {
      setIncludeInQuota(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!itemName.trim()) {
      alert('Keterangan transaksi harus diisi.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('Jumlah harus lebih dari 0.');
      return;
    }

    let finalDate = new Date();
    if (createdAt) {
      const [year, month, day] = createdAt.split('-').map(Number);
      finalDate.setFullYear(year, month - 1, day);
      if (editingTx && editingTx.created_at) {
        const orig = new Date(editingTx.created_at);
        finalDate.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), orig.getMilliseconds());
      } else {
        const now = new Date();
        finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
    }

    const data = {
      item_name: itemName.trim(),
      amount: parseFloat(amount),
      type,
      category,
      notes: notes.trim() || null,
      account_from_id: null,
      account_to_id: null,
      savings_from_id: null,
      savings_to_id: null,
      lifegoal_from_id: null,
      lifegoal_to_id: null,
      created_at: finalDate.toISOString(),
      exclude_from_quota: type === 'expense' ? !includeInQuota : true,
    };

    // Parse source/destination accounts
    if (type === 'expense' || type === 'transfer') {
      if (fromId.startsWith('account:')) {
        data.account_from_id = parseInt(fromId.split(':')[1]);
      } else if (fromId.startsWith('saving:')) {
        data.savings_from_id = parseInt(fromId.split(':')[1]);
      } else if (fromId.startsWith('lifegoal:')) {
        data.lifegoal_from_id = parseInt(fromId.split(':')[1]);
      }
    }
    if (type === 'income' || type === 'transfer') {
      if (toId.startsWith('account:')) {
        data.account_to_id = parseInt(toId.split(':')[1]);
      } else if (toId.startsWith('saving:')) {
        data.savings_to_id = parseInt(toId.split(':')[1]);
      } else if (toId.startsWith('lifegoal:')) {
        data.lifegoal_to_id = parseInt(toId.split(':')[1]);
      }
    }

    setIsSubmitting(true);
    try {
      await onSave(data, editingTx?.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
              {categories.filter(cat => cat !== 'Pindah Dana').map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-tab ${category === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                  style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CategoryIcon category={cat} size={14} />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tanggal Transaksi */}
        <div className="form-group">
          <label className="form-label">Tanggal Transaksi</label>
          <input
            type="date"
            className="form-control"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            required
          />
        </div>

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

        {/* Kuota Harian Checkbox (Hanya untuk Pengeluaran) */}
        {type === 'expense' && (
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="include_quota"
              checked={includeInQuota}
              onChange={(e) => setIncludeInQuota(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
            />
            <label htmlFor="include_quota" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', userSelect: 'none', color: 'hsl(var(--text-primary))', textTransform: 'none', letterSpacing: 'normal' }}>
              Hitung dalam kuota harian (Maks Rp 100.000 / hari)
            </label>
          </div>
        )}

        {/* Dynamic Account Select Fields */}
        <div className="grid grid-2" style={{ gap: '16px', margin: '8px 0' }}>
          {(type === 'expense' || type === 'transfer') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sumber Dana (Dari)</label>
              <select
                className="form-control"
                value={fromId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromId(val);
                  if (val.startsWith('saving:')) {
                    setIncludeInQuota(false);
                  }
                }}
                required
              >
                <option value="">— Pilih Rekening / Celengan —</option>
                {accounts.length > 0 && (
                  <optgroup label="Rekening / Dompet">
                    {accounts.map(acc => (
                      <option key={acc.id} value={`account:${acc.id}`}>
                        {acc.name} ({acc.category}) — {fmtRp(acc.balance)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {savings.length > 0 && (
                  <optgroup label="Celengan Tabungan">
                    {savings.map(sav => (
                      <option key={sav.id} value={`saving:${sav.id}`}>
                        {sav.name} — {fmtRp(sav.balance)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {lifegoals && lifegoals.length > 0 && (
                  <optgroup label="Impian / Life Goals">
                    {lifegoals.map(lg => (
                      <option key={lg.id} value={`lifegoal:${lg.id}`}>
                        {lg.name} — {fmtRp(lg.balance)} / {fmtRp(lg.target_amount)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {(type === 'income' || type === 'transfer') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tujuan Dana (Ke)</label>
              <select
                className="form-control"
                value={toId}
                onChange={(e) => {
                  const val = e.target.value;
                  setToId(val);
                  if (val.startsWith('saving:')) {
                    setIncludeInQuota(false);
                  }
                }}
                required
              >
                <option value="">— Pilih Rekening / Celengan —</option>
                {accounts.length > 0 && (
                  <optgroup label="Rekening / Dompet">
                    {accounts.map(acc => (
                      <option key={acc.id} value={`account:${acc.id}`}>
                        {acc.name} ({acc.category}) — {fmtRp(acc.balance)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {savings.length > 0 && (
                  <optgroup label="Celengan Tabungan">
                    {savings.map(sav => (
                      <option key={sav.id} value={`saving:${sav.id}`}>
                        {sav.name} — {fmtRp(sav.balance)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {lifegoals && lifegoals.length > 0 && (
                  <optgroup label="Impian / Life Goals">
                    {lifegoals.map(lg => (
                      <option key={lg.id} value={`lifegoal:${lg.id}`}>
                        {lg.name} — {fmtRp(lg.balance)} / {fmtRp(lg.target_amount)}
                      </option>
                    ))}
                  </optgroup>
                )}
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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : (editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
