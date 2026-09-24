import { AccountWallet, Category, DividendDistribution, ExchangeRate, Shareholder, Transaction } from '../types/cashflow';

export const INITIAL_EXCHANGE_RATES: ExchangeRate[] = [
  {
    currency: 'USD',
    toCurrency: 'VND',
    rate: 25450,
    updatedAt: '2026-09-23 07:00:00',
    source: 'market',
    note: 'Tỷ giá ngân hàng'
  },
  {
    currency: 'AED',
    toCurrency: 'VND',
    rate: 6930,
    updatedAt: '2026-09-23 07:00:00',
    source: 'market',
    note: 'Tỷ giá AED/VND'
  },
  {
    currency: 'USDT',
    toCurrency: 'VND',
    rate: 25650,
    updatedAt: '2026-09-23 07:30:00',
    source: 'market',
    note: 'Tỷ giá USDT/VND'
  },
  {
    currency: 'EUR',
    toCurrency: 'VND',
    rate: 27300,
    updatedAt: '2026-09-23 07:00:00',
    source: 'market',
    note: 'Tỷ giá EUR/VND'
  },
  {
    currency: 'VND',
    toCurrency: 'VND',
    rate: 1,
    updatedAt: '2026-09-23 00:00:00',
    source: 'manual',
    note: 'Đồng tiền gốc'
  }
];

export const INITIAL_ACCOUNTS: AccountWallet[] = [
  // 1. Tài Khoản Ngân Hàng VND (Bank)
  {
    id: 'acc_techcom',
    name: 'Tài Khoản Ngân Hàng (Bank VND)',
    category: 'bank_vn',
    currency: 'VND',
    initialBalance: 140477765, // 140.477.765 đ
    minBalanceThreshold: 30000000,
    accountNumber: 'Bank Chính',
    bankName: 'Ngân Hàng Doanh Nghiệp',
    color: '#059669',
    notes: 'Quỹ tiền mặt VND tại Ngân hàng'
  },
  // 2. Ví USDT
  {
    id: 'acc_binance_usdt',
    name: 'Ví USDT',
    category: 'wallet_usdt',
    currency: 'USDT',
    initialBalance: 62718.22, // 62.718,22 USDT
    minBalanceThreshold: 5000,
    accountNumber: 'Ví TRC20/BEP20 Chính',
    bankName: 'Ví USDT',
    color: '#F59E0B',
    notes: 'Quỹ thanh khoản USDT'
  },
  // 3. Quỹ Tiền Mặt VND
  {
    id: 'acc_cash_vnd',
    name: 'Quỹ Tiền Mặt Tại Két',
    category: 'cash_vnd',
    currency: 'VND',
    initialBalance: 0,
    minBalanceThreshold: 10000000,
    bankName: 'Két sắt trụ sở',
    color: '#D97706',
    notes: 'Chi tiêu trực tiếp & tạm ứng'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  // TIỀN VÀO (INFLOW)
  { id: 'cat_rev_cs1', name: 'Doanh thu Cơ sở 1', type: 'inflow', group: 'revenue', color: '#10B981' },
  { id: 'cat_rev_cs2', name: 'Doanh thu Cơ sở 2', type: 'inflow', group: 'revenue', color: '#059669' },
  { id: 'cat_rev_online', name: 'Doanh thu Bán hàng Online', type: 'inflow', group: 'revenue', color: '#34D399' },
  { id: 'cat_rev_dubai_aed', name: 'Doanh thu Khách Dubai (AED)', type: 'inflow', group: 'revenue', color: '#0D9488' },
  { id: 'cat_rev_intl_usd', name: 'Doanh thu Khách Quốc tế (USD)', type: 'inflow', group: 'revenue', color: '#0284C7' },
  { id: 'cat_rev_usdt_in', name: 'Nhận Thanh Toán Bằng USDT', type: 'inflow', group: 'revenue', color: '#F59E0B' },
  { id: 'cat_debt_recovery', name: 'Thu hồi công nợ', type: 'inflow', group: 'debt', color: '#6366F1' },

  // TIỀN RA (OUTFLOW) - TÁCH NHỎ CHI TIẾT
  // Nhóm Ads:
  { id: 'cat_ads_fb_cold', name: 'Ads Facebook: Tìm Khách Mới', type: 'outflow', group: 'marketing_ads', color: '#EF4444' },
  { id: 'cat_ads_fb_re', name: 'Ads Facebook: Retargeting Tệp Cũ', type: 'outflow', group: 'marketing_ads', color: '#DC2626' },
  { id: 'cat_ads_tiktok', name: 'Ads TikTok: Livestream / Chuyển Đổi', type: 'outflow', group: 'marketing_ads', color: '#F43F5E' },
  { id: 'cat_ads_google', name: 'Ads Google: Search & Shopping', type: 'outflow', group: 'marketing_ads', color: '#E11D48' },
  { id: 'cat_ads_agency_fee', name: 'Chi phí Agency & Thuê Tài Khoản', type: 'outflow', group: 'marketing_ads', color: '#BE123C' },
  { id: 'cat_ads_creative', name: 'Sản xuất Video & Banner Ads', type: 'outflow', group: 'marketing_ads', color: '#FB7185' },

  // Nhóm Vận hành:
  { id: 'cat_sal_cs1', name: 'Lương Nhân Viên - Cơ Sở 1', type: 'outflow', group: 'operating_cost', color: '#EA580C' },
  { id: 'cat_sal_cs2', name: 'Lương Nhân Viên - Cơ Sở 2', type: 'outflow', group: 'operating_cost', color: '#D97706' },
  { id: 'cat_sal_kpi', name: 'Thưởng KPI & Doanh Số', type: 'outflow', group: 'operating_cost', color: '#B45309' },
  { id: 'cat_rent_cs1', name: 'Tiền Thuê Mặt Bằng CS1', type: 'outflow', group: 'operating_cost', color: '#C2410C' },
  { id: 'cat_rent_cs2', name: 'Tiền Thuê Mặt Bằng CS2', type: 'outflow', group: 'operating_cost', color: '#9A3412' },
  { id: 'cat_electric_cs1', name: 'Điện Nước Internet Cơ Sở 1', type: 'outflow', group: 'operating_cost', color: '#CA8A04' },
  { id: 'cat_electric_cs2', name: 'Điện Nước Internet Cơ Sở 2', type: 'outflow', group: 'operating_cost', color: '#A16207' },

  // Nhóm Giá vốn / Hàng hóa:
  { id: 'cat_cogs_goods', name: 'Tiền Nhập Hàng / Nguyên Liệu', type: 'outflow', group: 'cogs', color: '#7C2D12' },
  { id: 'cat_cogs_shipping', name: 'Cước Vận Chuyển / Logistics', type: 'outflow', group: 'cogs', color: '#78350F' },

  // Phí ngân hàng & Cổ tức:
  { id: 'cat_fee_bank', name: 'Phí Dịch Vụ Ngân Hàng / Chuyển Tiền', type: 'outflow', group: 'financial_fee', color: '#64748B' },
  { id: 'cat_dividend_out', name: 'Chi Trả Cổ Tức Cổ Đông', type: 'outflow', group: 'dividend', color: '#8B5CF6' }
];

export const INITIAL_SHAREHOLDERS: Shareholder[] = [
  {
    id: 'sh_d',
    name: 'Cổ đông D',
    ownershipPercentage: 60,
    bankName: '',
    accountNumber: ''
  },
  {
    id: 'sh_t',
    name: 'Cổ đông T',
    ownershipPercentage: 40,
    bankName: '',
    accountNumber: ''
  }
];

// Danh sách giao dịch ban đầu rỗng để bắt đầu quản lý mới
export const INITIAL_TRANSACTIONS: Transaction[] = [];

// Danh sách chia cổ tức rỗng
export const INITIAL_DIVIDEND_DISTRIBUTIONS: DividendDistribution[] = [];
