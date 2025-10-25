import { auth, db } from "../../Shared/firebase-config.js";

<<<<<<< HEAD
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
=======
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
>>>>>>> main
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ---------------- SIGN UP ---------------- */
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
<<<<<<< HEAD
    const role = document.getElementById('role').value; 
=======
    const role = document.getElementById('role').value;
>>>>>>> main

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

        // Send verification email
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

/* ---------------- SIGN IN ---------------- */
const signinForm = document.getElementById('signinForm');
if (signinForm) {
  signinForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
<<<<<<< HEAD
    const errorMsg = document.getElementById('error-message'); 
=======
    const errorMsg = document.getElementById('error-message');
>>>>>>> main
    errorMsg.textContent = "";

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        if (!user.emailVerified) {
          errorMsg.textContent = "Please verify your email before signing in.";
          await signOut(auth);
          return;
        }

        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          localStorage.setItem("userRole", userData.role);

          // Redirect by role
          if (userData.role === "organizer") {
            window.location.href = "../../website/Organizer/organizer-dashboard.html";
          } else if (userData.role === "student") {
<<<<<<< HEAD
            window.location.href = "../../website/Student/student-dashboard.html";;
=======
            window.location.href = "website.html";
>>>>>>> main
          } else {
            window.location.href = "website.html"; // fallback
          }
        } else {
          errorMsg.textContent = "User record not found.";
        }
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

/* ---------------- LOGOUT ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = "../Registration/SignIn.html";
      } catch (error) {
        alert("Error logging out. Please try again.");
      }
    });
  }
});

/* ---------------- FORGOT PASSWORD ---------------- */
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

/* ---------------- AUTH STATE HANDLER ---------------- */
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop();

  // 🚫 If user not logged in → redirect away from protected pages
  if (!user) {
    if (
<<<<<<< HEAD
      currentPage === "../../website/Student/student-dashboard.html" || 
      currentPage === "organizer-dashboard.html" || 
      currentPage === "../../website/Organizer/organizer-dashboard.html"
=======
      currentPage === "student-dashboard.html" ||
      currentPage === "organizer-dashboard.html" ||
      currentPage === "website.html"
>>>>>>> main
    ) {
      window.location.href = "../Registration/SignIn.html";
    }
    return;
  }

  // ✅ If logged in and on SignIn/SignUp → redirect to dashboard
  if (currentPage === "SignIn.html" || currentPage === "SignUp.html") {
    if (!user.emailVerified) {
<<<<<<< HEAD
    console.log("User is signed in but not verified — staying on SignUp/SignIn page.");
    return; // stop here — do NOT redirect
  }
=======
      console.log("User is signed in but not verified — staying on SignUp/SignIn page.");
      return; // stop here — do NOT redirect
    }
>>>>>>> main

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      if (role === "organizer") {
        window.location.href = "../../website/Organizer/organizer-dashboard.html";
      } else {
<<<<<<< HEAD
        window.location.href = "../../website/Student/student-dashboard.html";
=======
        window.location.href = "website.html";
>>>>>>> main
      }
    }
  }
});
