import { AccountWallet, AlertConfig, FundAlert, Transaction } from '../types/cashflow';
import { formatMoney } from './cashflowCalculations';

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  maxSingleOutflowThresholdVND: 50000000, // Chi đơn lẻ vượt 50 triệu -> Cảnh báo
  anomalySpikeRatio: 2.5, // Vượt 2.5 lần trung bình cùng hạng mục -> Bất thường
  enableMinBalanceAlert: true,
  enableOutflowSpikeAlert: true,
};

/**
 * Tính toán trung bình chi tiêu lịch sử của từng hạng mục
 */
export const calculateCategoryAverages = (transactions: Transaction[]) => {
  const sumByCategory: { [catId: string]: { totalVND: number; count: number } } = {};

  transactions.forEach(tx => {
    if (tx.type === 'outflow') {
      if (!sumByCategory[tx.categoryId]) {
        sumByCategory[tx.categoryId] = { totalVND: 0, count: 0 };
      }
      sumByCategory[tx.categoryId].totalVND += tx.amountVND;
      sumByCategory[tx.categoryId].count += 1;
    }
  });

  const avgByCategory: { [catId: string]: number } = {};
  Object.keys(sumByCategory).forEach(catId => {
    const item = sumByCategory[catId];
    avgByCategory[catId] = item.count > 0 ? item.totalVND / item.count : 0;
  });

  return avgByCategory;
};

/**
 * Phát hiện tất cả các cảnh báo số dư quỹ và giao dịch bất thường
 */
export const detectActiveAlerts = (
  accounts: AccountWallet[],
  accountBalances: { [accountId: string]: { currentBalance: number; balanceVND: number } },
  transactions: Transaction[],
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): FundAlert[] => {
  const alerts: FundAlert[] = [];
  const now = new Date().toISOString().slice(0, 10);

  // 1. Cảnh báo số dư quỹ chạm ngưỡng tối thiểu
  if (config.enableMinBalanceAlert) {
    accounts.forEach(acc => {
      const bal = accountBalances[acc.id]?.currentBalance ?? acc.initialBalance;
      const minThreshold = acc.minBalanceThreshold;

      if (minThreshold > 0 && bal < minThreshold) {
        const isDepleted = bal <= 0;
        alerts.push({
          id: `alert_bal_${acc.id}`,
          type: 'fund_min_balance',
          severity: isDepleted ? 'danger' : 'warning',
          title: `Số Dư Quỹ Dưới Mức Tối Thiểu: ${acc.name}`,
          message: `Số dư hiện tại ${formatMoney(bal, acc.currency)} thấp hơn mức an toàn (${formatMoney(minThreshold, acc.currency)}). Cần bổ sung quỹ kịp thời.`,
          fundId: acc.id,
          amount: bal,
          currency: acc.currency,
          date: now,
        });
      }
    });
  }

  // 2. Cảnh báo giao dịch chi tiêu bất thường hoặc vượt ngưỡng
  if (config.enableOutflowSpikeAlert) {
    const categoryAverages = calculateCategoryAverages(transactions);

    transactions.forEach(tx => {
      if (tx.type === 'outflow') {
        // Kiểm tra vượt ngưỡng chi tối đa
        if (config.maxSingleOutflowThresholdVND > 0 && tx.amountVND >= config.maxSingleOutflowThresholdVND) {
          alerts.push({
            id: `alert_large_tx_${tx.id}`,
            type: 'abnormal_outflow',
            severity: 'danger',
            title: `Khoản Chi Vượt Ngưỡng Lớn: ${formatMoney(tx.amountVND, 'VND')}`,
            message: `Giao dịch ngày ${tx.date} (${tx.categoryName}) tại quỹ "${tx.accountName}" vượt mức trần kiểm soát ${formatMoney(config.maxSingleOutflowThresholdVND, 'VND')}.`,
            transactionId: tx.id,
            amount: tx.amountVND,
            currency: 'VND',
            date: tx.date,
          });
        }
        // Kiểm tra đột biến so với trung bình lịch sử
        else {
          const avg = categoryAverages[tx.categoryId];
          if (avg && avg > 0 && tx.amountVND >= avg * config.anomalySpikeRatio) {
            alerts.push({
              id: `alert_spike_tx_${tx.id}`,
              type: 'abnormal_outflow',
              severity: 'warning',
              title: `Chi Phí Đột Biến: ${tx.categoryName}`,
              message: `Khoản chi ${formatMoney(tx.amountVND, 'VND')} ngày ${tx.date} gấp ${(tx.amountVND / avg).toFixed(1)}x mức trung bình (${formatMoney(avg, 'VND')}) của hạng mục này.`,
              transactionId: tx.id,
              amount: tx.amountVND,
              currency: 'VND',
              date: tx.date,
            });
          }
        }
      }
    });
  }

  return alerts;
};
