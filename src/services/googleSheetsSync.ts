import { AccountWallet, Category, ExchangeRate, Transaction, TransactionType } from '../types/cashflow';
import { calculateAccountBalances } from '../utils/cashflowCalculations';

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface GoogleSheetsSyncConfig {
  spreadsheetId: string | null;
  spreadsheetName: string;
  spreadsheetUrl: string | null;
  autoSyncEnabled: boolean;
  lastSyncedAt: string | null;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string; // ISO string
  action: 'single_tx' | 'bulk_sync' | 'accounts_sync' | 'delete_tx' | 'fetch_sheet' | 'create_sheet' | 'auth_check';
  actionLabel: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  sheetTitle?: string;
  sheetId?: string;
  itemCount?: number;
  errorDetails?: string;
}

const STORAGE_KEY = 'omniflow_google_sheets_config_v1';
const SYNC_LOGS_STORAGE_KEY = 'omniflow_sheets_sync_logs_v1';

export function getSyncLogs(): SyncLogEntry[] {
  try {
    const raw = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Lỗi đọc sync logs:', e);
  }
  return [];
}

export function addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): SyncLogEntry {
  const newEntry: SyncLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = getSyncLogs();
    // Lưu mới nhất lên đầu, giới hạn tối đa 100 logs gần nhất
    const updated = [newEntry, ...existing].slice(0, 100);
    localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(updated));
    // Phát event để UI cập nhật realtime
    window.dispatchEvent(new CustomEvent('omniflow_sync_logs_updated', { detail: newEntry }));
  } catch (e) {
    console.warn('Lỗi lưu sync log:', e);
  }

  return newEntry;
}

export function clearSyncLogs(): void {
  try {
    localStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('omniflow_sync_logs_updated', { detail: null }));
  } catch (e) {
    console.warn('Lỗi xóa sync logs:', e);
  }
}

export function getLocalSheetsConfig(): GoogleSheetsSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc cấu hình Google Sheets từ local:', e);
  }
  return {
    spreadsheetId: null,
    spreadsheetName: 'OmniFlow - Sổ Quản Trị Quỹ & Dòng Tiền Đa Tệ',
    spreadsheetUrl: null,
    autoSyncEnabled: true,
    lastSyncedAt: null,
  };
}

export function saveLocalSheetsConfig(config: GoogleSheetsSyncConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Rút trích Spreadsheet ID từ bất kỳ định dạng link hoặc chuỗi ID
 * Hỗ trợ các link dạng:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/u/0/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Cảnh báo nếu dán link pubhtml (web export)
  if (trimmed.includes('/pubhtml') || trimmed.includes('/pub?')) {
    throw new Error('Link bạn vừa dán là link Xuất bản web (pubhtml). Google Sheets API chỉ hỗ trợ link file gốc dạng: https://docs.google.com/spreadsheets/d/.../edit. Vui lòng mở trang tính và sao chép đường link trên thanh trình duyệt.');
  }

  const match = trimmed.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Nếu là ID thuần (dài hơn 15 ký tự chữ & số)
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Đảm bảo tab trang tính tồn tại trong spreadsheet. Nếu chưa có, tự động tạo mới!
 * Tránh lỗi 400 Bad Request: "Unable to parse range"
 */
export async function ensureSheetTabExists(
  accessToken: string,
  spreadsheetId: string,
  desiredTabName: string
): Promise<string> {
  const metaUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const metaRes = await fetch(metaUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!metaRes.ok) {
    if (metaRes.status === 401) {
      throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng bấm Đổi tài khoản hoặc Đăng nhập lại với Google.');
    }
    if (metaRes.status === 403) {
      throw new Error('Tài khoản Google hiện tại không có quyền Chỉnh sửa (Editor) đối với bảng tính này. Hãy mở Google Sheet > Chia sẻ (Share) và cấp quyền Người chỉnh sửa (Editor) cho tài khoản Google của bạn.');
    }
    if (metaRes.status === 404) {
      throw new Error('Không tìm thấy file Google Sheet này. Hãy kiểm tra lại đường link.');
    }
    const errText = await metaRes.text();
    throw new Error(`Lỗi kết nối Google Sheets (${metaRes.status}): ${errText}`);
  }

  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  const found = sheets.find((s: any) => s.properties?.title === desiredTabName);

  if (found) {
    return desiredTabName;
  }

  // Tạo tab mới nếu chưa tồn tại
  const batchUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`;
  try {
    const addRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: desiredTabName,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      }),
    });

    if (addRes.ok) {
      return desiredTabName;
    }
    console.warn('Không thể thêm tab mới qua batchUpdate, sẽ dùng tab đầu tiên có sẵn:', await addRes.text());
  } catch (err) {
    console.warn('Lỗi khi gọi addSheet:', err);
  }

  // Fallback: dùng tên của tab đầu tiên trong Sheet nếu không thể tạo tab mới
  return sheets[0]?.properties?.title || desiredTabName;
}

/**
 * Kiểm tra xem người dùng có quyền ghi vào Spreadsheet ID hay không
 */
export async function verifySpreadsheetAccess(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; url: string; sheets: string[] }> {
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng bấm Đăng nhập lại với Google.');
    }
    if (response.status === 403) {
      throw new Error('Tài khoản Google hiện tại không có quyền Chỉnh sửa (Editor) đối với bảng tính này. Hãy mở Google Sheet > bấm nút Chia sẻ (Share) và cấp quyền Người chỉnh sửa (Editor) cho tài khoản Google của bạn.');
    }
    if (response.status === 404) {
      throw new Error('Không tìm thấy bảng tính Google Sheet này. Hãy kiểm tra lại link đã dán.');
    }
    const errText = await response.text();
    throw new Error(`Không thể truy cập Google Sheet này: ${errText}`);
  }

  const data = await response.json();
  const title = data.properties?.title || 'OmniFlow - Sổ Quản Trị Quỹ & Dòng Tiền Đa Tệ';
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return { title, url: spreadsheetUrl, sheets };
}

/**
 * Tạo một Google Sheet mới chuẩn OmniFlow trên tài khoản Google của người dùng
 */
export async function createOmniFlowSpreadsheet(
  accessToken: string,
  title = 'OmniFlow - Sổ Quản Trị Quỹ & Dòng Tiền Đa Tệ'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Sổ Giao Dịch',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Danh Mục Quỹ & Số Dư',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const response = await fetch(GOOGLE_SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Lỗi tạo bảng tính Google Sheets: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Format range chuẩn Google Sheets API (bắt buộc bọc tên tab có dấu cách trong dấu nháy đơn)
 */
export function formatSheetRange(tabName: string, cellRange: string): string {
  const safeTab = tabName.replace(/'/g, "''");
  return `'${safeTab}'!${cellRange}`;
}

/**
 * Thêm các dòng vào Google Sheet
 */
export async function appendRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number)[][]
): Promise<void> {
  const range = formatSheetRange(sheetName, 'A1');
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lỗi ghi vào Google Sheets (${response.status}): ${err}`);
  }
}

/**
 * Chuyển đổi đối tượng Transaction thành hàng dữ liệu Sheet
 */
export function transactionToRow(tx: Transaction): (string | number)[] {
  const typeLabel = tx.type === 'inflow' ? 'Thu (+)' : tx.type === 'outflow' ? 'Chi (-)' : tx.type === 'dividend_payout' ? 'Cổ tức (-)' : 'Chuyển quỹ (⇄)';
  return [
    tx.id,
    tx.date,
    typeLabel,
    tx.categoryName,
    tx.categoryGroup,
    tx.accountName,
    tx.originalAmount,
    tx.originalCurrency,
    tx.exchangeRate,
    tx.amountVND,
    tx.description || '',
    tx.partnerOrBranch || '',
    tx.referenceCode || '',
    tx.createdAt || new Date().toISOString(),
  ];
}

/**
 * Đồng bộ toàn bộ danh sách giao dịch sang Google Sheet (Ghi đè hoặc tạo mới dữ liệu)
 */
export async function syncAllTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[]
): Promise<string> {
  const targetTab = await ensureSheetTabExists(accessToken, spreadsheetId, 'Sổ Giao Dịch');

  const headerRow = [
    'Mã Giao Dịch',
    'Ngày (Date)',
    'Loại',
    'Hạng Mục Chi Tiết',
    'Nhóm Chi Phí',
    'Quỹ Tiền / Tài Khoản',
    'Số Tiền Gốc',
    'Loại Tiền',
    'Tỷ Giá Quy Đổi',
    'Thành Tiền (VND)',
    'Diễn Giải / Nội Dung',
    'Đối Tác / Cơ Sở',
    'Mã Tham Chiếu',
    'Thời Gian Tạo',
  ];

  const dataRows = transactions.map(transactionToRow);
  const allRows = [headerRow, ...dataRows];

  // 1. Dọn sạch dữ liệu cũ
  const clearRange = formatSheetRange(targetTab, `A1:N${Math.max(allRows.length + 50, 100)}`);
  const clearUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`;
  try {
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    // ignore clear error
  }

  // 2. Ghi đè toàn bộ dữ liệu mới
  const updateRange = formatSheetRange(targetTab, 'A1');
  const updateUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: updateRange,
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    addSyncLog({
      action: 'bulk_sync',
      actionLabel: 'Đồng Bộ Sổ Cái',
      status: 'error',
      message: `Lỗi cập nhật bảng tính Google Sheets: ${err}`,
      sheetId: spreadsheetId,
      errorDetails: err,
    });
    throw new Error(`Lỗi cập nhật bảng tính Google Sheets: ${err}`);
  }

  addSyncLog({
    action: 'bulk_sync',
    actionLabel: 'Đồng Bộ Sổ Cái',
    status: 'success',
    message: `Đã đồng bộ toàn bộ ${transactions.length} giao dịch sang tab "${targetTab}"`,
    sheetId: spreadsheetId,
    itemCount: transactions.length,
  });

  return targetTab;
}

/**
 * Đồng bộ danh sách các Quỹ Nguồn và Số Dư Hiện Tại sang Tab "Danh Mục Quỹ & Số Dư"
 */
export async function syncAccountsToSheet(
  accessToken: string,
  spreadsheetId: string,
  accounts: AccountWallet[],
  transactions: Transaction[],
  rates: ExchangeRate[]
): Promise<string> {
  const targetTab = await ensureSheetTabExists(accessToken, spreadsheetId, 'Danh Mục Quỹ & Số Dư');
  const balances = calculateAccountBalances(accounts, transactions, rates);

  const headerRow = [
    'Mã Quỹ (ID)',
    'Tên Quỹ Nguồn',
    'Nhóm Quỹ',
    'Đồng Tiền',
    'Số Dư Ban Đầu',
    'Số Dư Hiện Tại (Nguyên Tệ)',
    'Quy Đổi Thành Tiền (VND)',
    'Ngưỡng Tối Thiểu (Min)',
    'Tình Trạng Cảnh Báo',
    'Số Tài Khoản / Ngân Hàng',
    'Ghi Chú Mục Đích',
  ];

  const dataRows = accounts.map(acc => {
    const bal = balances[acc.id] || { currentBalance: acc.initialBalance, balanceVND: 0 };
    const isLow = acc.minBalanceThreshold > 0 && bal.currentBalance < acc.minBalanceThreshold;
    const statusText = isLow ? '🔴 THIẾU HỤT - DƯỚI NGƯỠNG' : '🟢 AN TOÀN';
    const categoryLabel = 
      acc.category === 'cash_vnd' ? 'Tiền mặt' :
      acc.category === 'bank_vn' ? 'Ngân hàng VN' :
      acc.category === 'bank_intl' ? 'Ngân hàng QT' : 'Ví Crypto/USDT';

    return [
      acc.id,
      acc.name,
      categoryLabel,
      acc.currency,
      acc.initialBalance,
      bal.currentBalance,
      bal.balanceVND,
      acc.minBalanceThreshold,
      statusText,
      acc.accountNumber || acc.bankName || '',
      acc.notes || '',
    ];
  });

  const allRows = [headerRow, ...dataRows];

  // Dọn sạch và ghi dữ liệu quỹ
  const clearRange = formatSheetRange(targetTab, `A1:K${Math.max(allRows.length + 30, 50)}`);
  const clearUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`;
  try {
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {}

  const updateRange = formatSheetRange(targetTab, 'A1');
  const updateUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: updateRange,
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    addSyncLog({
      action: 'accounts_sync',
      actionLabel: 'Cập Nhật Số Dư Quỹ',
      status: 'error',
      message: `Lỗi cập nhật số dư quỹ: ${err}`,
      sheetId: spreadsheetId,
      errorDetails: err,
    });
  } else {
    addSyncLog({
      action: 'accounts_sync',
      actionLabel: 'Cập Nhật Số Dư Quỹ',
      status: 'success',
      message: `Đã cập nhật số dư thực tế ${accounts.length} quỹ sang tab "${targetTab}"`,
      sheetId: spreadsheetId,
      itemCount: accounts.length,
    });
  }

  return targetTab;
}

/**
 * Đẩy một giao dịch mới trực tiếp vào cuối bảng tính (tự tạo dòng tiêu đề nếu chưa có)
 */
export async function syncSingleTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction
): Promise<void> {
  const targetTab = await ensureSheetTabExists(accessToken, spreadsheetId, 'Sổ Giao Dịch');

  // Kiểm tra xem sheet đã có tiêu đề chưa
  try {
    const checkRange = formatSheetRange(targetTab, 'A1:A1');
    const checkUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(checkRange)}`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      const hasHeader = Boolean(data.values && data.values.length > 0 && data.values[0][0]);
      if (!hasHeader) {
        const headerRow = [
          'Mã Giao Dịch',
          'Ngày (Date)',
          'Loại',
          'Hạng Mục Chi Tiết',
          'Nhóm Chi Phí',
          'Quỹ Tiền / Tài Khoản',
          'Số Tiền Gốc',
          'Loại Tiền',
          'Tỷ Giá Quy Đổi',
          'Thành Tiền (VND)',
          'Diễn Giải / Nội Dung',
          'Đối Tác / Cơ Sở',
          'Mã Tham Chiếu',
          'Thời Gian Tạo',
        ];
        await appendRowsToSheet(accessToken, spreadsheetId, targetTab, [headerRow]);
      }
    }
  } catch (e) {
    console.warn('Lỗi kiểm tra tiêu đề sheet:', e);
  }

  const row = transactionToRow(tx);
  try {
    await appendRowsToSheet(accessToken, spreadsheetId, targetTab, [row]);
    addSyncLog({
      action: 'single_tx',
      actionLabel: tx.type === 'inflow' ? 'Ghi Khoản Thu' : tx.type === 'outflow' ? 'Ghi Khoản Chi' : 'Ghi Giao Dịch',
      status: 'success',
      message: `Đã lưu giao dịch "${tx.description || tx.categoryName}" (${tx.originalAmount.toLocaleString('vi-VN')} ${tx.originalCurrency}) vào Google Sheet`,
      sheetId: spreadsheetId,
      itemCount: 1,
    });
  } catch (err: any) {
    addSyncLog({
      action: 'single_tx',
      actionLabel: 'Ghi Giao Dịch',
      status: 'error',
      message: `Không thể ghi giao dịch "${tx.description || tx.categoryName}" vào Sheet`,
      sheetId: spreadsheetId,
      errorDetails: err?.message || String(err),
    });
    throw err;
  }
}

/**
 * Đọc toàn bộ danh sách giao dịch từ Google Sheet về ứng dụng (Khôi phục lịch sử)
 */
export async function fetchTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  accounts: AccountWallet[],
  categories: Category[]
): Promise<Transaction[]> {
  const targetTab = await ensureSheetTabExists(accessToken, spreadsheetId, 'Sổ Giao Dịch');
  const readRange = formatSheetRange(targetTab, 'A2:N5000');
  const readUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(readRange)}`;
  
  const response = await fetch(readUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    addSyncLog({
      action: 'fetch_sheet',
      actionLabel: 'Đọc Từ Sheet',
      status: 'error',
      message: `Không thể đọc dữ liệu từ Google Sheet: ${errText}`,
      sheetId: spreadsheetId,
      errorDetails: errText,
    });
    throw new Error(`Không thể đọc dữ liệu từ Google Sheet: ${errText}`);
  }

  const data = await response.json();
  const rows: (string | number)[][] = data.values || [];
  
  if (rows.length === 0) {
    addSyncLog({
      action: 'fetch_sheet',
      actionLabel: 'Đọc Từ Sheet',
      status: 'warning',
      message: `Bảng tính Google Sheet chưa có dữ liệu giao dịch trong tab "${targetTab}"`,
      sheetId: spreadsheetId,
      itemCount: 0,
    });
    return [];
  }

  const defaultAccount = accounts[0] || { id: 'acc_techcom', name: 'Tài khoản Ngân hàng', currency: 'VND' };

  const parsedTxs = rows.map((r, idx) => {
    const rawId = String(r[0] || '').trim();
    const id = rawId && rawId.length > 3 ? rawId : `TX-RESTORE-${Date.now().toString().slice(-4)}-${idx}`;
    const date = String(r[1] || '').trim() || new Date().toISOString().slice(0, 10);
    const typeRaw = String(r[2] || '').toLowerCase();
    const type: TransactionType = typeRaw.includes('thu') ? 'inflow' : 
                 typeRaw.includes('cổ tức') ? 'dividend_payout' : 
                 typeRaw.includes('chuyển') ? 'transfer' : 'outflow';

    const catName = String(r[3] || 'Chi phí khác').trim();
    const catGroup = (r[4] as any) || 'operating_cost';
    const accName = String(r[5] || '').trim();
    const foundAcc = accounts.find(a => a.name.toLowerCase() === accName.toLowerCase()) || defaultAccount;

    const origAmount = typeof r[6] === 'number' ? r[6] : parseFloat(String(r[6] || '0').replace(/[^0-9.-]/g, '')) || 0;
    const currency = (String(r[7] || foundAcc.currency || 'VND').trim().toUpperCase() as any);
    const rate = typeof r[8] === 'number' ? r[8] : parseFloat(String(r[8] || '1').replace(/[^0-9.-]/g, '')) || 1;
    const amtVnd = typeof r[9] === 'number' ? r[9] : parseFloat(String(r[9] || '0').replace(/[^0-9.-]/g, '')) || Math.round(origAmount * rate);

    const desc = String(r[10] || '').trim();
    const partner = String(r[11] || '').trim();
    const refCode = String(r[12] || '').trim();
    const createdAt = String(r[13] || '').trim() || new Date().toISOString();

    const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());

    return {
      id,
      date,
      type,
      categoryId: matchedCat?.id || 'cat_other',
      categoryName: catName,
      categoryGroup: matchedCat?.group || catGroup,
      accountId: foundAcc.id,
      accountName: foundAcc.name,
      originalCurrency: currency,
      originalAmount: origAmount,
      exchangeRate: rate,
      amountVND: amtVnd,
      description: desc,
      partnerOrBranch: partner || undefined,
      referenceCode: refCode || undefined,
      createdAt,
    };
  });

  addSyncLog({
    action: 'fetch_sheet',
    actionLabel: 'Đọc Từ Sheet',
    status: 'success',
    message: `Đã đọc thành công ${parsedTxs.length} giao dịch từ Google Sheet về OmniFlow`,
    sheetId: spreadsheetId,
    itemCount: parsedTxs.length,
  });

  return parsedTxs;
}
