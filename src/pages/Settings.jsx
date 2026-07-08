import React, { useState, useEffect } from 'react';
import { 
  Database, 
  LogOut, 
  RefreshCw, 
  HelpCircle, 
  Key,
  Save,
  Cloud,
  Upload,
  User
} from 'lucide-react';
import Modal from '../components/Modal';
import { 
  getDbMode, 
  setDbMode, 
  syncFromSheets, 
  syncToSheets,
  importDatabase,
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

export default function Settings({ onToast, triggerRefresh }) {
  const [dbMode, setLocalDbMode] = useState(getDbMode());
  const [googleClientId, setGoogleClientId] = useState(getClientId());
  const [isGUserLoggedIn, setIsGUserLoggedIn] = useState(isLoggedIn());
  const [gUser, setGUser] = useState(getGoogleUser());
  const [showInstructions, setShowInstructions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

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
                  {getSpreadsheetUrl() && (
                    <a
                      href={getSpreadsheetUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <Cloud size={12} />
                      <span>Buka Google Sheets</span>
                    </a>
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
