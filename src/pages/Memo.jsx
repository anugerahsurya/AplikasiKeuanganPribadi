import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Calendar, FileText } from 'lucide-react';
import { getMemos, addMemo, updateMemo, deleteMemo } from '../services/db';
import Modal from '../components/Modal';

export default function Memo({ onToast, refreshTrigger, triggerRefresh }) {
  const [memos, setMemos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#7aab8a'); // default Sage

  const colorOptions = [
    { label: 'Sage', value: '#7aab8a' },
    { label: 'Biru', value: '#4a9abe' },
    { label: 'Kuning', value: '#d4a84b' },
    { label: 'Merah', value: '#e05c5c' },
    { label: 'Ungu', value: '#9b7fd4' }
  ];

  useEffect(() => {
    setMemos(getMemos());
  }, [refreshTrigger]);

  const handleOpenAdd = () => {
    setEditingMemo(null);
    setTitle('');
    setContent('');
    setColor('#7aab8a');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (memo) => {
    setEditingMemo(memo);
    setTitle(memo.title);
    setContent(memo.content);
    setColor(memo.color || '#7aab8a');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      onToast('Judul catatan harus diisi.', 'error');
      return;
    }

    try {
      if (editingMemo) {
        await updateMemo({
          id: editingMemo.id,
          title: title.trim(),
          content: content.trim(),
          color
        });
        onToast('Catatan berhasil diperbarui! ✏️');
      } else {
        await addMemo({
          title: title.trim(),
          content: content.trim(),
          color
        });
        onToast('Catatan baru berhasil ditambahkan! 📝');
      }
      setIsModalOpen(false);
      setEditingMemo(null);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menyimpan catatan.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus catatan keuangan ini?')) return;

    try {
      await deleteMemo(id);
      onToast('Catatan berhasil dihapus.');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menghapus catatan.', 'error');
    }
  };

  return (
    <div className="page active">
      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Catatan Baru</span>
        </button>
      </div>

      <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
        Tulis target tabungan, catatan rencana belanja, atau pengingat keuangan pribadi Anda di sini.
      </p>

      {/* Grid list */}
      {memos.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
              <FileText size={40} />
            </div>
            <p>Belum ada catatan keuangan yang dibuat. Klik "Catatan Baru" untuk membuat.</p>
          </div>
        </div>
      ) : (
        <div className="memo-grid">
          {memos.map(m => (
            <div key={m.id} className="memo-card">
              <div className="memo-dot" style={{ backgroundColor: m.color || '#7aab8a' }}></div>
              <div className="memo-card-title">{m.title}</div>
              <div className="memo-card-content">{m.content}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
                <div className="memo-card-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={11} style={{ color: 'hsl(var(--text-muted))' }} />
                  <span>{m.date}</span>
                </div>
                
                <div className="memo-card-actions" style={{ position: 'static', opacity: 1 }}>
                  <button className="tx-btn tx-edit" onClick={() => handleOpenEdit(m)} title="Edit" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit3 size={14} />
                  </button>
                  <button className="tx-btn tx-delete" onClick={() => handleDelete(m.id)} title="Hapus" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-danger))' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        title={editingMemo ? 'Edit Catatan Keuangan' : 'Tulis Catatan Baru'} 
        onClose={() => setIsModalOpen(false)}
        width="520px"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Judul Catatan</label>
            <input
              type="text"
              className="form-control"
              placeholder="cth: Rencana Anggaran Liburan, List Belanja Bulanan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Isi Catatan</label>
            <textarea
              className="form-control"
              placeholder="Tulis detail rencana keuangan atau catatan penting di sini..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Warna Label / Tag</label>
            <div className="cat-tabs">
              {colorOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cat-tab ${color === opt.value ? 'active' : ''}`}
                  onClick={() => setColor(opt.value)}
                >
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: opt.value, 
                    marginRight: '6px' 
                  }}></span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
