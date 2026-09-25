import React, { useState, useEffect } from 'react';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_CATEGORIES, 
  INITIAL_DIVIDEND_DISTRIBUTIONS, 
  INITIAL_EXCHANGE_RATES, 
  INITIAL_SHAREHOLDERS, 
  INITIAL_TRANSACTIONS 
} from './data/initialData';
import { 
  AccountWallet, 
  AlertConfig, 
  Category, 
  Currency, 
  DividendDistribution, 
  ExchangeRate, 
  Shareholder, 
  TimeFilterPeriod, 
  Transaction 
} from './types/cashflow';
import { calculateAccountBalances, filterTransactionsByPeriod } from './utils/cashflowCalculations';
import { DEFAULT_ALERT_CONFIG, detectActiveAlerts } from './utils/alertUtils';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { TransactionsView } from './components/TransactionsView';
import { FundManagerView } from './components/FundManagerView';
import { AlertCenterView } from './components/AlertCenterView';
import { DividendView } from './components/DividendView';
import { GoogleSheetsGuideView } from './components/GoogleSheetsGuideView';
import { CategoryManagerView } from './components/CategoryManagerView';
import { CashflowAllocationView } from './components/CashflowAllocationView';
import { TransactionModal } from './components/TransactionModal';
import { TransferFundModal } from './components/TransferFundModal';
import { ShareholderModal } from './components/ShareholderModal';
import { RotateCcw } from 'lucide-react';
import { testFirebaseConnection, getAccessToken } from './services/firebase';
import { getLocalSheetsConfig, saveLocalSheetsConfig, syncSingleTransactionToSheet, GoogleSheetsSyncConfig } from './services/googleSheetsSync';
import { SEED_USDT_TRANSACTIONS } from './data/seedUsdtData';
import { 
  subscribeToTransactions, 
  subscribeToAccounts, 
  subscribeToDividends, 
  subscribeToSettings,
  saveTransactionToCloud,
  saveTransactionsBulkToCloud,
  deleteTransactionFromCloud,
  clearAllTransactionsFromCloud,
  saveAccountToCloud,
  saveAccountsBulkToCloud,
  deleteAccountFromCloud,
  saveDividendToCloud,
  saveSettingsToCloud
} from './services/cashflowSync';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'funds' | 'allocation' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide'>('dashboard');

  // Persistence State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('omniflow_transactions_v3');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState<AccountWallet[]>(() => {
    try {
      const saved = localStorage.getItem('omniflow_accounts_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading accounts from localStorage', e);
    }
    return INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('omniflow_categories_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading categories from localStorage', e);
    }
    return INITIAL_CATEGORIES;
  });

  const [rates, setRates] = useState<ExchangeRate[]>(() => {
    const saved = localStorage.getItem('omniflow_rates_v3');
    return saved ? JSON.parse(saved) : INITIAL_EXCHANGE_RATES;
  });

  const [shareholders, setShareholders] = useState<Shareholder[]>(() => {
    const saved = localStorage.getItem('omniflow_shareholders_v3');
    return saved ? JSON.parse(saved) : INITIAL_SHAREHOLDERS;
  });

  const [dividendDistributions, setDividendDistributions] = useState<DividendDistribution[]>(() => {
    const saved = localStorage.getItem('omniflow_dividends_v3');
    return saved ? JSON.parse(saved) : INITIAL_DIVIDEND_DISTRIBUTIONS;
  });

  const [alertConfig, setAlertConfig] = useState<AlertConfig>(() => {
    const saved = localStorage.getItem('omniflow_alert_config');
    return saved ? JSON.parse(saved) : DEFAULT_ALERT_CONFIG;
  });

  // Google Sheets Config (Persisted in Cloud Firestore)
  const [cloudSheetsConfig, setCloudSheetsConfig] = useState<GoogleSheetsSyncConfig | null>(() => {
    return getLocalSheetsConfig();
  });

  // Time Period Filter
  const [selectedPeriod, setSelectedPeriod] = useState<TimeFilterPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Modals & Editing State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isShareholderModalOpen, setIsShareholderModalOpen] = useState(false);

  // 1. Initial Test Connection on boot
  useEffect(() => {
    testFirebaseConnection();
  }, []);

  // Helper to read deleted account IDs
  const getDeletedAccountIds = (): Set<string> => {
    try {
      const saved = localStorage.getItem('omniflow_deleted_accounts');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      return new Set();
    }
  };

  // 2. Realtime Subscriptions to Cloud Firestore with smart merging and local protection
  useEffect(() => {
    const unsubscribeTx = subscribeToTransactions((cloudTx) => {
      if (cloudTx && cloudTx.length > 0) {
        setTransactions(cloudTx);
        localStorage.setItem('omniflow_transactions_v3', JSON.stringify(cloudTx));
      }
    });

    const unsubscribeAccounts = subscribeToAccounts((cloudAccounts) => {
      // Get current local accounts
      let localAccounts: AccountWallet[] = [];
      try {
        const saved = localStorage.getItem('omniflow_accounts_v3');
        if (saved) localAccounts = JSON.parse(saved);
      } catch (e) {}

      const deletedIds = getDeletedAccountIds();

      if (cloudAccounts && cloudAccounts.length > 0) {
        // Filter out deleted accounts from cloud
        const activeCloudAccounts = cloudAccounts.filter(a => !deletedIds.has(a.id));
        const cloudIdMap = new Map(activeCloudAccounts.map(a => [a.id, a]));

        // Merge: keep cloud accounts, and KEEP any local accounts that are not in cloud yet
        const merged: AccountWallet[] = [...activeCloudAccounts];
        const missingFromCloud: AccountWallet[] = [];

        for (const localAcc of localAccounts) {
          if (!deletedIds.has(localAcc.id) && !cloudIdMap.has(localAcc.id)) {
            merged.push(localAcc);
            missingFromCloud.push(localAcc);
          }
        }

        // Push local accounts missing from cloud
        if (missingFromCloud.length > 0) {
          saveAccountsBulkToCloud(missingFromCloud).catch(console.warn);
        }

        setAccounts(merged);
        localStorage.setItem('omniflow_accounts_v3', JSON.stringify(merged));
      } else {
        // If cloud snapshot is empty or offline, preserve local accounts!
        if (localAccounts.length > 0) {
          setAccounts(localAccounts);
          saveAccountsBulkToCloud(localAccounts).catch(console.warn);
        } else {
          setAccounts(INITIAL_ACCOUNTS);
          localStorage.setItem('omniflow_accounts_v3', JSON.stringify(INITIAL_ACCOUNTS));
          saveAccountsBulkToCloud(INITIAL_ACCOUNTS).catch(console.warn);
        }
      }
    });

    const unsubscribeDividends = subscribeToDividends((cloudDividends) => {
      if (cloudDividends && cloudDividends.length > 0) {
        setDividendDistributions(cloudDividends);
        localStorage.setItem('omniflow_dividends_v3', JSON.stringify(cloudDividends));
      }
    });

    const unsubscribeSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings.shareholders && cloudSettings.shareholders.length > 0) {
        setShareholders(cloudSettings.shareholders);
      }
      if (cloudSettings.rates && cloudSettings.rates.length > 0) {
        setRates(cloudSettings.rates);
      }

      // Handle categories safely: NEVER overwrite user-edited local categories with stale/default cloud data!
      let localCategories: Category[] = [];
      let localUpdatedAt = 0;
      try {
        const saved = localStorage.getItem('omniflow_categories_v3');
        if (saved) localCategories = JSON.parse(saved);
        const savedTs = localStorage.getItem('omniflow_categories_updated_at');
        if (savedTs) localUpdatedAt = parseInt(savedTs, 10) || 0;
      } catch (e) {}

      const cloudCategories = cloudSettings.categories;
      const cloudUpdatedAt = cloudSettings.categoriesUpdatedAt || 0;

      if (cloudCategories && cloudCategories.length > 0) {
        // If local has no categories yet, or cloud has a strictly newer timestamp:
        if (localCategories.length === 0 || (cloudUpdatedAt > localUpdatedAt && cloudUpdatedAt > 0)) {
          setCategories(cloudCategories);
          localStorage.setItem('omniflow_categories_v3', JSON.stringify(cloudCategories));
          if (cloudUpdatedAt) {
            localStorage.setItem('omniflow_categories_updated_at', cloudUpdatedAt.toString());
          }
        } else if (localUpdatedAt > cloudUpdatedAt) {
          // Local is newer than cloud: sync local up to cloud
          saveSettingsToCloud({
            categories: localCategories,
            categoriesUpdatedAt: localUpdatedAt
          }).catch(console.warn);
        }
      } else {
        // Cloud categories is empty/undefined: upload local categories to cloud, DO NOT OVERWRITE LOCAL!
        const catsToSave = localCategories.length > 0 ? localCategories : INITIAL_CATEGORIES;
        saveSettingsToCloud({
          categories: catsToSave,
          categoriesUpdatedAt: localUpdatedAt || Date.now()
        }).catch(console.warn);
      }

      if (cloudSettings.sheetsConfig) {
        setCloudSheetsConfig(cloudSettings.sheetsConfig);
        saveLocalSheetsConfig(cloudSettings.sheetsConfig);
      }
    });

    return () => {
      unsubscribeTx();
      unsubscribeAccounts();
      unsubscribeDividends();
      unsubscribeSettings();
    };
  }, []);

  // Compute Account Balances & Active Alerts
  const balances = calculateAccountBalances(accounts, transactions, rates);
  const activeAlerts = detectActiveAlerts(accounts, balances, transactions, alertConfig);

  // Handlers with instant Cloud persistence
  const handleSaveTransaction = async (savedTx: Transaction) => {
    // Optimistic UI update
    setTransactions(prev => {
      const exists = prev.some(t => t.id === savedTx.id);
      if (exists) {
        return prev.map(t => (t.id === savedTx.id ? savedTx : t));
      }
      return [savedTx, ...prev];
    });
    setEditingTransaction(null);

    // Save to Cloud Firestore
    try {
      await saveTransactionToCloud(savedTx);
    } catch (err) {
      console.error('Lỗi lưu giao dịch lên đám mây:', err);
    }

    // Auto-save to Google Sheets if connected and enabled
    try {
      const sheetsCfg = getLocalSheetsConfig();
      if (sheetsCfg.spreadsheetId && sheetsCfg.autoSyncEnabled) {
        const token = await getAccessToken();
        if (token) {
          syncSingleTransactionToSheet(token, sheetsCfg.spreadsheetId, savedTx).catch(sheetErr => {
            console.warn('[Google Sheets Auto-Save] Không thể đồng bộ giao dịch:', sheetErr);
          });
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTransactionFromCloud(id);
    } catch (err) {
      console.error('Lỗi xóa giao dịch trên đám mây:', err);
    }
  };

  const handleUpdateAccountThreshold = async (accountId: string, newThreshold: number) => {
    const updated = accounts.map(a => (a.id === accountId ? { ...a, minBalanceThreshold: newThreshold } : a));
    setAccounts(updated);
    localStorage.setItem('omniflow_accounts_v3', JSON.stringify(updated));
    const targetAcc = updated.find(a => a.id === accountId);
    if (targetAcc) {
      try {
        await saveAccountToCloud(targetAcc);
      } catch (err) {
        console.error('Lỗi cập nhật ngưỡng lên đám mây:', err);
      }
    }
  };

  const handleUpdateAccountInitialBalance = async (accountId: string, newInitialBalance: number) => {
    const updated = accounts.map(a => (a.id === accountId ? { ...a, initialBalance: newInitialBalance } : a));
    setAccounts(updated);
    localStorage.setItem('omniflow_accounts_v3', JSON.stringify(updated));
    const targetAcc = updated.find(a => a.id === accountId);
    if (targetAcc) {
      try {
        await saveAccountToCloud(targetAcc);
      } catch (err) {
        console.error('Lỗi cập nhật số dư gốc lên đám mây:', err);
      }
    }
  };

  const handleSaveAccount = async (account: AccountWallet) => {
    let updatedAccounts: AccountWallet[] = [];
    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id);
      if (idx >= 0) {
        updatedAccounts = [...prev];
        updatedAccounts[idx] = account;
      } else {
        updatedAccounts = [...prev, account];
      }
      localStorage.setItem('omniflow_accounts_v3', JSON.stringify(updatedAccounts));
      return updatedAccounts;
    });

    // Xóa khỏi danh sách đã xóa nếu tạo lại cùng ID
    try {
      const deleted = JSON.parse(localStorage.getItem('omniflow_deleted_accounts') || '[]');
      const filtered = deleted.filter((id: string) => id !== account.id);
      localStorage.setItem('omniflow_deleted_accounts', JSON.stringify(filtered));
    } catch (e) {}

    try {
      await saveAccountToCloud(account);
    } catch (err) {
      console.error('Lỗi lưu quỹ lên đám mây:', err);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== accountId);
      localStorage.setItem('omniflow_accounts_v3', JSON.stringify(updated));
      return updated;
    });

    // Đánh dấu ID đã xóa để listener không kéo lại từ cache cũ
    try {
      const deleted = JSON.parse(localStorage.getItem('omniflow_deleted_accounts') || '[]');
      if (!deleted.includes(accountId)) {
        deleted.push(accountId);
        localStorage.setItem('omniflow_deleted_accounts', JSON.stringify(deleted));
      }
    } catch (e) {}

    try {
      await deleteAccountFromCloud(accountId);
    } catch (err) {
      console.error('Lỗi xóa quỹ trên đám mây:', err);
    }
  };

  const handleAddDividendDistribution = async (newDist: DividendDistribution) => {
    setDividendDistributions(prev => [newDist, ...prev]);

    // Tự động hạch toán giao dịch chi cổ tức vào sổ dòng tiền
    const defaultVndAccount = accounts.find(a => a.currency === 'VND' && a.id === 'acc_techcom') || accounts[0];
    const dividendTx: Transaction = {
      id: `TX-DIV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'dividend_payout',
      categoryId: 'cat_dividend_out',
      categoryName: 'Chi Trả Cổ Tức Cổ Đông',
      categoryGroup: 'dividend',
      accountId: defaultVndAccount.id,
      accountName: defaultVndAccount.name,
      originalCurrency: 'VND',
      originalAmount: newDist.distributableProfitVND,
      exchangeRate: 1,
      amountVND: newDist.distributableProfitVND,
      description: `Chi trả cổ tức ${newDist.periodLabel} cho Cổ đông D và Cổ đông T (${newDist.code})`,
      partnerOrBranch: 'Cổ đông D & T',
      referenceCode: newDist.code,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [dividendTx, ...prev]);

    try {
      await saveDividendToCloud(newDist);
      await saveTransactionToCloud(dividendTx);
    } catch (err) {
      console.error('Lỗi đồng bộ chia cổ tức lên đám mây:', err);
    }
  };

  const handleSaveShareholders = async (newShareholders: Shareholder[]) => {
    setShareholders(newShareholders);
    try {
      await saveSettingsToCloud({ shareholders: newShareholders });
    } catch (err) {
      console.error('Lỗi lưu cổ đông lên đám mây:', err);
    }
  };

  const handleUpdateCategories = async (newCategories: Category[]) => {
    const timestamp = Date.now();
    setCategories(newCategories);
    localStorage.setItem('omniflow_categories_v3', JSON.stringify(newCategories));
    localStorage.setItem('omniflow_categories_updated_at', timestamp.toString());
    try {
      await saveSettingsToCloud({ 
        categories: newCategories,
        categoriesUpdatedAt: timestamp
      });
    } catch (err) {
      console.error('Lỗi lưu hạng mục lên đám mây:', err);
    }
  };

  const handleSaveCloudSheetsConfig = async (newConfig: GoogleSheetsSyncConfig) => {
    setCloudSheetsConfig(newConfig);
    saveLocalSheetsConfig(newConfig);
    try {
      await saveSettingsToCloud({ sheetsConfig: newConfig });
    } catch (err) {
      console.error('Lỗi lưu cấu hình Google Sheets lên đám mây:', err);
    }
  };

  const handleImportUsdtSheet = async () => {
    // Merge USDT transactions ensuring no duplicate IDs
    const existingIds = new Set(transactions.map(t => t.id));
    const toAdd = SEED_USDT_TRANSACTIONS.filter(t => !existingIds.has(t.id));

    // Update initial balance of USDT wallet if not yet 45,332
    const updatedAccounts = accounts.map(a => 
      a.id === 'acc_binance_usdt' ? { ...a, initialBalance: 45332 } : a
    );
    setAccounts(updatedAccounts);
    saveAccountsBulkToCloud(updatedAccounts).catch(console.warn);

    if (toAdd.length === 0) {
      alert('Tất cả 28 giao dịch Thu Chi USDT đã có trong sổ cái!');
      return;
    }

    const merged = [...toAdd, ...transactions];
    setTransactions(merged);
    localStorage.setItem('omniflow_transactions_v3', JSON.stringify(merged));
    await saveTransactionsBulkToCloud(toAdd);

    alert(`Đã nạp thành công ${toAdd.length} giao dịch Thu Chi USDT vào sổ cái và đồng bộ Cloud!`);
  };

  const handleClearAllOldTransactions = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ các giao dịch cũ để bắt đầu sổ cái mới từ quỹ hiện tại không?')) {
      return;
    }
    const oldTx = [...transactions];
    setTransactions([]);
    localStorage.setItem('omniflow_transactions_v3', JSON.stringify([]));
    try {
      await clearAllTransactionsFromCloud(oldTx);
    } catch (e) {
      console.warn('Lỗi dọn dẹp giao dịch cloud:', e);
    }
  };

  // Khởi tạo Quỹ Thực Tế: Bank 140.477.765 đ, USDT 62.718,22 USDT
  // TUYỆT ĐỐI BẢO TOÀN DANH MỤC HẠNG MỤC THU/CHI ĐÃ SỬA CỦA NGƯỜI DÙNG!
  const handleResetData = async () => {
    const confirmMessage = 
      'Khởi tạo lại số dư Quỹ thực tế ban đầu:\n' +
      '• Tài khoản Ngân hàng (Bank VND): 140.477.765 đ\n' +
      '• Ví USDT: 62.718,22 USDT\n' +
      '• Quỹ Tiền Mặt Tại Két: 0 đ\n' +
      '• Các giao dịch cũ sẽ được dọn sạch để bắt đầu từ số dư quỹ này.\n\n' +
      '★ BẢO ĐẢM: Toàn bộ danh mục Hạng mục thu/chi bạn đã sửa, danh sách cổ đông và tỷ giá sẽ được GIỮ NGUYÊN VẸN 100%.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // 1. Dọn dẹp giao dịch cũ để bắt đầu sổ cái mới từ mốc số dư thực tế
    const oldTx = [...transactions];
    setTransactions([]);
    localStorage.setItem('omniflow_transactions_v3', JSON.stringify([]));
    try {
      await clearAllTransactionsFromCloud(oldTx);
    } catch (e) {
      console.warn('Clear cloud tx note:', e);
    }

    // 2. Cập nhật số dư quỹ thực tế cho các tài khoản, giữ nguyên bất kỳ quỹ nào người dùng đã tạo thêm!
    const targetBankVnd = 140477765;
    const targetUsdt = 62718.22;

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === 'acc_techcom' || (acc.currency === 'VND' && acc.category === 'bank_vn')) {
        return { ...acc, initialBalance: targetBankVnd };
      }
      if (acc.id === 'acc_binance_usdt' || (acc.currency === 'USDT' && acc.category === 'wallet_usdt')) {
        return { ...acc, initialBalance: targetUsdt };
      }
      if (acc.id === 'acc_cash_vnd') {
        return { ...acc, initialBalance: 0 };
      }
      return acc;
    });

    const hasBank = updatedAccounts.some(a => a.id === 'acc_techcom' || (a.currency === 'VND' && a.category === 'bank_vn'));
    const hasUsdt = updatedAccounts.some(a => a.id === 'acc_binance_usdt' || (a.currency === 'USDT' && a.category === 'wallet_usdt'));

    let finalAccounts = [...updatedAccounts];
    if (!hasBank) finalAccounts.push(INITIAL_ACCOUNTS[0]);
    if (!hasUsdt) finalAccounts.push(INITIAL_ACCOUNTS[1]);

    setAccounts(finalAccounts);
    localStorage.setItem('omniflow_accounts_v3', JSON.stringify(finalAccounts));
    saveAccountsBulkToCloud(finalAccounts).catch(console.warn);

    // 3. HẠNG MỤC THU CHI HOÀN TOÀN ĐƯỢC GIỮ NGUYÊN!
    alert('Đã khởi tạo số dư Quỹ thực tế thành công!\n• Bank VND: 140.477.765 đ\n• Ví USDT: 62.718,22 USDT\nToàn bộ Hạng mục Thu Chi của bạn đã được giữ nguyên vẹn.');
  };

  const filteredTransactions = filterTransactionsByPeriod(
    transactions,
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-slate-200 selection:text-slate-900 font-sans antialiased">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenTransferModal={() => setIsTransferModalOpen(true)}
        transactions={transactions}
        alertCount={activeAlerts.length}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <SummaryCards
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              accounts={accounts}
              rates={rates}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
              onOpenNewTransaction={handleOpenNewTransaction}
              onNavigateToFunds={() => setActiveTab('funds')}
              onNavigateToAllocation={() => setActiveTab('allocation')}
            />

            {/* Recent Transactions List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Giao Dịch Dòng Tiền Gần Đây
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Xem toàn bộ sổ giao dịch →
                </button>
              </div>
              <TransactionsView
                transactions={transactions.slice(0, 8)}
                accounts={accounts}
                categories={categories}
                onOpenNewTransaction={handleOpenNewTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          </div>
        )}

        {activeTab === 'allocation' && (
          <CashflowAllocationView
            transactions={transactions}
            filteredTransactions={filteredTransactions}
            accounts={accounts}
            categories={categories}
            rates={rates}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            onOpenNewTransaction={handleOpenNewTransaction}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onClearAllTransactions={handleClearAllOldTransactions}
            onLoadUsdtSheetData={handleImportUsdtSheet}
          />
        )}

        {activeTab === 'funds' && (
          <FundManagerView
            accounts={accounts}
            transactions={transactions}
            rates={rates}
            onUpdateAccountThreshold={handleUpdateAccountThreshold}
            onUpdateAccountInitialBalance={handleUpdateAccountInitialBalance}
            onSaveAccount={handleSaveAccount}
            onDeleteAccount={handleDeleteAccount}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
            onEditTransaction={handleEditTransaction}
            onResetActualFunds={handleResetData}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManagerView
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertCenterView
            alerts={activeAlerts}
            accounts={accounts}
            alertConfig={alertConfig}
            onUpdateAlertConfig={setAlertConfig}
            onNavigateToFund={() => setActiveTab('funds')}
            onEditTransaction={txId => {
              const targetTx = transactions.find(t => t.id === txId);
              if (targetTx) handleEditTransaction(targetTx);
            }}
          />
        )}

        {activeTab === 'dividends' && (
          <DividendView
            transactions={transactions}
            shareholders={shareholders}
            dividendDistributions={dividendDistributions}
            accounts={accounts}
            onAddDividendDistribution={handleAddDividendDistribution}
            onOpenShareholderModal={() => setIsShareholderModalOpen(true)}
          />
        )}

        {activeTab === 'sheets_guide' && (
          <GoogleSheetsGuideView 
            transactions={transactions} 
            cloudSheetsConfig={cloudSheetsConfig}
            onSaveCloudSheetsConfig={handleSaveCloudSheetsConfig}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>OmniFlow · Hệ Thống Quản Trị Quỹ Tiền Mặt & Dòng Tiền Đa Tệ</div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              title="Đặt lại số dư quỹ ban đầu theo số thực tế và dọn dẹp sạch giao dịch"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khởi tạo Quỹ Thực Tế (Bank: 140tr + 62.718 USDT)</span>
            </button>
            <span className="text-slate-800">|</span>
            <span>Cổ đông D & T</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        accounts={accounts}
        categories={categories}
        rates={rates}
        editingTransaction={editingTransaction}
        onManageCategories={() => setActiveTab('categories')}
      />

      <TransferFundModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSave={handleSaveTransaction}
        accounts={accounts}
      />

      <ShareholderModal
        isOpen={isShareholderModalOpen}
        onClose={() => setIsShareholderModalOpen(false)}
        shareholders={shareholders}
        onUpdateShareholders={handleSaveShareholders}
      />
    </div>
  );
}
