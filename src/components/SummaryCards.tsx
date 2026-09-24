import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Scale, 
  Plus, 
  Layers,
  ArrowRight,
  Coins,
  DollarSign,
  Building2,
  Calendar
} from 'lucide-react';
import { AccountWallet, Currency, ExchangeRate, TimeFilterPeriod, Transaction } from '../types/cashflow';
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
  onNavigateToFunds?: () => void;
  onNavigateToAllocation?: () => void;
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
  onNavigateToFunds,
  onNavigateToAllocation
}) => {
  const summary = calculateCashFlowSummary(filteredTransactions);
  const balances = calculateAccountBalances(accounts, transactions, rates);

  // Tổng hợp số dư còn lại theo từng loại đồng tiền (TIỀN CÁC LOẠI CÒN BAO NHIÊU)
  const currencyRemainingTotals: Record<Currency, { originalTotal: number; vndTotal: number; count: number }> = {
    VND: { originalTotal: 0, vndTotal: 0, count: 0 },
    USDT: { originalTotal: 0, vndTotal: 0, count: 0 },
    USD: { originalTotal: 0, vndTotal: 0, count: 0 },
    AED: { originalTotal: 0, vndTotal: 0, count: 0 },
    EUR: { originalTotal: 0, vndTotal: 0, count: 0 },
  };

  accounts.forEach(acc => {
    const bal = balances[acc.id] || { currentBalance: acc.initialBalance, balanceVND: 0 };
    if (currencyRemainingTotals[acc.currency]) {
      currencyRemainingTotals[acc.currency].originalTotal += bal.currentBalance;
      currencyRemainingTotals[acc.currency].vndTotal += bal.balanceVND;
      currencyRemainingTotals[acc.currency].count += 1;
    }
  });

  // Tổng tài sản thanh khoản hợp nhất (Quy đổi toàn bộ ra VND)
  const totalAssetsVND = Object.values(balances).reduce((sum, b) => sum + b.balanceVND, 0);

  const periods: { id: TimeFilterPeriod; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
    { id: 'all', label: 'Toàn bộ' },
  ];

  return (
    <div className="space-y-6">
      {/* KHỐI ĐẦU TIÊN CỦA TỔNG QUAN: "TIỀN CÁC LOẠI CÒN BAO NHIÊU" */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Số dư thanh khoản tức thì</span>
              <span className="text-xs font-medium text-slate-500">· Realtime</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              TIỀN CÁC LOẠI CÒN LẠI HIỆN TẠI (Số Dư Thực Tế)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Tổng tài sản hợp nhất (VND)</span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {formatMoney(totalAssetsVND, 'VND')}
              </span>
            </div>
            {onNavigateToFunds && (
              <button
                onClick={onNavigateToFunds}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl transition-colors shrink-0"
              >
                Chi tiết quỹ →
              </button>
            )}
          </div>
        </div>

        {/* 4 Cards chi tiết số dư các loại tiền: VND, USDT, USD, AED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {/* 1. Tiền mặt & Ngân hàng VND */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiền VND (Két & Ngân hàng)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                {currencyRemainingTotals['VND'].count} quỹ
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {formatMoney(currencyRemainingTotals['VND'].originalTotal, 'VND')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Khả dụng ngay cho chi tiêu & vận hành
              </div>
            </div>
          </div>

          {/* 2. Tiền USDT / Crypto */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiền USDT (Ví Crypto)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                {currencyRemainingTotals['USDT'].count} ví
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {formatMoney(currencyRemainingTotals['USDT'].originalTotal, 'USDT')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                ≈ {formatMoney(currencyRemainingTotals['USDT'].vndTotal, 'VND')}
              </div>
            </div>
          </div>

          {/* 3. Tiền USD (Quốc tế) */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiền USD (Ngoại tệ)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                {currencyRemainingTotals['USD'].count} tài khoản
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {formatMoney(currencyRemainingTotals['USD'].originalTotal, 'USD')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                ≈ {formatMoney(currencyRemainingTotals['USD'].vndTotal, 'VND')}
              </div>
            </div>
          </div>

          {/* 4. Tiền AED (Dubai / Trung Đông) */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tiền AED (Dubai)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                {currencyRemainingTotals['AED'].count} tài khoản
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {formatMoney(currencyRemainingTotals['AED'].originalTotal, 'AED')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                ≈ {formatMoney(currencyRemainingTotals['AED'].vndTotal, 'VND')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG THỜI GIAN & TẠO GIAO DỊCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Kỳ báo cáo:</span>
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                selectedPeriod === p.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-mono"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
          )}

          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thu / Chi Mới</span>
          </button>
        </div>
      </div>

      {/* 3 THẺ HIỆU SUẤT TRONG KỲ: TỔNG THU, TỔNG CHI, DÒNG TIỀN THUẦN (NET) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Thu vào */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng Tiền Thu Vào (Inflow)</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              +{formatMoney(summary.totalInflowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Doanh thu từ các kênh, khách hàng & đối tác
            </div>
          </div>
        </div>

        {/* Chi ra */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng Tiền Chi Ra (Outflow)</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              -{formatMoney(summary.totalOutflowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Chi phí Ads, vận hành, mặt bằng & chi cổ tức
            </div>
          </div>
        </div>

        {/* Dòng tiền thuần */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dòng Tiền Thuần (Net Cash Flow)</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono tracking-tight ${summary.netCashFlowVND >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.netCashFlowVND >= 0 ? '+' : ''}{formatMoney(summary.netCashFlowVND, 'VND')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {summary.netCashFlowVND >= 0 ? 'Thặng dư dòng tiền trong kỳ' : 'Dòng tiền thâm hụt trong kỳ'}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK PREVIEW PHÂN BỔ DÒNG TIỀN VÀ NÚT XEM CHI TIẾT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Phân bổ Ads theo tài khoản ngân hàng */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Chi Phí Ads Theo Kênh / Thẻ Ngân Hàng
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatMoney(
                Object.values(summary.adsByAccount).reduce((s, v) => s + v, 0),
                'VND'
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.keys(summary.adsByAccount).length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Chưa phát sinh chi phí Ads trong kỳ này.
              </div>
            ) : (
              Object.entries(summary.adsByAccount).map(([accName, amount]) => {
                const totalAds = Object.values(summary.adsByAccount).reduce((s, v) => s + v, 0);
                const percent = totalAds > 0 ? ((amount / totalAds) * 100).toFixed(1) : '0';

                return (
                  <div key={accName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{accName}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{percent}%</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          -{formatMoney(amount, 'VND')}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
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

        {/* Top 5 khoản chi lớn nhất & Link sang Phân Bổ Dòng Tiền */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Top Hạng Mục Chi Nhiều Nhất
            </h3>
            {onNavigateToAllocation && (
              <button
                onClick={onNavigateToAllocation}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-white hover:underline"
              >
                <span>Xem tất cả phân bổ</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {Object.keys(summary.outflowByCategory).length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Chưa có dữ liệu chi tiêu trong kỳ này.
              </div>
            ) : (
              Object.entries(summary.outflowByCategory)
                .sort((a, b) => b[1].amountVND - a[1].amountVND)
                .slice(0, 5)
                .map(([catName, item]) => {
                  const percent = summary.totalOutflowVND > 0 
                    ? ((item.amountVND / summary.totalOutflowVND) * 100).toFixed(1)
                    : '0';

                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                          {catName}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 text-[11px]">{percent}%</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            -{formatMoney(item.amountVND, 'VND')}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-400 dark:bg-slate-600 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
