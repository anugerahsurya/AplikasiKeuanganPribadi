/* ==========================================================================
   ITUANG AUTH SERVICE (src/services/auth.js)
   
   Mengelola autentikasi user via Google Apps Script yang terhubung ke
   spreadsheet tetap sebagai user registry.
   
   Password di-hash SHA-256 + salt di sisi client sebelum dikirim ke server.
   Password asli tidak pernah meninggalkan browser.
   ========================================================================== */

/**
 * URL Apps Script Web App yang sudah di-deploy.
 * Ganti dengan URL deployment kamu setelah deploy Apps Script.
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

const SESSION_KEY = 'ituang_auth_session';

// ── Crypto Helpers ────────────────────────────────────────────────────

/**
 * Generate random salt sebagai hex string
 */
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash string menggunakan SHA-256, return hex string
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password dengan salt: SHA-256(password + salt)
 */
export async function hashPassword(password, salt) {
  return sha256(password + salt);
}

// ── Session Management ────────────────────────────────────────────────

/**
 * Simpan session ke localStorage
 */
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/**
 * Ambil session dari localStorage
 * @returns {{ id, username, email } | null}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cek apakah user sedang login
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

/**
 * Hapus session (logout)
 */
export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

// ── API Calls ─────────────────────────────────────────────────────────

/**
 * Validasi bahwa Apps Script URL sudah dikonfigurasi
 */
function checkScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error(
      'Apps Script URL belum dikonfigurasi. ' +
      'Silakan tambahkan VITE_APPS_SCRIPT_URL di file .env'
    );
  }
}

/**
 * Register user baru
 * @param {{ username: string, email: string, password: string }} param0
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function registerUser({ username, email, password }) {
  checkScriptUrl();

  // Validasi client-side
  if (!username || username.trim().length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Format email tidak valid.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password minimal 6 karakter.' };
  }

  // Hash password sebelum dikirim
  const salt = generateSalt();
  const password_hash = await hashPassword(password, salt);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script butuh text/plain untuk avoid CORS preflight
      body: JSON.stringify({
        action: 'register',
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash,
        salt
      })
    });

    const result = await response.json();

    if (result.success) {
      const user = { id: result.data.id, username: result.data.username, email: result.data.email };
      saveSession(user);
      return { success: true, user };
    } else {
      return { success: false, error: result.error || 'Registrasi gagal.' };
    }
  } catch (err) {
    console.error('Register error:', err);
    return { success: false, error: 'Koneksi ke server gagal. Periksa koneksi internet Anda.' };
  }
}

/**
 * Login user
 * @param {{ username: string, password: string }} param0
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function loginUser({ username, password }) {
  checkScriptUrl();

  if (!username || !password) {
    return { success: false, error: 'Username dan password harus diisi.' };
  }

  try {
    // Ambil hash+salt dari server berdasarkan username
    const url = `${APPS_SCRIPT_URL}?action=login&username=${encodeURIComponent(username.trim())}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || 'Username tidak ditemukan.' };
    }

    const { id, username: storedUsername, email, password_hash: storedHash, salt } = result.data;

    // Verifikasi password di sisi client
    const inputHash = await hashPassword(password, salt);

    if (inputHash !== storedHash) {
      return { success: false, error: 'Password salah.' };
    }

    // Login berhasil — simpan session
    const user = { id, username: storedUsername, email };
    saveSession(user);
    return { success: true, user };

  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: 'Koneksi ke server gagal. Periksa koneksi internet Anda.' };
  }
}

/**
 * Login/Register otomatis menggunakan Google OAuth
 * @param {{ username: string, email: string }} param0
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function loginWithGoogle({ username, email }) {
  checkScriptUrl();

  if (!email) {
    return { success: false, error: 'Email Google tidak valid.' };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'google_login',
        username: username || email.split('@')[0],
        email: email.trim().toLowerCase()
      })
    });

    const result = await response.json();

    if (result.success) {
      const user = { id: result.data.id, username: result.data.username, email: result.data.email };
      saveSession(user);
      return { success: true, user };
    } else {
      return { success: false, error: result.error || 'Autentikasi Google gagal.' };
    }
  } catch (err) {
    console.error('Google auth database error:', err);
    return { success: false, error: 'Koneksi ke user registry gagal.' };
  }
}
