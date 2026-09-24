export type Currency = 'VND' | 'USD' | 'AED' | 'USDT' | 'EUR';

export interface ExchangeRate {
  currency: Currency;
  toCurrency: 'VND';
  rate: number;
  updatedAt: string;
  source: 'market' | 'manual';
  note?: string;
}

export type FundCategory = 'cash_vnd' | 'bank_vn' | 'bank_intl' | 'wallet_usdt';

export interface AccountWallet {
  id: string;
  name: string;
  category: FundCategory;
  currency: Currency;
  initialBalance: number;
  minBalanceThreshold: number; // Ngưỡng số dư tối thiểu cảnh báo
  accountNumber?: string;
  bankName?: string;
  color: string;
  notes?: string;
}

export type TransactionType = 
  | 'inflow'          // Tiền vào (Thu)
  | 'outflow'         // Tiền ra (Chi)
  | 'transfer'        // Chuyển giữa các quỹ
  | 'dividend_payout'; // Chi trả cổ tức

export type CategoryGroup = 
  | 'revenue'          // Doanh thu
  | 'marketing_ads'    // Chi phí Ads tách nhỏ
  | 'operating_cost'   // Lương, Mặt bằng, Điện nước tách nhỏ
  | 'cogs'             // Giá vốn, nguyên liệu, vận chuyển tách nhỏ
  | 'financial_fee'    // Phí ngân hàng, SWIFT, giao dịch
  | 'debt'             // Công nợ
  | 'dividend'         // Cổ tức
  | 'other';

export interface Category {
  id: string;
  name: string;
  type: 'inflow' | 'outflow';
  group: CategoryGroup;
  color: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryGroup: CategoryGroup;
  
  // Quỹ tài khoản
  accountId: string; // Quỹ nguồn
  accountName: string;
  targetAccountId?: string; // Quỹ đích khi chuyển tiền
  targetAccountName?: string;
  
  // Tiền tệ & Tỷ giá nhập tay
  originalCurrency: Currency;
  originalAmount: number;
  exchangeRate: number; // Tỷ giá quy đổi về VND (có thể sửa nhập tay)
  amountVND: number;    // Thành tiền VND
  
  description: string;
  partnerOrBranch?: string; // Cơ sở, Kênh Ads, Đối tác cụ thể
  referenceCode?: string;   // Mã sao kê / ref
  
  // Đánh dấu cảnh báo nếu giao dịch bất thường
  isAbnormal?: boolean;
  abnormalReason?: string;
  
  createdAt: string;
}

export interface Shareholder {
  id: string;
  name: string; // "Cổ đông D", "Cổ đông T"
  ownershipPercentage: number;
  bankName: string;
  accountNumber: string;
}

export interface ShareholderAllocation {
  shareholderId: string;
  shareholderName: string;
  ownershipPercentage: number;
  dividendAmountVND: number;
  status: 'paid' | 'pending';
  paidDate?: string;
  bankInfo: string;
}

export interface DividendDistribution {
  id: string;
  code: string;
  periodType: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalInflowVND: number;
  totalOutflowVND: number;
  netCashFlowVND: number;
  reservePercentage: number;
  reserveAmountVND: number;
  distributableProfitVND: number;
  allocations: ShareholderAllocation[];
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
  notes?: string;
}

export type TimeFilterPeriod = 'today' | '7days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom';

// Cấu hình luật cảnh báo
export interface AlertConfig {
  maxSingleOutflowThresholdVND: number; // Ngưỡng chi tối đa 1 lần (VND)
  anomalySpikeRatio: number; // Tỷ lệ đột biến so với trung bình (VD: 2.5x)
  enableMinBalanceAlert: boolean;
  enableOutflowSpikeAlert: boolean;
}

export interface FundAlert {
  id: string;
  type: 'fund_min_balance' | 'abnormal_outflow' | 'abnormal_inflow';
  severity: 'warning' | 'danger';
  title: string;
  message: string;
  fundId?: string;
  transactionId?: string;
  amount?: number;
  currency?: Currency;
  date: string;
}
