import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  MapPin, 
  ArrowRight, 
  CreditCard, 
  Target, 
  ArrowRightLeft, 
  PiggyBank, 
  TrendingUp, 
  Settings, 
  FileText 
} from 'lucide-react';
import { fmtRp } from '../utils/format';

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
      desc: 'Hubungkan Google Sheets pribadi Anda di menu Pengaturan. Data terisolasi dengan aman di Google Drive Anda.',
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
          🚦 Alur & Tahapan Penggunaan
        </button>
        <button 
          className={`cat-tab ${activeTab === 'fitur' ? 'active' : ''}`}
          onClick={() => setActiveTab('fitur')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          🧩 Fungsi Detail Fitur
        </button>
      </div>

      {/* Tab Content: TAHAPAN */}
      {activeTab === 'tahapan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>Alur Penggunaan Aplikasi yang Direkomendasikan:</div>
          
          <div className="grid grid-2" style={{ gap: '24px' }}>
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.num} className="card" style={{ display: 'flex', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '-15px', 
                    right: '-5px', 
                    fontSize: '80px', 
                    fontWeight: 900, 
                    color: 'hsl(var(--border) / 0.25)', 
                    lineHeight: 1,
                    userSelect: 'none'
                  }}>
                    {step.num}
                  </div>
                  
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    backgroundColor: `${step.color}15`, 
                    color: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
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

      {/* Tab Content: FITUR */}
      {activeTab === 'fitur' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>Penjelasan Fungsi Masing-Masing Fitur:</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {features.map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div key={idx} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    backgroundColor: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--color-accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
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

    </div>
  );
}
