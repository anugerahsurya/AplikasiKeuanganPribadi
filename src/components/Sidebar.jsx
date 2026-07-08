import React from 'react';
import { 
  BarChart3, 
  ArrowRightLeft, 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  Target, 
  FileText, 
  Settings,
  LogOut,
  User,
  Wallet,
  HelpCircle
} from 'lucide-react';
import { isLoggedIn, getGoogleUser, signOut } from '../services/googleSheets';

export default function Sidebar({ currentPage, setCurrentPage, onToast }) {
  const isGoogle = isLoggedIn();
  const googleUser = getGoogleUser();

  const menuUtama = [
    { id: 'overview', label: 'Ringkasan Bulanan', icon: BarChart3 },
    { id: 'transactions', label: 'Transaksi', icon: ArrowRightLeft },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  ];

  const menuManajemen = [
    { id: 'accounts', label: 'Tempat Saldo', icon: CreditCard },
    { id: 'savings', label: 'Tabungan', icon: PiggyBank },
    { id: 'budgeting', label: 'Budgeting', icon: Target },
    { id: 'memo', label: 'Catatan Keuangan', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const handleSignOut = () => {
    signOut();
    onToast('Berhasil keluar dari akun Google!');
    // Reload page to reset database context to local
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ color: 'hsl(var(--color-accent))', display: 'flex', alignItems: 'center' }}>
          <Wallet size={24} />
        </div>
        <span className="sidebar-logo-text">Ituang</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Menu Utama</div>
        {menuUtama.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Manajemen</div>
        {menuManajemen.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Bantuan</div>
        <div
          className={`nav-item ${currentPage === 'guide' ? 'active' : ''}`}
          onClick={() => setCurrentPage('guide')}
        >
          <HelpCircle size={18} />
          <span>Panduan Penggunaan</span>
        </div>
      </div>

      <div className="sidebar-footer">
        {isGoogle && googleUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sidebar-user">
              {googleUser.picture ? (
                <img 
                  src={googleUser.picture} 
                  alt={googleUser.name} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }} 
                />
              ) : (
                <div className="sidebar-user-avatar">
                  {googleUser.name ? googleUser.name.substring(0, 2).toUpperCase() : 'US'}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div className="sidebar-user-name" title={googleUser.name}>{googleUser.name}</div>
                <div className="sidebar-user-role" title={googleUser.email}>{googleUser.email}</div>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={handleSignOut}
              style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '8px 12px' }}
            >
              <LogOut size={14} />
              <span>Keluar Google</span>
            </button>
          </div>
        ) : (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(localStorage.getItem('ituang_user_name') || 'Pengguna Lokal').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="sidebar-user-name" title={localStorage.getItem('ituang_user_name') || 'Pengguna Lokal'}>
                {localStorage.getItem('ituang_user_name') || 'Pengguna Lokal'}
              </div>
              <div className="sidebar-user-role">Offline / Local Storage</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
