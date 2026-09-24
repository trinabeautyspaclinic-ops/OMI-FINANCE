import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Scale, 
  Plus, 
  Layers
} from 'lucide-react';
import { AccountWallet, ExchangeRate, TimeFilterPeriod, Transaction } from '../types/cashflow';
import { calculateAccountBalances, calculateCashFlowSummary, formatMoney } from '../utils/cashflowCalculations';

interface SummaryCardsProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  accounts: AccountWallet[];
  rates: ExchangeRate[];
  selectedPeriod: TimeFilterPeriod;
  setSelectedPeriod: (period: TimeFilterPeriod) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  onOpenNewTransaction: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  transactions,
  filteredTransactions,
  accounts,
  rates,
  selectedPeriod,
  setSelectedPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onOpenNewTransaction,
}) => {
  const summary = calculateCashFlowSummary(filteredTransactions);
  // Số dư các quỹ hiện tại luôn tính trên toàn bộ các giao dịch thực tế đã ghi nhận
  const balances = calculateAccountBalances(accounts, transactions, rates);

  // Tổng tài sản thanh khoản hợp nhất (VND)
  const totalAssetsVND = Object.values(balances).reduce((sum, b) => sum + b.balanceVND, 0);

  const periods: { id: TimeFilterPeriod; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày qua' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
    { id: 'all', label: 'Toàn bộ' },
  ];

  // Chi phí chi tiết theo từng tiểu mục (top 6 khoản chi lớn nhất)
  const topOutflowItems = Object.entries(summary.outflowByCategory)
    .sort((a, b) => b[1].amountVND - a[1].amountVND)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Time Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedPeriod === p.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
            </div>
          )}

          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thu / Chi Mới</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng Tiền Vào */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Tiền Vào (Inflow)</span>
            <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              +{formatMoney(summary.totalInflowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Từ các cơ sở, online & quốc tế
            </div>
          </div>
        </div>

        {/* Card 2: Tổng Tiền Ra */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Tiền Ra (Outflow)</span>
            <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
              -{formatMoney(summary.totalOutflowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Ads, vận hành, mặt bằng & giá vốn
            </div>
          </div>
        </div>

        {/* Card 3: Dòng Tiền Thuần */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Dòng Tiền Thuần (Net)</span>
            <div className="w-6 h-6 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className={`text-xl font-bold font-mono tabular-nums ${summary.netCashFlowVND >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {summary.netCashFlowVND >= 0 ? '+' : ''}{formatMoney(summary.netCashFlowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Cơ sở tính toán chia cổ tức
            </div>
          </div>
        </div>

        {/* Card 4: Tổng Tài Sản Hợp Nhất */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Số Dư Tất Cả Quỹ ({accounts.length})</span>
            <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
              {formatMoney(totalAssetsVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Quy đổi toàn bộ ngoại tệ về VND
            </div>
          </div>
        </div>
      </div>

      {/* Bóc Tách Chi Tiết: Chi Phí Ads Từng Ngân Hàng & Top Khoản Chi Nhỏ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cột 1: Bóc tách Chi phí Ads theo Kênh / Ngân Hàng */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bóc Tách Chi Phí Ads Theo Kênh & Thẻ Ngân Hàng
              </h3>
            </div>
            <span className="text-[11px] font-mono text-rose-400 font-bold">
              {formatMoney(
                Object.values(summary.adsByAccount).reduce((s, v) => s + v, 0),
                'VND'
              )}
            </span>
          </div>

          <div className="space-y-2">
            {Object.keys(summary.adsByAccount).length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Chưa có chi phí Ads phát sinh trong kỳ này.
              </div>
            ) : (
              Object.entries(summary.adsByAccount).map(([accName, amount]) => {
                const totalAds = Object.values(summary.adsByAccount).reduce((s, v) => s + v, 0);
                const percent = totalAds > 0 ? ((amount / totalAds) * 100).toFixed(1) : '0';

                return (
                  <div key={accName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{accName}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{percent}%</span>
                        <span className="font-bold text-rose-400">{formatMoney(amount, 'VND')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột 2: Top Các Khoản Chi Đã Bóc Tách Nhỏ */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Top Khoản Chi Tiết Đã Phân Tách
            </h3>
            <span className="text-[11px] text-slate-500">Đơn vị: VNĐ</span>
          </div>

          <div className="space-y-2">
            {topOutflowItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Không có dữ liệu chi tiêu trong kỳ.
              </div>
            ) : (
              topOutflowItems.map(([catName, data]) => (
                <div
                  key={catName}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
                >
                  <span className="font-medium text-slate-300 truncate max-w-[260px]">
                    {catName}
                  </span>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-[10px] text-slate-500">{data.count} lần</span>
                    <span className="font-bold text-rose-400">{formatMoney(data.amountVND, 'VND')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
