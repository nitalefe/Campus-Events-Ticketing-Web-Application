// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Your Firebase configuration (from the console)
const firebaseConfig = {
  apiKey: "AIzaSyCtCLGcR_sDwb6wDE7NpVz8vghrxLZFYB8",
  authDomain: "campus-events-ticketing-e648f.firebaseapp.com",
  projectId: "campus-events-ticketing-e648f",
  storageBucket: "campus-events-ticketing-e648f.firebasestorage.app",
  messagingSenderId: "844285609905",
  appId: "1:844285609905:web:c8913b71b2991d128c9f90",
  measurementId: "G-1TMVH5DRF3"
};

// Initialize once
const app = initializeApp(firebaseConfig);

// Create the services you’ll reuse
export const db = getFirestore(app);
export const auth = getAuth(app);
