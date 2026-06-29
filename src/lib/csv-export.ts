import { Transaction } from '@/types/database';

export function exportToCSV(transactions: Transaction[], filename = 'finsight-transactions.csv') {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'Recurring', 'Recurring Interval'];
  const rows = transactions.map(t => [
    t.date,
    t.type,
    t.category?.name ?? '',
    t.description ?? '',
    t.amount.toString(),
    t.currency ?? 'USD',
    t.is_recurring ? 'Yes' : 'No',
    t.recurring_interval ?? '',
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
