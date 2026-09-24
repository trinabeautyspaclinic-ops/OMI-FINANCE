import React, { useState } from 'react';
import { X, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { AccountWallet, Transaction } from '../types/cashflow';
import { formatMoney } from '../utils/cashflowCalculations';

interface TransferFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  accounts: AccountWallet[];
}

export const TransferFundModal: React.FC<TransferFundModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
}) => {
  const [fromAccountId, setFromAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[2]?.id || accounts[0]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>('Điều chuyển quỹ nội bộ');
  const [refCode, setRefCode] = useState<string>('');

  if (!isOpen) return null;

  const sourceAccount = accounts.find(a => a.id === fromAccountId);
  const targetAccount = accounts.find(a => a.id === toAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Vui lòng nhập số tiền điều chuyển hợp lệ');
      return;
    }
    if (fromAccountId === toAccountId) {
      alert('Quỹ nguồn và Quỹ đích không được trùng nhau');
      return;
    }

    const tx: Transaction = {
      id: `TX-TRF-${Date.now().toString().slice(-6)}`,
      date,
      type: 'transfer',
      categoryId: 'cat_transfer',
      categoryName: 'Điều chuyển quỹ nội bộ',
      categoryGroup: 'other',
      accountId: fromAccountId,
      accountName: sourceAccount?.name || 'Quỹ nguồn',
      targetAccountId: toAccountId,
      targetAccountName: targetAccount?.name || 'Quỹ đích',
      originalCurrency: sourceAccount?.currency || 'VND',
      originalAmount: numAmount,
      exchangeRate: 1,
      amountVND: numAmount,
      description: description || `Chuyển tiền từ ${sourceAccount?.name} sang ${targetAccount?.name}`,
      referenceCode: refCode || `TRF-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    onSave(tx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Điều Chuyển Tiền Giữa Các Quỹ
            </h3>
            <span className="text-[11px] text-slate-400">
              Chuyển tiền nội bộ giữa tiền mặt, tài khoản ngân hàng & ví
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Ngày Chuyển Tiền</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Quỹ Nguồn (Trừ Tiền)</label>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Quỹ Đích (Cộng Tiền)</label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">
              Số Tiền Chuyển ({sourceAccount?.currency})
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Diễn Giải Nội Dung</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Rút tiền nạp thẻ Ads, nộp quỹ tiền mặt..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Mã Lệnh / Giao Dịch Ngân Hàng</label>
            <input
              type="text"
              value={refCode}
              onChange={e => setRefCode(e.target.value)}
              placeholder="VD: FT2609238910..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Xác Nhận Chuyển Quỹ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
