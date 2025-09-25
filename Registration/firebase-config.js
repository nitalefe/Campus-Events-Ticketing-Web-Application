// Import Firebase from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  setDoc, 
  getDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCtCLGcR_sDwb6wDE7NpVz8vghrxLZFYB8",
  authDomain: "campus-events-ticketing-e648f.firebaseapp.com",
  projectId: "campus-events-ticketing-e648f",
  storageBucket: "campus-events-ticketing-e648f.firebasestorage.app",
  messagingSenderId: "844285609905",
  appId: "1:844285609905:web:c8913b71b2991d128c9f90",
  measurementId: "G-1TMVH5DRF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized ✅");

// ---------------- SIGN UP ----------------
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const role = document.getElementById("role").value;
    const school = document.getElementById("school").value;
    const organization = document.getElementById("organization").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        role,
        school: role === "student" ? school : null,
        organization: role === "organizer" ? organization : null,
        createdAt: new Date()
      });

      alert("Account created successfully 🎉");
      window.location.href = "SignIn.html";
    } catch (error) {
      console.error("Signup error:", error.message);
      alert(error.message);
    }
  });
}

// ---------------- SIGN IN ----------------
const signinForm = document.getElementById("signinForm");

if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User profile:", userData);

        alert(`Welcome back, ${userData.fullName}! 🎉`);

        // Redirect all users to website.html after login
        window.location.href = "website.html";
      } else {
        alert("No profile found in Firestore!");
      }
    } catch (error) {
      console.error("Login error:", error.message);
      alert(error.message);
    }
  });
}
