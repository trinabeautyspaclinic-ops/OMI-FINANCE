import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Clock, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  SyncLogEntry, 
  getSyncLogs, 
  clearSyncLogs, 
  getLocalSheetsConfig, 
  GoogleSheetsSyncConfig,
  syncAllTransactionsToSheet,
  syncAccountsToSheet
} from '../services/googleSheetsSync';
import { getAccessToken, googleSignIn } from '../services/firebase';
import { AccountWallet, ExchangeRate, Transaction } from '../types/cashflow';

interface SyncLogsViewProps {
  transactions: Transaction[];
  accounts: AccountWallet[];
  rates: ExchangeRate[];
  cloudSheetsConfig?: GoogleSheetsSyncConfig | null;
  onNavigateToSheetsGuide?: () => void;
}

export const SyncLogsView: React.FC<SyncLogsViewProps> = ({
  transactions,
  accounts,
  rates,
  cloudSheetsConfig,
  onNavigateToSheetsGuide
}) => {
  const [logs, setLogs] = useState<SyncLogEntry[]>(() => getSyncLogs());
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error' | 'warning'>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sheetsConfig = cloudSheetsConfig?.spreadsheetId ? cloudSheetsConfig : getLocalSheetsConfig();

  const refreshLogs = () => {
    setLogs(getSyncLogs());
  };

  useEffect(() => {
    refreshLogs();

    const handleSyncLogUpdated = () => {
      refreshLogs();
    };

    window.addEventListener('omniflow_sync_logs_updated', handleSyncLogUpdated);
    window.addEventListener('storage', handleSyncLogUpdated);
    return () => {
      window.removeEventListener('omniflow_sync_logs_updated', handleSyncLogUpdated);
      window.removeEventListener('storage', handleSyncLogUpdated);
    };
  }, []);

  const handleClearLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử ghi log đồng bộ này không?')) {
      clearSyncLogs();
      setLogs([]);
      setToastMessage({ type: 'success', text: 'Đã dọn sạch nhật ký đồng bộ' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleManualFullSync = async () => {
    if (!sheetsConfig.spreadsheetId) {
      setToastMessage({ type: 'error', text: 'Chưa cấu hình link Google Sheet. Vui lòng vào tab Google Sheets để liên kết trước.' });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsRetrying(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Chưa đăng nhập tài khoản Google');
      }

      await syncAllTransactionsToSheet(token, sheetsConfig.spreadsheetId, transactions);
      await syncAccountsToSheet(token, sheetsConfig.spreadsheetId, accounts, transactions, rates);
      refreshLogs();
      setToastMessage({ type: 'success', text: `✅ Đã đồng bộ thành công ${transactions.length} giao dịch và ${accounts.length} quỹ nguồn sang Google Sheet!` });
    } catch (err: any) {
      console.warn('Lỗi đồng bộ thủ công:', err);
      refreshLogs();
      setToastMessage({ type: 'error', text: `Lỗi đồng bộ: ${err.message || 'Không thể ghi vào Google Sheet'}` });
    } finally {
      setIsRetrying(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchLabel = log.actionLabel.toLowerCase().includes(q);
      const matchErr = (log.errorDetails || '').toLowerCase().includes(q);
      if (!matchMsg && !matchLabel && !matchErr) return false;
    }
    return true;
  });

  const totalLogs = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;
  const warningCount = logs.filter(l => l.status === 'warning').length;
  const successRate = totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 100;

  const formatLogTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Quick Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Theo Dõi Thời Gian Thực (Sync Audit Logs)</span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Lịch Sử Đồng Bộ Google Sheets
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Kiểm tra trạng thái từng thao tác lưu giao dịch, cập nhật số dư các quỹ hoặc ghi chú lỗi (hết hạn token, quyền truy cập) giúp bạn an tâm 100% về tính toàn vẹn của dữ liệu trên Google Sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleManualFullSync}
              disabled={isRetrying || !sheetsConfig.spreadsheetId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Đồng bộ lại toàn bộ giao dịch & số dư quỹ sang Google Sheet ngay"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Đang đồng bộ...' : 'Đồng Bộ Lại Toàn Bộ'}</span>
            </button>

            {sheetsConfig.spreadsheetUrl && (
              <a
                href={sheetsConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Mở Google Sheets</span>
              </a>
            )}

            <button
              onClick={refreshLogs}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Làm mới danh sách log"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-800/80 transition-colors cursor-pointer"
                title="Xóa lịch sử log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Tổng Lượt Ghi Nhận</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {totalLogs} <span className="text-xs text-slate-500 font-normal">lần</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[11px] text-emerald-400 block font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Thành Công
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {successCount} <span className="text-xs text-slate-500 font-normal">({successRate}%)</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[11px] text-rose-400 block font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Thất Bại / Lỗi
            </span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {errorCount + warningCount} <span className="text-xs text-slate-500 font-normal">lần</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Trạng Thái Kết Nối</span>
            <div className="text-xs font-bold text-white mt-2 truncate flex items-center gap-1.5">
              {sheetsConfig.spreadsheetId ? (
                <span className="text-emerald-400 flex items-center gap-1 truncate font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">{sheetsConfig.spreadsheetName || 'Đã liên kết'}</span>
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">Chưa gắn link Sheet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả ({totalLogs})
            </button>
            <button
              onClick={() => setFilterStatus('success')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Thành công ({successCount})
            </button>
            <button
              onClick={() => setFilterStatus('error')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === 'error' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Lỗi ({errorCount})
            </button>
            {warningCount > 0 && (
              <button
                onClick={() => setFilterStatus('warning')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filterStatus === 'warning' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                Cảnh báo ({warningCount})
              </button>
            )}
          </div>

          {/* Action filter */}
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-slate-700"
          >
            <option value="all">Tất cả hành động</option>
            <option value="single_tx">Thêm / Ghi giao dịch</option>
            <option value="bulk_sync">Đồng bộ toàn bộ sổ cái</option>
            <option value="accounts_sync">Cập nhật số dư các quỹ</option>
            <option value="fetch_sheet">Đọc dữ liệu từ Sheet</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung log..."
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-slate-700"
          />
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-300">
              {logs.length === 0 ? 'Chưa có nhật ký đồng bộ nào được ghi nhận' : 'Không tìm thấy log phù hợp với bộ lọc'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {logs.length === 0 
                ? 'Khi bạn tạo giao dịch mới hoặc bấm "Đồng Bộ Lại Toàn Bộ", hệ thống sẽ tự động ghi lại lịch sử trạng thái tại đây.'
                : 'Thử đổi từ khóa tìm kiếm hoặc bấm "Tất cả" để xem toàn bộ lịch sử.'}
            </p>
            {logs.length === 0 && sheetsConfig.spreadsheetId && (
              <button
                onClick={handleManualFullSync}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thực Hiện Đồng Bộ Lần Đầu Ngay</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map(log => {
              const isSuccess = log.status === 'success';
              const isWarning = log.status === 'warning';
              const isError = log.status === 'error';

              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status icon badge */}
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isSuccess 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : isWarning ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>

                    {/* Main content */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.actionLabel}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          {formatLogTime(log.timestamp)}
                        </span>

                        {log.itemCount !== undefined && log.itemCount > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {log.itemCount} bản ghi
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {log.message}
                      </p>

                      {/* Error details if any */}
                      {log.errorDetails && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300 font-mono break-all leading-normal">
                          <span className="font-bold text-rose-400">Chi tiết lỗi: </span>
                          {log.errorDetails}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side info / action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 text-right gap-1.5">
                    <span className={`text-[11px] font-bold ${
                      isSuccess ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {isSuccess ? 'Thành công' : isWarning ? 'Cảnh báo' : 'Thất bại'}
                    </span>

                    {isError && (
                      <button
                        onClick={handleManualFullSync}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Thử lại</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful Guide / FAQ Footer */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cách xử lý khi gặp lỗi đồng bộ Google Sheets:</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1 leading-relaxed">
          <li><strong>Lỗi 401 (Hết hạn phiên):</strong> Token bảo mật của Google hết hạn sau 1 giờ. Bạn chỉ cần bấm <em>"Cấp quyền Google"</em> hoặc <em>"Đăng nhập lại"</em> ở tab Google Sheets để cấp mới token.</li>
          <li><strong>Lỗi 403 (Từ chối quyền):</strong> Mở file Google Sheets trên Google Drive, bấm nút <strong>Chia sẻ (Share)</strong> và bảo đảm tài khoản Google của bạn có quyền <strong>Người chỉnh sửa (Editor)</strong>.</li>
          <li><strong>Tự động khôi phục:</strong> Mỗi khi bấm <em>"Đồng Bộ Lại Toàn Bộ"</em>, hệ thống sẽ tự động tạo/sắp xếp lại 2 tab <code>Sổ Giao Dịch</code> và <code>Danh Mục Quỹ & Số Dư</code> trên file Sheet và đẩy toàn bộ dữ liệu mới nhất sang.</li>
        </ul>
      </div>
    </div>
  );
};
