import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  Link,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Transaction } from '../types/cashflow';
import { exportTransactionsToCSV } from '../utils/exportUtils';
import { 
  getLocalSheetsConfig, 
  saveLocalSheetsConfig, 
  createOmniFlowSpreadsheet, 
  syncAllTransactionsToSheet,
  extractSpreadsheetId,
  verifySpreadsheetAccess,
  GoogleSheetsSyncConfig
} from '../services/googleSheetsSync';
import { googleSignIn, googleSignOut, initAuth } from '../services/firebase';
import { User } from 'firebase/auth';

interface GoogleSheetsGuideViewProps {
  transactions: Transaction[];
  cloudSheetsConfig?: GoogleSheetsSyncConfig | null;
  onSaveCloudSheetsConfig?: (config: GoogleSheetsSyncConfig) => void;
}

export const GoogleSheetsGuideView: React.FC<GoogleSheetsGuideViewProps> = ({ 
  transactions,
  cloudSheetsConfig,
  onSaveCloudSheetsConfig
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

  const handleLoginGoogle = async () => {
    setIsSigningIn(true);
    setSyncMessage(null);
    try {
      const res = await googleSignIn();
      setCurrentUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err: any) {
      console.error(err);
      setSyncMessage({
        type: 'error',
        text: `Đăng nhập Google thất bại: ${err?.message || 'Vui lòng thử lại'}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await googleSignOut();
    setCurrentUser(null);
    setAccessToken(null);
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
    if (!accessToken) {
      alert('Vui lòng kết nối Google trước bằng nút Đăng nhập ở trên');
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await createOmniFlowSpreadsheet(accessToken, syncConfig.spreadsheetName);
      // Đẩy data hiện tại sang
      await syncAllTransactionsToSheet(accessToken, result.spreadsheetId, transactions);

      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }),
      };

      persistConfig(updatedConfig);

      setSyncMessage({
        type: 'success',
        text: `Đã khởi tạo thành công Google Sheet trên Drive và đồng bộ ${transactions.length} giao dịch! Cấu hình đã được lưu vĩnh viễn trên Cloud.`,
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

  // 2. Liên kết một Sheet có sẵn bằng Link hoặc ID
  const handleLinkExistingSheet = async () => {
    if (!customSheetInput.trim()) {
      alert('Vui lòng dán link Google Sheet vào ô');
      return;
    }

    const extractedId = extractSpreadsheetId(customSheetInput);
    if (!extractedId) {
      alert('Không nhận diện được ID Google Sheet từ đường link này. Vui lòng kiểm tra lại');
      return;
    }

    if (!accessToken) {
      alert('Vui lòng bấm Đăng nhập Google trước để ứng dụng có quyền đồng bộ sang Sheet này');
      return;
    }

    setIsLinkingCustomSheet(true);
    setSyncMessage(null);

    try {
      // Xác thực quyền truy cập
      const verified = await verifySpreadsheetAccess(accessToken, extractedId);
      
      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        spreadsheetId: extractedId,
        spreadsheetUrl: verified.url,
        spreadsheetName: verified.title,
        lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }),
      };

      // Đẩy luôn data sang sheet này
      await syncAllTransactionsToSheet(accessToken, extractedId, transactions);

      persistConfig(updatedConfig);
      setCustomSheetInput('');

      setSyncMessage({
        type: 'success',
        text: `Đã liên kết thành công với Google Sheet "${verified.title}" và lưu vĩnh viễn trên Cloud!`,
      });
    } catch (err: any) {
      console.error(err);
      setSyncMessage({
        type: 'error',
        text: `Không thể liên kết Sheet: ${err?.message || 'Vui lòng kiểm tra link và quyền chia sẻ'}`,
      });
    } finally {
      setIsLinkingCustomSheet(false);
    }
  };

  // 3. Đồng bộ lại toàn bộ dữ liệu
  const handleManualSyncNow = async () => {
    if (!accessToken) {
      alert('Vui lòng Đăng nhập với Google để thực hiện đồng bộ');
      return;
    }
    if (!syncConfig.spreadsheetId) {
      alert('Chưa có liên kết với Google Sheets');
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await syncAllTransactionsToSheet(accessToken, syncConfig.spreadsheetId, transactions);
      const updatedConfig: GoogleSheetsSyncConfig = {
        ...syncConfig,
        lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }),
      };
      persistConfig(updatedConfig);

      setSyncMessage({
        type: 'success',
        text: `Đã cập nhật toàn bộ ${transactions.length} giao dịch lên Google Sheets thành công!`,
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

  const sheetsStructure = [
    {
      id: 'sheet_danhmuc_quy',
      name: '1. Sheet DanhMucQuy (Quản Lý Chi Tiết Các Quỹ Tiền Mặt & Số Dư)',
      desc: 'Quản lý 4 nhóm quỹ: Tiền mặt VND, Ngân hàng VND, Ngân hàng QT, Ví USDT. Theo dõi số dư thực tế và cảnh báo dưới mức tối thiểu.',
      columns: [
        { name: 'A: Mã Quỹ', desc: 'QUY-VND-01, TECH-01, VP-ADS, MB-02, CHASE-USD, VIB-AED, BINANCE-USDT' },
        { name: 'B: Tên Quỹ / Tài Khoản', desc: 'Két tiền mặt, Techcombank, Thẻ Ads VPBank, Chase USD, Ví Binance...' },
        { name: 'C: Nhóm Quỹ', desc: 'Tiền mặt VND / Ngân hàng VND / Ngân hàng Quốc tế / Ví USDT' },
        { name: 'D: Loại Tiền Tệ', desc: 'VND / USD / AED / USDT' },
        { name: 'E: Số Dư Đầu Kỳ', desc: 'Số tiền ban đầu khi mở sổ' },
        { name: 'F: Tổng Thu (Inflow)', desc: 'Công thức tự tính: =SUMIFS(SổGiaoDịch!F:F, SổGiaoDịch!C:C, "Thu", SổGiaoDịch!D:D, A2) + SUMIFS(SổGiaoDịch!F:F, SổGiaoDịch!C:C, "Chuyển", SổGiaoDịch!E:E, A2)' },
        { name: 'G: Tổng Chi (Outflow)', desc: 'Công thức tự tính: =SUMIFS(SổGiaoDịch!F:F, SổGiaoDịch!C:C, "Chi", SổGiaoDịch!D:D, A2) + SUMIFS(SổGiaoDịch!F:F, SổGiaoDịch!C:C, "Chuyển", SổGiaoDịch!D:D, A2)' },
        { name: 'H: Số Dư Hiện Tại', desc: '=E2 + F2 - G2' },
        { name: 'I: Ngưỡng Tối Thiểu (Min)', desc: 'Mức an toàn tối thiểu (VD: Két 15M, VPBank 25M, USDT 3,500)' },
        { name: 'J: Cảnh Báo Số Dư', desc: '=IF(H2<I2, "🔴 BÁO ĐỘNG THIẾU HỤT", "🟢 AN TOÀN")' }
      ],
      formulas: [
        {
          title: 'Công thức tính Số Dư Động Hiện Tại theo thời gian thực (Cột H):',
          code: `=E2 + (SUMIFS(SổGiaoDịch!$F:$F, SổGiaoDịch!$C:$C, "Thu", SổGiaoDịch!$D:$D, A2) + SUMIFS(SổGiaoDịch!$F:$F, SổGiaoDịch!$C:$C, "Chuyển", SổGiaoDịch!$E:$E, A2)) - (SUMIFS(SổGiaoDịch!$F:$F, SổGiaoDịch!$C:$C, "Chi", SổGiaoDịch!$D:$D, A2) + SUMIFS(SổGiaoDịch!$F:$F, SổGiaoDịch!$C:$C, "Chuyển", SổGiaoDịch!$D:$D, A2))`
        },
        {
          title: 'Công thức Cảnh Báo Số Dư Dưới Ngưỡng Tối Thiểu (Cột J):',
          code: `=IF(H2<I2, "🔴 BÁO ĐỘNG THIẾU HỤT", "🟢 AN TOÀN")`
        }
      ]
    },
    {
      id: 'sheet_sogiaodich',
      name: '2. Sheet SổGiaoDịch (Chi Tiết Từng Hạng Mục & Tỷ Giá Nhập Tay)',
      desc: 'Nhật ký giao dịch dòng tiền. Tỷ giá quy đổi cho phép nhập tay để chỉnh sửa các giao dịch cũ. Có cột tự động cảnh báo giao dịch chi lớn bất thường.',
      columns: [
        { name: 'A: Mã Giao Dịch', desc: 'Mã duy nhất TX-...' },
        { name: 'B: Ngày (Date)', desc: 'YYYY-MM-DD' },
        { name: 'C: Loại', desc: 'Thu / Chi / Chuyển quỹ' },
        { name: 'D: Hạng Mục Chi Tiết', desc: 'Doanh thu CS1, Ads TikTok, Tiền nhà CS2...' },
        { name: 'E: Nhóm Chi Phí', desc: 'revenue, marketing_ads, operating_cost, cogs...' },
        { name: 'F: Quỹ Tiền / Tài Khoản', desc: 'Techcombank, Két tiền mặt, Chase USD...' },
        { name: 'G: Số Tiền Gốc', desc: 'Số tiền thực tế giao dịch' },
        { name: 'H: Loại Tiền', desc: 'VND / USD / AED / USDT' },
        { name: 'I: Tỷ Giá Quy Đổi', desc: 'Tỷ giá thực tế tại thời điểm GD (Có thể nhập tay tự do)' },
        { name: 'J: Thành Tiền VND', desc: 'Quy đổi ra VND' },
        { name: 'K: Diễn Giải', desc: 'Nội dung chi tiết giao dịch' },
        { name: 'L: Đối Tác / Cơ Sở', desc: 'Tên đối tác hoặc cơ sở phát sinh' },
        { name: 'M: Mã Tham Chiếu', desc: 'Số hoá đơn / Mã UNC' },
        { name: 'N: Thời Gian Tạo', desc: 'Timestamp hệ thống' }
      ],
      formulas: [
        {
          title: 'Công thức tính Thành Tiền VND với tỷ giá nhập tay:',
          code: `=ROUND(G2 * I2, 0)`
        }
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
                  Tự Động Lưu Dòng Tiền Vào Google Sheets
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Đã Lưu Cloud Vĩnh Viễn
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Link Google Sheet được lưu đồng bộ trên Cloud Database, không bao giờ bị mất khi refresh hay cập nhật code.
              </p>
            </div>
          </div>

          {/* Nút Đăng nhập Google theo chuẩn Brand */}
          <div className="shrink-0">
            {!currentUser ? (
              <button
                onClick={handleLoginGoogle}
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
                  className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700"
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
              className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {syncMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{syncMessage.text}</span>
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
                    {syncConfig.lastSyncedAt && <> · Cập nhật: <strong className="text-slate-300">{syncConfig.lastSyncedAt}</strong></>}
                  </>
                ) : (
                  <>Dán link trang tính có sẵn ở bên dưới hoặc bấm nút Tạo trang tính mới.</>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {syncConfig.spreadsheetId ? (
                <>
                  <button
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Đang cập nhật...' : 'Đồng bộ lại toàn bộ'}</span>
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
                </>
              ) : (
                <button
                  onClick={handleCreateNewSheet}
                  disabled={isSyncing || !currentUser}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSyncing ? 'Đang tạo...' : 'Tạo Sheet Mới Tự Động'}</span>
                </button>
              )}
            </div>
          </div>

          {/* KHỐI DÁN LINK HOẶC ĐỔI LINK GOOGLE SHEET (LƯU VĨNH VIỄN) */}
          <div className="mt-3 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
              <Link className="w-4 h-4 text-emerald-400" />
              <span>Dán Link Google Sheet Của Bạn (Lưu vĩnh viễn không mất):</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={customSheetInput}
                onChange={e => setCustomSheetInput(e.target.value)}
                placeholder="Dán link Google Sheet (VD: https://docs.google.com/spreadsheets/d/...)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleLinkExistingSheet}
                disabled={isLinkingCustomSheet || !customSheetInput.trim()}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <span>{isLinkingCustomSheet ? 'Đang kết nối...' : 'Lưu Link Này'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              💡 Bạn có thể dán bất kỳ link Google Sheet nào của công ty. Hệ thống sẽ lưu ID này lên Database Cloud, tự động ghi nhận mọi giao dịch và mở lại bất cứ lúc nào.
            </p>
          </div>
        </div>
      </div>

      {/* 2. CẤU TRÚC SHEETS THAM KHẢO & CÔNG THỨC */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Cấu Trúc Các Sheet & Công Thức Tự Tính (Tham Khảo)
            </h3>
            <p className="text-xs text-slate-400">
              Bạn có thể copy các công thức SUMIFS để dán vào Google Sheet nếu muốn tự làm thêm các báo cáo riêng.
            </p>
          </div>
          <button
            onClick={() => exportTransactionsToCSV(transactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Tải File CSV Về Máy</span>
          </button>
        </div>

        <div className="space-y-6">
          {sheetsStructure.map(sheet => (
            <div key={sheet.id} className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
              <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{sheet.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sheet.desc}</p>
                </div>
              </div>

              {/* Columns Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {sheet.columns.map((col, idx) => (
                  <div key={idx} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="font-mono text-emerald-400 text-xs font-semibold block">{col.name}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">{col.desc}</span>
                  </div>
                ))}
              </div>

              {/* Formulas */}
              {sheet.formulas && (
                <div className="px-4 pb-4 space-y-3">
                  {sheet.formulas.map((f, fIdx) => (
                    <div key={fIdx} className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-300">{f.title}</span>
                        <button
                          onClick={() => handleCopy(f.code, `${sheet.id}_${fIdx}`)}
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono px-2 py-0.5 bg-slate-800 rounded"
                        >
                          {copiedKey === `${sheet.id}_${fIdx}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy công thức</span>
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-xs text-emerald-300/90 font-mono block bg-slate-950 p-2 rounded border border-slate-800/80 overflow-x-auto whitespace-pre">
                        {f.code}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
