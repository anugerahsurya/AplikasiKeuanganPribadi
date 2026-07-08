import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, BarChart2, Target, Tag } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  LineController,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { getBudgets, getBudgetProgress, addBudget, updateBudget, deleteBudget } from '../services/db';
import { fmtRp, MONTHS } from '../utils/format';
import Modal from '../components/Modal';
import CategoryIcon from '../components/CategoryIcon';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  LineController,
  Title, 
  Tooltip, 
  Legend
);

export default function Budgeting({ onToast, refreshTrigger, triggerRefresh }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [budgets, setBudgets] = useState([]);
  const [progress, setProgress] = useState([]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form States
  const [editId, setEditId] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [period, refreshTrigger]);

  const loadData = () => {
    setBudgets(getBudgets());
    setProgress(getBudgetProgress(period.year, period.month));
  };

  const handlePrevMonth = () => {
    setPeriod(prev => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) { m = 12; y -= 1; }
      return { year: y, month: m };
    });
  };

  const handleNextMonth = () => {
    setPeriod(prev => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) { m = 1; y += 1; }
      return { year: y, month: m };
    });
  };

  const getPeriodLabel = () => {
    return `${MONTHS[period.month - 1]} ${period.year}`;
  };

  const handleOpenEdit = (b) => {
    setEditId(b.id);
    setEditCategory(b.category);
    setEditAmount(b.amount > 0 ? b.amount.toString() : '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(editAmount) < 0) {
      onToast('Nominal anggaran tidak boleh negatif.', 'error');
      return;
    }

    try {
      const amount = parseFloat(editAmount) || 0;
      await updateBudget({ id: editId, amount });
      onToast(`Anggaran kategori "${editCategory}" berhasil diperbarui! 🎯`);
      setIsEditModalOpen(false);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal mengubah anggaran.', 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const category = addName.trim();
    if (!category) {
      onToast('Nama kategori kustom harus diisi.', 'error');
      return;
    }

    // Check duplicate
    const exists = budgets.some(b => b.category.toLowerCase() === category.toLowerCase());
    if (exists) {
      onToast('Kategori anggaran sudah ada.', 'error');
      return;
    }

    try {
      const amount = parseFloat(addAmount) || 0;
      await addBudget({ category, amount });
      onToast(`Kategori kustom "${category}" berhasil dibuat! 🎉`);
      setAddName('');
      setAddAmount('');
      setIsAddModalOpen(false);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menambahkan kategori kustom.', 'error');
    }
  };

  const handleDeleteCustom = async (id, catName) => {
    if (!window.confirm(`Hapus kategori kustom "${catName}"?`)) return;

    try {
      await deleteBudget(id);
      onToast(`Kategori kustom "${catName}" berhasil dihapus.`);
      triggerRefresh();
    } catch (err) {
      onToast('Gagal menghapus kategori kustom.', 'error');
    }
  };

  // Main budget chart setup
  const withBudget = progress.filter(b => b.amount > 0);

  const budgetChartData = {
    labels: withBudget.map(b => b.category),
    datasets: [
      {
        label: 'Pengeluaran Aktual',
        data: withBudget.map(b => b.spent),
        backgroundColor: withBudget.map(b =>
          b.pct < 70 ? 'rgba(34, 197, 94, 0.8)' :
          b.pct < 100 ? 'rgba(234, 179, 8, 0.8)' :
          'rgba(239, 68, 68, 0.85)'
        ),
        borderRadius: 6,
        order: 1
      },
      {
        label: 'Batas Anggaran',
        data: withBudget.map(b => b.amount),
        type: 'line',
        borderColor: 'hsl(var(--color-accent) / 0.5)',
        borderWidth: 2,
        borderDash: [5, 4],
        pointBackgroundColor: 'hsl(var(--color-accent))',
        pointRadius: 5,
        fill: false,
        order: 0
      }
    ]
  };

  const budgetChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'hsl(var(--text-secondary))', font: { family: 'Poppins', size: 11 } } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtRp(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { color: 'hsl(var(--text-muted))', font: { family: 'Poppins', size: 10 } }, grid: { color: 'hsl(var(--border) / 0.2)' } },
      y: { ticks: { color: 'hsl(var(--text-muted))', font: { family: 'Poppins', size: 10 }, callback: v => 'Rp ' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'hsl(var(--border) / 0.2)' } },
    },
  };

  return (
    <div className="page active">
      {/* Page Actions / Sub Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Kategori Kustom</span>
        </button>
      </div>

      {/* Period selection */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
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
      </div>

      {/* Main progress chart */}
      <div className="card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={16} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Grafik Budget vs Pengeluaran</span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          {withBudget.length === 0 ? (
            <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
              <div className="empty-state-icon" style={{ color: 'hsl(var(--text-muted))' }}>
                <Target size={40} />
              </div>
              <p>Belum ada anggaran yang ditetapkan. Klik kartu kategori di bawah untuk menetapkan nominal anggaran.</p>
            </div>
          ) : (
            <Bar data={budgetChartData} options={budgetChartOptions} />
          )}
        </div>
      </div>

      {/* Budget Grid list */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Anggaran per Kategori</span>
        </h2>
        
        {progress.length === 0 ? (
          <div className="card">
            <div className="empty-state">Tidak ada kategori budget.</div>
          </div>
        ) : (
          <div className="grid grid-3">
            {progress.map(b => {
              const pct = b.amount > 0 ? Math.min(b.pct, 100) : 0;
              const pctClass = b.pct < 70 ? 'safe' : b.pct < 100 ? 'warn' : 'danger';
              const isOver = b.spent > b.amount && b.amount > 0;
              const isDefault = b.is_default === 1 || b.is_default === '1';

              return (
                <div 
                  key={b.id} 
                  className={`budget-card ${isOver ? 'over-budget' : ''}`}
                  onClick={() => handleOpenEdit(b)}
                >
                  {/* Actions (Delete only custom) */}
                  {!isDefault && (
                    <div className="budget-card-actions">
                      <button 
                        className="tx-btn" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCustom(b.id, b.category); }}
                        title="Hapus Kategori"
                        style={{ color: 'hsl(var(--color-danger))' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div className="budget-card-header">
                    <div className="budget-card-cat" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CategoryIcon category={b.category} size={16} />
                      <span>{b.category}</span>
                    </div>
                    <span className={`badge ${isDefault ? 'badge-budget' : 'badge-custom'}`}>
                      {isDefault ? 'Default' : 'Kustom'}
                    </span>
                  </div>

                  <div className="budget-card-meta">
                    <span className="budget-card-spent" style={{ color: isOver ? 'hsl(var(--color-danger))' : 'hsl(var(--text-primary))' }}>
                      {fmtRp(b.spent)} terpakai
                    </span>
                    <span className="budget-card-limit">
                      {b.amount > 0 ? 'dari ' + fmtRp(b.amount) : 'Belum diset'}
                    </span>
                  </div>

                  <div className="budget-progress-wrap">
                    <div className={`budget-progress-bar ${pctClass}`} style={{ width: `${pct}%` }}></div>
                  </div>

                  <div className="budget-card-footer">
                    <span className={`budget-remaining ${b.remaining >= 0 ? 'positive' : 'negative'}`}>
                      {b.amount > 0
                        ? (b.remaining >= 0 ? `Sisa ${fmtRp(b.remaining)}` : `Lebih ${fmtRp(Math.abs(b.remaining))}`)
                        : 'Klik untuk atur anggaran'}
                    </span>
                    {b.amount > 0 && (
                      <span className={`budget-pct ${pctClass}`}>
                        {b.pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Budget Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        title={`Atur Anggaran — ${editCategory}`} 
        onClose={() => setIsEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <input type="text" className="form-control" value={editCategory} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Nominal Anggaran Bulanan (Rp)</label>
            <input
              type="number"
              className="form-control"
              placeholder="0"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Budget Modal */}
      <Modal isOpen={isAddModalOpen} title="Tambah Kategori Anggaran Kustom" onClose={() => setIsAddModalOpen(false)}>
        <form onSubmit={handleAddSubmit}>
          <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
            Tambahkan kategori pengeluaran kustom Anda sendiri (misal: Hobi, Vakansi, Kucing). Kategori ini dapat dihapus sewaktu-waktu.
          </p>
          <div className="form-group">
            <label className="form-label">Nama Kategori</label>
            <input
              type="text"
              className="form-control"
              placeholder="cth: Hobi, Langganan, Olahraga"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Anggaran Bulanan (Rp)</label>
            <input
              type="number"
              className="form-control"
              placeholder="0"
              min="0"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Tambah</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
