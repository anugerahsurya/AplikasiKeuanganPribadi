import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Wallet, Loader } from 'lucide-react';
import { loginUser, registerUser } from '../services/auth';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Form fields
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await loginUser({ username: form.username, password: form.password });
      } else {
        result = await registerUser({ username: form.username, email: form.email, password: form.password });
      }

      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Terjadi kesalahan. Coba lagi.');
      }
    } catch (err) {
      setError('Koneksi gagal. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setForm({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(var(--bg-base))',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background orbs */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'hsl(var(--color-accent) / 0.07)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'hsl(var(--color-accent) / 0.05)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', maxWidth: '440px',
        display: 'flex', flexDirection: 'column', gap: '24px',
        position: 'relative', zIndex: 1
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'var(--color-accent-gradient)',
            boxShadow: '0 8px 32px hsl(var(--color-accent) / 0.35)',
            marginBottom: '16px'
          }}>
            <Wallet size={30} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            background: 'var(--color-accent-gradient)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '6px'
          }}>
            Ituang
          </h1>
          <p style={{ fontSize: '13.5px', color: 'hsl(var(--text-muted))' }}>
            Aplikasi Keuangan Pribadi Cerdas
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
          {/* Mode Toggle */}
          <div style={{
            display: 'flex', backgroundColor: 'hsl(var(--bg-input))',
            borderRadius: '10px', padding: '4px', marginBottom: '28px'
          }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease',
                background: mode === 'login' ? 'var(--color-accent-gradient)' : 'none',
                color: mode === 'login' ? '#fff' : 'hsl(var(--text-muted))',
                boxShadow: mode === 'login' ? '0 2px 8px hsl(var(--color-accent) / 0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <LogIn size={14} />
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease',
                background: mode === 'register' ? 'var(--color-accent-gradient)' : 'none',
                color: mode === 'register' ? '#fff' : 'hsl(var(--text-muted))',
                boxShadow: mode === 'register' ? '0 2px 8px hsl(var(--color-accent) / 0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <UserPlus size={14} />
              Daftar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <input
                className="form-control"
                type="text"
                name="username"
                placeholder={mode === 'login' ? 'Masukkan username...' : 'Buat username (min. 3 karakter)'}
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
                style={{ fontSize: '13.5px' }}
              />
            </div>

            {/* Email (register only) */}
            {mode === 'register' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  style={{ fontSize: '13.5px' }}
                />
              </div>
            )}

            {/* Password */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder={mode === 'login' ? 'Masukkan password...' : 'Buat password (min. 6 karakter)'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ fontSize: '13.5px', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'hsl(var(--text-muted))', display: 'flex', padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Konfirmasi Password</label>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Ulangi password..."
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  style={{ fontSize: '13.5px' }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                backgroundColor: 'hsl(var(--color-danger) / 0.1)',
                border: '1px solid hsl(var(--color-danger) / 0.25)',
                color: 'hsl(var(--color-danger))',
                fontSize: '12.5px', lineHeight: '1.5',
                display: 'flex', alignItems: 'flex-start', gap: '8px'
              }}>
                <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '4px', fontSize: '14px', padding: '12px' }}
            >
              {loading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span>{mode === 'login' ? 'Memverifikasi...' : 'Mendaftarkan...'}</span>
                </>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                  <span>{mode === 'login' ? 'Masuk ke Ituang' : 'Buat Akun Baru'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'hsl(var(--text-muted))', lineHeight: '1.6' }}>
          Password dienkripsi dengan SHA-256 sebelum disimpan.{' '}
          <br />Data keuangan Anda tersimpan aman di Google Sheets Anda sendiri.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
