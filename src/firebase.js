import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ╔══════════════════════════════════════════════════════════════╗
// ║  FIREBASE SETUP — Follow these steps:                        ║
// ║                                                              ║
// ║  1. Go to https://console.firebase.google.com               ║
// ║  2. Click "Create a project" → name it "rival-app"          ║
// ║  3. Once created, click the web icon (</>) to add a web app ║
// ║  4. Copy your config values below                           ║
// ║  5. In the Firebase console sidebar:                        ║
// ║     • Authentication → Sign-in method → Enable Email/Pass   ║
// ║     • Firestore Database → Create database → Start in       ║
// ║       test mode (we'll lock it down later)                  ║
// ╚══════════════════════════════════════════════════════════════╝

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
