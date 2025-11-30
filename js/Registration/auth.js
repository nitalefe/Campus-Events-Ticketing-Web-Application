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
import { setDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ---------------- SIGN UP ---------------- */
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const role = document.getElementById("role").value;
    const signupError = document.getElementById("signup-error");
    signupError.textContent = "";

    if (password.length < 6) {
      signupError.textContent = "Password must be at least 6 characters long.";
      return;
    }
    if (password !== confirmPassword) {
      signupError.textContent = "Passwords do not match.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Extra info
      let extraInfo = {};
      if (role === "student") {
        const school = document.getElementById("school").value;
        extraInfo = { school };
      } else if (role === "organizer") {
        const organization = document.getElementById("organization").value;
        extraInfo = { organization };
      }

      // Save user record
      await setDoc(doc(db, "users", user.uid), {
        fullname,
        email,
        role,
        ...extraInfo,
      });

      // Organizer approval request
      if (role === "organizer") {
        await setDoc(doc(db, "organizers", user.uid), {
          uid: user.uid,
          displayName: fullname || "",
          email: email || "",
          university: extraInfo.organization || "",
          approved: false,
          status: "pending",
          createdAt: serverTimestamp(),
        });
        console.log("Organizer request created for", user.uid);
      }

      await sendEmailVerification(user);
      alert("Check your email to verify your account before logging in.");
      window.location.href = "SignIn.html";
    } catch (error) {
      console.error("Signup error:", error);
      signupError.textContent = error.message;
    }
  });
}

/* ---------------- SIGN IN ---------------- */
const signinForm = document.getElementById("signinForm");
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const errorMsg = document.getElementById("error-message");
    errorMsg.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        errorMsg.textContent = "Please verify your email before signing in.";
        await signOut(auth);
        return;
      }

// --- Organizer Approval Check ---
try {
  // Get user role first
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    console.log("User role detected:", userData.role); // Debug log

    // Only organizers require admin approval
    if (userData.role === "organizer") {
      const orgRef = doc(db, "organizers", user.uid);
      const orgSnap = await getDoc(orgRef);

      if (orgSnap.exists()) {
        const org = orgSnap.data();
        const approved = org.approved === true;
        const status = (org.status || "").toLowerCase();

        if (!approved || status !== "approved") {
          let reason =
            "Your organizer account is not approved yet. An administrator must approve your request.";
          if (status === "disapproved") {
            reason =
              "Your organizer account has been disapproved. Please contact the administrator.";
          }

          errorMsg.textContent = reason;
          console.warn("Organizer blocked — not approved yet:", org);

          // Wait briefly before logout
          await new Promise((res) => setTimeout(res, 2500));
          await signOut(auth);
          return;
        }
      }
    }

    // Continue normal login for all roles
    localStorage.setItem("userRole", userData.role);
    if (userData.role === "organizer") {
      window.location.href = "../../website/Organizer/organizer-dashboard.html";
    } else if (userData.role === "student") {
      window.location.href = "../../website/Student/student-dashboard.html";
    } else if (userData.role === "admin") {
      window.location.href = "../../website/Administrator/admin-dashboard.html";
    } else {
      // Fallback for unknown roles - redirect to student dashboard
      console.warn("Unknown role:", userData.role, "- redirecting to student dashboard");
      window.location.href = "../../website/Student/student-dashboard.html";
    }
  } else {
    errorMsg.textContent = "User record not found.";
  }
} catch (e) {
  console.error("Error verifying organizer approval:", e);
  errorMsg.textContent = "Could not verify account status. Try again later.";
  await new Promise((res) => setTimeout(res, 2500));
  await signOut(auth);
  return;
}
    } catch (error) {
      console.error("Login error:", error.code);
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
    }
  });
}

/* ---------------- ADMIN SIGN IN ---------------- */
const adminSigninForm = document.getElementById("adminSigninForm");
if (adminSigninForm) {
  adminSigninForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    const errorMsg = document.getElementById("admin-error-message");
    errorMsg.textContent = "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        errorMsg.textContent = "Please verify your email before signing in.";
        await signOut(auth);
        return;
      }

      const tokenResult = await getIdTokenResult(user);
      const isAdmin = tokenResult.claims.admin === true;

      if (isAdmin) {
        console.log("✅ Admin confirmed");
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

/* ---------------- LOGOUT & PROFILE HANDLERS ---------------- */
function attachAuthHandlers() {
  try {
    const logoutBtn = document.getElementById("logout-btn");
    const profileBtn = document.getElementById("profile-btn");

    if (logoutBtn && !logoutBtn._authHandlerAttached) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await signOut(auth);
          window.location.href = getSignInPath();
        } catch (error) {
          alert("Error logging out. Please try again.");
        }
      });
      // mark to avoid double-attaching
      logoutBtn._authHandlerAttached = true;
    }

    if (profileBtn && !profileBtn._authHandlerAttached) {
      profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // when on pages under /website/Organizer or /website/Student use ../Profile/
        const path = window.location.pathname;
        if (path.includes('/website/Organizer/') || path.includes('/website/Student/') || path.includes('/website/Administrator/') ) {
          window.location.href = '../Profile/profile.html';
        } else {
          // fallback relative path
          window.location.href = './Profile/profile.html';
        }
      });
      profileBtn._authHandlerAttached = true;
    }
  } catch (e) {
    // safe no-op if DOM not ready
    console.warn('attachAuthHandlers error', e);
  }
}

// Run immediately in case DOM is already ready, and also after DOMContentLoaded
attachAuthHandlers();
document.addEventListener('DOMContentLoaded', attachAuthHandlers);

// Delegated logout handler: catches clicks on any `#logout-btn`, even if added later
if (!window._logoutDelegationAttached) {
  document.body.addEventListener('click', async (ev) => {
    try {
      const target = ev.target && ev.target.closest && ev.target.closest('#logout-btn');
      if (!target) return;
      ev.preventDefault();
      // clear local role flags
      try { localStorage.removeItem('userRole'); } catch(e) {}
      try { localStorage.removeItem('isAdmin'); } catch(e) {}
      await signOut(auth);
      window.location.href = getSignInPath();
    } catch (err) {
      console.warn('Logout (delegated) failed', err);
      alert('Error logging out. Please try again.');
    }
  }, { passive: false });
  window._logoutDelegationAttached = true;
}

// Compute path to SignIn.html robustly based on current location
function getSignInPath() {
  try {
    const p = window.location.pathname || '';
    const idx = p.indexOf('/website/');
    if (idx !== -1) {
      const base = p.substring(0, idx + '/website'.length);
      return base + '/Registration/SignIn.html';
    }
  } catch (e) {
    // ignore
  }
  // fallback relative path
  return '../Registration/SignIn.html';
}

/* ---------------- FORGOT PASSWORD ---------------- */
const forgotPasswordLink = document.getElementById("forgotPassword");
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      alert("Please enter your email above first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Could not send reset email: " + error.message);
    }
  });
}

/* ---------------- AUTH STATE HANDLER ---------------- */
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop();

  if (!user) {
    if (
      currentPage === "student-dashboard.html" ||
      currentPage === "organizer-dashboard.html" ||
      currentPage === "admin-dashboard.html"
    ) {
      window.location.href = getSignInPath();
    }
    return;
  }

  // ✅ Check verification
  if (!user.emailVerified) {
    console.log("User is signed in but not verified — staying on sign-in page.");
    return;
  }

  // ✅ Get user role
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) return;

  const role = userDoc.data().role;

  // ✅ If organizer, check approval before redirect
  if (role === "organizer") {
    try {
      const orgRef = doc(db, "organizers", user.uid);
      const orgSnap = await getDoc(orgRef);

      if (orgSnap.exists()) {
        const org = orgSnap.data();
        const approved = org.approved === true;
        const status = (org.status || "").toLowerCase();

        // ❌ Block pending or disapproved organizers
        if (!approved || status !== "approved") {
          console.warn("Organizer not approved, blocking redirect:", org);
          await signOut(auth);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to verify organizer approval in state check:", e);
      await signOut(auth);
      return;
    }
  }

  // ✅ Safe redirect logic
  if (currentPage === "SignIn.html" || currentPage === "SignUp.html") {
    if (role === "admin") {
      window.location.href = "../../website/Administrator/admin-dashboard.html";
    } else if (role === "organizer") {
      window.location.href = "../../website/Organizer/organizer-dashboard.html";
    } else {
      window.location.href = "../../website/Student/student-dashboard.html";
    }
  }
});