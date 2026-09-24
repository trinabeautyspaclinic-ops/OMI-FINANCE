import React, { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { Shareholder } from '../types/cashflow';

interface ShareholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareholders: Shareholder[];
  onUpdateShareholders: (list: Shareholder[]) => void;
}

export const ShareholderModal: React.FC<ShareholderModalProps> = ({
  isOpen,
  onClose,
  shareholders,
  onUpdateShareholders,
}) => {
  const [list, setList] = useState<Shareholder[]>(shareholders);

  if (!isOpen) return null;

  const totalPercentage = list.reduce((sum, s) => sum + s.ownershipPercentage, 0);

  const handlePercentChange = (id: string, newPercent: number) => {
    setList(prev => prev.map(s => s.id === id ? { ...s, ownershipPercentage: newPercent } : s));
  };

  const handleBankChange = (id: string, field: 'bankName' | 'accountNumber', val: string) => {
    setList(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleSave = () => {
    if (totalPercentage !== 100) {
      alert(`Tổng tỷ lệ cổ phần hiện tại là ${totalPercentage}%. Phải bằng chính xác 100% để chia cổ tức.`);
      return;
    }
    onUpdateShareholders(list);
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
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tỷ Lệ Sở Hữu Cổ Phần
            </h3>
            <span className="text-[11px] text-slate-400">
              Tổng tỷ lệ: <strong className={totalPercentage === 100 ? 'text-emerald-400' : 'text-rose-400'}>{totalPercentage}%</strong> / 100%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {list.map(sh => (
            <div
              key={sh.id}
              className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <span className="font-bold text-white text-sm">{sh.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">Tỷ lệ:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={sh.ownershipPercentage}
                  onChange={e => handlePercentChange(sh.id, Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-500"
                />
                <span className="text-purple-400 font-bold">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};
