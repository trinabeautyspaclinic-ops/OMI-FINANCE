import { Transaction } from '../types/cashflow';

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';

export interface GoogleSheetsSyncConfig {
  spreadsheetId: string | null;
  spreadsheetName: string;
  spreadsheetUrl: string | null;
  autoSyncEnabled: boolean;
  lastSyncedAt: string | null;
}

const STORAGE_KEY = 'omniflow_google_sheets_config_v1';

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
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * hoặc chỉ riêng id 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
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
 * Kiểm tra xem người dùng có quyền ghi vào Spreadsheet ID hay không
 */
export async function verifySpreadsheetAccess(accessToken: string, spreadsheetId: string): Promise<{ title: string; url: string }> {
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Không thể truy cập Google Sheet này. Hãy chắc chắn link đúng và tài khoản Google đã được cấp quyền: ${errText}`);
  }

  const data = await response.json();
  const title = data.properties?.title || 'OmniFlow - Sổ Quản Trị Quỹ & Dòng Tiền Đa Tệ';
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { title, url: spreadsheetUrl };
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

  // Thiết lập tiêu đề cột chuẩn dòng tiền
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

  await appendRowsToSheet(accessToken, spreadsheetId, 'Sổ Giao Dịch', [headerRow]);

  return { spreadsheetId, spreadsheetUrl };
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
  const range = `${sheetName}!A1`;
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
    throw new Error(`Lỗi ghi vào Google Sheets: ${err}`);
  }
}

/**
 * Chuyển đổi đối tượng Transaction thành hàng dữ liệu Sheet
 */
export function transactionToRow(tx: Transaction): (string | number)[] {
  const typeLabel = tx.type === 'inflow' ? 'Thu' : tx.type === 'outflow' ? 'Chi' : 'Chuyển quỹ';
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
): Promise<void> {
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

  // Ghi đè vào Sổ Giao Dịch
  const range = `Sổ Giao Dịch!A1:N${allRows.length + 10}`;
  const clearUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;

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

  const updateUrl = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent('Sổ Giao Dịch!A1')}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: 'Sổ Giao Dịch!A1',
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lỗi cập nhật bảng tính Google Sheets: ${err}`);
  }
}

/**
 * Đẩy một giao dịch mới trực tiếp vào cuối bảng tính
 */
export async function syncSingleTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction
): Promise<void> {
  const row = transactionToRow(tx);
  await appendRowsToSheet(accessToken, spreadsheetId, 'Sổ Giao Dịch', [row]);
}
