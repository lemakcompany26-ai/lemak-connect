export function formatNaira(n) {
  const value = Number(n || 0);
  return '₦' + value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNairaShort(n) {
  const value = Number(n || 0);
  return '₦' + value.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export const TRANSACTION_STATUS_STYLES = {
  successful: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
  reversed: 'bg-purple-50 text-purple-700 border-purple-200'
};

export const NIGERIAN_NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];