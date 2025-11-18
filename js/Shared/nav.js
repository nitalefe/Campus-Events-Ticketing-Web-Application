import { auth, db } from './firebase-config.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

/**
 * goToHome - navigate the current user to the correct dashboard based on their role.
 * - organizer -> Organizer/organizer-dashboard.html
 * - admin -> Administrator/admin-dashboard.html
 * - student (or unknown) -> Student/student-dashboard.html
 * - not signed in -> Registration/SignIn.html
 */
export async function goToHome() {
  try {
    const current = auth.currentUser;
    if (!current) {
      window.location.href = 'Registration/SignIn.html';
      return;
    }

    const snap = await getDoc(doc(db, 'users', current.uid));
    const role = snap.exists() ? (snap.data().role || 'student') : 'student';

    if (role === 'organizer') {
      window.location.href = 'Organizer/organizer-dashboard.html';
    } else if (role === 'admin') {
      window.location.href = 'Administrator/admin-dashboard.html';
    } else {
      window.location.href = 'Student/student-dashboard.html';
    }
  } catch (err) {
    console.error('nav.goToHome error:', err);
    // fallback
    window.location.href = 'Student/student-dashboard.html';
  }
}

// Also expose on window for pages using inline onclick="goToHome()"
// Consumers that import should still use the exported function directly.
try { window.goToHome = goToHome; } catch (e) { /* ignore in non-browser contexts */ }
