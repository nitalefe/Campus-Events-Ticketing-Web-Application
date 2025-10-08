
import { auth, db } from "../../Shared/firebase-config.js";

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


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
              
               // Extra info
        let extraInfo = {};
        if (role === "student") {
          const school = document.getElementById('school').value;
          extraInfo = { school };
        } else if (role === "organizer") {
          const organization = document.getElementById('organization').value;
          extraInfo = { organization };
        }

        // Save to Firestore
        await setDoc(doc(db, "users", user.uid), {
          fullname,
          email,
          role,
          ...extraInfo
        });

        await sendEmailVerification(user);
        alert("Check your email to verify your account before logging in.");
        window.location.href = "SignIn.html";
      })
      .catch((error) => {
        console.error("Signup error:", error);
        signupError.textContent = error.message;
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

                 if (!user.emailVerified) {
            errorMsg.textContent = "Please verify your email before signing in.";
            return; // Stop here, don’t let them continue
        }
                console.log('User logged in:', user);

                // Retrieve user role from Firestore and store in localStorage
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    localStorage.setItem("userRole", userData.role);
                }
                
                // Optional: redirect by role
           // if (userData.role === "organizer") {
             //   window.location.href = "organizer-dashboard.html";
            //} else {
              //  window.location.href = "student-dashboard.html";
            ///}


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


//Forgot password: 

const forgotPasswordLink = document.getElementById('forgotPassword');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
            alert("Please enter your email above first.");
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert("Password reset email sent! Check your inbox.");
            })
            .catch((error) => {
                console.error("Error resetting password:", error);
                alert("Could not send reset email: " + error.message);
            });
    });
}




