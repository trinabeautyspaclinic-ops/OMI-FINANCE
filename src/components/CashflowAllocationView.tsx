import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Calendar, 
  Filter, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Wallet
} from 'lucide-react';
import { AccountWallet, Category, Currency, ExchangeRate, TimeFilterPeriod, Transaction } from '../types/cashflow';
import { calculateAccountBalances, calculateCashFlowSummary, formatMoney } from '../utils/cashflowCalculations';

interface CashflowAllocationViewProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  accounts: AccountWallet[];
  categories: Category[];
  rates: ExchangeRate[];
  selectedPeriod: TimeFilterPeriod;
  setSelectedPeriod: (period: TimeFilterPeriod) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  onOpenNewTransaction: () => void;
}

export const CashflowAllocationView: React.FC<CashflowAllocationViewProps> = ({
  transactions,
  filteredTransactions,
  accounts,
  categories,
  rates,
  selectedPeriod,
  setSelectedPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onOpenNewTransaction
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'both' | 'outflow' | 'inflow'>('both');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | 'ALL'>('ALL');

  // Filter transactions by currency if selected
  const activeTxList = filteredTransactions.filter(tx => {
    if (selectedCurrency === 'ALL') return true;
    return tx.originalCurrency === selectedCurrency;
  });

  const summary = calculateCashFlowSummary(activeTxList);

  // Bóc tách THU theo nhóm danh mục
  const inflowByCat = summary.inflowByCategory;
  const totalInflowVND = summary.totalInflowVND;

  // Bóc tách CHI theo nhóm danh mục
  const outflowByCat = summary.outflowByCategory;
  const totalOutflowVND = summary.totalOutflowVND;

  // Sắp xếp giảm dần theo số tiền
  const sortedOutflow = Object.entries(outflowByCat).sort((a, b) => b[1].amountVND - a[1].amountVND);
  const sortedInflow = Object.entries(inflowByCat).sort((a, b) => b[1].amountVND - a[1].amountVND);

  // Phân bổ Dòng tiền theo Đồng Tiền (VND, USDT, USD, AED...)
  const currencyStats: Record<Currency, { inflowOriginal: number; outflowOriginal: number; inflowVND: number; outflowVND: number }> = {
    VND: { inflowOriginal: 0, outflowOriginal: 0, inflowVND: 0, outflowVND: 0 },
    USDT: { inflowOriginal: 0, outflowOriginal: 0, inflowVND: 0, outflowVND: 0 },
    USD: { inflowOriginal: 0, outflowOriginal: 0, inflowVND: 0, outflowVND: 0 },
    AED: { inflowOriginal: 0, outflowOriginal: 0, inflowVND: 0, outflowVND: 0 },
    EUR: { inflowOriginal: 0, outflowOriginal: 0, inflowVND: 0, outflowVND: 0 },
  };

  filteredTransactions.forEach(tx => {
    const c = tx.originalCurrency;
    if (currencyStats[c]) {
      if (tx.type === 'inflow') {
        currencyStats[c].inflowOriginal += tx.originalAmount;
        currencyStats[c].inflowVND += tx.amountVND;
      } else if (tx.type === 'outflow' || tx.type === 'dividend_payout') {
        currencyStats[c].outflowOriginal += tx.originalAmount;
        currencyStats[c].outflowVND += tx.amountVND;
      }
    }
  });

  // Phân bổ CHI theo Quỹ nguồn xuất phát (Thẻ nào, Két nào chi bao nhiêu)
  const outflowByAccount: Record<string, { name: string; currency: Currency; originalAmount: number; amountVND: number }> = {};
  filteredTransactions
    .filter(t => t.type === 'outflow' || t.type === 'dividend_payout')
    .forEach(t => {
      if (!outflowByAccount[t.accountId]) {
        outflowByAccount[t.accountId] = {
          name: t.accountName,
          currency: t.originalCurrency,
          originalAmount: 0,
          amountVND: 0,
        };
      }
      outflowByAccount[t.accountId].originalAmount += t.originalAmount;
      outflowByAccount[t.accountId].amountVND += t.amountVND;
    });

  const sortedOutflowByAccount = Object.values(outflowByAccount).sort((a, b) => b.amountVND - a.amountVND);

  const periods: { id: TimeFilterPeriod; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày qua' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
    { id: 'all', label: 'Toàn kỳ' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter & Period Control */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Báo cáo phân tích</span>
            <span className="text-xs font-medium text-slate-500">· Tỷ trọng dòng tiền</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Phân Bổ Dòng Tiền Thu & Chi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bóc tách minh bạch từng đồng thu về và chi ra theo danh mục, kênh thanh toán và loại tiền tệ.
          </p>
        </div>

        {/* Currency & Subtab Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chọn đồng tiền hiển thị */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-mono">
            {(['ALL', 'VND', 'USDT', 'USD', 'AED'] as const).map(curr => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedCurrency === curr
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Chọn tab xem */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveSubTab('both')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeSubTab === 'both' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Cả Thu & Chi
            </button>
            <button
              onClick={() => setActiveSubTab('outflow')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeSubTab === 'outflow' ? 'bg-rose-500 text-white font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Phân Bổ Chi
            </button>
            <button
              onClick={() => setActiveSubTab('inflow')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeSubTab === 'inflow' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Phân Bổ Thu
            </button>
          </div>
        </div>
      </div>

      {/* Time Period Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium mr-1.5">Kỳ xem:</span>
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPeriod(p.id)}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedPeriod === p.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* TỔNG QUAN PHÂN BỔ THEO ĐỒNG TIỀN (VND vs USDT vs Ngoại tệ) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Dòng Tiền Thu & Chi Theo Từng Loại Tiền Tệ
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Quy đổi tất cả về VND để so sánh
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(['VND', 'USDT', 'USD', 'AED'] as Currency[]).map(curr => {
            const data = currencyStats[curr];
            const netVND = data.inflowVND - data.outflowVND;

            return (
              <div key={curr} className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    {curr}
                  </span>
                  <span className={`text-[11px] font-mono font-bold ${netVND >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Net: {netVND >= 0 ? '+' : ''}{formatMoney(netVND, 'VND')}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thu vào:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(data.inflowOriginal, curr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chi ra:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatMoney(data.outflowOriginal, curr)}
                    </span>
                  </div>
                  {curr !== 'VND' && (
                    <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                      ≈ Thu {formatMoney(data.inflowVND, 'VND')} · Chi {formatMoney(data.outflowVND, 'VND')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHI TIẾT PHÂN BỔ THU & CHI THEO HẠNG MỤC */}
      <div className={`grid grid-cols-1 ${activeSubTab === 'both' ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-5`}>
        {/* BẢNG PHÂN BỔ CHI RA (OUTFLOW) */}
        {(activeSubTab === 'both' || activeSubTab === 'outflow') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Phân Bổ Dòng Tiền CHI Ra
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                Tổng: -{formatMoney(totalOutflowVND, 'VND')}
              </span>
            </div>

            {sortedOutflow.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có dữ liệu chi trong kỳ đã chọn.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOutflow.map(([catName, item]) => {
                  const percent = totalOutflowVND > 0 ? (item.amountVND / totalOutflowVND) * 100 : 0;

                  return (
                    <div key={catName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                          {catName}
                        </span>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-slate-400 font-medium">{percent.toFixed(1)}%</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            -{formatMoney(item.amountVND, 'VND')}
                          </span>
                        </div>
                      </div>

                      {/* Thanh phân bổ progress bar tinh tế */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BẢNG PHÂN BỔ THU VÀO (INFLOW) */}
        {(activeSubTab === 'both' || activeSubTab === 'inflow') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Phân Bổ Dòng Tiền THU Vào
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Tổng: +{formatMoney(totalInflowVND, 'VND')}
              </span>
            </div>

            {sortedInflow.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có dữ liệu thu trong kỳ đã chọn.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedInflow.map(([catName, item]) => {
                  const percent = totalInflowVND > 0 ? (item.amountVND / totalInflowVND) * 100 : 0;

                  return (
                    <div key={catName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                          {catName}
                        </span>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-slate-400 font-medium">{percent.toFixed(1)}%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatMoney(item.amountVND, 'VND')}
                          </span>
                        </div>
                      </div>

                      {/* Thanh phân bổ progress bar tinh tế */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BÓC TÁCH CHI TIẾT: CÁC NGUỒN TIỀN ĐÃ CHI (TIỀN MẶT, VPBANK ADS, TECHCOMBANK, CRYPTO) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Dòng Tiền Chi Phân Bổ Theo Từng Quỹ Nguồn (Nơi tiền xuất ra)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Biết rõ từng quỹ két hoặc ngân hàng đã thanh toán bao nhiêu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Quỹ nguồn thanh toán</th>
                <th className="py-2.5 px-3 text-right">Số tiền gốc đã chi</th>
                <th className="py-2.5 px-3 text-right">Quy đổi VND</th>
                <th className="py-2.5 px-3 text-right">Tỷ trọng trong tổng chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sortedOutflowByAccount.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Không có khoản chi nào trong kỳ này.
                  </td>
                </tr>
              ) : (
                sortedOutflowByAccount.map(acc => {
                  const share = totalOutflowVND > 0 ? (acc.amountVND / totalOutflowVND) * 100 : 0;
                  return (
                    <tr key={acc.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {acc.name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatMoney(acc.originalAmount, acc.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatMoney(acc.amountVND, 'VND')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
