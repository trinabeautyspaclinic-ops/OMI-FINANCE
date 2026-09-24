import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  SlidersHorizontal, 
  BellRing, 
  CheckCircle2, 
  ArrowUpRight, 
  Wallet,
  Settings,
  AlertCircle
} from 'lucide-react';
import { AccountWallet, AlertConfig, FundAlert, Transaction } from '../types/cashflow';
import { formatMoney } from '../utils/cashflowCalculations';

interface AlertCenterViewProps {
  alerts: FundAlert[];
  accounts: AccountWallet[];
  alertConfig: AlertConfig;
  onUpdateAlertConfig: (newConfig: AlertConfig) => void;
  onNavigateToFund: (fundId: string) => void;
  onEditTransaction: (txId: string) => void;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({
  alerts,
  accounts,
  alertConfig,
  onUpdateAlertConfig,
  onNavigateToFund,
  onEditTransaction,
}) => {
  const [maxOutflow, setMaxOutflow] = useState<number>(alertConfig.maxSingleOutflowThresholdVND);
  const [spikeRatio, setSpikeRatio] = useState<number>(alertConfig.anomalySpikeRatio);
  const [enableMinBal, setEnableMinBal] = useState<boolean>(alertConfig.enableMinBalanceAlert);
  const [enableSpike, setEnableSpike] = useState<boolean>(alertConfig.enableOutflowSpikeAlert);

  const dangerAlerts = alerts.filter(a => a.severity === 'danger');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAlertConfig({
      maxSingleOutflowThresholdVND: Number(maxOutflow) || 0,
      anomalySpikeRatio: Number(spikeRatio) || 2,
      enableMinBalanceAlert: enableMinBal,
      enableOutflowSpikeAlert: enableSpike,
    });
    alert('Đã cập nhật cấu hình ngưỡng cảnh báo thành công!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Hệ Thống Cảnh Báo Rủi Ro Tự Động</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {alerts.length} Phát hiện
              </span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Tự động rà soát số dư quỹ dưới mức tối thiểu và các khoản chi tiêu bất thường
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 font-bold">
            {dangerAlerts.length} Báo động đỏ
          </span>
          <span className="text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 font-bold">
            {warningAlerts.length} Cần lưu ý
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Cấu hình quy tắc & ngưỡng cảnh báo */}
        <div className="lg:col-span-1 bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Thiết Lập Ngưỡng Kiểm Soát</span>
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">
                Ngưỡng Chi Tối Đa 1 Lần (VND)
              </label>
              <input
                type="number"
                value={maxOutflow}
                onChange={e => setMaxOutflow(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Mọi khoản chi ≥ {formatMoney(maxOutflow, 'VND')} sẽ kích hoạt cảnh báo đỏ.
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                Hệ Số Đột Biến So Với Trung Bình
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.2"
                  max="10"
                  value={spikeRatio}
                  onChange={e => setSpikeRatio(Number(e.target.value))}
                  className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono font-bold text-center"
                />
                <span className="text-slate-400">lần (x) so với lịch sử</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Ví dụ: Gấp {spikeRatio}x mức trung bình cùng hạng mục sẽ báo động vàng.
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableMinBal}
                  onChange={e => setEnableMinBal(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 accent-emerald-500"
                />
                <span>Cảnh báo số dư quỹ dưới mức an toàn</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableSpike}
                  onChange={e => setEnableSpike(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 accent-emerald-500"
                />
                <span>Cảnh báo chi tiêu đột biến bất thường</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors mt-2"
            >
              Áp Dụng Quy Tắc Cảnh Báo
            </button>
          </form>
        </div>

        {/* Cột 2 & 3: Danh sách các cảnh báo phát hiện */}
        <div className="lg:col-span-2 space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-slate-900/80 p-8 rounded-xl border border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">
                Tất Cả Các Quỹ & Giao Dịch Đang Ở Trạng Thái An Toàn
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Không có quỹ nào dưới mức tối thiểu và không phát sinh khoản chi bất thường nào vượt ngưỡng kiểm soát.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alertItem => {
                const isDanger = alertItem.severity === 'danger';
                return (
                  <div
                    key={alertItem.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDanger
                        ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700'
                        : 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
                            isDanger
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {isDanger ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isDanger ? 'text-rose-300' : 'text-amber-300'
                              }`}
                            >
                              {alertItem.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {alertItem.date}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {alertItem.message}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {alertItem.fundId && (
                          <button
                            onClick={() => onNavigateToFund(alertItem.fundId!)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            Xem Quỹ
                          </button>
                        )}

                        {alertItem.transactionId && (
                          <button
                            onClick={() => onEditTransaction(alertItem.transactionId!)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 rounded border border-rose-800/40 transition-colors"
                          >
                            Kiểm Tra GD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
