export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const CAT_ICONS = {
  'Makanan': '🍜',
  'Transportasi': '🚗',
  'Belanja': '🛍️',
  'Hiburan': '🎮',
  'Kesehatan': '🏥',
  'Pendidikan': '📚',
  'Tagihan': '🧾',
  'Gaji': '💼',
  'Investasi': '📈',
  'Pindah Dana': '🔄',
  'Lainnya': '📦',
};

export function fmtRp(n) {
  const num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

export function fmtDate(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getCatIcon(category) {
  return CAT_ICONS[category] || '📦';
}
