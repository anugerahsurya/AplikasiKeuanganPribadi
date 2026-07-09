import React, { useState } from 'react';
import { Sun, Moon, Palette, RefreshCw } from 'lucide-react';
import { syncFromSheets, getDbMode } from '../services/db';
import { isLoggedIn } from '../services/googleSheets';

export default function Topbar({ currentPage, theme, setTheme, colorTheme, setColorTheme, onToast, triggerRefresh }) {
  const [syncing, setSyncing] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    onToast('Menyinkronkan data dari Google Sheets...');
    try {
      const success = await syncFromSheets();
      if (success) {
        onToast('Data berhasil diperbarui! 🔄');
        if (triggerRefresh) triggerRefresh();
      } else {
        onToast('Koneksi gagal atau data di cloud kosong.', 'error');
      }
    } catch (e) {
      console.error(e);
      onToast('Gagal sinkronisasi: ' + (e.message || 'Error tidak diketahui'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const isCloudMode = getDbMode() === 'googlesheets';
  const isGLoggedIn = isLoggedIn();
  const showRefresh = isCloudMode && isGLoggedIn;

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid hsl(var(--border))' }}>
      <div className="topbar-title" style={{ fontSize: '22px', fontWeight: 700 }}>
        {titles[currentPage] || 'Ituang'}
      </div>
      
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Color Preset Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <Palette size={16} style={{ color: 'hsl(var(--color-accent))' }} />
          <select 
            value={colorTheme} 
            onChange={handleColorChange}
            className="form-control"
            style={{ 
              padding: '6px 26px 6px 10px', 
              fontSize: '13px', 
              fontWeight: 500, 
              width: '100px', 
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

        {/* Refresh Button */}
        {showRefresh && (
          <button 
            className="btn btn-ghost" 
            onClick={handleSync}
            disabled={syncing}
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
            title="Sinkronisasi Data Google Sheets"
          >
            <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
          </button>
        )}

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
