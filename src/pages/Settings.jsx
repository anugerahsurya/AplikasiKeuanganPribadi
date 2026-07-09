import React, { useState, useEffect } from 'react';
import { 
  Database, 
  LogOut, 
  RefreshCw, 
  HelpCircle, 
  Key,
  Save,
  Cloud,
  User,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Loader
} from 'lucide-react';
import Modal from '../components/Modal';
import { 
  getDbMode, 
  setDbMode, 
  syncFromSheets, 
  syncToSheets,
  mergeDbWithCloud,
  getAccounts,
  getSavings,
  getAllTransactions,
  getMemos
} from '../services/db';
import { 
  getClientId, 
  setClientId, 
  isLoggedIn, 
  getGoogleUser, 
  signIn, 
  signOut,
  getSpreadsheetUrl
} from '../services/googleSheets';

import { loginUser, registerUser } from '../services/auth';

export default function Settings({ onToast, triggerRefresh, onLogout, authUser }) {
  const [dbMode, setLocalDbMode] = useState(getDbMode());
  const [googleClientId, setGoogleClientId] = useState(getClientId());
  const [isGUserLoggedIn, setIsGUserLoggedIn] = useState(isLoggedIn());
  const [gUser, setGUser] = useState(getGoogleUser());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(getSpreadsheetUrl());
  const [showInstructions, setShowInstructions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Ituang account login form state
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuthPass, setShowAuthPass] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'primary', // primary | danger | success
    onConfirm: null
  });

  const openConfirm = ({ title, message, variant = 'primary', onConfirm }) => {
    setConfirmModal({ open: true, title, message, variant, onConfirm });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false, onConfirm: null }));
  
  // Mobile access link state
  const [mobileLink, setMobileLink] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const generateMobileLink = () => {
    const clientId = getClientId();
    if (!clientId) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}?clientId=${encodeURIComponent(clientId)}`;
    setMobileLink(link);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`;
    setQrCodeUrl(qr);
  };

  const handleCopyLink = () => {
    if (!mobileLink) return;
    navigator.clipboard.writeText(mobileLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // User Profile Name State
  const [localName, setLocalNameState] = useState(() => localStorage.getItem('ituang_user_name') || '');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const name = localName.trim();
    if (!name) {
      onToast('Nama profil tidak boleh kosong.', 'error');
      return;
    }
    localStorage.setItem('ituang_user_name', name);
    onToast('Nama profil berhasil diperbarui! 👤');
    triggerRefresh();
  };


  // Sync state when Google OAuth state changes
  useEffect(() => {
    setIsGUserLoggedIn(isLoggedIn());
    setGUser(getGoogleUser());
  }, []);

  const handleDbModeChange = (mode) => {
    if (mode === 'googlesheets' && !googleClientId) {
      onToast('Google Client ID harus diatur sebelum beralih ke mode cloud.', 'error');
      return;
    }
    
    setLocalDbMode(mode);
    setDbMode(mode);
    onToast(`Database dialihkan ke mode ${mode === 'local' ? 'Lokal (Offline)' : 'Cloud (Google Sheets)'}!`);
    triggerRefresh();
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    setClientId(googleClientId);
    onToast('Google Client ID berhasil disimpan!');
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      onToast('Silakan masukkan Google Client ID terlebih dahulu.', 'error');
      return;
    }

    try {
      await signIn();
      setIsGUserLoggedIn(isLoggedIn());
      setGUser(getGoogleUser());
      setDbMode('googlesheets');
      setLocalDbMode('googlesheets');
      onToast('Berhasil terhubung! Menyiapkan spreadsheet...');
      // Buat/cari spreadsheet agar sheet ID langsung tersimpan
      try {
        await import('../services/googleSheets').then(m => m.getOrCreateSpreadsheet());
        setSpreadsheetUrl(getSpreadsheetUrl());
        onToast('Berhasil terhubung dengan Akun Google Anda! Spreadsheet siap. ✅');
      } catch (sheetErr) {
        console.error('Spreadsheet init error:', sheetErr);
        onToast('Terhubung ke Google, tapi gagal membuka spreadsheet: ' + sheetErr.message, 'error');
      }
      triggerRefresh();
    } catch (err) {
      console.error(err);
      onToast(err.message || 'Gagal login Google OAuth.', 'error');
    }
  };

  const handleGoogleLogout = () => {
    signOut();
    setIsGUserLoggedIn(false);
    setGUser(null);
    setSpreadsheetUrl(null);
    setDbMode('local');
    setLocalDbMode('local');
    onToast('Koneksi Google diputuskan. Database dialihkan ke mode Lokal.');
    triggerRefresh();
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      await syncToSheets();
      setSpreadsheetUrl(getSpreadsheetUrl());
      onToast('Berhasil mengunggah rekap data lokal ke Google Sheets! ☁️');
    } catch (e) {
      console.error(e);
      onToast('Gagal mengunggah data: ' + e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFromSheets = async () => {
    setSyncing(true);
    try {
      const success = await syncFromSheets();
      if (success) {
        onToast('Berhasil mengunduh rekap data dari Google Sheets!');
        triggerRefresh();
      } else {
        onToast('Koneksi gagal atau database sheet kosong.', 'error');
      }
    } catch (e) {
      onToast('Gagal mengunduh data.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Ituang Account Auth Handlers ─────────────────────────────────────
  const handleAuthFormChange = (e) => {
    setAuthForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setAuthError('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
      setAuthError('Konfirmasi password tidak cocok.');
      return;
    }
    setAuthLoading(true);
    try {
      let result;
      if (authMode === 'login') {
        result = await loginUser({ username: authForm.username, password: authForm.password });
      } else {
        result = await registerUser({ username: authForm.username, email: authForm.email, password: authForm.password });
      }
      if (result.success) {
        if (!localStorage.getItem('ituang_user_name')) {
          localStorage.setItem('ituang_user_name', result.user.username);
        }
        onToast(`Selamat datang, ${result.user.username}! 👋`);
        // Update parent authUser state via onLogin callback
        if (onLogout) {
          // Trigger re-render in parent by calling a special handler
          // We emit a custom event since we only have onLogout prop available
          window.dispatchEvent(new CustomEvent('ituang:auth-login', { detail: result.user }));
        }
        triggerRefresh();
      } else {
        setAuthError(result.error || 'Terjadi kesalahan.');
      }
    } catch {
      setAuthError('Koneksi gagal. Periksa koneksi internet.');
    } finally {
      setAuthLoading(false);
    }
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthForm({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="page active">

      {/* AKUN ITUANG CARD */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Akun Ituang</span>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
            backgroundColor: 'hsl(var(--color-accent) / 0.1)', color: 'hsl(var(--color-accent))', marginLeft: '4px'
          }}>Opsional</span>
        </h2>

        {authUser ? (
          /* ── Sudah Login ── */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'var(--color-accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '18px',
                boxShadow: '0 4px 12px hsl(var(--color-accent) / 0.3)'
              }}>
                {authUser.username?.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{authUser.username}</div>
                <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>{authUser.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'hsl(var(--color-success))', marginTop: '3px' }}>
                  <ShieldCheck size={11} />
                  <span>Sesi aktif · Password terenkripsi SHA-256</span>
                </div>
              </div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => openConfirm({
                title: 'Keluar dari Akun Ituang?',
                message: 'Anda akan keluar dari akun Ituang. Data lokal di perangkat ini tetap aman. Lanjutkan?',
                variant: 'danger',
                onConfirm: () => { closeConfirm(); if (onLogout) onLogout(); }
              })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        ) : (
          /* ── Belum Login ── */
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Info di kiri */}
            <div style={{ flex: '1', minWidth: '220px' }}>
              <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, marginBottom: '12px' }}>
                Daftarkan akun untuk menyimpan identitas Anda secara online. Fitur ini <strong>opsional</strong> — tanpa login pun app tetap berjalan normal dengan penyimpanan lokal.
              </p>
              <div style={{ fontSize: '11.5px', color: 'hsl(var(--text-muted))', lineHeight: '1.8' }}>
                <div>✅ App tetap berfungsi tanpa login</div>
                <div>✅ Password dienkripsi SHA-256</div>
                <div>✅ Data keuangan di Google Sheets milik kamu</div>
              </div>
            </div>

            {/* Form login/register di kanan */}
            <div style={{ flex: '1', minWidth: '260px' }}>
              {/* Mode toggle */}
              <div style={{
                display: 'flex', backgroundColor: 'hsl(var(--bg-input))',
                borderRadius: '8px', padding: '3px', marginBottom: '16px'
              }}>
                {['login', 'register'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchAuthMode(m)}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s ease',
                      background: authMode === m ? 'var(--color-accent-gradient)' : 'none',
                      color: authMode === m ? '#fff' : 'hsl(var(--text-muted))',
                      boxShadow: authMode === m ? '0 2px 6px hsl(var(--color-accent) / 0.3)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                  >
                    {m === 'login' ? <LogIn size={12} /> : <UserPlus size={12} />}
                    {m === 'login' ? 'Masuk' : 'Daftar'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    type="text" name="username"
                    placeholder={authMode === 'login' ? 'Username kamu...' : 'Buat username (min. 3 karakter)'}
                    value={authForm.username}
                    onChange={handleAuthFormChange}
                    required style={{ fontSize: '13px' }}
                  />
                </div>

                {authMode === 'register' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email" name="email"
                      placeholder="email@contoh.com"
                      value={authForm.email}
                      onChange={handleAuthFormChange}
                      required style={{ fontSize: '13px' }}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      type={showAuthPass ? 'text' : 'password'} name="password"
                      placeholder={authMode === 'login' ? 'Password...' : 'Min. 6 karakter'}
                      value={authForm.password}
                      onChange={handleAuthFormChange}
                      required style={{ fontSize: '13px', paddingRight: '40px' }}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowAuthPass(v => !v)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex' }}
                    >
                      {showAuthPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Konfirmasi Password</label>
                    <input
                      className="form-control"
                      type={showAuthPass ? 'text' : 'password'} name="confirmPassword"
                      placeholder="Ulangi password..."
                      value={authForm.confirmPassword}
                      onChange={handleAuthFormChange}
                      required style={{ fontSize: '13px' }}
                    />
                  </div>
                )}

                {authError && (
                  <div style={{
                    padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
                    backgroundColor: 'hsl(var(--color-danger) / 0.1)',
                    border: '1px solid hsl(var(--color-danger) / 0.25)',
                    color: 'hsl(var(--color-danger))',
                  }}>
                    ⚠️ {authError}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-sm" disabled={authLoading}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
                >
                  {authLoading
                    ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /><span>Memproses...</span></>
                    : <>{authMode === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}<span>{authMode === 'login' ? 'Masuk' : 'Buat Akun'}</span></>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-2" style={{ gap: '24px' }}>
        {/* PROFILE SETTINGS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Profil Pengguna (Lokal)</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
            Atur nama panggilan Anda yang akan ditampilkan di menu navigasi utama dan laporan cetak keuangan Anda.
          </p>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nama Panggilan / User</label>
              <input
                type="text"
                className="form-control"
                placeholder="Masukkan nama panggilan Anda..."
                value={localName}
                onChange={(e) => setLocalNameState(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
              Simpan Profil
            </button>
          </form>
        </div>

        {/* DATABASE SETTINGS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: 0 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Pilihan Database</span>
          </h2>

          <div className="form-group">
            <label className="form-label">Mode Penyimpanan</label>
            <div className="cat-tabs">
              <button
                className={`cat-tab ${dbMode === 'local' ? 'active' : ''}`}
                onClick={() => handleDbModeChange('local')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} />
                <span>Lokal (Offline)</span>
              </button>
              <button
                className={`cat-tab ${dbMode === 'googlesheets' ? 'active' : ''}`}
                onClick={() => {
                  if (!isGUserLoggedIn) {
                    setShowSetupModal(true);
                  } else {
                    handleDbModeChange('googlesheets');
                  }
                }}
                title={!isGUserLoggedIn ? "Klik untuk melihat petunjuk konfigurasi" : ""}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Cloud size={14} />
                <span>Cloud (Google Sheets)</span>
              </button>
            </div>
            <small style={{ marginTop: '6px', fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
              Mode Cloud menyinkronkan data langsung ke spreadsheet `Ituang_Database` di Google Drive Anda.
            </small>
          </div>
        </div>

      </div>

      {/* GOOGLE SHEET CONFIGURATION SECTION */}
      <div id="google-config-section" className="card" style={{ marginTop: '8px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Konfigurasi Google Drive & Sheets API</span>
        </h2>

        <div className="grid grid-2" style={{ gap: '24px' }}>
          
          {/* Client ID Setting Form */}
          <form onSubmit={handleSaveClientId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Google OAuth Client ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="Masukkan Client ID Google Anda..."
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-secondary btn-sm">Simpan Client ID</button>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowInstructions(!showInstructions)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <HelpCircle size={14} />
                Cara Mendapatkan Client ID
              </button>
            </div>
          </form>

          {/* Login Status */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'hsl(var(--bg-input))', padding: '20px', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}>
            {isGUserLoggedIn && gUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {gUser.picture ? (
                    <img src={gUser.picture} alt="Profile" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'hsl(var(--color-accent))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {gUser.name?.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{gUser.name}</div>
                    <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))' }}>{gUser.email}</div>
                    <div style={{ fontSize: '11px', color: 'hsl(var(--color-success))', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'hsl(var(--color-success))', display: 'inline-block' }} />
                      Terhubung ke Google Sheets
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {spreadsheetUrl ? (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={12} />
                      <span>Buka Google Sheets</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={syncing}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={async () => {
                        setSyncing(true);
                        try {
                          const { getOrCreateSpreadsheet } = await import('../services/googleSheets');
                          await getOrCreateSpreadsheet();
                          setSpreadsheetUrl(getSpreadsheetUrl());
                          onToast('Spreadsheet berhasil ditemukan/dibuat! ✅');
                        } catch(e) {
                          onToast('Gagal menyiapkan spreadsheet: ' + e.message, 'error');
                        } finally {
                          setSyncing(false);
                        }
                      }}
                    >
                      <Cloud size={12} />
                      <span>Lihat Spreadsheet</span>
                    </button>
                  )}
                  <button 
                    className="btn btn-success btn-sm" 
                    onClick={handleSyncToSheets} 
                    disabled={syncing}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} className={syncing ? 'spinning' : ''} />
                    <span>Upload ke Cloud</span>
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleSyncFromSheets} 
                    disabled={syncing}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} className={syncing ? 'spinning' : ''} />
                    <span>Download dari Cloud</span>
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={handleGoogleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <LogOut size={12} />
                    <span>Putuskan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'hsl(var(--text-muted))' }}>
                  <Cloud size={36} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>
                  Akun Google belum terhubung. Hubungkan untuk sinkronisasi Google Sheets.
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  onClick={handleGoogleLogin}
                  disabled={!googleClientId}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  Hubungkan dengan Google
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Google Credentials Help Guide */}
        {showInstructions && (
          <div style={{ marginTop: '20px', borderTop: '1px solid hsl(var(--border) / 0.5)', paddingTop: '16px', fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: '1.6' }}>
            <h3 style={{ fontWeight: 600, fontSize: '13px', color: 'hsl(var(--text-primary))', marginBottom: '8px' }}>
              Panduan Membuat Client ID di Google Cloud Console:
            </h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--color-accent-light))' }}>Google Cloud Console</a>.</li>
              <li>Buat Proyek baru (atau pilih proyek yang sudah ada).</li>
              <li>Buka menu <strong>APIs & Services</strong> ➔ <strong>Library</strong>. Cari dan aktifkan <strong>Google Drive API</strong> dan <strong>Google Sheets API</strong>.</li>
              <li>Buka menu <strong>OAuth consent screen</strong>, pilih jenis User Type <strong>External</strong>, isi Nama Aplikasi (misal: "Ituang"), dan email Anda.</li>
              <li>Pada tab <strong>Scopes</strong>, tambahkan scope: <code>.../auth/spreadsheets</code> dan <code>.../auth/drive.file</code>. Pada tab <strong>Test Users</strong>, tambahkan alamat email Google Anda sendiri.</li>
              <li>Buka menu <strong>Credentials</strong>, klik <strong>Create Credentials</strong> ➔ <strong>OAuth client ID</strong>.</li>
              <li>Pilih Application Type <strong>Web application</strong>.</li>
              <li>Di bawah <strong>Authorized JavaScript origins</strong>, tambahkan domain tempat aplikasi React ini dijalankan (misal: <code>http://localhost:5173</code> jika dijalankan lokal).</li>
              <li>Klik <strong>Create</strong>. Copy <strong>Client ID</strong> yang diberikan, tempel di form di atas, lalu klik Simpan.</li>
            </ol>
          </div>
        )}
      </div>

      {/* DATA MIGRATION SECTION */}
      <div className="card" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={18} style={{ color: 'hsl(var(--color-accent))' }} />
          <span>Migrasi Data (Lokal ➔ Cloud Spreadsheet)</span>
        </h2>
        
        {isGUserLoggedIn ? (
          <>
            <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
              Anda terhubung dengan Google Sheets. Gunakan fitur migrasi di bawah ini untuk memindahkan atau menyelaraskan data agar tidak ada data yang hilang saat beralih mode database.
            </p>

            {/* Local Data Stats Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px', 
              backgroundColor: 'hsl(var(--bg-input))', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid hsl(var(--border))',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'hsl(var(--text-muted))', display: 'block' }}>Tempat Saldo</span>
                <strong style={{ fontSize: '14px' }}>{getAccounts().length}</strong>
              </div>
              <div>
                <span style={{ color: 'hsl(var(--text-muted))', display: 'block' }}>Tabungan</span>
                <strong style={{ fontSize: '14px' }}>{getSavings().length}</strong>
              </div>
              <div>
                <span style={{ color: 'hsl(var(--text-muted))', display: 'block' }}>Transaksi</span>
                <strong style={{ fontSize: '14px' }}>{getAllTransactions().length}</strong>
              </div>
              <div>
                <span style={{ color: 'hsl(var(--text-muted))', display: 'block' }}>Catatan/Memo</span>
                <strong style={{ fontSize: '14px' }}>{getMemos().length}</strong>
              </div>
            </div>

            {/* Migration Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {/* Option A: Merge */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                borderRadius: '10px', 
                border: '1px solid hsl(var(--color-success) / 0.3)',
                backgroundColor: 'hsl(var(--color-success) / 0.03)',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'hsl(var(--color-success))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Pilihan 1: Gabungkan Data (Merge)</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'hsl(var(--color-success) / 0.15)', padding: '2px 6px', borderRadius: '4px' }}>Sangat Direkomendasikan</span>
                  </span>
                  <span style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                    Gabungkan data offline lokal saat ini dengan data di Google Sheets secara cerdas. Menghindari duplikasi transaksi dan mempertahankan semua relasi saldo.
                  </span>
                </div>
                <button 
                  className="btn btn-success btn-sm" 
                  onClick={() => openConfirm({
                    title: 'Konfirmasi: Gabungkan Data',
                    message: 'Proses ini akan mencocokkan data lokal dengan Google Sheets secara cerdas untuk menghindari duplikasi. Data lokal dan cloud akan digabungkan menjadi satu. Lanjutkan?',
                    variant: 'success',
                    onConfirm: async () => {
                      closeConfirm();
                      setSyncing(true);
                      try {
                        await mergeDbWithCloud();
                        onToast('Migrasi berhasil! Data lokal dan cloud Anda telah digabungkan. 🎉');
                        triggerRefresh();
                      } catch (e) {
                        console.error(e);
                        onToast('Gagal melakukan penggabungan data: ' + e.message, 'error');
                      } finally {
                        setSyncing(false);
                      }
                    }
                  })}
                  disabled={syncing}
                  style={{ flexShrink: 0 }}
                >
                  Mulai Gabungkan
                </button>
              </div>

              {/* Option B: Upload Overwrite */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                borderRadius: '10px', 
                border: '1px solid hsl(var(--border))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px' }}>Pilihan 2: Ekspor Lokal ke Cloud (Overwrite Cloud)</span>
                  <span style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                    Unggah data lokal Anda ke Google Sheets dan hapus data lama yang ada di cloud. Gunakan ini jika Google Sheets masih kosong atau tidak relevan.
                  </span>
                </div>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => openConfirm({
                    title: '⚠️ Ekspor Lokal ke Cloud',
                    message: 'PERINGATAN: Opsi ini akan menghapus dan menimpa seluruh data keuangan di Google Sheets Anda dengan data lokal saat ini. Data cloud yang ada sebelumnya akan hilang permanen. Lanjutkan?',
                    variant: 'danger',
                    onConfirm: async () => {
                      closeConfirm();
                      setSyncing(true);
                      try {
                        await syncToSheets();
                        onToast('Migrasi berhasil! Data lokal Anda telah diunggah ke Google Sheets. ☁️');
                      } catch (e) {
                        console.error(e);
                        onToast('Gagal mengunggah data: ' + e.message, 'error');
                      } finally {
                        setSyncing(false);
                      }
                    }
                  })}
                  disabled={syncing}
                  style={{ flexShrink: 0 }}
                >
                  Ekspor ke Cloud
                </button>
              </div>

              {/* Option C: Download Overwrite */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                borderRadius: '10px', 
                border: '1px solid hsl(var(--border))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'hsl(var(--color-danger))' }}>Pilihan 3: Impor Cloud ke Lokal (Overwrite Lokal)</span>
                  <span style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                    Unduh data dari Google Sheets dan timpa seluruh database lokal saat ini. <strong>Peringatan:</strong> Seluruh data lokal Anda saat ini akan dihapus!
                  </span>
                </div>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => openConfirm({
                    title: '⛔ Impor Cloud ke Lokal',
                    message: 'PERINGATAN SANGAT PENTING: Opsi ini akan menghapus seluruh data lokal saat ini dan menggantinya dengan data dari Google Sheets. Data lokal yang ada sebelumnya akan hilang permanen. Lanjutkan?',
                    variant: 'danger',
                    onConfirm: async () => {
                      closeConfirm();
                      setSyncing(true);
                      try {
                        const success = await syncFromSheets();
                        if (success) {
                          onToast('Migrasi berhasil! Data lokal digantikan dengan data dari Google Sheets. 📥');
                          triggerRefresh();
                        } else {
                          onToast('Koneksi gagal atau database sheet kosong.', 'error');
                        }
                      } catch (e) {
                        console.error(e);
                        onToast('Gagal mengunduh data: ' + e.message, 'error');
                      } finally {
                        setSyncing(false);
                      }
                    }
                  })}
                  disabled={syncing}
                  style={{ flexShrink: 0 }}
                >
                  Impor dari Cloud
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', backgroundColor: 'hsl(var(--bg-input))', borderRadius: '10px', border: '1px solid hsl(var(--border))' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>Database Online Belum Siap</span>
            <span style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', maxWidth: '380px', lineHeight: '1.5' }}>
              Anda belum menghubungkan Client ID Google atau belum login ke akun Google. Sambungkan terlebih dahulu untuk memigrasi data lokal Anda ke spreadsheet online.
            </span>
            <button 
              type="button" 
              className="btn btn-primary btn-sm" 
              onClick={() => setShowSetupModal(true)}
              style={{ marginTop: '8px' }}
            >
              Lihat Langkah Konfigurasi
            </button>
          </div>
        )}
      </div>

      {/* MOBILE ACCESS CARD */}
      {googleClientId && (
        <div className="card" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Akses di HP / Perangkat Lain</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
            Generate link khusus yang sudah menyertakan Client ID secara otomatis. Buka link tersebut di HP Anda, lalu langsung login dengan akun Google yang sama — data akan langsung tersinkronisasi dari spreadsheet.
          </p>

          {!mobileLink ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={generateMobileLink}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Smartphone size={14} />
              Generate Link Akses HP
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img
                  src={qrCodeUrl}
                  alt="QR Code Akses HP"
                  style={{ width: '150px', height: '150px', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>Scan QR dari HP</span>
              </div>

              {/* Link & Actions */}
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Link Akses Langsung</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <input
                      readOnly
                      value={mobileLink}
                      className="form-control"
                      style={{ fontSize: '11px', flex: 1, padding: '8px 12px', wordBreak: 'break-all' }}
                    />
                    <button
                      className={`btn btn-sm ${linkCopied ? 'btn-success' : 'btn-secondary'}`}
                      onClick={handleCopyLink}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Salin link"
                    >
                      {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                      {linkCopied ? 'Tersalin!' : 'Salin'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))', lineHeight: '1.5', backgroundColor: 'hsl(var(--bg-input))', padding: '10px 12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Cara pakai di HP:</strong>
                  1. Scan QR code atau salin link di atas<br />
                  2. Buka link di browser HP Anda<br />
                  3. Pergi ke Pengaturan → klik <strong>Hubungkan dengan Google</strong><br />
                  4. Login dengan akun Google yang sama<br />
                  5. Data tersinkronisasi otomatis 🎉
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={mobileLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '11.5px' }}
                  >
                    <ExternalLink size={13} />
                    Buka di Tab Baru
                  </a>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setMobileLink(null); setQrCodeUrl(null); }}
                    style={{ fontSize: '11.5px' }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POP-UP PETUNJUK KONFIGURASI ONLINE */}
      <Modal
        isOpen={showSetupModal}
        title="Petunjuk Konfigurasi Database Online ☁️"
        onClose={() => setShowSetupModal(false)}
        width="560px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: '1.6' }}>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            Untuk mengaktifkan mode <strong>Cloud (Google Sheets)</strong> dan melakukan migrasi data, silakan selesaikan konfigurasi berikut:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '3px solid hsl(var(--color-accent))', paddingLeft: '14px' }}>
            <div>
              <strong style={{ display: 'block', color: 'hsl(var(--text-primary))' }}>Langkah 1: Siapkan Google OAuth Client ID</strong>
              <span style={{ color: 'hsl(var(--text-muted))' }}>Dapatkan Client ID dari Google Cloud Console. Masukkan Client ID pada form di bagian bawah menu Pengaturan dan klik <strong>Simpan Client ID</strong>.</span>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'hsl(var(--text-primary))' }}>Langkah 2: Hubungkan Akun Google</strong>
              <span style={{ color: 'hsl(var(--text-muted))' }}>Klik tombol <strong>Hubungkan dengan Google</strong> di bawah status koneksi untuk mengizinkan aplikasi mengakses spreadsheet.</span>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'hsl(var(--text-primary))' }}>Langkah 3: Alihkan Mode Penyimpanan & Migrasi</strong>
              <span style={{ color: 'hsl(var(--text-muted))' }}>Setelah terhubung, Anda dapat beralih ke mode Cloud dan menggunakan fitur <strong>Migrasi Data</strong> untuk memindahkan data lokal Anda agar tidak hilang.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => {
                setShowSetupModal(false);
                setShowInstructions(true);
                const el = document.getElementById('google-config-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ flex: 1 }}
            >
              Mulai Konfigurasi Sekarang
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowSetupModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL KONFIRMASI AKSI MIGRASI (Ganti window.confirm) */}
      <Modal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        onClose={closeConfirm}
        width="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '13.5px', color: 'hsl(var(--text-secondary))', lineHeight: '1.6' }}>
            {confirmModal.message}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={closeConfirm}
            >
              Batal
            </button>
            <button 
              className={`btn btn-${confirmModal.variant === 'success' ? 'success' : 'danger'} btn-sm`}
              onClick={() => confirmModal.onConfirm && confirmModal.onConfirm()}
            >
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
