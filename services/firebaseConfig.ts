
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDbTBzggKOu-X9xpXLwrEBdP7wLT6dsepI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hkm-church-management.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hkm-church-management",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hkm-church-management.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1067271076976",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1067271076976:web:6dffc67073969d04c6c8b5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Validate that required config is present
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!isFirebaseConfigured) {
  console.warn('Firebase configuration is incomplete. Some features may not work.');
}

const app = initializeApp(firebaseConfig);

// Initialize auth and providers immediately
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Analytics only in browser (not in Electron main process)
isSupported().then(supported => {
  if (supported) {
    getAnalytics(app);
  }
});

// Enable offline persistence for desktop/web
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available in this browser');
  }
});
