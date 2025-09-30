// Import only what you need, from CDN
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
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
        const confirmPassword = document.getElementById('confirm-password').value;
        const role = document.getElementById('role').value; 
        // ^ Example: radio buttons with name="role" and values "student" or "organizer"

        const signupError = document.getElementById('signup-error');
        signupError.textContent = "";

        if (password.length < 6) {
            signupError.textContent = "Password must be at least 6 characters long.";
            return;
        }

        if (password !== confirmPassword) {
            signupError.textContent = "Passwords do not match.";
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                console.log('User signed up:', user);

                // Store additional user info in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    fullname,
                    email,
                    role
                });

                // Optionally, retrieve and log the data to confirm
                localStorage.setItem("userRole", role);

                window.location.href = "website.html";
            })
            .catch((error) => {
                console.error('Signup error:', error);
                if (error.code === "auth/email-already-in-use") {
                    signupError.textContent = "This email is already registered. Please sign in or use a different email.";
                } else {
                    signupError.textContent = error.message;
                }
            });
    });
}


// Sign In Form
// Sign In Form
const signinForm = document.getElementById('signinForm');
if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorMsg = document.getElementById('error-message'); 
        errorMsg.textContent = "";

        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                console.log('User logged in:', user);

                // Retrieve user role from Firestore and store in localStorage
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    localStorage.setItem("userRole", userData.role);
                }

                window.location.href = "website.html";
            })
            .catch((error) => {
                console.error('Login error:', error.code);

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


// Logout Button
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth)
            .then(() => {
                window.location.href = "SignIn.html";
            })
            .catch((error) => {
                alert("Error logging out. Please try again.");
            });
    });
}


