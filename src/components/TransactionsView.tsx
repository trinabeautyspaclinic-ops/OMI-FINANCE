import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Plus, 
  Edit3, 
  Trash2,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { AccountWallet, Category, CategoryGroup, Transaction } from '../types/cashflow';
import { formatMoney } from '../utils/cashflowCalculations';
import { exportTransactionsToCSV } from '../utils/exportUtils';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: AccountWallet[];
  categories: Category[];
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions?: () => void;
  onLoadUsdtSheetData?: () => void;
  highlightTxId?: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onClearAllTransactions,
  onLoadUsdtSheetData,
  highlightTxId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<CategoryGroup | 'all'>('all');

  const filteredTransactions = transactions.filter(tx => {
    // Search keyword
    const matchesSearch = 
      searchTerm === '' ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.partnerOrBranch && tx.partnerOrBranch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.referenceCode && tx.referenceCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;

    // Account filter
    const matchesAccount = accountFilter === 'all' || tx.accountId === accountFilter || tx.targetAccountId === accountFilter;

    // Group filter
    const matchesGroup = groupFilter === 'all' || tx.categoryGroup === groupFilter;

    return matchesSearch && matchesType && matchesAccount && matchesGroup;
  });

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, mã, đối tác, kênh Ads..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tất cả loại (Thu/Chi)</option>
            <option value="inflow">+ Tiền Vào (Thu)</option>
            <option value="outflow">- Tiền Ra (Chi)</option>
            <option value="transfer">⇄ Điều Chuyển Quỹ</option>
          </select>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tất cả các quỹ ({accounts.length})</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>

          {/* Group Filter (Bóc tách nhỏ) */}
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tất cả nhóm chi phí</option>
            <option value="marketing_ads">Chi Phí Ads & Marketing</option>
            <option value="operating_cost">Chi Phí Vận Hành & Mặt Bằng</option>
            <option value="cogs">Giá Vốn & Hàng Hóa</option>
            <option value="revenue">Doanh Thu Các Cơ Sở</option>
            <option value="financial_fee">Phí Ngân Hàng</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {onLoadUsdtSheetData && (
            <button
              onClick={onLoadUsdtSheetData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors"
              title="Nạp tự động 28 giao dịch từ bảng Thu Chi USDT"
            >
              <span>📥 Nạp Sổ Thu Chi USDT</span>
            </button>
          )}

          {onClearAllTransactions && transactions.length > 0 && (
            <button
              onClick={onClearAllTransactions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors"
              title="Xóa toàn bộ các giao dịch cũ để bắt đầu sổ cái mới"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa Hết Giao Dịch Cũ</span>
            </button>
          )}

          <button
            onClick={() => exportTransactionsToCSV(filteredTransactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="Xuất file CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Ngày & Mã</th>
                <th className="py-2.5 px-3">Loại</th>
                <th className="py-2.5 px-3">Hạng Mục Chi Tiết</th>
                <th className="py-2.5 px-3 text-right">Số Tiền Gốc</th>
                <th className="py-2.5 px-3 text-right">Tỷ Giá Quy Đổi</th>
                <th className="py-2.5 px-3 text-right">Thành Tiền (VND)</th>
                <th className="py-2.5 px-3">Quỹ Tiền Mặt / Thẻ</th>
                <th className="py-2.5 px-3">Đối Tác / Kênh Ads</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p className="text-slate-400 text-xs">
                        Sổ cái đang sạch sẽ (đã xóa hết các giao dịch mẫu). Bạn có thể bắt đầu nhập giao dịch thu, chi thực tế phát sinh từ hôm nay.
                      </p>
                      <button
                        onClick={onOpenNewTransaction}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Nhập Giao Dịch Đầu Tiên</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isInflow = tx.type === 'inflow';
                  const isTransfer = tx.type === 'transfer';
                  const isHighValue = tx.amountVND >= 50000000;
                  const isHighlighted = highlightTxId === tx.id;

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-500/10'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Ngày & Mã */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-200 font-medium">{tx.date}</div>
                        <div className="font-mono text-[10px] text-slate-500">{tx.id}</div>
                      </td>

                      {/* Loại */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isInflow ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span>THU</span>
                          </span>
                        ) : isTransfer ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                            <span>CHUYỂN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                            <span>CHI</span>
                          </span>
                        )}
                      </td>

                      {/* Hạng mục chi tiết */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{tx.categoryName}</span>
                          {isHighValue && (
                            <span
                              title="Khoản chi lớn ≥ 50 triệu"
                              className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-[240px] truncate">
                          {tx.description}
                        </div>
                      </td>

                      {/* Số tiền gốc */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-bold">
                        <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                          {isInflow ? '+' : '-'}{formatMoney(tx.originalAmount, tx.originalCurrency)}
                        </span>
                      </td>

                      {/* Tỷ giá quy đổi (Nhập tay hoặc niêm yết) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-300">
                        {tx.originalCurrency === 'VND' ? (
                          <span className="text-slate-600">1</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold" title="Tỷ giá quy đổi được ghi nhận">
                            {tx.exchangeRate.toLocaleString('vi-VN')} ₫
                          </span>
                        )}
                      </td>

                      {/* Thành tiền VND */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums font-bold text-slate-100">
                        {formatMoney(tx.amountVND, 'VND')}
                      </td>

                      {/* Quỹ tài khoản */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                        <div>{tx.accountName}</div>
                        {tx.targetAccountName && (
                          <div className="text-[10px] text-slate-500">➔ {tx.targetAccountName}</div>
                        )}
                      </td>

                      {/* Đối tác / Kênh Ads */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-300 block max-w-[150px] truncate">
                          {tx.partnerOrBranch || '-'}
                        </span>
                        {tx.referenceCode && (
                          <span className="font-mono text-[10px] text-slate-500 block truncate">
                            {tx.referenceCode}
                          </span>
                        )}
                      </td>

                      {/* Thao tác: Sửa (Edit) & Xóa */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                            title="Sửa giao dịch (Sửa số tiền, tỷ giá, hạng mục...)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Xác nhận xóa giao dịch ${tx.id}?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Xóa giao dịch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-2.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Hiển thị <strong>{filteredTransactions.length}</strong> / {transactions.length} giao dịch
          </span>
          <span className="font-mono">
            Bấm biểu tượng bút chì để chỉnh sửa tỷ giá hoặc thông tin giao dịch cũ
          </span>
        </div>
      </div>
    </div>
  );
};
