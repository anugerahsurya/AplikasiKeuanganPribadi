import React, { useState, useEffect } from 'react';
import { 
  Database, 
  LogOut, 
  RefreshCw, 
  HelpCircle, 
  Key,
  Save,
  Cloud,
  Upload
} from 'lucide-react';
import { 
  getDbMode, 
  setDbMode, 
  syncFromSheets, 
  syncToSheets,
  importDatabase
} from '../services/db';
import { 
  getClientId, 
  setClientId, 
  isLoggedIn, 
  getGoogleUser, 
  signIn, 
  signOut 
} from '../services/googleSheets';

export default function Settings({ onToast, triggerRefresh }) {
  const [dbMode, setLocalDbMode] = useState(getDbMode());
  const [googleClientId, setGoogleClientId] = useState(getClientId());
  const [isGUserLoggedIn, setIsGUserLoggedIn] = useState(isLoggedIn());
  const [gUser, setGUser] = useState(getGoogleUser());
  const [showInstructions, setShowInstructions] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        const success = await importDatabase(parsedData);
        if (success) {
          onToast('Berhasil mengimpor data dari desktop!');
          triggerRefresh();
        } else {
          onToast('Format file JSON tidak valid.', 'error');
        }
      } catch (err) {
        onToast('Gagal membaca file JSON. Pastikan file valid.', 'error');
      }
    };
    reader.readAsText(file);
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
      onToast('Berhasil terhubung dengan Akun Google Anda!');
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
    setDbMode('local');
    setLocalDbMode('local');
    onToast('Koneksi Google diputuskan. Database dialihkan ke mode Lokal.');
    triggerRefresh();
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      await syncToSheets();
      onToast('Berhasil mengunggah rekap data lokal ke Google Sheets!');
    } catch (e) {
      onToast('Gagal mengunggah data.', 'error');
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

  return (
    <div className="page active">
      <div className="grid grid-2" style={{ gap: '24px' }}>
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
                onClick={() => handleDbModeChange('googlesheets')}
                disabled={!isGUserLoggedIn}
                title={!isGUserLoggedIn ? "Silakan login Google dahulu" : ""}
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

        {/* IMPORT DATA SETTINGS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: 'hsl(var(--color-accent))' }} />
            <span>Import Data dari Desktop</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
            Pindahkan data dari aplikasi desktop lama Anda. Jalankan script eksportir terlebih dahulu untuk menghasilkan file JSON.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>
              <Upload size={14} />
              <span>Pilih File ituang_import.json</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJson} 
                style={{ display: 'none' }} 
              />
            </label>
            <small style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
              Catatan: Impor data akan menimpa data lokal saat ini. Cadangkan jika dirasa perlu.
            </small>
          </div>
        </div>

      </div>

      {/* GOOGLE SHEET CONFIGURATION SECTION */}
      <div className="card" style={{ marginTop: '8px' }}>
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
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{gUser.name}</div>
                    <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))' }}>{gUser.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                    <span>Disconnet</span>
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

    </div>
  );
}
