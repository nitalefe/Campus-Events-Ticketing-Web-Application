// Import only what you need, from CDN
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
    import { getFirestore, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";



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
     
// Sign Up Form
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log('User signed up:', user);
                window.location.href = "website.html";
            })
            .catch((error) => {
                console.error('Signup error:', error);
            });
    });
}

// Sign In Form
const signinForm = document.getElementById('signinForm');
if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorMsg = document.getElementById('error-message'); 
        errorMsg.textContent = ""; // clear old messages

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log('User logged in:', user);
                window.location.href = "website.html";
            })
            .catch((error) => {
                console.error('Login error:', error.code); // log for devs only

                // Always show a simple message to users
                if (
                    error.code === "auth/invalid-credential" ||
                    error.code === "auth/wrong-password" ||
                    error.code === "auth/user-not-found" ||
                    error.code === "auth/invalid-email"
                ) {
                    errorMsg.textContent = "Invalid email or password. Please try again.";
                } else {
                    errorMsg.textContent = "Something went wrong. Please try again later.";
                }
            });
    });
}


