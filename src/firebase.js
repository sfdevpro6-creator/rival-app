import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD3HyaLn7vjON8z_ferBJK1IBET4O4CAVw",
  authDomain: "rival-27027.firebaseapp.com",
  projectId: "rival-27027",
  storageBucket: "rival-27027.firebasestorage.app",
  messagingSenderId: "1754548006",
  appId: "1:1754548006:web:fa2802adc6089697d8a3e7",
  measurementId: "G-HSY6JHNXQZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

