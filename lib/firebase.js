// lib/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  setLogLevel
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔍 DEBUG: Firestore műveletek logolása a konzolba
// Kommenteld ki production-ben!
if (typeof window !== 'undefined') {
  setLogLevel('debug');
}

// 1. lépés: Olvassuk be a "titkos fiókból" (process.env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 2. lépés: Csatlakozzunk a Firebase "központhoz" (az App)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 3. lépés: Készítsük elő a "szerszámokat"
const auth = getAuth(app);

// Firestore beállítás natív offline cache-sel a gyors betöltéshez
let db;
if (!getApps().length || typeof window === 'undefined') {
  // Server-side vagy első inicializálás
  db = getFirestore(app);
} else {
  try {
    // Kliens oldali Firestore natív cache bekapcsolása
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    // Ha már inicializálva van, használjuk a meglévőt
    db = getFirestore(app);
  }
}

const storage = getStorage(app);

// 4. lépés: Exportálás
export { app, auth, db, storage };
