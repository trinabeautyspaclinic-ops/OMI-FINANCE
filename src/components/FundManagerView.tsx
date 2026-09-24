import React, { useState } from 'react';
import { 
  Wallet, 
  Building2, 
  Globe2, 
  Coins, 
  AlertTriangle, 
  ArrowRightLeft, 
  Plus, 
  Settings2,
  Check,
  Edit2,
  TrendingDown,
  TrendingUp,
  History
} from 'lucide-react';
import { AccountWallet, ExchangeRate, FundCategory, Transaction } from '../types/cashflow';
import { calculateAccountBalances, formatMoney } from '../utils/cashflowCalculations';

interface FundManagerViewProps {
  accounts: AccountWallet[];
  transactions: Transaction[];
  rates: ExchangeRate[];
  onUpdateAccountThreshold: (accountId: string, newThreshold: number) => void;
  onUpdateAccountInitialBalance: (accountId: string, newInitialBalance: number) => void;
  onOpenTransferModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const FundManagerView: React.FC<FundManagerViewProps> = ({
  accounts,
  transactions,
  rates,
  onUpdateAccountThreshold,
  onUpdateAccountInitialBalance,
  onOpenTransferModal,
  onEditTransaction
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<string>('');
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [tempBalanceValue, setTempBalanceValue] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<FundCategory | 'all'>('all');

  const balances = calculateAccountBalances(accounts, transactions, rates);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  // Lịch sử giao dịch của riêng quỹ được chọn
  const accountTransactions = transactions
    .filter(t => t.accountId === selectedAccountId || t.targetAccountId === selectedAccountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Thống kê thu/chi riêng quỹ này
  let totalFundInflow = 0;
  let totalFundOutflow = 0;
  accountTransactions.forEach(t => {
    if (t.accountId === selectedAccountId) {
      if (t.type === 'inflow') totalFundInflow += t.originalAmount;
      if (t.type === 'outflow' || t.type === 'dividend_payout') totalFundOutflow += t.originalAmount;
      if (t.type === 'transfer') totalFundOutflow += t.originalAmount;
    } else if (t.targetAccountId === selectedAccountId) {
      if (t.type === 'transfer') totalFundInflow += t.originalAmount;
    }
  });

  const getCategoryIcon = (cat: FundCategory) => {
    switch (cat) {
      case 'cash_vnd': return <Wallet className="w-4 h-4 text-amber-400" />;
      case 'bank_vn': return <Building2 className="w-4 h-4 text-rose-400" />;
      case 'bank_intl': return <Globe2 className="w-4 h-4 text-cyan-400" />;
      case 'wallet_usdt': return <Coins className="w-4 h-4 text-amber-400" />;
    }
  };

  const getCategoryLabel = (cat: FundCategory) => {
    switch (cat) {
      case 'cash_vnd': return 'Tiền mặt VND';
      case 'bank_vn': return 'Ngân hàng VND';
      case 'bank_intl': return 'Ngân hàng Quốc tế';
      case 'wallet_usdt': return 'Ví USDT';
    }
  };

  const handleStartEditThreshold = (acc: AccountWallet) => {
    setEditingThresholdId(acc.id);
    setTempThresholdValue(acc.minBalanceThreshold.toString());
  };

  const handleSaveThreshold = (accountId: string) => {
    const val = parseFloat(tempThresholdValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateAccountThreshold(accountId, val);
    }
    setEditingThresholdId(null);
  };

  const handleStartEditBalance = (acc: AccountWallet) => {
    setEditingBalanceId(acc.id);
    setTempBalanceValue(acc.initialBalance.toString());
  };

  const handleSaveBalance = (accountId: string) => {
    const val = parseFloat(tempBalanceValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateAccountInitialBalance(accountId, val);
    }
    setEditingBalanceId(null);
  };

  const filteredAccounts = filterCategory === 'all' 
    ? accounts 
    : accounts.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Quản Trị Các Quỹ Tiền Mặt & Ngân Hàng ({accounts.length} Quỹ)
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span>Bấm nút <strong>"Sửa số dư gốc"</strong> trên từng thẻ quỹ để cập nhật số dư hiện có (VND, AED, USD, USDT)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTransferModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Điều Chuyển Nội Bộ</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc nhóm Quỹ */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 text-xs font-medium mr-1">Nhóm Quỹ:</span>
        {[
          { id: 'all', label: 'Tất cả quỹ' },
          { id: 'cash_vnd', label: 'Tiền mặt VND' },
          { id: 'bank_vn', label: 'Ngân hàng VND' },
          { id: 'bank_intl', label: 'Ngân hàng QT' },
          { id: 'wallet_usdt', label: 'Ví USDT' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterCategory === tab.id
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid 4 Nhóm Quỹ Tiền Mặt & Thẻ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredAccounts.map(acc => {
          const bal = balances[acc.id] || { currentBalance: acc.initialBalance, balanceVND: 0 };
          const isLow = acc.minBalanceThreshold > 0 && bal.currentBalance < acc.minBalanceThreshold;
          const isSelected = selectedAccountId === acc.id;

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(acc.category)}
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
                      {acc.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-slate-300">
                    {acc.currency}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  {acc.accountNumber || acc.bankName}
                </div>

                {/* Số dư hiện tại & Cài đặt số dư ban đầu */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span>Số dư hiện tại:</span>
                    {editingBalanceId === acc.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempBalanceValue}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setTempBalanceValue(e.target.value)}
                          placeholder="Số dư ban đầu"
                          className="w-24 bg-slate-950 border border-emerald-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-emerald-400"
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSaveBalance(acc.id);
                          }}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Lưu số dư"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleStartEditBalance(acc);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 px-1 py-0.5 rounded hover:bg-slate-800"
                        title="Chỉnh sửa số dư ban đầu của quỹ này"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Sửa số dư gốc</span>
                      </button>
                    )}
                  </div>

                  <div className="text-xl font-bold font-mono text-white tabular-nums">
                    {formatMoney(bal.currentBalance, acc.currency)}
                  </div>
                  {acc.currency !== 'VND' && (
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      ≈ {formatMoney(bal.balanceVND, 'VND')}
                    </div>
                  )}
                </div>
              </div>

              {/* Ngưỡng tối thiểu & Cảnh báo */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Ngưỡng tối thiểu:</span>
                  {editingThresholdId === acc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempThresholdValue}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setTempThresholdValue(e.target.value)}
                        className="w-20 bg-slate-950 border border-emerald-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-emerald-400"
                      />
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSaveThreshold(acc.id);
                        }}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-slate-300">
                        {formatMoney(acc.minBalanceThreshold, acc.currency)}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleStartEditThreshold(acc);
                        }}
                        className="text-slate-500 hover:text-slate-300 p-0.5"
                        title="Đổi ngưỡng cảnh báo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-between">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Cảnh báo thiếu hụt</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      <span>Số dư an toàn</span>
                    </span>
                  )}

                  <span className="text-[11px] text-slate-500 font-medium">
                    {accountTransactions.length} GD
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lịch Sử Giao Dịch Chi Tiết Của Riêng Quỹ Đang Chọn */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Sổ Nhật Ký Riêng Quỹ: <span className="text-emerald-400">{selectedAccount.name}</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Theo dõi biến động thu/chi và tỷ giá quy đổi của quỹ này
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{formatMoney(totalFundInflow, selectedAccount.currency)}</span>
            </div>
            <div className="flex items-center gap-1 text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-{formatMoney(totalFundOutflow, selectedAccount.currency)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Ngày & Mã</th>
                <th className="py-2.5 px-3">Loại</th>
                <th className="py-2.5 px-3">Hạng Mục Chi Tiết</th>
                <th className="py-2.5 px-3 text-right">Số Tiền Gốc</th>
                <th className="py-2.5 px-3 text-right">Tỷ Giá Quy Đổi</th>
                <th className="py-2.5 px-3 text-right">Quy Đổi (VND)</th>
                <th className="py-2.5 px-3">Đối Tác / Kênh Ads</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {accountTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có giao dịch phát sinh tại quỹ này.
                  </td>
                </tr>
              ) : (
                accountTransactions.map(tx => {
                  const isInflow = tx.type === 'inflow' || (tx.type === 'transfer' && tx.targetAccountId === selectedAccountId);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-200">{tx.date}</div>
                        <div className="font-mono text-[10px] text-slate-500">{tx.id}</div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isInflow ? (
                          <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            + THU
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            - CHI
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{tx.categoryName}</div>
                        <div className="text-[10px] text-slate-500">{tx.description}</div>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-bold">
                        <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                          {isInflow ? '+' : '-'}{formatMoney(tx.originalAmount, tx.originalCurrency)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-300">
                        {tx.originalCurrency === 'VND' ? '1' : `${tx.exchangeRate.toLocaleString('vi-VN')} ₫`}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-slate-200">
                        {formatMoney(tx.amountVND, 'VND')}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {tx.partnerOrBranch || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        >
                          Sửa
                        </button>
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
