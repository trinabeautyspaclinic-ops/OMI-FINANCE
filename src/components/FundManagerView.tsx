import React, { useState } from 'react';
import { 
  Plus, 
  Wallet, 
  Building2, 
  Globe2, 
  Coins, 
  ArrowRightLeft, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  CreditCard,
  Building,
  Smartphone,
  ShieldAlert,
  Sliders,
  DollarSign
} from 'lucide-react';
import { AccountWallet, Currency, ExchangeRate, FundCategory, Transaction } from '../types/cashflow';
import { calculateAccountBalances, formatMoney } from '../utils/cashflowCalculations';

interface FundManagerViewProps {
  accounts: AccountWallet[];
  transactions: Transaction[];
  rates: ExchangeRate[];
  onUpdateAccountThreshold: (accountId: string, newThreshold: number) => void;
  onUpdateAccountInitialBalance: (accountId: string, newInitialBalance: number) => void;
  onSaveAccount: (account: AccountWallet) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenTransferModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const FundManagerView: React.FC<FundManagerViewProps> = ({
  accounts,
  transactions,
  rates,
  onUpdateAccountThreshold,
  onUpdateAccountInitialBalance,
  onSaveAccount,
  onDeleteAccount,
  onOpenTransferModal,
  onEditTransaction
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [filterCategory, setFilterCategory] = useState<FundCategory | 'all'>('all');

  // Modal / Form state for Add/Edit Fund
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWallet | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<FundCategory>('cash_vnd');
  const [formCurrency, setFormCurrency] = useState<Currency>('VND');
  const [formInitialBalance, setFormInitialBalance] = useState<number | ''>(0);
  const [formMinThreshold, setFormMinThreshold] = useState<number | ''>(0);
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Inline edit state for initial balance
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [tempBalanceValue, setTempBalanceValue] = useState<string>('');

  const balances = calculateAccountBalances(accounts, transactions, rates);
  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormCategory('cash_vnd');
    setFormCurrency('VND');
    setFormInitialBalance(0);
    setFormMinThreshold(0);
    setFormAccountNumber('');
    setFormBankName('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: AccountWallet) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormCategory(acc.category);
    setFormCurrency(acc.currency);
    setFormInitialBalance(acc.initialBalance);
    setFormMinThreshold(acc.minBalanceThreshold);
    setFormAccountNumber(acc.accountNumber || '');
    setFormBankName(acc.bankName || '');
    setFormNotes(acc.notes || '');
    setIsModalOpen(true);
  };

  const handleFormCategoryChange = (cat: FundCategory) => {
    setFormCategory(cat);
    if (cat === 'cash_vnd' || cat === 'bank_vn') {
      setFormCurrency('VND');
    } else if (cat === 'wallet_usdt') {
      setFormCurrency('USDT');
    } else if (cat === 'bank_intl') {
      if (formCurrency === 'VND') setFormCurrency('USD');
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const initialVal = typeof formInitialBalance === 'number' ? formInitialBalance : parseFloat(formInitialBalance) || 0;
    const threshVal = typeof formMinThreshold === 'number' ? formMinThreshold : parseFloat(formMinThreshold) || 0;

    const saved: AccountWallet = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      currency: formCurrency,
      initialBalance: initialVal,
      minBalanceThreshold: threshVal,
      accountNumber: formAccountNumber.trim() || undefined,
      bankName: formBankName.trim() || undefined,
      color: editingAccount?.color || '#3b82f6',
      notes: formNotes.trim() || undefined
    };

    onSaveAccount(saved);
    setIsModalOpen(false);
    if (!editingAccount) {
      setSelectedAccountId(saved.id);
    }
  };

  const handleSaveInlineBalance = (accountId: string) => {
    const val = parseFloat(tempBalanceValue);
    if (!isNaN(val)) {
      onUpdateAccountInitialBalance(accountId, val);
    }
    setEditingBalanceId(null);
  };

  const getCategoryIcon = (cat: FundCategory) => {
    switch (cat) {
      case 'cash_vnd': return <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'bank_vn': return <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'bank_intl': return <Globe2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'wallet_usdt': return <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getCategoryLabel = (cat: FundCategory) => {
    switch (cat) {
      case 'cash_vnd': return 'Tiền mặt';
      case 'bank_vn': return 'Ngân hàng VN';
      case 'bank_intl': return 'Ngân hàng QT';
      case 'wallet_usdt': return 'Ví Crypto/USDT';
    }
  };

  const filteredAccounts = filterCategory === 'all' 
    ? accounts 
    : accounts.filter(a => a.category === filterCategory);

  // Giao dịch liên quan đến quỹ được chọn
  const accountTransactions = transactions
    .filter(t => t.accountId === selectedAccountId || t.targetAccountId === selectedAccountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Danh mục tài khoản</span>
            <span className="text-xs font-medium text-slate-500">· {accounts.length} quỹ nguồn hoạt động</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Quản Lý & Cấu Hình Quỹ Nguồn
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dễ dàng thêm mới, sửa tên quỹ tiền mặt, ngân hàng (VND, USD, AED) hoặc ví USDT. Số dư được tính tự động từ sổ cái.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenTransferModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/80 dark:border-slate-700"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Điều chuyển</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Quỹ Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Tất cả quỹ' },
          { id: 'cash_vnd', label: 'Tiền mặt' },
          { id: 'bank_vn', label: 'Ngân hàng Việt Nam' },
          { id: 'bank_intl', label: 'Tài khoản Quốc tế' },
          { id: 'wallet_usdt', label: 'Ví Crypto / USDT' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterCategory === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Danh Sách Quỹ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAccounts.map(acc => {
          const bal = balances[acc.id] || { currentBalance: acc.initialBalance, balanceVND: 0 };
          const isSelected = selectedAccountId === acc.id;
          const isLow = acc.minBalanceThreshold > 0 && bal.currentBalance < acc.minBalanceThreshold;

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-white shadow-md ring-2 ring-slate-900/10 dark:ring-white/20'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div>
                {/* Header item */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(acc.category)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </h4>
                      <div className="text-[11px] text-slate-400 truncate">
                        {acc.bankName || getCategoryLabel(acc.category)}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Currency */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {acc.currency}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(acc);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
                      title="Chỉnh sửa thông tin quỹ"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {acc.accountNumber && (
                  <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-2 py-1 rounded-lg truncate">
                    STK: {acc.accountNumber}
                  </div>
                )}

                {/* Số dư */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Số dư khả dụng</span>
                    {editingBalanceId === acc.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          value={tempBalanceValue}
                          onChange={e => setTempBalanceValue(e.target.value)}
                          placeholder="Số dư ban đầu"
                          className="w-24 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveInlineBalance(acc.id)}
                          className="p-1 text-emerald-600 hover:text-emerald-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBalanceId(acc.id);
                          setTempBalanceValue(acc.initialBalance.toString());
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Sửa gốc ({formatMoney(acc.initialBalance, acc.currency)})
                      </button>
                    )}
                  </div>

                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                    {formatMoney(bal.currentBalance, acc.currency)}
                  </div>
                  {acc.currency !== 'VND' && (
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      ≈ {formatMoney(bal.balanceVND, 'VND')}
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings / Threshold */}
              {isLow && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Dưới ngưỡng ({formatMoney(acc.minBalanceThreshold, acc.currency)})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Account Drilldown & Transactions */}
      {selectedAccount && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Chi tiết quỹ</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">· {selectedAccount.currency}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedAccount.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedAccount.notes || 'Không có ghi chú thêm'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Tổng thu vào</div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(totalFundInflow, selectedAccount.currency)}
                </div>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-right">
                <div className="text-xs text-slate-400">Tổng chi ra</div>
                <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{formatMoney(totalFundOutflow, selectedAccount.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table for this account */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Loại</th>
                  <th className="py-2.5 px-3">Hạng mục & Nội dung</th>
                  <th className="py-2.5 px-3 text-right">Số tiền ({selectedAccount.currency})</th>
                  <th className="py-2.5 px-3 text-right">Quy đổi VND</th>
                  <th className="py-2.5 px-3">Đối tác / Ghi chú</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {accountTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có giao dịch nào được ghi nhận cho quỹ này.
                    </td>
                  </tr>
                ) : (
                  accountTransactions.slice(0, 15).map(tx => {
                    const isInflow = tx.type === 'inflow' || (tx.type === 'transfer' && tx.targetAccountId === selectedAccountId);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`font-semibold ${isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isInflow ? '+ THU' : '- CHI'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{tx.categoryName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isInflow ? '+' : '-'}{formatMoney(tx.originalAmount, tx.originalCurrency)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatMoney(tx.amountVND, 'VND')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {tx.partnerOrBranch || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
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
      )}

      {/* Modal Thêm / Chỉnh Sửa Quỹ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingAccount ? 'Chỉnh Sửa Quỹ Nguồn' : 'Thêm Quỹ Nguồn Mới'}
                </h3>
                <p className="text-xs text-slate-500">
                  Cấu hình tên, loại quỹ, đồng tiền và số dư khởi tạo
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {/* Tên Quỹ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên quỹ nguồn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Két tiền mặt Trụ Sở, Vietcombank Chi Nhánh 2..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-slate-900 dark:focus:border-white"
                />
              </div>

              {/* Loại nhóm quỹ & Loại tiền */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhóm quỹ
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => handleFormCategoryChange(e.target.value as FundCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="cash_vnd">Tiền mặt tại két (VND)</option>
                    <option value="bank_vn">Ngân hàng Việt Nam (VND)</option>
                    <option value="bank_intl">Ngân hàng Quốc tế (USD, AED, EUR)</option>
                    <option value="wallet_usdt">Ví Crypto / USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đồng tiền tệ
                  </label>
                  <select
                    value={formCurrency}
                    onChange={e => setFormCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  >
                    <option value="VND">VND (Việt Nam Đồng)</option>
                    <option value="USDT">USDT (Tether USD)</option>
                    <option value="USD">USD (Đô la Mỹ)</option>
                    <option value="AED">AED (Dirham Dubai)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              {/* Tên ngân hàng & Số tài khoản */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngân hàng / Đơn vị quản lý
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Techcombank, Binance..."
                    value={formBankName}
                    onChange={e => setFormBankName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tài khoản / Địa chỉ ví
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 19034889988..."
                    value={formAccountNumber}
                    onChange={e => setFormAccountNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Số dư ban đầu & Ngưỡng cảnh báo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số dư ban đầu ({formCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formInitialBalance}
                    onChange={e => setFormInitialBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngưỡng số dư tối thiểu
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formMinThreshold}
                    onChange={e => setFormMinThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mục đích sử dụng / Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="VD: Quỹ chi trả lương, Quỹ thẻ thanh toán Ads..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingAccount ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Bạn có chắc chắn muốn xóa quỹ "${editingAccount.name}"?`)) {
                        onDeleteAccount(editingAccount.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa quỹ này</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-xl shadow-xs transition-colors"
                  >
                    {editingAccount ? 'Lưu thay đổi' : 'Tạo Quỹ Mới'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
