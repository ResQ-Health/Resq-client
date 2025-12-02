import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyApMd_5NJW1h8elnWFLB5FM-TYF1ycgkMw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'resq-health-africa.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'resq-health-africa',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'resq-health-africa.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '653104696055',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:653104696055:web:58072df5159c77c1c9e1f2',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-2BFCNPZ395'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;

