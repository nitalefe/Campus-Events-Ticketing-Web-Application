import { auth, db } from "../../js/Shared/firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

        // Create organizer approval request (only for organizer role)
        if (role === "organizer") {
          try {
            await setDoc(doc(db, "organizers", user.uid), {
              uid: user.uid,
              displayName: fullname || "",
              email: email || "",
              university: extraInfo.organization || extraInfo.school || "",
              approved: false,
              status: "pending", // ADDED: canonical status so admin actions reflect immediately
              createdAt: serverTimestamp()
            });
            console.log("Organizer request created for", user.uid);
          } catch (e) {
            console.error("Failed to create organizer request:", e);
          }
        }
        
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
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = "";

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        if (!user.emailVerified) {
          errorMsg.textContent = "Please verify your email before signing in.";
          await signOut(auth);
          return;
        }

        // Check organizer approval status here BEFORE redirecting
        try {
          const orgRef = doc(db, "organizers", user.uid);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const org = orgSnap.data();
            const status = (org.status || (org.approved ? 'approved' : 'pending')).toLowerCase();
            if (status !== 'approved') {
              errorMsg.textContent = "Your organizer account is not approved yet. An administrator must approve your request before you can log in.";
              await signOut(auth);
              return;
            }
          }
        } catch (e) {
          // Show user-friendly error message
          console.error('Failed to verify organizer approval status during sign-in', e);
          errorMsg.textContent = "Could not verify organizer approval status. Try again later.";
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
            window.location.href = "../../website/Student/student-dashboard.html";;
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

  // Check organizer approval status
  try {
    const orgRef = doc(db, 'organizers', user.uid);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const org = orgSnap.data();
      const status = (org.status || (org.approved ? 'approved' : 'pending')).toLowerCase();
      if (status !== 'approved') {
        // sign the user out and prevent navigation
        await signOut(auth);
        alert('Your organizer account is not approved yet. An administrator must approve your request before you can log in.');
        return; // stop further sign-in navigation
      }
    }
  } catch (e) {
    console.error('Failed to check organizer approval status', e);
    console.error('getDoc error code:', e?.code, 'message:', e?.message);
    // block sign-in on error to be safe
    await signOut(auth);
    alert('Could not verify organizer approval status. Try again later.');
    return;
  }
});
