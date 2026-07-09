/* ==========================================================================
   GOOGLE SHEETS INTEGRATION SERVICE (src/services/googleSheets.js)
   ========================================================================== */

const STORAGE_KEYS = {
  TOKEN: 'ituang_google_oauth_token',
  EXPIRES: 'ituang_google_oauth_expires',
  SHEET_ID: 'ituang_google_sheet_id',
  CLIENT_ID: 'ituang_google_client_id',
  USER_INFO: 'ituang_google_user_info'
};

// Default Google Client ID (User can change this in settings page)
const DEFAULT_CLIENT_ID = '1047113110901-m29hfgoc7pt252i9s7p68260q649l0c1.apps.googleusercontent.com'; // Dummy or generic

export function getClientId() {
  return localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '';
}

export function setClientId(clientId) {
  if (clientId) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

export function getAccessToken() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const expires = localStorage.getItem(STORAGE_KEYS.EXPIRES);
  
  if (!token || !expires) return null;
  
  // Check if token has expired (with 2-minute safety margin)
  if (Date.now() > parseInt(expires) - 120000) {
    signOut();
    return null;
  }
  
  return token;
}

export function isLoggedIn() {
  return getAccessToken() !== null;
}

export function getGoogleUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES);
  localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
}

export function getSpreadsheetUrl() {
  const sheetId = localStorage.getItem(STORAGE_KEYS.SHEET_ID);
  return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : null;
}

/**
 * Menunggu sampai Google Identity Services library selesai dimuat
 * (penting untuk HP/perangkat lambat karena script menggunakan async defer)
 */
function waitForGoogleLibrary(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined') {
      resolve();
      return;
    }
    const interval = setInterval(() => {
      if (typeof window.google !== 'undefined') {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout menunggu Google library'));
    }, timeoutMs);
  });
}

/**
 * Triggers Google OAuth 2.0 Flow to get an access token
 */
export async function signIn() {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Google Client ID belum diatur. Harap atur di menu Pengaturan.');
  }

  // Tunggu sampai Google library siap (penting untuk HP dengan koneksi lambat)
  await waitForGoogleLibrary();

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(tokenResponse);
            return;
          }
          
          localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
          // Expires in tokenResponse.expires_in seconds (usually 3600s = 1 hour)
          const expiresAt = Date.now() + (parseInt(tokenResponse.expires_in) * 1000);
          localStorage.setItem(STORAGE_KEYS.EXPIRES, expiresAt.toString());

          // Fetch user info for profile display
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify({
                name: profile.name,
                email: profile.email,
                picture: profile.picture
              }));
            }
          } catch (e) {
            console.error('Failed to fetch user profile:', e);
          }

          resolve(tokenResponse.access_token);
        },
      });

      // Request token with prompt option to force account chooser
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Helper to fetch with Google Auth Bearer Token
 */
async function gapiFetch(url, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google Authentication expired or required.');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorDetail = await response.text();
    console.error(`Google API Error [${response.status}]: ${errorDetail}`);
    if (response.status === 401) {
      signOut();
    }
    throw new Error(`Google API returned code ${response.status}: ${errorDetail}`);
  }

  return response.json();
}

/**
 * Finds or Creates the 'Ituang_Database' spreadsheet in user's Google Drive
 */
export async function getOrCreateSpreadsheet() {
  const cachedId = localStorage.getItem(STORAGE_KEYS.SHEET_ID);
  if (cachedId) return cachedId;

  // 1. Search for existing file
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='Ituang_Database' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id)`;
  const searchResult = await gapiFetch(searchUrl);
  
  if (searchResult.files && searchResult.files.length > 0) {
    const sheetId = searchResult.files[0].id;
    localStorage.setItem(STORAGE_KEYS.SHEET_ID, sheetId);
    return sheetId;
  }

  // 2. Create a new Spreadsheet with initial sheets
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: { title: 'Ituang_Database' },
    sheets: [
      { properties: { title: 'accounts' } },
      { properties: { title: 'savings' } },
      { properties: { title: 'transactions' } },
      { properties: { title: 'budgets' } },
      { properties: { title: 'memos' } }
    ]
  };

  const createdSheet = await gapiFetch(createUrl, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const sheetId = createdSheet.spreadsheetId;
  localStorage.setItem(STORAGE_KEYS.SHEET_ID, sheetId);

  // 3. Write Headers for all tables
  await writeHeaders(sheetId);

  return sheetId;
}

async function writeHeaders(sheetId) {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'accounts!A1:E1', values: [['id', 'name', 'category', 'balance', 'created_at']] },
      { range: 'savings!A1:D1', values: [['id', 'name', 'balance', 'created_at']] },
      { range: 'transactions!A1:L1', values: [['id', 'item_name', 'amount', 'type', 'category', 'account_from_id', 'account_to_id', 'savings_from_id', 'savings_to_id', 'notes', 'created_at', 'exclude_from_quota']] },
      { range: 'budgets!A1:E1', values: [['id', 'category', 'amount', 'is_default', 'created_at']] },
      { range: 'memos!A1:E1', values: [['id', 'title', 'content', 'color', 'date']] }
    ]
  };

  await gapiFetch(batchUrl, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Sync entire local data to Google Sheets
 */
export async function syncAllToGoogleSheets(data) {
  const sheetId = await getOrCreateSpreadsheet();
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;

  // Helper to convert array of objects to array of rows
  const formatRows = (list, headers) => {
    return list.map(item => headers.map(h => {
      const val = item[h];
      return val === undefined || val === null ? '' : val;
    }));
  };

  // Prepare ranges
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: [
      // Clear ranges first (from A2 downwards)
      { range: 'accounts!A2:Z1000', values: Array(999).fill(Array(5).fill('')) },
      { range: 'savings!A2:Z1000', values: Array(999).fill(Array(4).fill('')) },
      { range: 'transactions!A2:Z10000', values: Array(9999).fill(Array(12).fill('')) },
      { range: 'budgets!A2:Z1000', values: Array(999).fill(Array(5).fill('')) },
      { range: 'memos!A2:Z1000', values: Array(999).fill(Array(5).fill('')) }
    ]
  };

  // Clear first
  await gapiFetch(batchUrl, { method: 'POST', body: JSON.stringify(body) });

  // Now write actual data
  const writeBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: `accounts!A2:E${data.accounts.length + 1}`,
        values: formatRows(data.accounts, ['id', 'name', 'category', 'balance', 'created_at'])
      },
      {
        range: `savings!A2:D${data.savings.length + 1}`,
        values: formatRows(data.savings, ['id', 'name', 'balance', 'created_at'])
      },
      {
        range: `transactions!A2:L${data.transactions.length + 1}`,
        values: formatRows(data.transactions, ['id', 'item_name', 'amount', 'type', 'category', 'account_from_id', 'account_to_id', 'savings_from_id', 'savings_to_id', 'notes', 'created_at', 'exclude_from_quota'])
      },
      {
        range: `budgets!A2:E${data.budgets.length + 1}`,
        values: formatRows(data.budgets, ['id', 'category', 'amount', 'is_default', 'created_at'])
      },
      {
        range: `memos!A2:E${data.memos.length + 1}`,
        values: formatRows(data.memos, ['id', 'title', 'content', 'color', 'date'])
      }
    ].filter(d => d.values.length > 0) // Filter out empty lists
  };

  if (writeBody.data.length > 0) {
    await gapiFetch(batchUrl, {
      method: 'POST',
      body: JSON.stringify(writeBody)
    });
  }
}

/**
 * Fetch all tables from Google Sheets in one batch request
 */
export async function syncAllFromGoogleSheets() {
  const sheetId = await getOrCreateSpreadsheet();
  const ranges = [
    'accounts!A:E',
    'savings!A:D',
    'transactions!A:L',
    'budgets!A:E',
    'memos!A:E'
  ].map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${ranges}`;
  
  const result = await gapiFetch(batchUrl);
  
  // Helper to parse rows back to object arrays
  const parseSheet = (valueRange, headers) => {
    if (!valueRange || !valueRange.values || valueRange.values.length <= 1) return [];
    const rows = valueRange.values;
    const sheetHeaders = rows[0];
    
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach(h => {
        const idx = sheetHeaders.indexOf(h);
        if (idx !== -1) {
          let val = row[idx];
          // Try parse numbers
          if (val === '') {
            val = null;
          } else if (!isNaN(val) && val !== null && val !== '') {
            val = Number(val);
          }
          obj[h] = val;
        } else {
          obj[h] = null;
        }
      });
      return obj;
    });
  };

  const valueRanges = result.valueRanges;
  return {
    accounts: parseSheet(valueRanges[0], ['id', 'name', 'category', 'balance', 'created_at']),
    savings: parseSheet(valueRanges[1], ['id', 'name', 'balance', 'created_at']),
    transactions: parseSheet(valueRanges[2], ['id', 'item_name', 'amount', 'type', 'category', 'account_from_id', 'account_to_id', 'savings_from_id', 'savings_to_id', 'notes', 'created_at', 'exclude_from_quota']),
    budgets: parseSheet(valueRanges[3], ['id', 'category', 'amount', 'is_default', 'created_at']),
    memos: parseSheet(valueRanges[4], ['id', 'title', 'content', 'color', 'date'])
  };
}
