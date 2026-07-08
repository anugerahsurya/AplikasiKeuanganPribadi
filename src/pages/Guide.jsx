import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  CreditCard, 
  Target, 
  ArrowRightLeft, 
  PiggyBank, 
  TrendingUp, 
  Settings, 
  FileText,
  Cloud,
  Smartphone,
  GitMerge,
  Upload,
  Download,
  Key,
  ExternalLink
} from 'lucide-react';

export default function Guide() {
  const [activeTab, setActiveTab] = useState('tahapan');

  const steps = [
    {
      num: '1',
      title: 'Wadah Saldo (Tempat Saldo)',
      desc: 'Masukkan semua rekening Anda (Bank, Dompet digital, Kas Tunai) di menu Tempat Saldo. Ini menjadi basis saldo utama Anda.',
      icon: CreditCard,
      color: 'hsl(var(--color-accent))'
    },
    {
      num: '2',
      title: 'Tentukan Anggaran (Budgeting)',
      desc: 'Set batas pengeluaran bulanan per kategori (Makanan, Transportasi, dsb.) di menu Budgeting agar pengeluaran terkontrol.',
      icon: Target,
      color: 'hsl(var(--color-warning))'
    },
    {
      num: '3',
      title: 'Catat Aktivitas Harian (Transaksi)',
      desc: 'Catat pengeluaran, pemasukan, atau transfer antar rekening. Saldo wadah akan otomatis bertambah/berkurang.',
      icon: ArrowRightLeft,
      color: 'hsl(var(--color-success))'
    },
    {
      num: '4',
      title: 'Sisihkan Tabungan (Celengan)',
      desc: 'Buat target menabung di menu Tabungan. Anda dapat mencairkan celengan ini kembali ke saldo aktif kapan saja.',
      icon: PiggyBank,
      color: 'hsl(var(--color-accent-light))'
    },
    {
      num: '5',
      title: 'Pantau Dashboard & Laporan',
      desc: 'Lihat ringkasan visual tren bulanan di Dashboard dan unduh PDF rekap formal A4 dari halaman Transaksi.',
      icon: TrendingUp,
      color: 'hsl(var(--color-info))'
    },
    {
      num: '6',
      title: 'Amankan Data (Cloud Sync)',
      desc: 'Hubungkan Google Sheets pribadi Anda di menu Pengaturan. Data disimpan di Google Drive Anda sendiri — aman dan bisa diakses dari HP manapun.',
      icon: Settings,
      color: 'hsl(var(--text-secondary))'
    }
  ];

  const features = [
    {
      title: 'Ringkasan Bulanan (Overview)',
      desc: 'Menampilkan arus masuk-keluar uang bulanan, daftar rekening aktif, transaksi terbaru, serta Kuota Harian. Kuota Harian adalah sistem cerdas yang memantau apakah rata-rata pengeluaran harian Anda masih berada di batas aman (misalnya Rp100.000/hari).',
      icon: BookOpen
    },
    {
      title: 'Semua Transaksi',
      desc: 'Daftar tabel transaksi harian Anda. Dilengkapi pencarian kata kunci, tab filter tipe (Pemasukan, Pengeluaran, Transfer), dan tombol Unduh Rekap (PDF) untuk mengekspor data ke dokumen cetak A4 formal.',
      icon: ArrowRightLeft
    },
    {
      title: 'Dashboard Keuangan',
      desc: 'Pusat visualisasi data dalam bentuk chart interaktif. Anda dapat melihat tren cashflow 12 bulan terakhir, diagram lingkaran pengeluaran per kategori, status limit anggaran, serta rincian tabel kategori masuk/keluar.',
      icon: TrendingUp
    },
    {
      title: 'Tempat Saldo & Tabungan',
      desc: 'Tempat Saldo memisahkan uang tunai, bank, dan e-wallet Anda. Tabungan bertindak sebagai celengan terproteksi (saldo tabungan terpisah dari saldo aktif agar tidak tidak sengaja terbelanjakan).',
      icon: PiggyBank
    },
    {
      title: 'Budgeting & Kategori Kustom',
      desc: 'Membantu Anda menetapkan batas pengeluaran bulanan. Jika pengeluaran mendekati atau melampaui limit, kartu anggaran akan otomatis berganti status warna menjadi kuning (Hati-hati) atau merah (Melebihi Anggaran). Anda juga bisa menambah kategori anggaran kustom sendiri.',
      icon: Target
    },
    {
      title: 'Catatan Keuangan (Memo)',
      desc: 'Berfungsi seperti sticky notes digital. Anda bisa mencatat daftar belanjaan, pengingat jatuh tempo tagihan, atau resolusi keuangan masa depan dengan label warna-warni yang estetik.',
      icon: FileText
    }
  ];

  const cloudSteps = [
    {
      icon: Key,
      color: 'hsl(var(--color-warning))',
      label: 'Langkah 1',
      title: 'Siapkan Google OAuth Client ID',
      desc: 'Buka Google Cloud Console, buat proyek baru, aktifkan Google Drive API & Google Sheets API, buat OAuth Client ID bertipe "Web application", lalu tambahkan URL aplikasi ke Authorized JavaScript Origins.',
      tip: 'Klik tombol "Cara Mendapatkan Client ID" di halaman Pengaturan untuk panduan lengkap step-by-step.'
    },
    {
      icon: Cloud,
      color: 'hsl(var(--color-accent))',
      label: 'Langkah 2',
      title: 'Hubungkan Akun Google',
      desc: 'Di halaman Pengaturan → bagian "Konfigurasi Google Drive & Sheets API", masukkan Client ID lalu klik Simpan. Kemudian klik tombol "Hubungkan dengan Google" dan izinkan akses.',
      tip: 'Setelah berhasil, status berubah menjadi terhubung (titik hijau) dan tombol "Buka Google Sheets" langsung tersedia.'
    },
    {
      icon: GitMerge,
      color: 'hsl(var(--color-success))',
      label: 'Langkah 3',
      title: 'Migrasi Data Lokal ke Cloud',
      desc: 'Di bagian "Migrasi Data", pilih salah satu dari tiga opsi: Gabungkan (cerdas, tanpa duplikasi), Ekspor Lokal ke Cloud (overwrite cloud), atau Impor Cloud ke Lokal (overwrite lokal).',
      tip: '"Gabungkan Data" adalah pilihan paling aman jika kedua tempat sudah memiliki data yang ingin digabung.'
    },
    {
      icon: Smartphone,
      color: 'hsl(var(--color-info))',
      label: 'Langkah 4',
      title: 'Akses dari HP / Perangkat Lain',
      desc: 'Di bagian "Akses di HP / Perangkat Lain", klik "Generate Link Akses HP". Scan QR code atau salin link di HP, lalu login dengan akun Google yang sama — data langsung tersinkronisasi.',
      tip: 'Link ini sudah menyertakan Client ID otomatis sehingga Anda tidak perlu mengetiknya ulang di HP.'
    }
  ];

  const migrationOptions = [
    {
      icon: GitMerge,
      color: 'hsl(var(--color-success))',
      title: 'Gabungkan Data (Merge)',
      badge: 'Direkomendasikan',
      badgeColor: 'hsl(var(--color-success))',
      desc: 'Menggabungkan data lokal dengan data Google Sheets secara cerdas. Sistem mencocokkan setiap record untuk menghindari duplikasi. Paling aman jika kedua sumber sudah memiliki data.'
    },
    {
      icon: Upload,
      color: 'hsl(var(--color-accent))',
      title: 'Ekspor Lokal ke Cloud',
      badge: 'Overwrite Cloud',
      badgeColor: 'hsl(var(--color-warning))',
      desc: 'Mengunggah seluruh data lokal ke Google Sheets dan menghapus data lama di cloud. Gunakan jika Google Sheets masih kosong atau data cloud tidak relevan.'
    },
    {
      icon: Download,
      color: 'hsl(var(--color-danger))',
      title: 'Impor Cloud ke Lokal',
      badge: 'Overwrite Lokal',
      badgeColor: 'hsl(var(--color-danger))',
      desc: 'Mengunduh data dari Google Sheets dan menimpa seluruh database lokal. Cocok jika baru pindah perangkat dan ingin mengambil data dari cloud. Hati-hati: data lokal saat ini akan terhapus.'
    }
  ];

  return (
    <div className="page active" style={{ paddingBottom: '40px' }}>
      
      {/* Header Info */}
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'hsl(var(--color-accent) / 0.05)', borderColor: 'hsl(var(--color-accent) / 0.2)' }}>
        <HelpCircle size={28} style={{ color: 'hsl(var(--color-accent))', flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Selamat Datang di Panduan Penggunaan Ituang</h1>
          <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
            Temukan langkah-langkah efisien mengelola finansial pribadi dan pahami fungsi setiap fitur canggih yang tersedia di aplikasi Ituang.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="cat-tabs" style={{ marginBottom: '8px' }}>
        <button 
          className={`cat-tab ${activeTab === 'tahapan' ? 'active' : ''}`}
          onClick={() => setActiveTab('tahapan')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          🚦 Alur & Tahapan
        </button>
        <button 
          className={`cat-tab ${activeTab === 'fitur' ? 'active' : ''}`}
          onClick={() => setActiveTab('fitur')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          🧩 Fungsi Fitur
        </button>
        <button 
          className={`cat-tab ${activeTab === 'cloud' ? 'active' : ''}`}
          onClick={() => setActiveTab('cloud')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          ☁️ Cloud & Sinkronisasi
        </button>
      </div>

      {/* Tab: TAHAPAN */}
      {activeTab === 'tahapan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>Alur Penggunaan Aplikasi yang Direkomendasikan:</div>
          <div className="grid grid-2" style={{ gap: '24px' }}>
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.num} className="card" style={{ display: 'flex', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-15px', right: '-5px', fontSize: '80px', fontWeight: 900, color: 'hsl(var(--border) / 0.25)', lineHeight: 1, userSelect: 'none' }}>
                    {step.num}
                  </div>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${step.color}15`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <StepIcon size={22} />
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '6px' }}>{step.title}</h3>
                    <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: FITUR */}
      {activeTab === 'fitur' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>Penjelasan Fungsi Masing-Masing Fitur:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {features.map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FeatIcon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '8px', color: 'hsl(var(--color-accent-light))' }}>{feat.title}</h3>
                    <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: CLOUD */}
      {activeTab === 'cloud' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Intro Banner */}
          <div className="card" style={{ backgroundColor: 'hsl(var(--color-accent) / 0.04)', borderColor: 'hsl(var(--color-accent) / 0.2)', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <Cloud size={24} style={{ color: 'hsl(var(--color-accent))', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>Kenapa pakai Cloud Sync?</div>
              <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, margin: 0 }}>
                Data Ituang disimpan di <strong>Google Spreadsheet milik Anda sendiri</strong> — bukan di server pihak ketiga. Ini berarti data 100% privat, bisa dibuka langsung dari Google Sheets, dan dapat diakses dari HP atau perangkat manapun hanya dengan login akun Google yang sama.
              </p>
            </div>
          </div>

          {/* Setup Steps */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Cara Mengaktifkan Sinkronisasi Cloud:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cloudSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div key={idx} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: `${step.color}15`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <StepIcon size={20} />
                      </div>
                      {idx < cloudSteps.length - 1 && (
                        <div style={{ width: '2px', height: '20px', backgroundColor: 'hsl(var(--border))' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingTop: '4px' }}>
                      <div style={{ fontSize: '11px', color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{step.label}</div>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{step.title}</div>
                      <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, margin: '0 0 8px 0' }}>{step.desc}</p>
                      <div style={{ fontSize: '11.5px', color: 'hsl(var(--color-accent-light))', backgroundColor: 'hsl(var(--color-accent) / 0.06)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid hsl(var(--color-accent) / 0.4)' }}>
                        💡 {step.tip}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Migration Options */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Pilihan Migrasi Data:</div>
            <p style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, marginBottom: '14px' }}>
              Setelah terhubung ke Google, gunakan kartu <strong>"Migrasi Data"</strong> di halaman Pengaturan untuk memindahkan atau menyelaraskan data antara lokal dan cloud.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {migrationOptions.map((opt, idx) => {
                const OptIcon = opt.icon;
                return (
                  <div key={idx} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: `${opt.color}12`, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <OptIcon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{opt.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: opt.badgeColor, backgroundColor: `${opt.badgeColor}15`, padding: '2px 7px', borderRadius: '4px' }}>
                          {opt.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))', lineHeight: 1.6, margin: 0 }}>{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Access */}
          <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', borderColor: 'hsl(var(--color-info) / 0.3)', backgroundColor: 'hsl(var(--color-info) / 0.03)' }}>
            <Smartphone size={24} style={{ color: 'hsl(var(--color-info))', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>📱 Akses dari HP / Perangkat Lain</div>
              <div style={{ fontSize: '12.5px', color: 'hsl(var(--text-secondary))', lineHeight: 1.7 }}>
                Pergi ke <strong>Pengaturan → "Akses di HP / Perangkat Lain"</strong> lalu klik <strong>Generate Link Akses HP</strong>. Anda akan mendapatkan:
                <ul style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>QR Code</strong> — scan langsung dari kamera HP</li>
                  <li><strong>Link khusus</strong> — sudah menyertakan Client ID agar tidak perlu ketik ulang di HP</li>
                </ul>
                <div style={{ marginTop: '10px' }}>
                  Di HP: buka link → Pengaturan → <strong>Hubungkan dengan Google</strong> (akun yang sama) → data tersinkronisasi otomatis 🎉
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '12px' }}>
              <ExternalLink size={13} />
              Google Cloud Console
            </a>
            <a href="https://docs.google.com/spreadsheets" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '12px' }}>
              <ExternalLink size={13} />
              Google Spreadsheets
            </a>
          </div>

        </div>
      )}

    </div>
  );
}
