import { Transaction } from '../types/cashflow';

export const exportTransactionsToCSV = (transactions: Transaction[], filename = 'omniflow_ledger.csv') => {
  if (!transactions || transactions.length === 0) {
    alert('Không có dữ liệu giao dịch để xuất file');
    return;
  }

  const headers = [
    'Mã GD',
    'Ngày',
    'Loại',
    'Hạng Mục',
    'Quỹ Tài Khoản',
    'Quỹ Đích (Nếu Chuyển)',
    'Số Tiền Gốc',
    'Loại Tiền',
    'Tỷ Giá Quy Đổi',
    'Thành Tiền (VND)',
    'Đối Tác / Kênh Ads',
    'Mã Sao Kê / Ref',
    'Nội Dung / Diễn Giải'
  ];

  const rows = transactions.map(tx => [
    `"${tx.id}"`,
    `"${tx.date}"`,
    `"${tx.type === 'inflow' ? 'Thu' : tx.type === 'transfer' ? 'Chuyển quỹ' : 'Chi'}"`,
    `"${tx.categoryName.replace(/"/g, '""')}"`,
    `"${tx.accountName.replace(/"/g, '""')}"`,
    `"${tx.targetAccountName ? tx.targetAccountName.replace(/"/g, '""') : ''}"`,
    tx.originalAmount,
    `"${tx.originalCurrency}"`,
    tx.exchangeRate,
    tx.amountVND,
    `"${tx.partnerOrBranch ? tx.partnerOrBranch.replace(/"/g, '""') : ''}"`,
    `"${tx.referenceCode ? tx.referenceCode.replace(/"/g, '""') : ''}"`,
    `"${tx.description.replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
