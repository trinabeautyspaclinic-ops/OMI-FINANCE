import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Calculator, Edit3, RotateCcw } from 'lucide-react';
import { AccountWallet, Category, Currency, ExchangeRate, Transaction } from '../types/cashflow';
import { formatMoney, getRateForCurrency } from '../utils/cashflowCalculations';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  accounts: AccountWallet[];
  categories: Category[];
  rates: ExchangeRate[];
  editingTransaction?: Transaction | null;
  onManageCategories?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  categories,
  rates,
  editingTransaction,
  onManageCategories,
}) => {
  const [type, setType] = useState<'inflow' | 'outflow'>('outflow');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [originalCurrency, setOriginalCurrency] = useState<Currency>('VND');
  const [originalAmount, setOriginalAmount] = useState<number | ''>('');
  const [customRate, setCustomRate] = useState<number>(1);
  const [partnerOrBranch, setPartnerOrBranch] = useState<string>('');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);

  // Pre-fill when editing or creating
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type === 'inflow' ? 'inflow' : 'outflow');
      setDate(editingTransaction.date);
      setAccountId(editingTransaction.accountId);
      setCategoryId(editingTransaction.categoryId);
      setCustomCategoryName(editingTransaction.categoryName);
      setIsCustomCategory(false);
      setOriginalCurrency(editingTransaction.originalCurrency);
      setOriginalAmount(editingTransaction.originalAmount);
      setCustomRate(editingTransaction.exchangeRate);
      setPartnerOrBranch(editingTransaction.partnerOrBranch || '');
      setReferenceCode(editingTransaction.referenceCode || '');
      setDescription(editingTransaction.description || '');
    } else {
      setType('outflow');
      setDate(new Date().toISOString().slice(0, 10));
      const firstAcc = accounts[0];
      if (firstAcc) {
        setAccountId(firstAcc.id);
        setOriginalCurrency(firstAcc.currency);
        setCustomRate(getRateForCurrency(firstAcc.currency, rates));
      }
      const firstOutflowCat = categories.find(c => c.type === 'outflow');
      if (firstOutflowCat) {
        setCategoryId(firstOutflowCat.id);
        setCustomCategoryName(firstOutflowCat.name);
      }
      setIsCustomCategory(false);
      setOriginalAmount('');
      setPartnerOrBranch('');
      setReferenceCode('');
      setDescription('');
    }
  }, [editingTransaction, isOpen, accounts, categories, rates]);

  // When changing account, update default currency & rate if not editing
  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    const acc = accounts.find(a => a.id === newAccId);
    if (acc) {
      setOriginalCurrency(acc.currency);
      const r = getRateForCurrency(acc.currency, rates);
      setCustomRate(r);
    }
  };

  // When currency changes, update default rate
  const handleCurrencyChange = (newCurr: Currency) => {
    setOriginalCurrency(newCurr);
    const r = getRateForCurrency(newCurr, rates);
    setCustomRate(r);
  };

  const handleResetToMarketRate = () => {
    const r = getRateForCurrency(originalCurrency, rates);
    setCustomRate(r);
  };

  if (!isOpen) return null;

  const numericAmount = typeof originalAmount === 'number' ? originalAmount : 0;
  const amountVND = Math.round(numericAmount * (customRate || 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === accountId);
    const selectedCat = categories.find(c => c.id === categoryId);

    const finalCategoryName = (customCategoryName && customCategoryName.trim()) 
      ? customCategoryName.trim() 
      : (selectedCat ? selectedCat.name : 'Khác');

    const savedTx: Transaction = {
      id: editingTransaction ? editingTransaction.id : `TX-${Date.now().toString().slice(-6)}`,
      date,
      type,
      categoryId: categoryId || 'cat_custom',
      categoryName: finalCategoryName,
      categoryGroup: selectedCat ? selectedCat.group : 'other',
      accountId,
      accountName: selectedAcc ? selectedAcc.name : 'Quỹ tài khoản',
      originalCurrency,
      originalAmount: numericAmount,
      exchangeRate: customRate || 1, // Tỷ giá quy đổi (có thể do người dùng nhập tay)
      amountVND,
      description: description || (type === 'inflow' ? 'Thu tiền' : 'Chi tiền'),
      partnerOrBranch,
      referenceCode,
      createdAt: editingTransaction ? editingTransaction.createdAt : new Date().toISOString(),
    };

    onSave(savedTx);
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type);

  // Nhóm categories theo group để dễ chọn
  const categoryGroups: { [groupKey: string]: Category[] } = {};
  filteredCategories.forEach(c => {
    if (!categoryGroups[c.group]) categoryGroups[c.group] = [];
    categoryGroups[c.group].push(c);
  });

  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'marketing_ads': return 'Chi Phí Ads & Marketing (Tách nhỏ)';
      case 'operating_cost': return 'Chi Phí Vận Hành & Mặt Bằng (Tách nhỏ)';
      case 'cogs': return 'Giá Vốn, Hàng Hóa & Logistics';
      case 'financial_fee': return 'Phí Ngân Hàng & Quốc Tế';
      case 'revenue': return 'Doanh Thu Theo Cơ Sở & Kênh';
      case 'debt': return 'Công Nợ';
      default: return 'Khác';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'inflow' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {type === 'inflow' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingTransaction ? 'Chỉnh Sửa Giao Dịch Dòng Tiền' : 'Nhập Giao Dịch Mới'}
            </h3>
            <span className="text-[11px] text-slate-400">
              {editingTransaction ? `Mã: ${editingTransaction.id} · Có thể sửa tay tỷ giá và số tiền` : 'Phân loại chi tiết từng khoản thu / chi'}
            </span>
          </div>
        </div>

        {/* Tab Switcher Thu / Chi */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-3.5">
          <button
            type="button"
            onClick={() => setType('inflow')}
            className={`py-1.5 text-xs font-bold rounded transition-all ${
              type === 'inflow'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + TIỀN VÀO (THU)
          </button>
          <button
            type="button"
            onClick={() => setType('outflow')}
            className={`py-1.5 text-xs font-bold rounded transition-all ${
              type === 'outflow'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            - TIỀN RA (CHI)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Row 1: Ngày & Quỹ Tài Khoản */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-400 block mb-1">Ngày Giao Dịch</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Quỹ Tiền / Tài Khoản</label>
              <select
                value={accountId}
                onChange={e => handleAccountChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Hạng mục chi tiết (Tách nhỏ & Sửa tay tên) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400">
                Hạng Mục Chi Tiết
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  {isCustomCategory ? '← Chọn từ danh sách có sẵn' : '✏️ Nhập tay tên giao dịch này'}
                </button>
                {onManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onManageCategories();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Quản lý danh mục
                  </button>
                )}
              </div>
            </div>

            {isCustomCategory ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder="Gõ tên giao dịch cụ thể bạn muốn..."
                  value={customCategoryName}
                  onChange={e => setCustomCategoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500 rounded-lg p-2 text-slate-100 font-medium focus:outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 block">
                  Tên này sẽ được lưu trực tiếp vào dòng tiền cho giao dịch này.
                </span>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={e => {
                  setCategoryId(e.target.value);
                  const found = categories.find(c => c.id === e.target.value);
                  if (found) setCustomCategoryName(found.name);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-medium"
              >
                {Object.keys(categoryGroups).map(groupKey => (
                  <optgroup key={groupKey} label={`── ${getGroupLabel(groupKey)} ──`}>
                    {categoryGroups[groupKey].map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {/* Row 3: Số tiền gốc & Loại tiền tệ */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-slate-400 block mb-1">Loại Tiền</label>
              <select
                value={originalCurrency}
                onChange={e => handleCurrencyChange(e.target.value as Currency)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono font-bold"
              >
                <option value="VND">VND (₫)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED (Dubai)</option>
                <option value="USDT">USDT</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Số Tiền Gốc</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={originalAmount}
                onChange={e => setOriginalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Ô Tỷ Giá Quy Đổi Nhập Tay (Manual Override) */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tỷ giá quy đổi (1 {originalCurrency} = ? ₫):</span>
              </span>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  value={customRate}
                  disabled={originalCurrency === 'VND'}
                  onChange={e => setCustomRate(Number(e.target.value))}
                  className="w-28 bg-slate-900 border border-emerald-500/60 rounded px-2 py-0.5 text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                  title="Có thể tự nhập tay tỷ giá tại thời điểm giao dịch"
                />
                {originalCurrency !== 'VND' && (
                  <button
                    type="button"
                    onClick={handleResetToMarketRate}
                    className="p-1 text-slate-500 hover:text-slate-300"
                    title="Đặt lại theo tỷ giá hệ thống"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Thành tiền quy đổi (VND):</span>
              <span
                className={`font-mono text-sm font-bold ${
                  type === 'inflow' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {type === 'inflow' ? '+' : '-'}{formatMoney(amountVND, 'VND')}
              </span>
            </div>
          </div>

          {/* Row 4: Đối tác / Cơ sở / Kênh Ads */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Cơ Sở / Kênh Ads / Đối Tác</label>
              <input
                type="text"
                value={partnerOrBranch}
                onChange={e => setPartnerOrBranch(e.target.value)}
                placeholder="VD: FB Ads, CS1, Nhà cung cấp..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Mã Sao Kê / Tham Chiếu</label>
              <input
                type="text"
                value={referenceCode}
                onChange={e => setReferenceCode(e.target.value)}
                placeholder="VD: FT2609..., INV-001..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Diễn giải */}
          <div>
            <label className="text-slate-400 block mb-1">Diễn Giải Nội Dung</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Thanh toán tiền điện, nạp Ads Facebook..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
                type === 'inflow'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {editingTransaction ? 'Cập Nhật Giao Dịch' : type === 'inflow' ? 'Lưu Khoản Thu' : 'Lưu Khoản Chi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
