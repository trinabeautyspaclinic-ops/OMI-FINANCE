import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore Database
const configRecord = firebaseConfig as Record<string, any>;
export const db = configRecord.firestoreDatabaseId && configRecord.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configRecord.firestoreDatabaseId)
  : getFirestore(app);

// Authentication & OAuth
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));

// Persistent OAuth Token Cache: Stored in localStorage so it NEVER resets on F5 or page refresh
const TOKEN_STORAGE_KEY = 'tf_google_oauth_token_permanent';

let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem('tf_google_oauth_token');
  } catch (e) {
    return null;
  }
})();
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem('tf_google_oauth_token');
        } catch (e) {
          // ignore
        }
      }

      // Always notify auth success with user even if token needs silent refresh
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      // User explicitly signed out
      if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem('tf_google_oauth_token');
        } catch (e) {}
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được token truy cập Google Sheets từ Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
      sessionStorage.setItem('tf_google_oauth_token', cachedAccessToken);
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem('tf_google_oauth_token');
    } catch (e) {}
  }
  return cachedAccessToken;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem('tf_google_oauth_token');
  } catch (e) {}
};

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[OmniFlow Cloud] Firestore connected successfully.');
    return true;
  } catch (error) {
    console.warn('[OmniFlow Cloud] Firestore note:', error);
    return false;
  }
}

export default app;
