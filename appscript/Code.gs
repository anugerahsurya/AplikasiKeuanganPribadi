/**
 * =============================================================================
 * ITUANG - Apps Script Web App (User Registry API)
 * =============================================================================
 * Deploy sebagai Web App:
 *   - Execute as: Me (pemilik spreadsheet)
 *   - Who has access: Anyone
 *
 * Spreadsheet ini HANYA menyimpan data akun user (username, email, password hash).
 * Data keuangan tiap user tetap di Google Sheets mereka masing-masing.
 * =============================================================================
 */

const SHEET_NAME = 'users';

// Ambil atau buat sheet 'users'
function getUserSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Tulis header
    sheet.appendRow(['id', 'username', 'email', 'password_hash', 'salt', 'created_at']);
    sheet.setFrozenRows(1);
    // Format header
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#4a5568').setFontColor('#ffffff');
  }
  return sheet;
}

// Generate UUID sederhana
function generateUUID() {
  return Utilities.getUuid();
}

// Ambil semua data users sebagai array of objects
function getAllUsers() {
  const sheet = getUserSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// Cari user berdasarkan username (case-insensitive)
function findUserByUsername(username) {
  const users = getAllUsers();
  return users.find(u => u.username && u.username.toString().toLowerCase() === username.toLowerCase()) || null;
}

// Cari user berdasarkan email (case-insensitive)
function findUserByEmail(email) {
  const users = getAllUsers();
  return users.find(u => u.email && u.email.toString().toLowerCase() === email.toLowerCase()) || null;
}

// Tambah user baru ke sheet
function addUser(id, username, email, passwordHash, salt) {
  const sheet = getUserSheet();
  const createdAt = new Date().toISOString();
  sheet.appendRow([id, username, email, passwordHash, salt, createdAt]);
}

/**
 * Tambahkan CORS headers ke response
 */
function buildResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * doGet - Menangani request GET
 * Query params:
 *   action=login&username=xxx        → kembalikan hash+salt untuk verifikasi di client
 *   action=check_username&username=xxx → cek apakah username sudah ada
 *   action=check_email&email=xxx    → cek apakah email sudah ada
 */
function doGet(e) {
  try {
    const action = e.parameter.action || '';

    if (action === 'login') {
      const username = (e.parameter.username || '').trim();
      if (!username) {
        return buildResponse({ success: false, error: 'Username tidak boleh kosong.' });
      }
      const user = findUserByUsername(username);
      if (!user) {
        return buildResponse({ success: false, error: 'Username tidak ditemukan.' });
      }
      // Kembalikan hanya data yang diperlukan untuk verifikasi (bukan data sensitif lain)
      return buildResponse({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          salt: user.salt
        }
      });
    }

    if (action === 'check_username') {
      const username = (e.parameter.username || '').trim();
      const exists = !!findUserByUsername(username);
      return buildResponse({ success: true, exists });
    }

    if (action === 'check_email') {
      const email = (e.parameter.email || '').trim();
      const exists = !!findUserByEmail(email);
      return buildResponse({ success: true, exists });
    }

    return buildResponse({ success: false, error: 'Action tidak dikenal.' });

  } catch (err) {
    return buildResponse({ success: false, error: 'Server error: ' + err.message });
  }
}

/**
 * doPost - Menangani request POST
 * Body JSON:
 *   { action: 'register', username, email, password_hash, salt }
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';

    if (action === 'register') {
      const { username, email, password_hash, salt } = body;

      // Validasi input
      if (!username || !email || !password_hash || !salt) {
        return buildResponse({ success: false, error: 'Data tidak lengkap.' });
      }
      if (username.trim().length < 3) {
        return buildResponse({ success: false, error: 'Username minimal 3 karakter.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return buildResponse({ success: false, error: 'Format email tidak valid.' });
      }

      // Cek duplikat username
      if (findUserByUsername(username.trim())) {
        return buildResponse({ success: false, error: 'Username sudah digunakan.' });
      }

      // Cek duplikat email
      if (findUserByEmail(email.trim())) {
        return buildResponse({ success: false, error: 'Email sudah terdaftar.' });
      }

      // Tambah user baru
      const id = generateUUID();
      addUser(id, username.trim(), email.trim().toLowerCase(), password_hash, salt);

      return buildResponse({
        success: true,
        data: {
          id,
          username: username.trim(),
          email: email.trim().toLowerCase()
        }
      });
    }

    if (action === 'google_login') {
      const { username, email } = body;
      if (!email) {
        return buildResponse({ success: false, error: 'Email Google tidak boleh kosong.' });
      }

      // Cari berdasarkan email
      const user = findUserByEmail(email.trim());
      if (user) {
        return buildResponse({
          success: true,
          data: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }

      // Registrasi otomatis jika belum ada
      const baseUsername = (username || email.split('@')[0]).trim();
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (findUserByUsername(uniqueUsername)) {
        uniqueUsername = baseUsername + counter;
        counter++;
      }

      const id = generateUUID();
      addUser(id, uniqueUsername, email.trim().toLowerCase(), 'oauth_user', 'oauth_user');

      return buildResponse({
        success: true,
        data: {
          id,
          username: uniqueUsername,
          email: email.trim().toLowerCase()
        }
      });
    }

    return buildResponse({ success: false, error: 'Action tidak dikenal.' });

  } catch (err) {
    return buildResponse({ success: false, error: 'Server error: ' + err.message });
  }
}
