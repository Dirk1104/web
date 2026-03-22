// ============================================
// FIREBASE CONFIGURATION
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYqUo3Yg71iLjrpUKUc_snKwXl4k2CKQo",
    authDomain: "familiekring-81a32.firebaseapp.com",
    projectId: "familiekring-81a32",
    storageBucket: "familiekring-81a32.firebasestorage.app",
    messagingSenderId: "150148207168",
    appId: "1:150148207168:web:2df85620e8d28d069e45a5",
    measurementId: "G-ZB2TDD0W09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
