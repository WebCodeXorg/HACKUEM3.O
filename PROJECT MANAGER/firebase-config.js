// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBZs0zgqe8fJitJv8F_T4bpNkN2be2TziA",
  authDomain: "projectmanager-2129b.firebaseapp.com",
  projectId: "projectmanager-2129b",
  storageBucket: "projectmanager-2129b.firebasestorage.app",
  messagingSenderId: "311655550491",
  appId: "1:311655550491:web:0f912487759148e57d32be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };