import React, { useState } from 'react';
import { 
  Users, 
  Percent, 
  CheckCircle2, 
  Coins
} from 'lucide-react';
import { AccountWallet, DividendDistribution, Shareholder, TimeFilterPeriod, Transaction } from '../types/cashflow';
import { calculateCashFlowSummary, calculateDividendDistribution, filterTransactionsByPeriod, formatMoney } from '../utils/cashflowCalculations';

interface DividendViewProps {
  transactions: Transaction[];
  shareholders: Shareholder[];
  dividendDistributions: DividendDistribution[];
  accounts: AccountWallet[];
  onAddDividendDistribution: (dist: DividendDistribution) => void;
  onOpenShareholderModal: () => void;
}

export const DividendView: React.FC<DividendViewProps> = ({
  transactions,
  shareholders,
  dividendDistributions,
  accounts,
  onAddDividendDistribution,
  onOpenShareholderModal
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimeFilterPeriod>('this_month');
  const [reservePercent, setReservePercent] = useState<number>(20);
  const [payoutAccountId, setPayoutAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [note, setNote] = useState<string>('Quyết định phân phối lợi nhuận');

  const periodTransactions = filterTransactionsByPeriod(transactions, selectedPeriod);
  const summary = calculateCashFlowSummary(periodTransactions);
  const netCashFlow = summary.netCashFlowVND;

  const calcResult = calculateDividendDistribution(netCashFlow, reservePercent, shareholders);

  const getPeriodLabel = (p: TimeFilterPeriod) => {
    switch (p) {
      case 'today': return 'Hôm nay';
      case '7days': return 'Tuần này (7 ngày)';
      case 'this_month': return 'Tháng này (T09/2026)';
      case 'last_month': return 'Tháng trước (T08/2026)';
      case 'this_quarter': return 'Quý này (Q3/2026)';
      case 'this_year': return 'Năm nay (2026)';
      default: return 'Toàn bộ';
    }
  };

  const handleCreateAndExecutePayout = () => {
    if (netCashFlow <= 0) {
      alert('Dòng tiền thuần trong kỳ không dương, không thể thực hiện chia cổ tức.');
      return;
    }

    const newDist: DividendDistribution = {
      id: `div_${Date.now()}`,
      code: `DIV-${Date.now().toString().slice(-6)}`,
      periodType: selectedPeriod === '7days' ? 'week' : selectedPeriod === 'this_month' ? 'month' : 'month',
      periodLabel: getPeriodLabel(selectedPeriod),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      totalInflowVND: summary.totalInflowVND,
      totalOutflowVND: summary.totalOutflowVND,
      netCashFlowVND: netCashFlow,
      reservePercentage: reservePercent,
      reserveAmountVND: calcResult.reserveAmountVND,
      distributableProfitVND: calcResult.distributableProfitVND,
      status: 'paid',
      createdAt: new Date().toISOString(),
      notes: note,
      allocations: calcResult.allocations.map(a => ({
        ...a,
        status: 'paid',
        paidDate: new Date().toISOString().slice(0, 10),
      }))
    };

    onAddDividendDistribution(newDist);
    alert('Đã phê duyệt và tạo lệnh chia cổ tức! Phiếu chi đã được hạch toán vào sổ cái.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Tự Động Chia Cổ Tức Cho Cổ Đông D & Cổ Đông T
            </h2>
            <span className="text-[11px] text-slate-400">
              Trích xuất Dòng tiền thuần (sau trừ chi phí Ads & vận hành) phân bổ theo tỷ lệ cổ phần
            </span>
          </div>
        </div>

        <button
          onClick={onOpenShareholderModal}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        >
          Tỷ Lệ Sở Hữu ({shareholders.map(s => `${s.name}: ${s.ownershipPercentage}%`).join(', ')})
        </button>
      </div>

      {/* Control Panel: Chọn kỳ & Thiết lập % dự phòng */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Percent className="w-4 h-4 text-purple-400" />
            <span>Kỳ & Tỷ Lệ Giữ Lại</span>
          </h3>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
              1. Chọn Kỳ Chia
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: '7days', label: '7 Ngày' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'last_month', label: 'Tháng trước' },
                { id: 'this_quarter', label: 'Quý này' },
                { id: 'this_year', label: 'Năm nay' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id as TimeFilterPeriod)}
                  className={`py-1.5 text-xs font-medium rounded transition-colors text-center ${
                    selectedPeriod === p.id
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-medium">
                2. Giữ Lại Dự Phòng / Tái Đầu Tư:
              </label>
              <span className="font-mono text-xs font-bold text-purple-400">
                {reservePercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={reservePercent}
              onChange={e => setReservePercent(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0% (Chia hết)</span>
              <span>20% (Khuyến nghị)</span>
              <span>60%</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-medium">
              3. Quỹ Chi Trả
            </label>
            <select
              value={payoutAccountId}
              onChange={e => setPayoutAccountId(e.target.value)}
              className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg p-2 focus:outline-none"
            >
              {accounts.filter(a => a.currency === 'VND').map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateAndExecutePayout}
            disabled={netCashFlow <= 0}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              netCashFlow > 0
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Phê Duyệt & Phân Bổ Cổ Tức</span>
          </button>
        </div>

        {/* Calculation Summary Box */}
        <div className="lg:col-span-2 bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bảng Phân Bổ: {getPeriodLabel(selectedPeriod)}
              </span>
              <span className="text-xs font-mono text-purple-400 font-bold">
                100% Cổ Phần
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3.5">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Dòng Tiền Thuần (Net)</span>
                <span className={`text-base font-bold font-mono mt-0.5 block ${netCashFlow >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatMoney(netCashFlow, 'VND')}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Quỹ Giữ Lại ({reservePercent}%)</span>
                <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
                  {formatMoney(calcResult.reserveAmountVND, 'VND')}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Quỹ Cổ Tức Thực Chia</span>
                <span className="text-base font-bold font-mono text-purple-400 mt-0.5 block">
                  {formatMoney(calcResult.distributableProfitVND, 'VND')}
                </span>
              </div>
            </div>

            {/* Shareholder Breakdown Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-2 px-3">Cổ Đông</th>
                    <th className="py-2 px-3 text-center">Tỷ Lệ</th>
                    <th className="py-2 px-3 text-right">Số Tiền Thực Nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {calcResult.allocations.map(alloc => (
                    <tr key={alloc.shareholderId} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-100">{alloc.shareholderName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-400">
                        {alloc.ownershipPercentage}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatMoney(alloc.dividendAmountVND, 'VND')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Lịch Sử Các Đợt Đã Chia Cổ Tức */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Lịch Sử Các Đợt Đã Chi Trả Cổ Tức
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {dividendDistributions.length} đợt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-3">Mã Đợt & Ngày</th>
                <th className="py-2 px-3">Kỳ Phân Phối</th>
                <th className="py-2 px-3 text-right">Dòng Tiền Thuần</th>
                <th className="py-2 px-3 text-right">Quỹ Giữ Lại</th>
                <th className="py-2 px-3 text-right">Quỹ Cổ Tức</th>
                <th className="py-2 px-3">Phân Bổ Cổ Đông</th>
                <th className="py-2 px-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {dividendDistributions.map(dist => (
                <tr key={dist.id} className="hover:bg-slate-800/20">
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="font-mono font-medium text-slate-200">{dist.code}</div>
                    <div className="font-mono text-[10px] text-slate-500">{dist.createdAt.slice(0, 10)}</div>
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                    {dist.periodLabel}
                  </td>

                  <td className="py-2 px-3 text-right whitespace-nowrap font-mono tabular-nums text-cyan-400 font-semibold">
                    {formatMoney(dist.netCashFlowVND, 'VND')}
                  </td>

                  <td className="py-2 px-3 text-right whitespace-nowrap font-mono tabular-nums text-amber-400">
                    {formatMoney(dist.reserveAmountVND, 'VND')} ({dist.reservePercentage}%)
                  </td>

                  <td className="py-2 px-3 text-right whitespace-nowrap font-mono tabular-nums font-bold text-purple-400">
                    {formatMoney(dist.distributableProfitVND, 'VND')}
                  </td>

                  <td className="py-2 px-3">
                    <div className="space-y-0.5">
                      {dist.allocations.map(al => (
                        <div key={al.shareholderId} className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-300">{al.shareholderName} ({al.ownershipPercentage}%):</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatMoney(al.dividendAmountVND, 'VND')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã chi trả</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
