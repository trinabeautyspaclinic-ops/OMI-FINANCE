import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { AccountWallet, Category, DividendDistribution, ExchangeRate, Shareholder, Transaction } from '../types/cashflow';

// Sync Transactions in real-time
export function subscribeToTransactions(
  onData: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Transaction);
      });
      // Sort newest date first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onData(items);
    },
    (err) => {
      console.warn('[OmniFlow Firebase] Transactions subscribe note:', err);
      if (onError) onError(err);
    }
  );
}

// Save or Update a single transaction to Cloud
export async function saveTransactionToCloud(tx: Transaction) {
  const docRef = doc(db, 'transactions', tx.id);
  await setDoc(docRef, tx, { merge: true });
}

// Bulk save transactions to Cloud
export async function saveTransactionsBulkToCloud(transactions: Transaction[]) {
  const promises = transactions.map(tx => {
    const docRef = doc(db, 'transactions', tx.id);
    return setDoc(docRef, tx, { merge: true });
  });
  await Promise.all(promises);
}

// Delete a transaction from Cloud
export async function deleteTransactionFromCloud(id: string) {
  const docRef = doc(db, 'transactions', id);
  await deleteDoc(docRef);
}

// Sync Accounts in real-time
export function subscribeToAccounts(
  onData: (accounts: AccountWallet[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, 'accounts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const items: AccountWallet[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AccountWallet);
      });
      onData(items);
    },
    (err) => {
      console.warn('[OmniFlow Firebase] Accounts subscribe note:', err);
      if (onError) onError(err);
    }
  );
}

// Save account changes to Cloud
export async function saveAccountToCloud(account: AccountWallet) {
  const docRef = doc(db, 'accounts', account.id);
  await setDoc(docRef, account, { merge: true });
}

// Delete an account from Cloud
export async function deleteAccountFromCloud(id: string) {
  const docRef = doc(db, 'accounts', id);
  await deleteDoc(docRef);
}

// Save all accounts in bulk
export async function saveAccountsBulkToCloud(accounts: AccountWallet[]) {
  for (const acc of accounts) {
    await saveAccountToCloud(acc);
  }
}

// Sync Dividend Distributions in real-time
export function subscribeToDividends(
  onData: (dividends: DividendDistribution[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, 'dividends');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: DividendDistribution[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as DividendDistribution);
      });
      items.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
      onData(items);
    },
    (err) => {
      console.warn('[OmniFlow Firebase] Dividends subscribe note:', err);
      if (onError) onError(err);
    }
  );
}

// Save a dividend payout to Cloud
export async function saveDividendToCloud(dividend: DividendDistribution) {
  const docRef = doc(db, 'dividends', dividend.id);
  await setDoc(docRef, dividend, { merge: true });
}

// Sync General Settings (Shareholders, Rates, AlertConfig, Categories, Google Sheets Config)
export function subscribeToSettings(
  onData: (settings: {
    shareholders?: Shareholder[];
    rates?: ExchangeRate[];
    categories?: Category[];
    sheetsConfig?: any;
  }) => void
) {
  const docRef = doc(db, 'settings', 'general');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as any);
      }
    },
    (err) => {
      console.warn('[OmniFlow Firebase] Settings note:', err);
    }
  );
}

// Save general settings
export async function saveSettingsToCloud(data: {
  shareholders?: Shareholder[];
  rates?: ExchangeRate[];
  categories?: Category[];
  sheetsConfig?: any;
}) {
  const docRef = doc(db, 'settings', 'general');
  await setDoc(docRef, data, { merge: true });
}
