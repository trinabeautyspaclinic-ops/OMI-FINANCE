import { AccountWallet, Currency, ExchangeRate, Shareholder, TimeFilterPeriod, Transaction } from '../types/cashflow';

export const formatMoney = (amount: number, currency: Currency = 'VND', hideSymbol = false): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  
  if (currency === 'VND') {
    const formatted = Math.round(amount).toLocaleString('vi-VN');
    return hideSymbol ? formatted : `${formatted} ₫`;
  }
  
  if (currency === 'USDT') {
    const formatted = Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return hideSymbol ? formatted : `${formatted} USDT`;
  }

  if (currency === 'USD') {
    const formatted = Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return hideSymbol ? formatted : `$${formatted}`;
  }

  if (currency === 'AED') {
    const formatted = Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return hideSymbol ? formatted : `${formatted} AED`;
  }

  if (currency === 'EUR') {
    const formatted = Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return hideSymbol ? formatted : `€${formatted}`;
  }

  return `${amount.toLocaleString()} ${currency}`;
};

export const getRateForCurrency = (currency: Currency, rates: ExchangeRate[]): number => {
  if (currency === 'VND') return 1;
  const found = rates.find(r => r.currency === currency && r.toCurrency === 'VND');
  return found ? found.rate : 1;
};

/**
 * Tính số dư thực tế theo thời gian thực cho từng quỹ tiền mặt / tài khoản / ví
 */
export const calculateAccountBalances = (
  accounts: AccountWallet[],
  transactions: Transaction[],
  rates: ExchangeRate[]
): { [accountId: string]: { currentBalance: number; balanceVND: number } } => {
  const result: { [accountId: string]: { currentBalance: number; balanceVND: number } } = {};

  // Khởi tạo từ số dư ban đầu
  accounts.forEach(acc => {
    result[acc.id] = {
      currentBalance: acc.initialBalance,
      balanceVND: 0,
    };
  });

  // Duyệt qua tất cả giao dịch trong sổ cái
  transactions.forEach(tx => {
    if (tx.type === 'inflow') {
      if (result[tx.accountId]) {
        result[tx.accountId].currentBalance += tx.originalAmount;
      }
    } else if (tx.type === 'outflow' || tx.type === 'dividend_payout') {
      if (result[tx.accountId]) {
        result[tx.accountId].currentBalance -= tx.originalAmount;
      }
    } else if (tx.type === 'transfer') {
      // Trừ ở quỹ nguồn theo đồng tiền nguồn
      if (result[tx.accountId]) {
        result[tx.accountId].currentBalance -= tx.originalAmount;
      }
      // Cộng ở quỹ nhận: nếu quỹ nhận là VND mà giao dịch gốc là ngoại tệ/USDT, cộng theo amountVND
      if (tx.targetAccountId && result[tx.targetAccountId]) {
        const targetAcc = accounts.find(a => a.id === tx.targetAccountId);
        if (targetAcc && targetAcc.currency === 'VND' && tx.originalCurrency !== 'VND') {
          result[tx.targetAccountId].currentBalance += tx.amountVND;
        } else {
          result[tx.targetAccountId].currentBalance += tx.originalAmount;
        }
      }
    }
  });

  // Quy đổi toàn bộ số dư sang VND để hợp nhất báo cáo tổng tài sản
  accounts.forEach(acc => {
    const balance = result[acc.id]?.currentBalance || 0;
    const rate = getRateForCurrency(acc.currency, rates);
    if (result[acc.id]) {
      result[acc.id].balanceVND = balance * rate;
    }
  });

  return result;
};

/**
 * Lọc giao dịch theo khoảng thời gian
 */
export const filterTransactionsByPeriod = (
  transactions: Transaction[],
  period: TimeFilterPeriod,
  customStart?: string,
  customEnd?: string
): Transaction[] => {
  if (period === 'all') return transactions;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  return transactions.filter(tx => {
    const txDate = tx.date;

    switch (period) {
      case 'today':
        return txDate === todayStr;

      case '7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        const sevenDaysAgoStr = d.toISOString().slice(0, 10);
        return txDate >= sevenDaysAgoStr && txDate <= todayStr;
      }

      case 'this_month': {
        const yearMonth = todayStr.slice(0, 7); // YYYY-MM
        return txDate.startsWith(yearMonth);
      }

      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthYear = lastMonth.getFullYear();
        const lastMonthMonth = String(lastMonth.getMonth() + 1).padStart(2, '0');
        const lastMonthPrefix = `${lastMonthYear}-${lastMonthMonth}`;
        return txDate.startsWith(lastMonthPrefix);
      }

      case 'this_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        const qStart = new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().slice(0, 10);
        const qEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0).toISOString().slice(0, 10);
        return txDate >= qStart && txDate <= qEnd;
      }

      case 'this_year': {
        const currentYear = String(now.getFullYear());
        return txDate.startsWith(currentYear);
      }

      case 'custom': {
        if (!customStart && !customEnd) return true;
        if (customStart && txDate < customStart) return false;
        if (customEnd && txDate > customEnd) return false;
        return true;
      }

      default:
        return true;
    }
  });
};

/**
 * Báo cáo tổng hợp dòng tiền với bóc tách chi tiết từng tiểu mục chi phí
 */
export const calculateCashFlowSummary = (transactions: Transaction[]) => {
  let totalInflowVND = 0;
  let totalOutflowVND = 0;

  const inflowByCategory: { [catName: string]: { amountVND: number; count: number; color?: string } } = {};
  const outflowByCategory: { [catName: string]: { amountVND: number; count: number; color?: string } } = {};
  const adsByAccount: { [accountOrChannel: string]: number } = {};

  transactions.forEach(tx => {
    if (tx.type === 'inflow') {
      const amt = tx.amountVND;
      totalInflowVND += amt;

      const cat = tx.categoryName || 'Khác';
      if (!inflowByCategory[cat]) inflowByCategory[cat] = { amountVND: 0, count: 0 };
      inflowByCategory[cat].amountVND += amt;
      inflowByCategory[cat].count += 1;
    } else if (tx.type === 'outflow' || tx.type === 'dividend_payout') {
      const amt = tx.amountVND;
      totalOutflowVND += amt;

      const cat = tx.categoryName || 'Khác';
      if (!outflowByCategory[cat]) outflowByCategory[cat] = { amountVND: 0, count: 0 };
      outflowByCategory[cat].amountVND += amt;
      outflowByCategory[cat].count += 1;

      // Nếu là chi phí Ads, thống kê cụ thể từng kênh / thẻ
      if (tx.categoryGroup === 'marketing_ads' || cat.toLowerCase().includes('ads')) {
        const channel = tx.partnerOrBranch || tx.accountName || 'Ads Khác';
        adsByAccount[channel] = (adsByAccount[channel] || 0) + amt;
      }
    }
  });

  const netCashFlowVND = totalInflowVND - totalOutflowVND;

  return {
    totalInflowVND,
    totalOutflowVND,
    netCashFlowVND,
    inflowByCategory,
    outflowByCategory,
    adsByAccount,
    transactionCount: transactions.length,
  };
};

/**
 * Tự động tính toán chia cổ tức cho Cổ đông D và Cổ đông T
 */
export const calculateDividendDistribution = (
  netCashFlowVND: number,
  reservePercentage: number,
  shareholders: Shareholder[]
) => {
  const reserveRate = Math.max(0, Math.min(100, reservePercentage)) / 100;
  const positiveNetProfit = Math.max(0, netCashFlowVND);
  const reserveAmountVND = Math.round(positiveNetProfit * reserveRate);
  const distributableProfitVND = positiveNetProfit - reserveAmountVND;

  const allocations = shareholders.map(sh => {
    const dividendAmountVND = Math.round(distributableProfitVND * (sh.ownershipPercentage / 100));
    return {
      shareholderId: sh.id,
      shareholderName: sh.name,
      ownershipPercentage: sh.ownershipPercentage,
      dividendAmountVND,
      status: 'pending' as const,
      bankInfo: `${sh.bankName} - ${sh.accountNumber}`,
    };
  });

  return {
    netCashFlowVND,
    reservePercentage,
    reserveAmountVND,
    distributableProfitVND,
    allocations,
  };
};
