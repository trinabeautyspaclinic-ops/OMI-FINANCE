import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  History, 
  Database, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Search,
  ArrowDownToLine,
  ShieldCheck,
  Download,
  HelpCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { AccountWallet, Category, Transaction } from '../types/cashflow';
import { 
  scanLocalBackups, 
  getSeedUsdtTransactions, 
  parseCSVToTransactions,
  exportSystemBackupJSON,
  LocalBackupInfo 
} from '../utils/recoveryUtils';
import { fetchTransactionsFromSheet, getLocalSheetsConfig } from '../services/googleSheetsSync';
import { getAccessToken, googleSignIn } from '../services/firebase';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTransactions: Transaction[];
  onRestoreTransactions: (transactions: Transaction[], mode: 'merge' | 'replace') => void;
  accounts: AccountWallet[];
  categories: Category[];
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  currentTransactions,
  onRestoreTransactions,
  accounts,
  categories,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'usdt_seed' | 'sheet' | 'csv' | 'guide'>('scan');
  const [localBackups, setLocalBackups] = useState<LocalBackupInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sheet restore state
  const [isRestoringSheet, setIsRestoringSheet] = useState(false);
  const sheetsConfig = getLocalSheetsConfig();

  // CSV paste/upload state
  const [csvContent, setCsvContent] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Quét bộ nhớ khi mở modal
  useEffect(() => {
    if (isOpen) {
      handleScanLocal();
    }
  }, [isOpen]);

  const handleScanLocal = () => {
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const found = scanLocalBackups();
      setLocalBackups(found);
    } catch (e) {
      console.warn('Lỗi quét backup:', e);
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  // 1. Khôi phục từ bản quét cục bộ
  const handleApplyLocalBackup = (backup: LocalBackupInfo, mode: 'merge' | 'replace') => {
    onRestoreTransactions(backup.transactions, mode);
    setStatusMessage({
      type: 'success',
      text: `✅ Đã khôi phục thành công ${backup.transactions.length} giao dịch từ nguồn "${backup.key}"!`,
    });
  };

  // 2. Nạp lại 28 giao dịch gốc USDT
  const handleApplySeedUsdt = (mode: 'merge' | 'replace') => {
    const seed = getSeedUsdtTransactions();
    onRestoreTransactions(seed, mode);
    setStatusMessage({
      type: 'success',
      text: `✅ Đã nạp thành công 28 giao dịch gốc Thu Chi USDT vào sổ cái!`,
    });
  };

  // 3. Khôi phục từ Google Sheet
  const handleRestoreFromGoogleSheet = async () => {
    if (!sheetsConfig.spreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'Chưa có liên kết với Google Sheet. Vui lòng vào tab "Google Sheets" để gắn link bảng tính trước.',
      });
      return;
    }

    setIsRestoringSheet(true);
    setStatusMessage(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Chưa đăng nhập Google. Vui lòng đăng nhập để đọc file Google Sheet.');
      }

      const txs = await fetchTransactionsFromSheet(token, sheetsConfig.spreadsheetId, accounts, categories);

      if (txs.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'Bảng tính Google Sheet hiện tại chưa có dữ liệu giao dịch ở tab "Sổ Giao Dịch".',
        });
        return;
      }

      onRestoreTransactions(txs, 'merge');
      setStatusMessage({
        type: 'success',
        text: `✅ ĐÃ KHÔI PHỤC THÀNH CÔNG! Đã đọc và nạp ${txs.length} giao dịch từ Google Sheet về sổ cái OmniFlow.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Lỗi đọc Google Sheet: ${err.message || 'Vui lòng kiểm tra quyền truy cập'}`,
      });
    } finally {
      setIsRestoringSheet(false);
    }
  };

  // 4. Khôi phục từ tệp / nội dung CSV
  const handleApplyCsv = (mode: 'merge' | 'replace') => {
    if (!csvContent.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng dán nội dung CSV hoặc chọn file' });
      return;
    }

    try {
      const parsed = parseCSVToTransactions(csvContent, accounts, categories);
      if (parsed.length === 0) {
        setStatusMessage({ type: 'error', text: 'Không tìm thấy dòng giao dịch hợp lệ trong nội dung CSV' });
        return;
      }

      onRestoreTransactions(parsed, mode);
      setStatusMessage({
        type: 'success',
        text: `✅ Đã nạp thành công ${parsed.length} giao dịch từ file CSV!`,
      });
      setCsvContent('');
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Lỗi đọc CSV: ${e.message}` });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Check if it is a JSON backup
      if (file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          let txsToRestore: Transaction[] = [];
          if (Array.isArray(parsed)) {
            txsToRestore = parsed;
          } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
            txsToRestore = parsed.transactions;
          }

          if (txsToRestore.length > 0) {
            onRestoreTransactions(txsToRestore, 'merge');
            setStatusMessage({
              type: 'success',
              text: `✅ Đã khôi phục thành công ${txsToRestore.length} giao dịch từ tệp sao lưu JSON "${file.name}"!`,
            });
            return;
          }
        } catch (jsonErr) {
          // not valid json, fall back to csv
        }
      }

      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  // 5. Xuất file sao lưu máy tính
  const handleExportSystemBackup = () => {
    try {
      const fullBackup = {
        exportedAt: new Date().toISOString(),
        transactionsCount: currentTransactions.length,
        transactions: currentTransactions,
        accounts,
        categories,
      };
      exportSystemBackupJSON(fullBackup);
      setStatusMessage({
        type: 'success',
        text: '✅ Đã tải tệp sao lưu dự phòng (JSON) về máy tính thành công! Bạn có thể lưu trữ tệp này để dùng bất cứ lúc nào.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất file: ${err.message}` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Trung Tâm Khôi Phục Lịch Sử Giao Dịch
              </h3>
              <p className="text-xs text-slate-400">
                Tìm lại các giao dịch cũ từ bộ nhớ máy tính, bản sao lưu, Google Sheet hoặc file đã lưu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-800/80 bg-slate-950/40 shrink-0 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('scan'); setStatusMessage(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Quét Bộ Nhớ Máy ({localBackups.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('usdt_seed'); setStatusMessage(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'usdt_seed'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>28 Giao Dịch Gốc USDT</span>
          </button>

          <button
            onClick={() => { setActiveTab('sheet'); setStatusMessage(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Kéo Từ Google Sheets</span>
          </button>

          <button
            onClick={() => { setActiveTab('csv'); setStatusMessage(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập / Xuất File Backup</span>
          </button>

          <button
            onClick={() => { setActiveTab('guide'); setStatusMessage(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tại Sao Mất Dữ Liệu?</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed whitespace-pre-line">{statusMessage.text}</div>
            </div>
          )}

          {/* TAB 1: Quét bộ nhớ máy */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Bản sao lưu & lịch sử tìm thấy trong trình duyệt này</h4>
                  <p className="text-[11px] text-slate-400">
                    Bao gồm các bản lưu tự động, bản lưu trữ trước khi khởi tạo quỹ và các phiên làm việc trước.
                  </p>
                </div>
                <button
                  onClick={handleScanLocal}
                  disabled={isScanning}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Quét lại</span>
                </button>
              </div>

              {localBackups.length === 0 ? (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <Database className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">Không tìm thấy bản lưu cũ nào trong trình duyệt hiện tại</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Nếu mấy hôm trước bạn điền trên <strong>link khác</strong> (ví dụ link dev / link share khác), trình duyệt khác hoặc máy tính khác, vui lòng xem tab <strong>&quot;Tại Sao Mất Dữ Liệu?&quot;</strong> để tìm lại link cũ hoặc dùng tab <strong>&quot;28 Giao Dịch Gốc USDT&quot;</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {localBackups.map((b, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-400 font-mono">{b.key}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            {b.count} giao dịch
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          Ví dụ: {b.transactions[0]?.description || b.transactions[0]?.categoryName || 'Không có mô tả'} ({b.transactions[0]?.date})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleApplyLocalBackup(b, 'merge')}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg shadow transition-colors cursor-pointer"
                        >
                          + Ghép Thêm Vào Sổ
                        </button>
                        <button
                          onClick={() => handleApplyLocalBackup(b, 'replace')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          title="Thay thế toàn bộ danh sách hiện tại bằng bản lưu này"
                        >
                          Khôi Phục Gốc
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Nạp lại 28 giao dịch gốc USDT */}
          {activeTab === 'usdt_seed' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-950/30 to-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-300">28 Bút Toán Thu Chi USDT Gốc Của Doanh Nghiệp</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bao gồm đầy đủ 28 giao dịch hạch toán thực tế: Nhận USDT doanh thu, bán USDT sang Techcombank VND, chi trả cổ tức bằng USDT... Đã được lưu sẵn trong hệ thống OmniFlow.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleApplySeedUsdt('merge')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    📥 Nạp 28 Giao Dịch Vào Sổ Cái
                  </button>
                  <button
                    onClick={() => handleApplySeedUsdt('replace')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Khởi Tạo Lại Toàn Bộ Sổ Bằng 28 Giao Dịch Này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Kéo từ Google Sheets */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Đồng bộ ngược từ bảng tính Google Sheet về OmniFlow</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nếu bạn đã lưu giao dịch trên Google Sheet, hệ thống có thể đọc toàn bộ các dòng trên file Sheet đó và nạp ngược lại vào OmniFlow.
                </p>

                {sheetsConfig.spreadsheetUrl ? (
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-300">
                      Bảng tính đang liên kết: <strong className="text-emerald-400">{sheetsConfig.spreadsheetName || 'Google Sheet'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      ID: {sheetsConfig.spreadsheetId}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400">
                    ⚠️ Bạn chưa liên kết với Google Sheet. Vui lòng vào tab &quot;Google Sheets&quot; để dán link file Sheet trước.
                  </div>
                )}

                <button
                  onClick={handleRestoreFromGoogleSheet}
                  disabled={isRestoringSheet || !sheetsConfig.spreadsheetId}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2"
                >
                  <ArrowDownToLine className={`w-3.5 h-3.5 ${isRestoringSheet ? 'animate-bounce' : ''}`} />
                  <span>{isRestoringSheet ? 'Đang đọc dữ liệu từ Sheet...' : 'Kéo Toàn Bộ Giao Dịch Từ Sheet Về Sổ Cái'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Nhập / Xuất file backup (JSON & CSV) */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              {/* Xuất file JSON */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Xuất tệp sao lưu dữ liệu (.JSON) về máy</h4>
                  <p className="text-[11px] text-slate-400">
                    Tải về tệp sao lưu toàn diện chứa sổ giao dịch ({currentTransactions.length} mục), quỹ, hạng mục để lưu trữ vĩnh viễn trên máy tính.
                  </p>
                </div>
                <button
                  onClick={handleExportSystemBackup}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải File Sao Lưu (.JSON)</span>
                </button>
              </div>

              {/* Nhập file JSON / CSV */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">Nhập file sao lưu (.JSON) hoặc file bảng tính (.CSV):</label>
                  <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span>Chọn file từ máy</span>
                    <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  placeholder="Dán nội dung JSON sao lưu hoặc các dòng CSV vào đây để nạp..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyCsv('merge')}
                  disabled={!csvContent.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                >
                  + Ghép Thêm Giao Dịch Vào Sổ
                </button>
                <button
                  onClick={() => handleApplyCsv('replace')}
                  disabled={!csvContent.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                >
                  Ghi Đè Toàn Bộ Sổ Bằng Dữ Liệu Này
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Hướng dẫn tìm lại link cũ */}
          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Tại sao mấy hôm trước điền dữ liệu mà hôm nay vào không thấy?
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Có 3 nguyên nhân phổ biến nhất:
                </p>
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-white block font-semibold">1. Bạn từng vào một đường link khác (Link Dev vs Link Share)</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      AI Studio có 2 đường link: Link môi trường phát triển (<code>ais-dev-...</code>) và Link chia sẻ (<code>ais-pre-...</code>). Trình duyệt lưu dữ liệu riêng biệt cho từng đường link. Nếu mấy hôm trước bạn điền trên link dev hoặc ngược lại, dữ liệu vẫn đang nằm nguyên ở link đó!
                    </p>
                    <p className="text-emerald-400 text-[11px] pt-1">
                      👉 <strong>Cách xử lý:</strong> Mở Lịch sử trình duyệt (bấm <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Ctrl + H</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Cmd + Y</kbd>), gõ tìm <code>run.app</code> hoặc <code>Trina</code> để mở lại đúng link bạn đã nhập trước đó. Sau đó bấm <strong>Xuất File Backup (.JSON)</strong> và nạp sang link mới này!
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-white block font-semibold">2. Bạn đã ấn nút &quot;Khởi tạo Quỹ Thực Tế&quot;</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Nút này có chức năng đưa số dư tiền mặt về mốc thực tế ban đầu (140 triệu VND và 62.718 USDT), nên hệ thống dọn dẹp các giao dịch cũ để bắt đầu sổ cái mới.
                    </p>
                    <p className="text-emerald-400 text-[11px] pt-1">
                      👉 <strong>Cách xử lý:</strong> Vào tab <strong>&quot;Quét Bộ Nhớ Máy&quot;</strong> ở trên, chọn mục <code>omniflow_history_archive</code> hoặc <code>omniflow_transactions_backup</code> và ấn <strong>&quot;+ Ghép Thêm Vào Sổ&quot;</strong> để lấy lại toàn bộ!
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-white block font-semibold">3. Sử dụng trình duyệt ẩn danh (Incognito) hoặc xóa lịch sử duyệt web</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Khi tắt cửa sổ ẩn danh, trình duyệt sẽ xóa toàn bộ bộ nhớ tạm.
                    </p>
                    <p className="text-emerald-400 text-[11px] pt-1">
                      👉 <strong>Cách xử lý:</strong> Sử dụng tab <strong>&quot;28 Giao Dịch Gốc USDT&quot;</strong> hoặc tab <strong>&quot;Kéo Từ Google Sheets&quot;</strong> để phục hồi ngay lập tức chỉ với 1 cú click!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Hiện có <strong>{currentTransactions.length}</strong> giao dịch đang hiển thị trong sổ cái.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
