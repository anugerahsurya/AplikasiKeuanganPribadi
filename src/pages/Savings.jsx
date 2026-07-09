import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, PiggyBank, ArrowDownRight, ArrowUpRight, Target, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { getSavings, addSaving, deleteSaving, getAccounts, addTransaction, getLifegoals, addLifegoal, deleteLifegoal } from '../services/db';
import { fmtRp } from '../utils/format';
import Modal from '../components/Modal';

export default function Savings({ onToast, refreshTrigger, triggerRefresh }) {
  const [activeTab, setActiveTab] = useState('savings'); // 'savings' | 'lifegoals'
  const [savings, setSavings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [lifegoals, setLifegoals] = useState([]);
  
  // Modals (Savings)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Form States (Savings)
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  
  // Withdraw States (Savings)
  const [selectedSaving, setSelectedSaving] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');

  // Modals (Lifegoals)
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isDepositGoalOpen, setIsDepositGoalOpen] = useState(false);
  const [isWithdrawGoalOpen, setIsWithdrawGoalOpen] = useState(false);

  // Form States (Lifegoals)
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalStartBalance, setGoalStartBalance] = useState('');
  const [goalImage, setGoalImage] = useState(null);

  // Camera States (Lifegoals)
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);

  // Deposit/Withdraw States (Lifegoals)
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawGoalAmount, setWithdrawGoalAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountIdWithdraw, setTargetAccountIdWithdraw] = useState('');

  // Submit Loading States
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [isSubmittingAddGoal, setIsSubmittingAddGoal] = useState(false);
  const [isSubmittingDepositGoal, setIsSubmittingDepositGoal] = useState(false);
  const [isSubmittingWithdrawGoal, setIsSubmittingWithdrawGoal] = useState(false);

  useEffect(() => {
    if (!isAddModalOpen) setIsSubmittingAdd(false);
  }, [isAddModalOpen]);

  useEffect(() => {
    if (!isWithdrawModalOpen) setIsSubmittingWithdraw(false);
  }, [isWithdrawModalOpen]);

  useEffect(() => {
    if (!isAddGoalOpen) {
      setIsSubmittingAddGoal(false);
      stopCamera();
    }
  }, [isAddGoalOpen]);

  useEffect(() => {
    if (!isDepositGoalOpen) setIsSubmittingDepositGoal(false);
  }, [isDepositGoalOpen]);

  useEffect(() => {
    if (!isWithdrawGoalOpen) setIsSubmittingWithdrawGoal(false);
  }, [isWithdrawGoalOpen]);

  useEffect(() => {
    setSavings(getSavings());
    setAccounts(getAccounts());
    setLifegoals(getLifegoals());
  }, [refreshTrigger]);

  // ── SAVINGS HANDLERS ──────────────────────────────────────────────────
  
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingAdd) return;
    if (!name.trim()) {
      onToast('Nama tabungan harus diisi.', 'error');
      return;
    }

    setIsSubmittingAdd(true);
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
    } finally {
      setIsSubmittingAdd(false);
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
    if (isSubmittingWithdraw) return;
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

    setIsSubmittingWithdraw(true);
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
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // ── LIFEGOALS HANDLERS ────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      onToast("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.", "error");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);
      setGoalImage(canvas.toDataURL('image/jpeg', 0.7));
      stopCamera();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 200;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          setGoalImage(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGoalSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingAddGoal) return;
    if (!goalName.trim()) {
      onToast('Nama impian harus diisi.', 'error');
      return;
    }
    if (!goalTarget || Number(goalTarget) <= 0) {
      onToast('Target harga harus lebih dari 0.', 'error');
      return;
    }

    setIsSubmittingAddGoal(true);
    try {
      const numTarget = parseFloat(goalTarget);
      const numStartBalance = parseFloat(goalStartBalance) || 0;
      await addLifegoal({
        name: goalName.trim(),
        target_amount: numTarget,
        balance: numStartBalance,
        image: goalImage
      });

      onToast(`Impian "${goalName}" berhasil dibuat! 🎯`);
      setGoalName('');
      setGoalTarget('');
      setGoalStartBalance('');
      setGoalImage(null);
      setIsAddGoalOpen(false);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal membuat impian.', 'error');
    } finally {
      setIsSubmittingAddGoal(false);
    }
  };

  const handleDeleteGoal = async (id, name) => {
    if (!window.confirm(`Hapus impian "${name}"? Semua data tabungan impian ini akan dihapus.`)) return;
    try {
      await deleteLifegoal(id);
      onToast('Impian berhasil dihapus.');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menghapus impian.', 'error');
    }
  };

  const openDepositGoalModal = (lg) => {
    setSelectedGoal(lg);
    setDepositAmount('');
    setSourceAccountId('');
    setIsDepositGoalOpen(true);
  };

  const handleDepositGoalSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingDepositGoal) return;
    if (!depositAmount || Number(depositAmount) <= 0) {
      onToast('Jumlah isi saldo harus lebih dari 0.', 'error');
      return;
    }
    if (!sourceAccountId) {
      onToast('Pilih rekening sumber dana.', 'error');
      return;
    }

    const sourceAcc = accounts.find(a => a.id === parseInt(sourceAccountId));
    if (!sourceAcc) return;
    
    if (Number(depositAmount) > sourceAcc.balance) {
      onToast('Saldo rekening sumber tidak mencukupi.', 'error');
      return;
    }

    setIsSubmittingDepositGoal(true);
    try {
      await addTransaction({
        item_name: `Tabungan Impian: ${selectedGoal.name}`,
        amount: parseFloat(depositAmount),
        type: 'transfer',
        category: 'Investasi',
        account_from_id: sourceAcc.id,
        account_to_id: null,
        savings_from_id: null,
        savings_to_id: null,
        lifegoal_from_id: null,
        lifegoal_to_id: selectedGoal.id,
        notes: `Menabung untuk: ${selectedGoal.name}`,
      });

      onToast(`Dana berhasil disetor ke impian "${selectedGoal.name}"! 💰`);
      setIsDepositGoalOpen(false);
      setSelectedGoal(null);
      setDepositAmount('');
      setSourceAccountId('');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menyetor dana.', 'error');
    } finally {
      setIsSubmittingDepositGoal(false);
    }
  };

  const openWithdrawGoalModal = (lg) => {
    setSelectedGoal(lg);
    setWithdrawGoalAmount('');
    setTargetAccountIdWithdraw('');
    setIsWithdrawGoalOpen(true);
  };

  const handleWithdrawGoalSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingWithdrawGoal) return;
    if (!withdrawGoalAmount || Number(withdrawGoalAmount) <= 0) {
      onToast('Jumlah pencairan harus lebih dari 0.', 'error');
      return;
    }
    if (Number(withdrawGoalAmount) > selectedGoal.balance) {
      onToast('Saldo impian tidak mencukupi.', 'error');
      return;
    }
    if (!targetAccountIdWithdraw) {
      onToast('Pilih rekening tujuan pencairan.', 'error');
      return;
    }

    const targetAcc = accounts.find(a => a.id === parseInt(targetAccountIdWithdraw));
    if (!targetAcc) return;

    setIsSubmittingWithdrawGoal(true);
    try {
      await addTransaction({
        item_name: `Cairkan Impian: ${selectedGoal.name}`,
        amount: parseFloat(withdrawGoalAmount),
        type: 'transfer',
        category: 'Pindah Dana',
        account_from_id: null,
        account_to_id: targetAcc.id,
        savings_from_id: null,
        savings_to_id: null,
        lifegoal_from_id: selectedGoal.id,
        lifegoal_to_id: null,
        notes: `Pencairan dana impian: ${selectedGoal.name}`,
      });

      onToast(`Dana impian berhasil dicairkan ke rekening "${targetAcc.name}"! 🎉`);
      setIsWithdrawGoalOpen(false);
      setSelectedGoal(null);
      setWithdrawGoalAmount('');
      setTargetAccountIdWithdraw('');
      triggerRefresh();
    } catch (err) {
      onToast('Gagal mencairkan dana impian.', 'error');
    } finally {
      setIsSubmittingWithdrawGoal(false);
    }
  };

  return (
    <div className="page active">
      {/* Tab Selector */}
      <div className="cat-tabs" style={{ marginBottom: '8px' }}>
        <button 
          type="button"
          className={`cat-tab ${activeTab === 'savings' ? 'active' : ''}`}
          onClick={() => setActiveTab('savings')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <PiggyBank size={15} />
          <span>Celengan Tabungan</span>
        </button>
        <button 
          type="button"
          className={`cat-tab ${activeTab === 'lifegoals' ? 'active' : ''}`}
          onClick={() => setActiveTab('lifegoals')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <Target size={15} />
          <span>Impian Hidup (Life Goals)</span>
        </button>
      </div>

      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        {activeTab === 'savings' ? (
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Tambah Tabungan</span>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setIsAddGoalOpen(true)}>
            <Plus size={16} />
            <span>Tambah Impian</span>
          </button>
        )}
      </div>

      {activeTab === 'savings' ? (
        /* CELENGAN TABUNGAN TAB */
        savings.length === 0 ? (
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
        )
      ) : (
        /* IMPIAN HIDUP (LIFE GOALS) TAB */
        lifegoals.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
                <Target size={40} />
              </div>
              <p>Belum ada impian hidup (life goal) yang dibuat.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAddGoalOpen(true)} style={{ marginTop: '12px' }}>
                Tetapkan Impian Hidup
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-3">
            {lifegoals.map(lg => {
              const pct = lg.target_amount > 0 ? Math.min((lg.balance / lg.target_amount) * 100, 100) : 0;
              return (
                <div key={lg.id} className="saving-card" style={{
                  backgroundColor: 'hsl(var(--bg-card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Goal Image */}
                  {lg.image ? (
                    <img 
                      src={lg.image} 
                      alt={lg.name} 
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '140px', borderRadius: '12px', backgroundColor: 'hsl(var(--bg-input))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* Goal Details */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'hsl(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lg.name}>
                      {lg.name}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="budget-progress-wrap" style={{ margin: '4px 0', height: '6px' }}>
                      <div className={`budget-progress-bar ${pct >= 100 ? 'safe' : 'warn'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'hsl(var(--color-success))' }}>{fmtRp(lg.balance)}</span>
                      <span style={{ color: 'hsl(var(--text-muted))' }}>target {fmtRp(lg.target_amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid hsl(var(--border) / 0.5)', paddingTop: '12px', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openDepositGoalModal(lg)}
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ArrowUpRight size={13} />
                        <span>Isi</span>
                      </button>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => openWithdrawGoalModal(lg)}
                        disabled={lg.balance <= 0}
                        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ArrowDownRight size={13} />
                        <span>Cairkan</span>
                      </button>
                    </div>
                    
                    <button 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => handleDeleteGoal(lg.id, lg.name)}
                      style={{ color: 'hsl(var(--color-danger))', padding: '6px 8px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
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
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmittingAdd}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingAdd}>
              {isSubmittingAdd ? 'Menyimpan...' : 'Simpan'}
            </button>
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
              <button type="button" className="btn btn-ghost" onClick={() => setIsWithdrawModalOpen(false)} disabled={isSubmittingWithdraw}>Batal</button>
              <button type="submit" className="btn btn-success" disabled={isSubmittingWithdraw}>
                {isSubmittingWithdraw ? 'Memproses...' : 'Cairkan Sekarang'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Lifegoal Modal */}
      <Modal isOpen={isAddGoalOpen} title="Buat Impian Baru (Life Goal)" onClose={() => setIsAddGoalOpen(false)}>
        <form onSubmit={handleCreateGoalSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Impian</label>
            <input
              type="text"
              className="form-control"
              placeholder="cth: Laptop Baru, Liburan Jepang, Menikah"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Harga (Rp)</label>
            <input
              type="number"
              className="form-control"
              placeholder="0"
              min="1"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
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
              value={goalStartBalance}
              onChange={(e) => setGoalStartBalance(e.target.value)}
            />
          </div>

          {/* Camera Access & Image Upload Section */}
          <div className="form-group">
            <label className="form-label">Gambar Target Impian</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', padding: '12px', border: '1px dashed hsl(var(--border))', borderRadius: '10px', backgroundColor: 'hsl(var(--bg-input))' }}>
              
              {/* Live Video / Captured Image preview */}
              {cameraActive ? (
                <div style={{ width: '200px', height: '200px', borderRadius: '10px', overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  ></video>
                </div>
              ) : goalImage ? (
                <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '10px', overflow: 'hidden' }}>
                  <img src={goalImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    className="btn btn-sm btn-danger" 
                    onClick={() => setGoalImage(null)}
                    style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }}
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div style={{ width: '200px', height: '200px', borderRadius: '10px', backgroundColor: 'hsl(var(--bg-card))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', gap: '8px', fontSize: '12px' }}>
                  <ImageIcon size={28} />
                  <span>Belum ada foto</span>
                </div>
              )}

              {/* Upload & Camera Actions */}
              <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center', marginTop: '6px' }}>
                {cameraActive ? (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-success" 
                      onClick={capturePhoto}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Camera size={13} />
                      <span>Jepret Foto</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-secondary" 
                      onClick={stopCamera}
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-secondary" 
                      onClick={startCamera}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Camera size={13} />
                      <span>Ambil Foto</span>
                    </button>

                    <label 
                      className="btn btn-sm btn-secondary" 
                      style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={13} />
                      <span>Pilih File</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </>
                )}
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddGoalOpen(false)} disabled={isSubmittingAddGoal}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingAddGoal}>
              {isSubmittingAddGoal ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deposit Lifegoal Modal */}
      <Modal isOpen={isDepositGoalOpen} title="Isi Saldo Impian" onClose={() => setIsDepositGoalOpen(false)}>
        {selectedGoal && (
          <form onSubmit={handleDepositGoalSubmit}>
            <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
              Pindahkan dana dari rekening utama Anda untuk menambah tabungan impian "{selectedGoal.name}".
            </p>
            
            <div className="form-group">
              <label className="form-label">Nama Impian</label>
              <input type="text" className="form-control" value={selectedGoal.name} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Saldo Saat Ini</label>
              <input type="text" className="form-control" value={`${fmtRp(selectedGoal.balance)} dari ${fmtRp(selectedGoal.target_amount)}`} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Rekening Sumber Dana</label>
              <select
                className="form-control"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
              >
                <option value="">— Pilih Rekening Sumber —</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.category}) — {fmtRp(acc.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah Setor (Rp)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setIsDepositGoalOpen(false)} disabled={isSubmittingDepositGoal}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingDepositGoal}>
                {isSubmittingDepositGoal ? 'Menyimpan...' : 'Setor Sekarang'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Withdraw Lifegoal Modal */}
      <Modal isOpen={isWithdrawGoalOpen} title="Cairkan Dana Impian" onClose={() => setIsWithdrawGoalOpen(false)}>
        {selectedGoal && (
          <form onSubmit={handleWithdrawGoalSubmit}>
            <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
              Pindahkan dana dari impian "{selectedGoal.name}" untuk ditransfer ke salah satu rekening aktif Anda.
            </p>
            
            <div className="form-group">
              <label className="form-label">Nama Impian</label>
              <input type="text" className="form-control" value={selectedGoal.name} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Saldo Tersedia</label>
              <input type="text" className="form-control" value={fmtRp(selectedGoal.balance)} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah Dicairkan (Rp)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                min="1"
                max={selectedGoal.balance}
                value={withdrawGoalAmount}
                onChange={(e) => setWithdrawGoalAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rekening Tujuan</label>
              <select
                className="form-control"
                value={targetAccountIdWithdraw}
                onChange={(e) => setTargetAccountIdWithdraw(e.target.value)}
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
              <button type="button" className="btn btn-ghost" onClick={() => setIsWithdrawGoalOpen(false)} disabled={isSubmittingWithdrawGoal}>Batal</button>
              <button type="submit" className="btn btn-success" disabled={isSubmittingWithdrawGoal}>
                {isSubmittingWithdrawGoal ? 'Memproses...' : 'Cairkan Sekarang'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
