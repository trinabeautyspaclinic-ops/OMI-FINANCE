import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  BellRing, 
  Users, 
  FileSpreadsheet, 
  Plus, 
  ArrowRightLeft,
  Download,
  Cloud,
  CheckCircle2,
  FolderTree
} from 'lucide-react';
import { Transaction } from '../types/cashflow';
import { exportTransactionsToCSV } from '../utils/exportUtils';

interface HeaderProps {
  activeTab: 'dashboard' | 'transactions' | 'funds' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'funds' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide') => void;
  onOpenNewTransaction: () => void;
  onOpenTransferModal: () => void;
  transactions: Transaction[];
  alertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  onOpenTransferModal,
  transactions,
  alertCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand & Cloud Status */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-sm">
                OF
              </div>
              <div>
                <span className="font-bold text-white text-sm tracking-tight block">OmniFlow</span>
                <span className="text-[10px] text-slate-400 font-mono -mt-1 block">Dòng Tiền Đa Quỹ</span>
              </div>
            </div>

            {/* Cloud Auto-Sync Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3 h-3" />
              <span>Đồng bộ Đám mây (Realtime)</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Tổng Quan</span>
              </button>

              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'transactions'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>Sổ Giao Dịch</span>
              </button>

              <button
                onClick={() => setActiveTab('funds')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'funds'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Quản Lý Quỹ</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'categories'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sửa tay tên giao dịch thu/chi, thêm bớt hạng mục"
              >
                <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tên Giao Dịch & Hạng Mục</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium relative ${
                  activeTab === 'alerts'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Cảnh Báo</span>
                {alertCount > 0 && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                    {alertCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('dividends')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'dividends'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Chia Cổ Tức</span>
              </button>

              <button
                onClick={() => setActiveTab('sheets_guide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeTab === 'sheets_guide'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lưu Google Sheets</span>
              </button>
            </nav>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTransferModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              title="Chuyển tiền giữa các quỹ"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chuyển Quỹ</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Giao Dịch</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-800/80 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            Tổng Quan
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'transactions' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            Sổ Giao Dịch
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'funds' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            Quản Lý Quỹ
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'categories' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400'}`}
          >
            Tên Giao Dịch
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${activeTab === 'alerts' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            <span>Cảnh Báo</span>
            {alertCount > 0 && <span className="text-[10px] text-rose-400 font-bold">({alertCount})</span>}
          </button>
          <button
            onClick={() => setActiveTab('dividends')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'dividends' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            Cổ Tức
          </button>
          <button
            onClick={() => setActiveTab('sheets_guide')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'sheets_guide' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400'}`}
          >
            Lưu Google Sheets
          </button>
        </div>
      </div>
    </header>
  );
};
