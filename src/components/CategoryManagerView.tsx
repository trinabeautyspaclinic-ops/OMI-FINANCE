import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  Layers,
  CornerDownRight
} from 'lucide-react';
import { Category, CategoryGroup } from '../types/cashflow';

interface CategoryManagerViewProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

export const CategoryManagerView: React.FC<CategoryManagerViewProps> = ({
  categories,
  onUpdateCategories,
}) => {
  const [activeTypeTab, setActiveTypeTab] = useState<'outflow' | 'inflow'>('inflow');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroup, setEditingGroup] = useState<CategoryGroup>('revenue');

  // Form thêm hạng mục nhanh cho một nhóm cụ thể
  const [addingForGroup, setAddingForGroup] = useState<CategoryGroup | null>(null);
  const [quickItemName, setQuickItemName] = useState('');

  // Form thêm hạng mục tổng
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<CategoryGroup>('revenue');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Nhóm hiển thị chuẩn cho từng tab
  const inflowGroups: CategoryGroup[] = ['revenue', 'debt', 'other'];
  const outflowGroups: CategoryGroup[] = ['marketing_ads', 'operating_cost', 'cogs', 'financial_fee', 'debt', 'dividend', 'other'];

  const groupMeta: Record<CategoryGroup, { label: string; desc: string; placeholder: string; badgeColor: string }> = {
    revenue: { 
      label: 'Doanh Thu Bán Hàng & Dịch Vụ', 
      desc: 'Bao gồm tất cả các nguồn thu: Cơ sở 1, Cơ sở 2, Cơ sở 3, Bán sỉ, Online, Khách Dubai, Khách quốc tế...',
      placeholder: 'Ví dụ: Doanh thu Cơ sở 3, Khách sỉ đại lý, Doanh thu TikTok Shop...',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    },
    debt: { 
      label: 'Công Nợ', 
      desc: 'Thu hồi công nợ từ khách hàng hoặc chi trả nợ đối tác/nhà cung cấp',
      placeholder: 'Ví dụ: Thu nợ khách A, Trả nợ tiền xưởng...',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    },
    marketing_ads: { 
      label: 'Chi Phí Ads & Marketing (Tách Nhỏ)', 
      desc: 'Facebook Ads, TikTok Ads, Google, Thuê tài khoản, Agency, Video Ads...',
      placeholder: 'Ví dụ: Ads TikTok Shop, Thuê BM Agency...',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    },
    operating_cost: { 
      label: 'Chi Phí Vận Hành & Mặt Bằng (Tách Nhỏ)', 
      desc: 'Lương nhân viên từng cơ sở, tiền thuê mặt bằng, điện nước, internet...',
      placeholder: 'Ví dụ: Lương thử việc CS3, Mặt bằng kho phụ...',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    },
    cogs: { 
      label: 'Giá Vốn & Hàng Hóa Logistics', 
      desc: 'Tiền nhập nguyên vật liệu, nhập hàng tồn, cước vận chuyển giao hàng...',
      placeholder: 'Ví dụ: Tiền hàng xưởng may, Cước gửi máy bay...',
      badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    },
    financial_fee: { 
      label: 'Chi Phí Tài Chính & Ngân Hàng', 
      desc: 'Phí chuyển khoản quốc tế, phí quẹt thẻ POS, phí thường niên ngân hàng...',
      placeholder: 'Ví dụ: Phí điện chuyển tiền SWIFT...',
      badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    },
    dividend: { 
      label: 'Cổ Tức Cổ Đông', 
      desc: 'Hạch toán phân chia lợi nhuận cổ đông',
      placeholder: 'Ví dụ: Chi tạm ứng cổ tức...',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    },
    other: { 
      label: 'Hạng Mục Khác', 
      desc: 'Các khoản phát sinh ngoài',
      placeholder: 'Ví dụ: Phạt vi phạm, Chi tiếp khách ngoài...',
      badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    }
  };

  const currentGroups = activeTypeTab === 'inflow' ? inflowGroups : outflowGroups;
  const filteredCategories = categories.filter(c => c.type === activeTypeTab);

  // Group by category group
  const groupedCategories: Record<string, Category[]> = {};
  currentGroups.forEach(g => {
    groupedCategories[g] = [];
  });
  filteredCategories.forEach(cat => {
    if (!groupedCategories[cat.group]) {
      groupedCategories[cat.group] = [];
    }
    groupedCategories[cat.group].push(cat);
  });

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingGroup(cat.group);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = (catId: string) => {
    if (!editingName.trim()) return;
    const updated = categories.map(c => 
      c.id === catId ? { ...c, name: editingName.trim(), group: editingGroup } : c
    );
    onUpdateCategories(updated);
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    if (categories.length <= 1) {
      alert('Phải giữ lại ít nhất 1 hạng mục');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa hạng mục "${name}" khỏi danh mục?`)) {
      const updated = categories.filter(c => c.id !== catId);
      onUpdateCategories(updated);
    }
  };

  const handleAddQuickToGroup = (groupKey: CategoryGroup) => {
    if (!quickItemName.trim()) return;
    const newCategory: Category = {
      id: `cat_${Date.now().toString().slice(-6)}`,
      name: quickItemName.trim(),
      type: activeTypeTab,
      group: groupKey,
      color: activeTypeTab === 'inflow' ? '#10B981' : '#F43F5E'
    };
    onUpdateCategories([...categories, newCategory]);
    setQuickItemName('');
    setAddingForGroup(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCategory: Category = {
      id: `cat_${Date.now().toString().slice(-6)}`,
      name: newName.trim(),
      type: activeTypeTab,
      group: newGroup,
      color: activeTypeTab === 'inflow' ? '#10B981' : '#F43F5E'
    };

    onUpdateCategories([...categories, newCategory]);
    setNewName('');
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderTree className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Quản Lý Tên Giao Dịch & Hạng Mục Dòng Tiền
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Thêm mới không giới hạn số lượng hạng mục (Doanh thu Cơ sở 1, 2, 3, Khách sỉ, Tiền phòng, Mặt bằng...) hoặc sửa lại tên theo ý bạn. Mọi thay đổi được lưu tự động trên Cloud và hiển thị ngay trong danh sách chọn.
          </p>
        </div>

        {/* Nút Thêm mới */}
        <button
          onClick={() => {
            setIsAddingNew(true);
            setNewGroup(activeTypeTab === 'inflow' ? 'revenue' : 'operating_cost');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Hạng Mục {activeTypeTab === 'inflow' ? 'Thu' : 'Chi'}</span>
        </button>
      </div>

      {/* Switch Tab: Tiền Vào (Doanh Thu) vs Tiền Ra (Chi Phí) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTypeTab('inflow')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'inflow'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Hạng Mục Tiền Vào (Doanh Thu Bán Hàng & Dịch Vụ)</span>
            <span className="ml-1 text-[11px] opacity-80">
              ({categories.filter(c => c.type === 'inflow').length})
            </span>
          </button>

          <button
            onClick={() => setActiveTypeTab('outflow')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTypeTab === 'outflow'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Hạng Mục Tiền Ra (Chi Phí, Ads, Vận Hành...)</span>
            <span className="ml-1 text-[11px] opacity-80">
              ({categories.filter(c => c.type === 'outflow').length})
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Bấm <span className="text-emerald-400 font-bold">+ Thêm vào nhóm</span> để bổ sung mục con nhanh
        </div>
      </div>

      {/* Form Tạo Hạng Mục Mới Tổng (Nếu đang mở) */}
      {isAddingNew && (
        <form 
          onSubmit={handleCreateCategory}
          className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Tạo Hạng Mục {activeTypeTab === 'inflow' ? 'Thu' : 'Chi'} Mới
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                Tên Hạng Mục / Giao Dịch Cần Đặt:
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={activeTypeTab === 'inflow' ? 'Ví dụ: Doanh thu Cơ sở 3, Bán sỉ, TikTok Shop...' : 'Ví dụ: Chi phí mua sắm thiết bị, Lương thử việc CS1...'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                Thuộc Nhóm Báo Cáo:
              </label>
              <select
                value={newGroup}
                onChange={e => setNewGroup(e.target.value as CategoryGroup)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {activeTypeTab === 'inflow' ? (
                  <>
                    <option value="revenue">Doanh Thu Bán Hàng & Dịch Vụ</option>
                    <option value="debt">Thu Hồi Công Nợ</option>
                    <option value="other">Thu Khác</option>
                  </>
                ) : (
                  <>
                    <option value="marketing_ads">Chi Phí Ads & Marketing (Tách Nhỏ)</option>
                    <option value="operating_cost">Chi Phí Vận Hành & Mặt Bằng (Tách Nhỏ)</option>
                    <option value="cogs">Giá Vốn & Hàng Hóa Logistics</option>
                    <option value="financial_fee">Chi Phí Ngân Hàng & Ngoại Tệ</option>
                    <option value="debt">Chi Trả Nợ</option>
                    <option value="dividend">Cổ Tức Cổ Đông</option>
                    <option value="other">Chi Phí Khác</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
            >
              Lưu Hạng Mục
            </button>
          </div>
        </form>
      )}

      {/* Danh Sách Hạng Mục Đã Phân Nhóm */}
      <div className="space-y-6">
        {currentGroups.map(groupKey => {
          const groupItems = groupedCategories[groupKey] || [];
          const meta = groupMeta[groupKey] || {
            label: groupKey,
            desc: '',
            placeholder: 'Nhập tên hạng mục...',
            badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
          };
          const isAddingToThisGroup = addingForGroup === groupKey;

          return (
            <div 
              key={groupKey}
              className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm"
            >
              {/* Group Title Bar */}
              <div className="bg-slate-900/95 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-sm text-white">
                      {meta.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                      {groupItems.length} hạng mục con
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {meta.desc}
                  </p>
                </div>

                {/* Nút Thêm mục con trực tiếp vào nhóm này */}
                <button
                  onClick={() => {
                    setAddingForGroup(groupKey);
                    setQuickItemName('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm vào nhóm này</span>
                </button>
              </div>

              {/* Quick Add Bar for this group */}
              {isAddingToThisGroup && (
                <div className="bg-emerald-950/20 border-b border-emerald-500/20 p-3 flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={meta.placeholder}
                    value={quickItemName}
                    onChange={e => setQuickItemName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddQuickToGroup(groupKey);
                      if (e.key === 'Escape') setAddingForGroup(null);
                    }}
                    className="flex-1 bg-slate-950 border border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddQuickToGroup(groupKey)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
                  >
                    Thêm
                  </button>
                  <button
                    onClick={() => setAddingForGroup(null)}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-slate-800/60">
                {groupItems.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    Chưa có hạng mục nào trong nhóm này. Bấm nút <strong>+ Thêm vào nhóm này</strong> để tạo mới.
                  </div>
                ) : (
                  groupItems.map(item => {
                    const isEditing = editingId === item.id;

                    return (
                      <div 
                        key={item.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                      >
                        {isEditing ? (
                          /* Editing Row */
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              className="flex-1 bg-slate-950 border border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                              placeholder="Nhập tên mới..."
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <select
                              value={editingGroup}
                              onChange={e => setEditingGroup(e.target.value as CategoryGroup)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                            >
                              {activeTypeTab === 'inflow' ? (
                                <>
                                  <option value="revenue">Doanh Thu</option>
                                  <option value="debt">Công Nợ</option>
                                  <option value="other">Khác</option>
                                </>
                              ) : (
                                <>
                                  <option value="marketing_ads">Ads & Marketing</option>
                                  <option value="operating_cost">Vận Hành & Mặt Bằng</option>
                                  <option value="cogs">Giá Vốn & Logistics</option>
                                  <option value="financial_fee">Phí Ngân Hàng</option>
                                  <option value="debt">Công Nợ</option>
                                  <option value="dividend">Cổ Tức</option>
                                  <option value="other">Khác</option>
                                </>
                              )}
                            </select>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Lưu</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Normal Display Row */
                          <>
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <div>
                                <div className="font-semibold text-slate-200 text-xs">
                                  {item.name}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500">
                                  Mã ID: {item.id}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-[11px] font-medium transition-colors"
                                title="Sửa tên hạng mục này"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-400" />
                                <span>Sửa tên</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(item.id, item.name)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                                title="Xóa hạng mục này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
