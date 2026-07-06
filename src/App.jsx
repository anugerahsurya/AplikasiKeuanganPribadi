import React, { useState, useEffect } from 'react';
import { initializeDb } from './services/db';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import Topbar from './components/Topbar';

// Pages
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Savings from './pages/Savings';
import Budgeting from './pages/Budgeting';
import Memo from './pages/Memo';
import Settings from './pages/Settings';
import Guide from './pages/Guide';

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState([]);
  
  // Theme & Preset settings (Default to 'light')
  const [theme, setTheme] = useState(() => localStorage.getItem('ituang_theme') || 'light');
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('ituang_color_preset') || 'blue');

  // Initialize DB and apply settings on startup
  useEffect(() => {
    const init = async () => {
      // Set Theme Attributes
      document.documentElement.setAttribute('data-theme', theme);
      
      // Remove all theme-color classes
      const bodyClass = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
      document.body.className = [...bodyClass, `theme-${colorTheme}`].join(' ');

      // Initialize local storage / cloud sync database
      try {
        await initializeDb();
        setDbInitialized(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
        showToast('Gagal memuat database.', 'error');
        setDbInitialized(true); // fall back to local state anyway
      }
    };
    init();
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (!dbInitialized) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0f18',
        color: '#a5b4fc',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(165,180,252,0.3)',
          borderTopColor: '#a5b4fc',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          marginBottom: '16px'
        }}></div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>Menyiapkan Ituang...</div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Page switching router map
  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <Overview 
            setCurrentPage={setCurrentPage} 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'transactions':
        return (
          <Transactions 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            refreshTrigger={refreshTrigger}
          />
        );
      case 'accounts':
        return (
          <Accounts 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'savings':
        return (
          <Savings 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'budgeting':
        return (
          <Budgeting 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'memo':
        return (
          <Memo 
            onToast={showToast} 
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        );
      case 'settings':
        return (
          <Settings 
            onToast={showToast} 
            triggerRefresh={triggerRefresh}
          />
        );
      case 'guide':
        return (
          <Guide />
        );
      default:
        return <Overview setCurrentPage={setCurrentPage} onToast={showToast} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Toast Notification Container */}
      <div id="toast-container">
        {toasts.map(t => (
          <Toast 
            key={t.id} 
            id={t.id} 
            message={t.message} 
            type={t.type} 
            onClose={removeToast} 
          />
        ))}
      </div>

      {/* Desktop Navigation Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onToast={showToast} 
      />

      {/* Mobile Sticky Header */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <span style={{ fontSize: '20px' }}>💰</span>
          <span className="mobile-header-text">Ituang</span>
        </div>
      </header>

      {/* Main Dynamic View Content */}
      <main className="main-content">
        <Topbar 
          currentPage={currentPage}
          theme={theme}
          setTheme={setTheme}
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          onToast={showToast}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          {renderPage()}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
      />
    </div>
  );
}
