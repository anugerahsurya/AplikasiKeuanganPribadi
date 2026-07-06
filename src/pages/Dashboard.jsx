import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  TrendingUp, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  BarChart2, 
  Tag, 
  Target, 
  ClipboardList 
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { getAccounts, getDashboardSummary, getMonthlyChart, getCategoryBreakdown, getBudgetProgress } from '../services/db';
import { fmtRp, MONTHS } from '../utils/format';
import CategoryIcon from '../components/CategoryIcon';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

export default function Dashboard({ refreshTrigger }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);

  useEffect(() => {
    loadData();
  }, [period, refreshTrigger]);

  const loadData = () => {
    const sum = getDashboardSummary(period.year, period.month);
    const accs = getAccounts();
    const balance = accs.reduce((s, a) => s + a.balance, 0);
    const monthly = getMonthlyChart();
    const breakdown = getCategoryBreakdown(period.year, period.month);
    const budgets = getBudgetProgress(period.year, period.month);

    setSummary(sum);
    setTotalBalance(balance);
    setMonthlyChartData(monthly);
    setCategoryBreakdown(breakdown);
    setBudgetProgress(budgets);
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

  // 1. Monthly Bar Chart Setup
  const monthlyBarData = {
    labels: monthlyChartData.map(d => d.period),
    datasets: [
      {
        label: 'Pemasukan',
        data: monthlyChartData.map(d => d.income),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderRadius: 6,
      },
      {
        label: 'Pengeluaran',
        data: monthlyChartData.map(d => d.expense),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderRadius: 6,
      }
    ]
  };

  const monthlyBarOptions = {
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

  // 2. Category Doughnut Chart Setup
  const expCats = categoryBreakdown.filter(d => d.type === 'expense');
  const COLORS = ['#7aab8a', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#14b8a6', '#06b6d4', '#84cc16', '#a78bfa', '#fb7185'];

  const categoryDoughnutData = {
    labels: expCats.map(d => d.category),
    datasets: [{
      data: expCats.map(d => d.total),
      backgroundColor: COLORS.slice(0, expCats.length),
      borderWidth: 0,
      hoverOffset: 6,
    }]
  };

  const categoryDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { 
        position: 'right', 
        labels: { 
          color: 'hsl(var(--text-secondary))', 
          font: { family: 'Poppins', size: 11 },
          boxWidth: 10,
          padding: 8
        } 
      },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtRp(ctx.parsed)}` } },
    },
  };

  // 3. Budget Status Bar Chart
  const activeBudgets = budgetProgress.filter(b => b.amount > 0 || b.spent > 0);
  
  const budgetBarData = {
    labels: activeBudgets.map(b => b.category),
    datasets: [
      {
        label: 'Pengeluaran Aktual',
        data: activeBudgets.map(b => b.spent),
        backgroundColor: activeBudgets.map(b =>
          b.amount === 0 ? 'rgba(59, 130, 246, 0.7)' :
          b.pct < 70 ? 'rgba(34, 197, 94, 0.75)' :
          b.pct < 100 ? 'rgba(234, 179, 8, 0.75)' :
          'rgba(239, 68, 68, 0.75)'
        ),
        borderRadius: 6,
        order: 1
      },
      {
        label: 'Batas Anggaran',
        data: activeBudgets.map(b => b.amount),
        type: 'line',
        borderColor: 'hsl(var(--text-muted) / 0.5)',
        borderWidth: 2,
        borderDash: [5, 4],
        pointBackgroundColor: 'hsl(var(--color-accent))',
        pointRadius: 4,
        fill: false,
        order: 0
      }
    ]
  };

  const budgetBarOptions = {
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

  // Group category breakdown for table
  const groupedBreakdown = {};
  categoryBreakdown.forEach(d => {
    if (!groupedBreakdown[d.category]) {
      groupedBreakdown[d.category] = { income: 0, expense: 0 };
    }
    groupedBreakdown[d.category][d.type] = d.total;
  });

  return (
    <div className="page active">

      {/* Period Navigator */}
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

      {/* Financial Summary Cards */}
      <div className="grid grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--color-accent) / 0.1)', color: 'hsl(var(--color-accent))' }}>
            <CreditCard size={20} />
          </div>
          <div className="stat-label">Total Saldo Aktif</div>
          <div className="stat-value">{fmtRp(totalBalance)}</div>
          <div className="stat-sub">Semua rekening</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--color-success) / 0.1)', color: 'hsl(var(--color-success))' }}>
            <ArrowDownLeft size={20} />
          </div>
          <div className="stat-label">Pemasukan Bulan Ini</div>
          <div className="stat-value" style={{ color: 'hsl(var(--color-success))' }}>{fmtRp(summary.income)}</div>
          <div className="stat-sub">{getPeriodLabel()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--color-danger) / 0.1)', color: 'hsl(var(--color-danger))' }}>
            <ArrowUpRight size={20} />
          </div>
          <div className="stat-label">Pengeluaran Bulan Ini</div>
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
          <div className="stat-label">Net Cashflow</div>
          <div className="stat-value" style={{ color: summary.net >= 0 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))' }}>
            {summary.net >= 0 ? '+' : ''}{fmtRp(summary.net)}
          </div>
          <div className="stat-sub">Pemasukan - Pengeluaran</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-2">
        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Tren 12 Bulan Terakhir</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {monthlyChartData.length === 0 ? (
              <div className="empty-state" style={{ height: '100%' }}>Belum ada data bulanan.</div>
            ) : (
              <Bar data={monthlyBarData} options={monthlyBarOptions} />
            )}
          </div>
        </div>

        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={16} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Pengeluaran per Kategori</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {expCats.length === 0 ? (
              <div className="empty-state" style={{ height: '100%' }}>Belum ada pengeluaran di bulan ini.</div>
            ) : (
              <Doughnut data={categoryDoughnutData} options={categoryDoughnutOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Budget Progress Chart */}
      <div className="card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Status Anggaran Bulanan</span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          {activeBudgets.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>Belum ada anggaran bulanan aktif. Atur anggaran di menu Budgeting.</div>
          ) : (
            <Bar data={budgetBarData} options={budgetBarOptions} />
          )}
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={16} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Rincian Kategori Bulan Ini</span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="empty-state">Belum ada rincian kegiatan.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pemasukan</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pengeluaran</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedBreakdown).map(([cat, val]) => (
                  <tr key={cat} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                    <td style={{ padding: '14px 8px', fontSize: '13.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CategoryIcon category={cat} size={16} />
                      {cat}
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 8px', fontSize: '13.5px', color: 'hsl(var(--color-success))', fontWeight: 600 }}>
                      {val.income > 0 ? fmtRp(val.income) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 8px', fontSize: '13.5px', color: 'hsl(var(--color-danger))', fontWeight: 600 }}>
                      {val.expense > 0 ? fmtRp(val.expense) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
