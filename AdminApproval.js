import {
  getAuth, signOut, getIdTokenResult, signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  updateDoc, doc, serverTimestamp, getDocs, getDoc, setDoc, addDoc
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

let auth = null;
let db = null;
function log(...args){ console.log('[AdminApproval]', ...args); }
function warn(...args){ console.warn('[AdminApproval]', ...args); }
function err(...args){ console.error('[AdminApproval]', ...args); }

// Whitelist admin emails here (case-insensitive). Add team admin emails.
const ADMIN_WHITELIST = [
  'gueyiejef@outlook.com',
  // 'otheradmin@example.com'
];

function isWhitelistedAdmin(email){
  if (!email) return false;
  return ADMIN_WHITELIST.some(e => e.toLowerCase() === String(email).toLowerCase());
}

document.addEventListener('DOMContentLoaded', () => {
  try { auth = getAuth(); db = getFirestore(); } catch (e) {
    err('Firebase not initialized', e);
    const emptyState = document.getElementById('emptyState');
    if (emptyState) { emptyState.style.display = ''; emptyState.textContent = 'Firebase not initialized.'; }
    return;
  }

  const tbody = document.getElementById('organizersTbody');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const emptyState = document.getElementById('emptyState');
  const signinForm = document.getElementById('signin-form');
  const signinBtn = document.getElementById('signin-btn');
  const adminEmail = document.getElementById('adminEmail');
  const adminPassword = document.getElementById('adminPassword');
  const userBadge = document.getElementById('user-badge');
  const userEmailSpan = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');

  const ORG_COLLECTION = 'organizers';
  // Ensure we write to the collection your MailerSend extension is listening to:
  const MAIL_COLLECTION = 'emails';
  if (!tbody) { err('organizersTbody element not found'); return; }

  function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  function createRow(id, data){
    const tr = document.createElement('tr');
    const displayName = data?.displayName || '(No name)';
    const email = data?.email || '';
    const uid = data?.uid || id;
    // Prefer explicit status field; fall back to boolean `approved`
    const status = (data?.status && String(data.status).toLowerCase()) ||
                   (data?.approved ? 'approved' : 'pending');
    const requestedAt = (data?.createdAt && data.createdAt.seconds)
      ? new Date(data.createdAt.seconds * 1000).toLocaleString()
      : (data?.requestedAt && data.requestedAt.seconds ? new Date(data.requestedAt.seconds*1000).toLocaleString() : '-');

    tr.innerHTML = `
      <td>
        <span class="main">${escapeHtml(displayName)}</span>
        <span class="sub">${escapeHtml(data?.university || '')}</span>
      </td>
      <td>
        <span class="main">${escapeHtml(email)}</span>
        <span class="sub">${escapeHtml(uid)}</span>
      </td>
      <td><span class="badge ${status === 'approved' ? 'approved' : status === 'disapproved' ? 'disapproved' : 'pending'}">${status === 'approved' ? 'Approved' : status === 'disapproved' ? 'Disapproved' : 'Pending'}</span></td>
      <td class="small">${escapeHtml(requestedAt)}</td>
      <td>
        <div class="row-actions">
          <button class="action-approve" data-id="${id}" ${status === 'approved' ? 'disabled' : ''}>Approve</button>
          <button class="action-dis" data-id="${id}" ${status === 'disapproved' ? 'disabled' : ''}>Disapprove</button>
        </div>
      </td>
    `;
    return tr;
  }

  let unsubscribe = null;

  async function getFreshClaims(user){
    try {
      const idTokenResult = await getIdTokenResult(user, true); // force refresh
      return idTokenResult?.claims || {};
    } catch (e) {
      warn('getFreshClaims failed', e);
      return {};
    }
  }

  async function startIfAdmin(user){
    if (!user) return;
    const claims = await getFreshClaims(user);
    log('ID token claims:', claims);
    const emailAdmin = isWhitelistedAdmin(user.email);
    if (!claims?.admin && !emailAdmin) {
      if (emptyState) {
        emptyState.style.display = '';
        emptyState.textContent = 'Signed in but not an admin. Please sign in with an administrator account.';
      }
      if (signinForm) signinForm.style.display = 'flex';
      if (userBadge) userBadge.style.display = 'none';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    setupRealtime();
  }

  async function setupRealtime(){
    log('Setting up realtime listener for organizer requests...');
    try {
      const user = auth.currentUser;
      if (!user) { warn('No signed-in user. Aborting realtime setup.'); return; }

      const q = query(collection(db, ORG_COLLECTION), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snap) => {
        tbody.innerHTML = '';
        if (snap.empty) { if (emptyState) emptyState.style.display = ''; return; }
        if (emptyState) emptyState.style.display = 'none';
        snap.forEach(d => tbody.appendChild(createRow(d.id, d.data())));
      }, (e) => {
        err('onSnapshot error:', e);
        if (emptyState) { emptyState.textContent = 'Error loading requests. See console.'; emptyState.style.display = ''; }
        fallbackFetch();
      });
    } catch (e) { err('setupRealtime exception:', e); fallbackFetch(); }
  }

  async function fallbackFetch(){
    try {
      log('Running fallback fetch...');
      const collRef = collection(db, ORG_COLLECTION);
      const snap = await getDocs(collRef);
      tbody.innerHTML = '';
      if (snap.empty) { if (emptyState) emptyState.style.display = ''; return; }
      if (emptyState) emptyState.style.display = 'none';
      snap.forEach(d => tbody.appendChild(createRow(d.id, d.data())));
    } catch (e) {
      err('fallbackFetch error:', e);
      if (emptyState) {
        if (e?.code === 'permission-denied' || /permission-denied/i.test(e?.message || '')) {
          emptyState.innerHTML = 'Permission denied. Sign in as an admin or check Firestore rules.';
        } else {
          emptyState.textContent = 'Failed to load organizer requests. See console.';
        }
        emptyState.style.display = '';
      }
    }
  }

  tbody.addEventListener('click', async (ev) => {
    const a = ev.target.closest('button.action-approve');
    const d = ev.target.closest('button.action-dis');
    if (a) { if (!confirm('Approve this organizer account?')) return; await performApproval(a.dataset.id, true); return; }
    if (d) { if (!confirm('Disapprove this organizer account?')) return; await performApproval(d.dataset.id, false); return; }
  });

  async function performApproval(id, value){
    try{
      const user = auth.currentUser;
      if (!user) { alert('You must be signed in as an admin to perform this action.'); return; }

      const claims = await getFreshClaims(user);
      if (!claims?.admin && !isWhitelistedAdmin(user.email)) {
        alert('You are not an admin. Sign in with an administrator account to perform approvals.');
        return;
      }

      const ref = doc(db, ORG_COLLECTION, id);

      let organizerData = {};
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) organizerData = snap.data();
        else { alert('Organizer document not found'); return; }
      } catch (e) { warn('Failed to read organizer doc', e); }

      const targetColl = value ? 'approvedOrganizer' : 'disapprovedOrganizer';
      const logRef = doc(db, targetColl, id);
      const payload = {
        uid: organizerData.uid || id,
        displayName: organizerData.displayName || organizerData.fullname || '',
        email: organizerData.email || '',
        university: organizerData.university || organizerData.school || '',
        approved: !!value,
        actedBy: user.uid,
        actedAt: serverTimestamp(),
        requestedAt: organizerData.requestedAt || organizerData.createdAt || null,
        sourceDoc: `${ORG_COLLECTION}/${id}`
      };

      // write audit/log entry
      try {
        await setDoc(logRef, payload, { merge: true });
        log('Wrote log to', targetColl, id);
      } catch (e) {
        if (e?.code === 'permission-denied') {
          alert('Failed to write audit log: permission denied. Check Firestore rules.');
          warn('Log write permission denied', e);
          return;
        } else {
          throw e;
        }
      }

      // Ensure organizers/{id} contains a canonical status field so listeners reflect action
      try {
        await updateDoc(ref, {
          approved: value,
          status: value ? 'approved' : 'disapproved',
          approvedBy: user.uid,
          approvedAt: serverTimestamp()
        });
        log('Updated organizer doc with status', id);
      } catch (e) {
        // surface permission issues but do not block because audit log is primary
        if (e?.code === 'permission-denied') {
          warn('Permission denied updating organizers/{id}. Audit log written but organizer doc not updated.', e);
          alert('Action recorded, but could not update organizer record due to rules. Check Firestore rules or admin privileges.');
        } else {
          warn('Failed to update organizers/{id}', e);
        }
      }

      try {
        const btn = tbody.querySelector(`button[data-id="${id}"]`);
        if (btn) {
          const tr = btn.closest('tr');
          if (tr) {
            const badge = tr.querySelector('.badge');
            if (badge) {
              badge.textContent = value ? 'Approved' : 'Disapproved';
              badge.classList.remove('approved','pending','disapproved');
              badge.classList.add(value ? 'approved' : 'disapproved');
            }
            const approveBtn = tr.querySelector('button.action-approve');
            const disBtn = tr.querySelector('button.action-dis');
            if (approveBtn) approveBtn.disabled = !!value;
            if (disBtn) disBtn.disabled = !value;
          }
        }
      } catch (e) { warn('Failed to update row UI after action', e); }

      // Send notification email (stubbed, requires implementation)
      try {
        const toEmail = (organizerData.email || '').toString();
        const displayName = organizerData.displayName || organizerData.fullname || '';
        const signInUrl = window.location.origin + '/SignIn.html';

        if (!toEmail) {
          warn('Organizer has no email; skipping notification for', id);
        } else {
          await addDoc(collection(db, MAIL_COLLECTION), {
            to: [toEmail],

            // For MailerSend extension: put these at TOP LEVEL (not under `message`)
            subject: "Your organizer account has been approved 🎉",
            text: `Hi ${displayName || 'there'},\n\nYour organizer account has been approved. You can now access your organizer features.\n\n— Campus Tickets Team`,
            html: `<p>Hi ${escapeHtml(displayName) || 'there'},</p>
                   <p>Your organizer account has been <strong>approved</strong>. You can now access your organizer features.</p>
                   <p>— Campus Tickets Team</p>`,

            // Optional extras
            headers: { "X-Mail-Source": `${ORG_COLLECTION}/${id}` },
            metadata: { uid: id, action: value ? 'approved' : 'disapproved' },

            createdAt: serverTimestamp()
          });
          log('Queued approval email for', toEmail);
        }
      } catch (e) {
        err('Failed to queue notification email:', e);
        // Do not fail the approval action if email queuing fails
      }

    } catch(e){
      err('performApproval failed', e);
      alert('Failed to perform action. See console.');
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
        tr.style.display = term ? (tr.textContent.toLowerCase().includes(term) ? '' : 'none') : '';
      });
    });
  } else { warn('searchInput not found in DOM'); }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        refreshBtn.disabled = true;
        if (typeof unsubscribe === 'function') {
          try { unsubscribe(); } catch(e){ /* ignore */ }
        }
        await fallbackFetch();
        setupRealtime();
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      const email = adminEmail.value.trim();
      const pass = adminPassword.value;
      if (!email || !pass) { alert('Enter email and password'); return; }
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (e) {
        err('signIn failed', e);
        alert('Sign-in failed: ' + (e.message || e.code));
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => { try { await signOut(auth); } catch (e) { err('Logout failed', e); alert('Logout failed'); } });
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      log('signed in as', user.uid, user.email || '');
      if (signinForm) signinForm.style.display = 'none';
      if (userBadge) { userBadge.style.display = 'flex'; userEmailSpan.textContent = user.email || user.uid; }
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      await startIfAdmin(user);
    } else {
      log('No user signed in.');
      if (signinForm) signinForm.style.display = 'flex';
      if (userBadge) userBadge.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      tbody.innerHTML = '';
      if (emptyState) { emptyState.style.display = ''; emptyState.textContent = 'Please sign in to view organizer requests.'; }
    }
  });

  window.__AdminApproval = {
    setupRealtime,
    fallbackFetch,
    forceRefreshClaims: async () => {
      const u = auth.currentUser;
      if (!u) { console.warn('No user'); return null; }
      const claims = await getFreshClaims(u);
      console.log('fresh claims:', claims, 'emailWhitelist:', isWhitelistedAdmin(u.email));
      return { claims, emailWhitelist: isWhitelistedAdmin(u.email) };
    }
  };
});