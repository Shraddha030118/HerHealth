/**
 * HerHealth AI — Firebase Configuration & Initialization
 * Project: herhealth-b2950
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbI3ID76xxZaFrDAbsqLNRANRgtgqA8lY",
  authDomain: "herhealth-b2950.firebaseapp.com",
  projectId: "herhealth-b2950",
  storageBucket: "herhealth-b2950.firebasestorage.app",
  messagingSenderId: "380427318786",
  appId: "1:380427318786:web:d298c236d3907222f0591b",
  measurementId: "G-FXVH434GF0"
};

// Initialize Firebase App, Auth, and Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.HerHealthFirebase = {
  app,
  auth,
  db,
  // Auth primitives
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  // Firestore primitives
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
};

// Dispatch global ready event
window.dispatchEvent(new CustomEvent('herhealth-firebase-ready', { detail: window.HerHealthFirebase }));
console.log('🌸 HerHealth Firebase initialized: herhealth-b2950');
