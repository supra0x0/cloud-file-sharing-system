// =========================================================
// SFS - FIREBASE CONFIGURATION
// Secure File Sharing System
// =========================================================

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

// =========================================================
// FIREBASE CONFIGURATION
// =========================================================
//
// IMPORTANT:
// Replace the values below with the Firebase configuration
// from YOUR Firebase project.
//
// Firebase Console
// → Project Settings
// → Your apps
// → Web App
// → Firebase SDK setup
//
// =========================================================

const firebaseConfig = {
  apiKey: "AIzaSyD7Q5oE0r9xgNHaKBY_9pH76MwCiDR3_Ew",
  authDomain: "file-share-6c224.firebaseapp.com",
  projectId: "file-share-6c224",
  storageBucket: "file-share-6c224.firebasestorage.app",
  messagingSenderId: "432213159890",
  appId: "1:432213159890:web:dfdb5c4ef5064abe2c220b",
  measurementId: "G-E59FYHQ306"
};
// =========================================================
// INITIALIZE FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);

// =========================================================
// FIREBASE SERVICES
// =========================================================

// User authentication
const auth = getAuth(app);

// Database
const db = getFirestore(app);

// File storage
const storage = getStorage(app);

// =========================================================
// EXPORT
// =========================================================
//
// Other JavaScript files can now use:
//
// import { auth, db, storage } from "./firebase.js";
//
// =========================================================

export { app, auth, db, storage };

