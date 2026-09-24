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
  saveAccountToCloud,
  saveAccountsBulkToCloud,
  saveDividendToCloud,
  saveSettingsToCloud
} from './services/cashflowSync';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'funds' | 'categories' | 'alerts' | 'dividends' | 'sheets_guide'>('dashboard');

  // Persistence State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('omniflow_transactions_v3');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState<AccountWallet[]>(() => {
    const saved = localStorage.getItem('omniflow_accounts_v3');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('omniflow_categories_v3');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
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

  // 2. Realtime Subscriptions to Cloud Firestore
  useEffect(() => {
    const unsubscribeTx = subscribeToTransactions((cloudTx) => {
      if (cloudTx.length > 0) {
        setTransactions(cloudTx);
        localStorage.setItem('omniflow_transactions_v3', JSON.stringify(cloudTx));
      } else {
        // If first time cloud has no transactions, seed initial transactions from USDT sheet
        saveTransactionsBulkToCloud(INITIAL_TRANSACTIONS).catch(console.warn);
      }
    });

    const unsubscribeAccounts = subscribeToAccounts((cloudAccounts) => {
      if (cloudAccounts.length > 0) {
        setAccounts(cloudAccounts);
        localStorage.setItem('omniflow_accounts_v3', JSON.stringify(cloudAccounts));
      } else {
        // If first time cloud is empty, seed initial accounts
        saveAccountsBulkToCloud(INITIAL_ACCOUNTS).catch(console.warn);
      }
    });

    const unsubscribeDividends = subscribeToDividends((cloudDividends) => {
      setDividendDistributions(cloudDividends);
      localStorage.setItem('omniflow_dividends_v3', JSON.stringify(cloudDividends));
    });

    const unsubscribeSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings.shareholders && cloudSettings.shareholders.length > 0) {
        setShareholders(cloudSettings.shareholders);
      }
      if (cloudSettings.rates && cloudSettings.rates.length > 0) {
        setRates(cloudSettings.rates);
      }
      if (cloudSettings.categories && cloudSettings.categories.length > 0) {
        setCategories(cloudSettings.categories);
        localStorage.setItem('omniflow_categories_v3', JSON.stringify(cloudSettings.categories));
      } else {
        // If first time cloud categories is empty, persist current INITIAL_CATEGORIES to Cloud
        saveSettingsToCloud({ categories: INITIAL_CATEGORIES }).catch(console.warn);
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
    const targetAcc = updated.find(a => a.id === accountId);
    if (targetAcc) {
      try {
        await saveAccountToCloud(targetAcc);
      } catch (err) {
        console.error('Lỗi cập nhật số dư gốc lên đám mây:', err);
      }
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
    setCategories(newCategories);
    localStorage.setItem('omniflow_categories_v3', JSON.stringify(newCategories));
    try {
      await saveSettingsToCloud({ categories: newCategories });
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

  const handleResetData = async () => {
    if (window.confirm('Đặt lại toàn bộ sổ cái về trạng thái trắng (xóa mọi giao dịch và đặt lại số dư 0)?')) {
      localStorage.removeItem('omniflow_transactions_v3');
      localStorage.removeItem('omniflow_accounts_v3');
      localStorage.removeItem('omniflow_categories_v3');
      localStorage.removeItem('omniflow_rates_v3');
      localStorage.removeItem('omniflow_shareholders_v3');
      localStorage.removeItem('omniflow_dividends_v3');
      localStorage.removeItem('omniflow_alert_config');

      setTransactions(INITIAL_TRANSACTIONS);
      setAccounts(INITIAL_ACCOUNTS);
      setCategories(INITIAL_CATEGORIES);
      setRates(INITIAL_EXCHANGE_RATES);
      setShareholders(INITIAL_SHAREHOLDERS);
      setDividendDistributions(INITIAL_DIVIDEND_DISTRIBUTIONS);
      setAlertConfig(DEFAULT_ALERT_CONFIG);

      // Xóa cloud
      try {
        for (const tx of transactions) {
          await deleteTransactionFromCloud(tx.id);
        }
        await saveAccountsBulkToCloud(INITIAL_ACCOUNTS);
      } catch (e) {
        console.warn('Reset cloud note:', e);
      }
    }
  };

  const filteredTransactions = filterTransactionsByPeriod(
    transactions,
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
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
            />

            {/* Recent Transactions List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Giao Dịch Dòng Tiền Gần Đây
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
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

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
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
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
            onEditTransaction={handleEditTransaction}
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
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              title="Khôi phục dữ liệu demo ban đầu"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Dữ liệu mẫu chuẩn</span>
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
