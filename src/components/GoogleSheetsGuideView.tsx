import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  Link,
  ArrowRight,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Activity,
  Share2
} from 'lucide-react';
import { AccountWallet, ExchangeRate, Transaction } from '../types/cashflow';
import { exportTransactionsToCSV } from '../utils/exportUtils';
import { 
  getLocalSheetsConfig, 
  saveLocalSheetsConfig, 
  createOmniFlowSpreadsheet, 
  syncAllTransactionsToSheet,
  syncAccountsToSheet,
  extractSpreadsheetId,
  verifySpreadsheetAccess,
  GoogleSheetsSyncConfig
} from '../services/googleSheetsSync';
import { googleSignIn, googleSignOut, initAuth } from '../services/firebase';
import { User } from 'firebase/auth';

interface GoogleSheetsGuideViewProps {
  transactions: Transaction[];
  accounts?: AccountWallet[];
  rates?: ExchangeRate[];
  cloudSheetsConfig?: GoogleSheetsSyncConfig | null;
  onSaveCloudSheetsConfig?: (config: GoogleSheetsSyncConfig) => void;
  onNavigateToSyncLogs?: () => void;
}

export const GoogleSheetsGuideView: React.FC<GoogleSheetsGuideViewProps> = ({ 
  transactions,
  accounts = [],
  rates = [],
  cloudSheetsConfig,
  onSaveCloudSheetsConfig,
  onNavigateToSyncLogs
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auth & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Ưu tiên config lưu trên Cloud Firebase nếu có, sau đó đến LocalStorage
  const [syncConfig, setSyncConfig] = useState<GoogleSheetsSyncConfig>(() => {
    return cloudSheetsConfig?.spreadsheetId ? cloudSheetsConfig : getLocalSheetsConfig();
  });

  // Custom Link Google Sheet input
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [isLinkingCustomSheet, setIsLinkingCustomSheet] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state when cloudSheetsConfig changes
  useEffect(() => {
    if (cloudSheetsConfig && cloudSheetsConfig.spreadsheetId) {
      setSyncConfig(cloudSheetsConfig);
      saveLocalSheetsConfig(cloudSheetsConfig);
    }
  }, [cloudSheetsConfig]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLoginGoogle = async (): Promise<string | null> => {
    setIsSigningIn(true);
    setSyncMessage(null);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        return res.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error(err);
      let errorMsg = err?.message || 'Vui lòng thử lại';
      if (err?.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
      } else if (errorMsg.includes('access_denied') || errorMsg.includes('403') || errorMsg.includes('chưa hoàn tất') || errorMsg.includes('testing')) {
        errorMsg = '⚠️ Lỗi 403 (access_denied): Tài khoản Gmail này chưa được cấp phép trong danh sách Người dùng thử nghiệm (Test Users). Hãy đăng nhập bằng tài khoản chủ dự án (Nguyenhaduy1501@gmail.com) hoặc thêm email này vào Google Cloud Console > OAuth consent screen > Test users.';
      } else if (err?.code === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
        const currentDomain = window.location.hostname;
        errorMsg = `Tên miền "${currentDomain}" chưa được thêm vào Firebase Authorized Domains. Hãy vào Firebase Console > Authentication > Settings > Authorized domains và thêm chính xác "${currentDomain}".`;
      }
      setSyncMessage({
        type: 'error',
        text: `Đăng nhập Google thất bại: ${errorMsg}`,
      });
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await googleSignOut();
    setCurrentUser(null);
    setAccessToken(null);
    setSyncMessage(null);
  };

  // Lưu cấu hình vào cả LocalStorage VÀ Cloud Firebase
  const persistConfig = (newConfig: GoogleSheetsSyncConfig) => {
    setSyncConfig(newConfig);
    saveLocalSheetsConfig(newConfig);
    if (onSaveCloudSheetsConfig) {
      onSaveCloudSheetsConfig(newConfig);
    }
  };

  // 1. Tạo Google Sheet mới tự động
  const handleCreateNewSheet = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    let activeToken = accessToken;

    if (!activeToken) {
      setSyncMessage({ type: 'success', text: 'Đang mở cửa sổ đăng nhập Google...' });
      activeToken = await handleLoginGoogle();
      if (!activeToken) {
        setIsSyncing(false);
        return;
      }
    }

    try {
      const result = await createOmniFlowSpreadsheet(activeToken, syncConfig.spreadsheetName);
      
      // 1. Đẩy toàn bộ giao dịch vào tab "Sổ Giao Dịch"
      const txTab = await syncAllTransactionsToSheet(activeToken, result.spreadsheetId, transactions);
      
      // 2. Đẩy danh mục quỹ vào tab "Danh Mục Quỹ & Số Dư"
      let fundTab = '';
      if (accounts && accounts.length > 0) {
        try {
          fundTab = await syncAccountsToSheet(activeToken, result.spreadsheetId, accounts, transactions, rates);
        } catch (fErr) {
          console.warn('Lỗi ghi tab quỹ:', fErr);
        }
      }

      const syncTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: syncTime,
      };

      persistConfig(updatedConfig);

      setSyncMessage({
        type: 'success',
        text: `✅ ĐÃ TẠO THÀNH CÔNG! Đã khởi tạo Google Sheet trên Google Drive của bạn và đồng bộ ${transactions.length} giao dịch vào tab "${txTab}"${fundTab ? ` & ${accounts.length} quỹ nguồn vào tab "${fundTab}"` : ''}. Bấm nút "Mở Google Sheets" bên dưới để xem trực tiếp!`,
      });
    } catch (error: any) {
      console.error(error);
      setSyncMessage({
        type: 'error',
        text: `Lỗi tạo Google Sheet: ${error?.message || 'Vui lòng kiểm tra quyền'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Liên kết một Sheet có sẵn bằng Link hoặc ID VÀ ĐỒNG BỘ NGAY LẬP TỨC
  const handleLinkExistingSheet = async () => {
    const rawInput = customSheetInput.trim();
    if (!rawInput) {
      setSyncMessage({ type: 'error', text: 'Vui lòng dán link Google Sheet vào ô nhập liệu' });
      return;
    }

    let extractedId: string | null = null;
    try {
      extractedId = extractSpreadsheetId(rawInput);
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Link không hợp lệ' });
      return;
    }

    if (!extractedId) {
      setSyncMessage({
        type: 'error',
        text: 'Không nhận diện được ID Google Sheet từ đường link này. Vui lòng mở Google Sheet và copy link đầy đủ dạng https://docs.google.com/spreadsheets/d/.../edit',
      });
      return;
    }

    setIsLinkingCustomSheet(true);
    setSyncMessage(null);

    let activeToken = accessToken;

    // BẮT BUỘC có token Google để ghi dữ liệu
    if (!activeToken) {
      setSyncMessage({
        type: 'success',
        text: 'Đang kết nối tài khoản Google để cấp quyền ghi vào Sheet của bạn...',
      });
      activeToken = await handleLoginGoogle();
      if (!activeToken) {
        setIsLinkingCustomSheet(false);
        setSyncMessage({
          type: 'error',
          text: 'Chưa thể đồng bộ vì bạn chưa đăng nhập Google. Hãy bấm "Đăng nhập Google" phía trên để cấp quyền ghi vào Sheet.',
        });
        return;
      }
    }

    try {
      // Bước 1: Kiểm tra quyền truy cập và lấy tiêu đề Sheet
      const verified = await verifySpreadsheetAccess(activeToken, extractedId);
      const sheetTitle = verified.title;
      const sheetUrl = verified.url;

      // Bước 2: Đồng bộ toàn bộ giao dịch vào tab "Sổ Giao Dịch" (Tự tạo tab nếu chưa có)
      const txTab = await syncAllTransactionsToSheet(activeToken, extractedId, transactions);

      // Bước 3: Đồng bộ danh mục quỹ vào tab "Danh Mục Quỹ & Số Dư"
      let fundTab = '';
      if (accounts && accounts.length > 0) {
        try {
          fundTab = await syncAccountsToSheet(activeToken, extractedId, accounts, transactions, rates);
        } catch (fErr) {
          console.warn('Lỗi đồng bộ tab quỹ:', fErr);
        }
      }

      const syncTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        spreadsheetId: extractedId,
        spreadsheetUrl: sheetUrl,
        spreadsheetName: sheetTitle,
        lastSyncedAt: syncTime,
      };

      persistConfig(updatedConfig);
      setCustomSheetInput('');

      setSyncMessage({
        type: 'success',
        text: `✅ ĐÃ LIÊN KẾT & ĐỒNG BỘ THÀNH CÔNG! Đã ghi ${transactions.length} giao dịch vào tab "${txTab}"${fundTab ? ` và ${accounts.length} quỹ nguồn vào tab "${fundTab}"` : ''} của Google Sheet "${sheetTitle}". Bấm nút "Mở Google Sheets" bên dưới để kiểm tra ngay!`,
      });
    } catch (err: any) {
      console.error(err);
      setSyncMessage({
        type: 'error',
        text: `Lỗi đồng bộ vào Google Sheet: ${err?.message || 'Vui lòng kiểm tra lại quyền truy cập hoặc link Sheet'}`,
      });
    } finally {
      setIsLinkingCustomSheet(false);
    }
  };

  // 3. Đồng bộ lại toàn bộ dữ liệu thủ công
  const handleManualSyncNow = async () => {
    if (!syncConfig.spreadsheetId) {
      setSyncMessage({ type: 'error', text: 'Chưa có liên kết với Google Sheets. Vui lòng dán link trang tính ở ô bên dưới.' });
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    let activeToken = accessToken;

    if (!activeToken) {
      setSyncMessage({ type: 'success', text: 'Đang mở cửa sổ đăng nhập Google...' });
      activeToken = await handleLoginGoogle();
      if (!activeToken) {
        setIsSyncing(false);
        return;
      }
    }

    try {
      const txTab = await syncAllTransactionsToSheet(activeToken, syncConfig.spreadsheetId, transactions);

      let fundTab = '';
      if (accounts && accounts.length > 0) {
        try {
          fundTab = await syncAccountsToSheet(activeToken, syncConfig.spreadsheetId, accounts, transactions, rates);
        } catch (fErr) {
          console.warn('Sync accounts note:', fErr);
        }
      }

      const syncTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        lastSyncedAt: syncTime,
      };
      persistConfig(updatedConfig);

      setSyncMessage({
        type: 'success',
        text: `✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG! Đã cập nhật ${transactions.length} giao dịch vào tab "${txTab}"${fundTab ? ` & số dư ${accounts.length} quỹ vào tab "${fundTab}"` : ''} lúc ${syncTime}.`,
      });
    } catch (error: any) {
      console.error(error);
      setSyncMessage({
        type: 'error',
        text: `Lỗi đồng bộ: ${error?.message || 'Vui lòng thử lại'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!syncConfig.spreadsheetId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?sheetId=${syncConfig.spreadsheetId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedKey('share_url');
    setTimeout(() => setCopiedKey(null), 4000);
    setSyncMessage({
      type: 'success',
      text: '📋 ĐÃ SAO CHÉP LINK DÙNG CHUNG! Hãy gửi link này cho đồng nghiệp. Khi họ mở link trên máy của họ, OmniFlow sẽ tự động nhận diện và kết nối với file Google Sheet này.',
    });
  };

  const sheetsStructure = [
    {
      id: 'sheet_danhmuc_quy',
      name: '1. Tab "Danh Mục Quỹ & Số Dư" (Quản Lý Chi Tiết Các Quỹ Nguồn & Cảnh Báo)',
      desc: 'Quản lý 4 nhóm quỹ: Tiền mặt VND, Ngân hàng VND, Ngân hàng QT, Ví USDT. Tự động tính số dư thực tế và cảnh báo dưới mức an toàn tối thiểu.',
      columns: [
        { name: 'A: Mã Quỹ', desc: 'ID định danh duy nhất (acc_techcom, acc_binance_usdt...)' },
        { name: 'B: Tên Quỹ Nguồn', desc: 'Tài khoản Ngân hàng, Ví USDT, Két tiền mặt...' },
        { name: 'C: Nhóm Quỹ', desc: 'Tiền mặt / Ngân hàng VN / Ngân hàng QT / Ví Crypto/USDT' },
        { name: 'D: Loại Tiền', desc: 'VND / USDT / USD / AED / EUR' },
        { name: 'E: Số Dư Ban Đầu', desc: 'Số dư gốc ban đầu của quỹ' },
        { name: 'F: Số Dư Thực Tế Hiện Tại', desc: 'Số tiền thực tế hiện tại theo nguyên tệ' },
        { name: 'G: Thành Tiền Quy Đổi VND', desc: 'Quy đổi về VND theo tỷ giá thị trường' },
        { name: 'H: Ngưỡng Tối Thiểu (Min)', desc: 'Ngưỡng an toàn tối thiểu' },
        { name: 'I: Tình Trạng Cảnh Báo', desc: '🟢 AN TOÀN hoặc 🔴 THIẾU HỤT - DƯỚI NGƯỠNG' },
        { name: 'J: Số Tài Khoản / Ngân Hàng', desc: 'Số tài khoản hoặc tên ngân hàng quản lý' }
      ]
    },
    {
      id: 'sheet_sogiaodich',
      name: '2. Tab "Sổ Giao Dịch" (Sổ Cái Dòng Tiền Đa Tệ & Phân Bổ Chi Tiết)',
      desc: 'Toàn bộ các bút toán Thu, Chi, Chuyển quỹ, Chi trả cổ tức được ghi nhận tức thì theo thời gian thực.',
      columns: [
        { name: 'A: Mã Giao Dịch', desc: 'Mã định danh duy nhất TX-...' },
        { name: 'B: Ngày (Date)', desc: 'Ngày hạch toán YYYY-MM-DD' },
        { name: 'C: Loại', desc: 'Thu (+) / Chi (-) / Chuyển quỹ (⇄) / Cổ tức (-)' },
        { name: 'D: Hạng Mục Chi Tiết', desc: 'Doanh thu CS1, Ads TikTok, Tiền thuê mặt bằng, Lương nhân viên...' },
        { name: 'E: Nhóm Chi Phí', desc: 'Doanh thu / Ads / Vận hành / Giá vốn / Tài chính / Cổ tức' },
        { name: 'F: Quỹ Nguồn', desc: 'Tên quỹ tiền mặt, ngân hàng hoặc ví thực hiện giao dịch' },
        { name: 'G: Số Tiền Gốc', desc: 'Số tiền nguyên tệ giao dịch' },
        { name: 'H: Loại Tiền', desc: 'VND / USDT / USD / AED' },
        { name: 'I: Tỷ Giá Quy Đổi', desc: 'Tỷ giá hạch toán thực tế' },
        { name: 'J: Thành Tiền VND', desc: 'Số tiền quy đổi VND' },
        { name: 'K: Diễn Giải / Nội Dung', desc: 'Nội dung chi tiết giao dịch' },
        { name: 'L: Đối Tác / Cơ Sở', desc: 'Cơ sở chi nhánh hoặc đối tác' },
        { name: 'M: Mã Tham Chiếu', desc: 'Mã hóa đơn / Mã chuyển khoản' },
        { name: 'N: Thời Gian Tạo', desc: 'Thời gian khởi tạo hệ thống' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TỰ ĐỘNG ĐỒNG BỘ GOOGLE SHEETS TRỰC TIẾP */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-indigo-950/40 p-6 rounded-2xl border border-emerald-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Tự Động Lưu & Đồng Bộ Dòng Tiền Vào Google Sheets
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Đồng Bộ Đám Mây Vĩnh Viễn
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dán link Google Sheet của bạn để hệ thống tự động đẩy toàn bộ giao dịch và số dư quỹ sang Google Sheets ngay lập tức.
              </p>
            </div>
          </div>

          {/* Nút Đăng nhập Google */}
          <div className="shrink-0">
            {!currentUser ? (
              <button
                onClick={() => handleLoginGoogle()}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Đang kết nối...' : 'Đăng nhập Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-200">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã kết nối Google
                  </div>
                </div>
                <button
                  onClick={handleLogoutGoogle}
                  className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Đổi tài khoản
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trạng thái Bảng tính & Tác vụ Đồng Bộ */}
        <div className="mt-4 pt-2">
          {syncMessage && (
            <div
              className={`p-3.5 rounded-xl mb-4 text-xs flex items-start gap-2.5 ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed whitespace-pre-line">{syncMessage.text}</div>
            </div>
          )}

          {/* Thẻ hiển thị Trang tính đang được gắn kết */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Trang tính hiện tại:</span>
                <span className="text-emerald-400 font-mono">
                  {syncConfig.spreadsheetUrl ? (
                    <a 
                      href={syncConfig.spreadsheetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      {syncConfig.spreadsheetName || 'OmniFlow - Sổ Quản Trị Quỹ & Dòng Tiền Đa Tệ'} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Chưa gắn kết trang tính</span>
                  )}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {syncConfig.spreadsheetId ? (
                  <>
                    ID: <code className="text-slate-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{syncConfig.spreadsheetId}</code>
                    {syncConfig.lastSyncedAt && <> · Cập nhật gần nhất: <strong className="text-emerald-400">{syncConfig.lastSyncedAt}</strong></>}
                  </>
                ) : (
                  <>Dán link Google Sheet của bạn vào ô bên dưới hoặc bấm nút Tạo Sheet Mới để bắt đầu.</>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onNavigateToSyncLogs && (
                <button
                  onClick={onNavigateToSyncLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Xem nhật ký chi tiết các lần đồng bộ thành công hoặc thất bại"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Xem Nhật Ký Đồng Bộ</span>
                </button>
              )}

              {syncConfig.spreadsheetId && (
                <>
                  <button
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Đang ghi vào Sheet...' : 'Đồng bộ lại toàn bộ'}</span>
                  </button>
                  {syncConfig.spreadsheetUrl && (
                    <a
                      href={syncConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Google Sheets</span>
                    </a>
                  )}

                  <button
                    onClick={handleCopyShareLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 font-semibold text-xs rounded-lg border border-indigo-500/30 transition-all cursor-pointer shadow-xs"
                    title="Sao chép link mời đồng nghiệp kết nối cùng Google Sheet này"
                  >
                    {copiedKey === 'share_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{copiedKey === 'share_url' ? 'Đã sao chép link!' : 'Chia Sẻ Cho Đồng Nghiệp'}</span>
                  </button>
                </>
              )}

              <button
                onClick={handleCreateNewSheet}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Đang tạo...' : '+ Tạo Sheet Mới Tự Động'}</span>
              </button>
            </div>
          </div>

          {/* KHỐI DÁN LINK HOẶC ĐỔI LINK GOOGLE SHEET (LƯU VĨNH VIỄN & ĐỒNG BỘ NGAY) */}
          <div className="mt-3 bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
              <Link className="w-4 h-4 text-emerald-400" />
              <span>Dán Link Google Sheet Của Bạn Để Đồng Bộ Trực Tiếp:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={customSheetInput}
                onChange={e => setCustomSheetInput(e.target.value)}
                placeholder="Dán link Google Sheet (VD: https://docs.google.com/spreadsheets/d/.../edit)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleLinkExistingSheet}
                disabled={isLinkingCustomSheet || !customSheetInput.trim()}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <span>{isLinkingCustomSheet ? 'Đang ghi vào Sheet...' : 'Lưu Link & Đồng Bộ Ngay'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 space-y-1">
              <p>💡 <strong>Cơ chế tự động:</strong> Khi bấm &quot;Lưu Link & Đồng Bộ Ngay&quot;, hệ thống sẽ tự động kết nối tài khoản Google của bạn, tự động tạo 2 tab <code>Sổ Giao Dịch</code> và <code>Danh Mục Quỹ & Số Dư</code> trên file Sheet đó và nạp toàn bộ {transactions.length} giao dịch sang.</p>
              <p>⚠️ <strong>Lưu ý:</strong> Hãy chắc chắn tài khoản Google bạn đăng nhập có quyền <strong>Chỉnh sửa (Editor)</strong> đối với file Google Sheet đó.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CẤU TRÚC SHEETS THAM KHẢO & CÔNG THỨC */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Cấu Trúc Các Tab & Dữ Liệu Tự Động Trong Google Sheet
            </h3>
            <p className="text-xs text-slate-400">
              Bảng tính Google Sheet được đồng bộ chuẩn 2 tab quản trị dòng tiền doanh nghiệp chuyên nghiệp.
            </p>
          </div>
          <button
            onClick={() => exportTransactionsToCSV(transactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Tải File CSV Về Máy</span>
          </button>
        </div>

        <div className="space-y-6">
          {sheetsStructure.map(sheet => (
            <div key={sheet.id} className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
              <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{sheet.name}</span>
                <span className="text-[11px] text-slate-400">{sheet.columns.length} cột dữ liệu</span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-400">{sheet.desc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {sheet.columns.map((col, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                      <span className="font-semibold text-emerald-400 block">{col.name}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{col.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
