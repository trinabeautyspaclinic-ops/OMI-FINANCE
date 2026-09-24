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
  Cloud,
  PieChart,
  FolderTree
} from 'lucide-react';
import { Transaction } from '../types/cashflow';

interface HeaderProps {
  activeTab: 'dashboard' | 'transactions' | 'funds' | 'allocation' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'funds' | 'allocation' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide') => void;
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
  alertCount,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand & Status */}
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-950 font-bold text-xs tracking-wider shadow-xs transition-transform group-hover:scale-105">
                TF
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight block">
                  Trina Finance
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Hệ Thống Dòng Tiền & Cổ Tức
                </span>
              </div>
            </div>

            {/* Cloud Realtime Status subtle indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium">Đồng bộ Đám mây</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            <nav className="flex items-center gap-0.5 text-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Tổng Quan</span>
              </button>

              <button
                onClick={() => setActiveTab('allocation')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'allocation'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Phân Bổ Thu & Chi</span>
              </button>

              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'transactions'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>Sổ Giao Dịch</span>
              </button>

              <button
                onClick={() => setActiveTab('funds')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'funds'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Quản Lý Quỹ</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'categories'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Hạng Mục</span>
              </button>

              <button
                onClick={() => setActiveTab('dividends')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'dividends'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cổ Tức</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium relative ${
                  activeTab === 'alerts'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Cảnh Báo</span>
                {alertCount > 0 && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                    {alertCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('sheets_guide')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-medium ${
                  activeTab === 'sheets_guide'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </button>
            </nav>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTransferModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/80 dark:border-slate-700"
              title="Chuyển tiền giữa các quỹ"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Chuyển Quỹ</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thu / Chi Mới</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 border-t border-slate-100 dark:border-slate-800 gap-1 text-xs">
          {[
            { id: 'dashboard', label: 'Tổng Quan' },
            { id: 'allocation', label: 'Phân Bổ Thu Chi' },
            { id: 'transactions', label: 'Sổ Giao Dịch' },
            { id: 'funds', label: 'Quản Lý Quỹ' },
            { id: 'categories', label: 'Hạng Mục' },
            { id: 'dividends', label: 'Cổ Tức' },
            { id: 'alerts', label: `Cảnh Báo ${alertCount > 0 ? `(${alertCount})` : ''}` },
            { id: 'sheets_guide', label: 'Google Sheets' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold'
                  : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
