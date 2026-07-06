import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';

export default function Topbar({ currentPage, theme, setTheme, colorTheme, setColorTheme, onToast }) {
  const titles = {
    overview: 'Ringkasan Bulanan',
    transactions: 'Semua Transaksi',
    dashboard: 'Dashboard Keuangan',
    accounts: 'Tempat Saldo',
    savings: 'Tabungan',
    budgeting: 'Budgeting',
    memo: 'Catatan Keuangan',
    settings: 'Pengaturan',
    guide: 'Panduan Penggunaan',
  };

  const handleThemeChange = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('ituang_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    onToast(`Tema ${nextTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan.`);
  };

  const handleColorChange = (e) => {
    const nextColor = e.target.value;
    setColorTheme(nextColor);
    localStorage.setItem('ituang_color_preset', nextColor);
    
    // Remove all theme-color classes
    const bodyClass = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
    document.body.className = [...bodyClass, `theme-${nextColor}`].join(' ');
    
    onToast(`Warna aksen ${nextColor.toUpperCase()} diaktifkan!`);
  };

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid hsl(var(--border))' }}>
      <div className="topbar-title" style={{ fontSize: '22px', fontWeight: 700 }}>
        {titles[currentPage] || 'Ituang'}
      </div>
      
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Color Preset Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <Palette size={16} style={{ color: 'hsl(var(--color-accent))' }} />
          <select 
            value={colorTheme} 
            onChange={handleColorChange}
            className="form-control"
            style={{ 
              padding: '6px 30px 6px 12px', 
              fontSize: '13px', 
              fontWeight: 500, 
              width: '120px', 
              height: '34px',
              backgroundColor: 'hsl(var(--bg-card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <option value="blue">Biru</option>
            <option value="pink">Pink</option>
            <option value="green">Hijau</option>
            <option value="orange">Oranye</option>
          </select>
        </div>

        {/* Theme Toggle (Sun/Moon button) */}
        <button 
          className="btn btn-ghost" 
          onClick={handleThemeChange}
          style={{ 
            width: '36px', 
            height: '36px', 
            padding: 0, 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'hsl(var(--bg-input))',
            border: '1px solid hsl(var(--border))'
          }}
          title={theme === 'light' ? 'Nyalakan Mode Gelap' : 'Nyalakan Mode Terang'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} style={{ color: '#f59e0b' }} />}
        </button>

      </div>
    </div>
  );
}
