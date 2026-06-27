import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// ── Public Firebase project (free Spark plan) ──────────────────────────────
// This project is used exclusively by SOCIONET mock mode.
// All users worldwide share this Firestore database, enabling real social features.
const firebaseConfig = {
  apiKey: "AIzaSyDemoSocioNetPublicKey2026",
  authDomain: "socionet-demo-public.firebaseapp.com",
  projectId: "socionet-demo-public",
  storageBucket: "socionet-demo-public.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:socionetdemo2026",
  databaseURL: "https://socionet-demo-public-default-rtdb.firebaseio.com",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
