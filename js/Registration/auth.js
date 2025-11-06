import { auth, db } from "../../js/Shared/firebase-config.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

/* ---------------- STUDENT / ORGANIZER SIGN IN ---------------- */
const signinForm = document.getElementById('signinForm');
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        errorMsg.textContent = "Please verify your email before signing in.";
        await signOut(auth);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        errorMsg.textContent = "User record not found.";
        return;
      }

      const userData = userDoc.data();
      localStorage.setItem("userRole", userData.role);
      localStorage.setItem("isAdmin", userData.isAdmin ? "true" : "false");

      // Redirect to main role dashboard
      if (userData.role === "student") {
        window.location.href = "../../website/Student/student-dashboard.html";
      } else if (userData.role === "organizer") {
        window.location.href = "../../website/Organizer/organizer-dashboard.html";
      } else {
        errorMsg.textContent = "Unknown role.";
      }

    } catch (error) {
      console.error("Login error:", error);
      errorMsg.textContent = "Invalid credentials.";
    }
  });
}

/* ---------------- ADMIN SIGN IN ---------------- */
const adminSigninForm = document.getElementById('adminSigninForm');
if (adminSigninForm) {
  adminSigninForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('admin-error-message');
    errorMsg.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        errorMsg.textContent = "Please verify your email before signing in.";
        await signOut(auth);
        return;
      }

      // ✅ Fetch the user's token to check custom claims
      const tokenResult = await getIdTokenResult(user);
      const isAdmin = tokenResult.claims.admin === true;

      if (isAdmin) {
        console.log("✅ Custom claim confirmed admin");
        localStorage.setItem("isAdmin", "true");
        window.location.href = "../../website/Administrator/admin-dashboard.html";
      } else {
        await signOut(auth);
        errorMsg.textContent = "Access denied — you are not an admin.";
      }

    } catch (error) {
      console.error("Admin login error:", error);
      errorMsg.textContent = "Invalid admin credentials.";
    }
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
      currentPage === "../../website/Student/student-dashboard.html" ||
      currentPage === "organizer-dashboard.html" ||
      currentPage === "../../website/Organizer/organizer-dashboard.html"
    ) {
      window.location.href = "../Registration/SignIn.html";
    }
    return;
  }

  // ✅ If logged in and on SignIn/SignUp → redirect to dashboard
  if (currentPage === "SignIn.html" || currentPage === "SignUp.html") {
    if (!user.emailVerified) {
      console.log("User is signed in but not verified — staying on SignUp/SignIn page.");
      return; // stop here — do NOT redirect
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      if (role === "organizer") {
        window.location.href = "../../website/Organizer/organizer-dashboard.html";
      } else {
        window.location.href = "../../website/Student/student-dashboard.html";
      }
    }
  }
});
