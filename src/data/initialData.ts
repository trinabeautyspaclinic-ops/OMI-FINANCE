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
  // 1. Quỹ Tiền Mặt VND
  {
    id: 'acc_cash_vnd',
    name: 'Quỹ Tiền Mặt Tại Két',
    category: 'cash_vnd',
    currency: 'VND',
    initialBalance: 0,
    minBalanceThreshold: 15000000,
    bankName: 'Két sắt trụ sở',
    color: '#D97706',
    notes: 'Chi tiêu trực tiếp & tạm ứng văn phòng'
  },
  // 2. Tài Khoản Ngân Hàng VND
  {
    id: 'acc_techcom',
    name: 'Techcombank Doanh Nghiệp',
    category: 'bank_vn',
    currency: 'VND',
    initialBalance: 0,
    minBalanceThreshold: 50000000,
    accountNumber: '19034889988011',
    bankName: 'Techcombank',
    color: '#E11D48',
    notes: 'Tài khoản chính nhận doanh thu & chi trả'
  },
  {
    id: 'acc_vpbank_ads',
    name: 'VPBank Thẻ Chuyên Ads',
    category: 'bank_vn',
    currency: 'VND',
    initialBalance: 0,
    minBalanceThreshold: 20000000,
    accountNumber: '99882233441',
    bankName: 'VPBank',
    color: '#059669',
    notes: 'Thẻ thanh toán Facebook & TikTok Ads'
  },
  {
    id: 'acc_mb_bank',
    name: 'MB Bank',
    category: 'bank_vn',
    currency: 'VND',
    initialBalance: 0,
    minBalanceThreshold: 20000000,
    accountNumber: '088812345678',
    bankName: 'MB Bank',
    color: '#4F46E5',
    notes: 'Tài khoản thanh toán & thu tiền'
  },
  // 3. Tài Khoản Ngân Hàng Quốc Tế
  {
    id: 'acc_emirates_aed',
    name: 'Emirates NBD Dubai (AED)',
    category: 'bank_intl',
    currency: 'AED',
    initialBalance: 0,
    minBalanceThreshold: 5000,
    accountNumber: 'AE09 0260 0012 3456 7890 12',
    bankName: 'Emirates NBD',
    color: '#0D9488',
    notes: 'Khách hàng Trung Đông (AED)'
  },
  {
    id: 'acc_chase_usd',
    name: 'Chase Wire Bank (USD)',
    category: 'bank_intl',
    currency: 'USD',
    initialBalance: 0,
    minBalanceThreshold: 2000,
    accountNumber: '021000021-987654321',
    bankName: 'Chase Bank',
    color: '#0284C7',
    notes: 'Doanh thu dịch vụ quốc tế (USD)'
  },
  // 4. Ví USDT
  {
    id: 'acc_binance_usdt',
    name: 'Ví USDT',
    category: 'wallet_usdt',
    currency: 'USDT',
    initialBalance: 45332, // Tồn đầu kì 1/8 theo sổ Thu Chi USDT
    minBalanceThreshold: 2000,
    accountNumber: 'TRC20-Ví chính',
    bankName: 'Ví USDT TRC20/BEP20',
    color: '#F59E0B',
    notes: 'Quỹ thanh khoản USDT'
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

import { SEED_USDT_TRANSACTIONS } from './seedUsdtData';

// Danh sách giao dịch ban đầu từ sổ Thu Chi USDT thực tế
export const INITIAL_TRANSACTIONS: Transaction[] = [...SEED_USDT_TRANSACTIONS];

// Danh sách chia cổ tức rỗng
export const INITIAL_DIVIDEND_DISTRIBUTIONS: DividendDistribution[] = [];
