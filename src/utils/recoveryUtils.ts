import { AccountWallet, Category, Transaction } from '../types/cashflow';
import { SEED_USDT_TRANSACTIONS } from '../data/seedUsdtData';

export interface LocalBackupInfo {
  key: string;
  count: number;
  transactions: Transaction[];
  lastModified?: string;
}

const KNOWN_BACKUP_KEYS = [
  'omniflow_transactions_backup',
  'omniflow_history_archive',
  'omniflow_transactions_v3',
  'omniflow_transactions_v2',
  'omniflow_transactions_v1',
  'omniflow_transactions',
  'trina_transactions',
  'cashflow_transactions',
  'transactions',
  'omniflow_backup_transactions',
  'omniflow_full_backup',
];

/**
 * Quét toàn bộ bộ nhớ máy tính (localStorage & sessionStorage) để tìm bất kỳ bản sao lưu giao dịch nào
 */
export function scanLocalBackups(): LocalBackupInfo[] {
  const results: LocalBackupInfo[] = [];
  const seenKeys = new Set<string>();

  // 1. Quét các key được định nghĩa sẵn
  for (const key of KNOWN_BACKUP_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && !seenKeys.has(key)) {
        seenKeys.add(key);
        const parsed = JSON.parse(raw);
        
        // Nếu là mảng transactions
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Trường hợp là archive với các bản ghi { timestamp, transactions }
          if (parsed[0]?.transactions && Array.isArray(parsed[0].transactions)) {
            parsed.forEach((item: any, idx: number) => {
              const valid = (item.transactions as any[]).filter(t => t && t.id && t.date);
              if (valid.length > 0) {
                results.push({
                  key: `${key} [Lưu lúc ${item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : `#${idx + 1}`}]`,
                  count: valid.length,
                  transactions: valid as Transaction[],
                  lastModified: item.timestamp,
                });
              }
            });
            continue;
          }

          const validTx = parsed.filter(t => t && t.id && t.date);
          if (validTx.length > 0) {
            results.push({
              key,
              count: validTx.length,
              transactions: validTx as Transaction[],
            });
          }
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.transactions)) {
          const validTx = parsed.transactions.filter((t: any) => t && t.id && t.date);
          if (validTx.length > 0) {
            results.push({
              key: `${key} (Bản sao lưu hệ thống)`,
              count: validTx.length,
              transactions: validTx as Transaction[],
            });
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Quét sâu toàn bộ các key còn lại trong localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || seenKeys.has(key)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      seenKeys.add(key);

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validTx = parsed.filter(t => t && t.id && t.date && (t.originalAmount !== undefined || t.amountVND !== undefined));
        if (validTx.length > 0) {
          results.push({
            key,
            count: validTx.length,
            transactions: validTx as Transaction[],
          });
        }
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.transactions)) {
        const validTx = parsed.transactions.filter((t: any) => t && t.id && t.date);
        if (validTx.length > 0) {
          results.push({
            key,
            count: validTx.length,
            transactions: validTx as Transaction[],
          });
        }
      }
    } catch (e) {}
  }

  // 3. Quét cả sessionStorage nếu có
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validTx = parsed.filter(t => t && t.id && t.date);
          if (validTx.length > 0) {
            results.push({
              key: `[Session] ${key}`,
              count: validTx.length,
              transactions: validTx as Transaction[],
            });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  return results;
}

/**
 * Lưu trữ bản sao lưu trước khi dọn dẹp hoặc reset dữ liệu để không bao giờ bị mất
 */
export function archiveTransactionsBeforeReset(transactions: Transaction[], reason: string = 'Khởi tạo lại'): void {
  if (!transactions || transactions.length === 0) return;
  try {
    const raw = localStorage.getItem('omniflow_history_archive');
    const archive = raw ? JSON.parse(raw) : [];
    archive.unshift({
      timestamp: new Date().toISOString(),
      reason,
      transactions,
    });
    // Giữ tối đa 15 bản snapshot gần nhất
    localStorage.setItem('omniflow_history_archive', JSON.stringify(archive.slice(0, 15)));
    localStorage.setItem('omniflow_transactions_backup', JSON.stringify(transactions));
  } catch (e) {
    console.warn('Lỗi ghi archive:', e);
  }
}

/**
 * Lưu bản sao lưu an toàn tự động vào localStorage
 */
export function saveAutoBackup(transactions: Transaction[]): void {
  if (transactions && transactions.length > 0) {
    try {
      localStorage.setItem('omniflow_transactions_backup', JSON.stringify(transactions));
      localStorage.setItem('omniflow_backup_timestamp', new Date().toISOString());
    } catch (e) {
      console.warn('Lỗi ghi bản sao lưu tự động:', e);
    }
  }
}

/**
 * Xuất toàn bộ dữ liệu ra tệp JSON để lưu an toàn trên máy
 */
export function exportSystemBackupJSON(data: any): void {
  try {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `OmniFlow_Full_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    console.error('Lỗi xuất file backup JSON:', e);
  }
}

/**
 * Lấy 28 giao dịch gốc Thu Chi USDT
 */
export function getSeedUsdtTransactions(): Transaction[] {
  return SEED_USDT_TRANSACTIONS;
}

/**
 * Phân tích tệp CSV để khôi phục danh sách giao dịch
 */
export function parseCSVToTransactions(
  csvText: string,
  accounts: AccountWallet[],
  categories: Category[]
): Transaction[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const defaultAccount = accounts[0] || { id: 'acc_techcom', name: 'Tài khoản Ngân hàng', currency: 'VND' };
  const transactions: Transaction[] = [];

  // Bỏ qua dòng tiêu đề nếu dòng đầu chứa chữ Mã hoặc ID
  const startIdx = lines[0].toLowerCase().includes('mã') || lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('ngày') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    // Tách cột bằng dấu phẩy, xử lý dấu ngoặc kép
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 3) continue;

    const id = cols[0] || `TX-CSV-${Date.now().toString().slice(-4)}-${i}`;
    const date = cols[1] || new Date().toISOString().slice(0, 10);
    const typeLabel = (cols[2] || '').toLowerCase();
    const type = typeLabel.includes('thu') ? 'inflow' :
                 typeLabel.includes('cổ tức') ? 'dividend_payout' :
                 typeLabel.includes('chuyển') ? 'transfer' : 'outflow';

    const catName = cols[3] || 'Chi phí khác';
    const accName = cols[5] || '';
    const foundAcc = accounts.find(a => a.name.toLowerCase() === accName.toLowerCase()) || defaultAccount;

    const rawOrig = cols[6] || '0';
    const origAmount = parseFloat(rawOrig.replace(/[^0-9.-]/g, '')) || 0;
    const currency = (cols[7] || foundAcc.currency || 'VND').toUpperCase() as any;
    const rate = parseFloat((cols[8] || '1').replace(/[^0-9.-]/g, '')) || 1;
    const amtVnd = parseFloat((cols[9] || '0').replace(/[^0-9.-]/g, '')) || Math.round(origAmount * rate);

    const desc = cols[10] || '';
    const partner = cols[11] || '';
    const refCode = cols[12] || '';

    const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());

    transactions.push({
      id,
      date,
      type,
      categoryId: matchedCat?.id || 'cat_other',
      categoryName: catName,
      categoryGroup: matchedCat?.group || 'operating_cost',
      accountId: foundAcc.id,
      accountName: foundAcc.name,
      originalCurrency: currency,
      originalAmount: origAmount,
      exchangeRate: rate,
      amountVND: amtVnd,
      description: desc,
      partnerOrBranch: partner || undefined,
      referenceCode: refCode || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return transactions;
}
