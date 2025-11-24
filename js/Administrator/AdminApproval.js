// ===============================
//  AdminApproval.js (Refresh-based update version)
// ===============================

import { app } from '../Shared/firebase-config.js';
import {
  getAuth, onAuthStateChanged, getIdTokenResult, signOut
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import {
  getFirestore, collection, query, where, orderBy,
  updateDoc, doc, serverTimestamp, getDoc, getDocs
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { handleApproval as backendHandleApproval } from './adminApprovalBackend.js';

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM references ---
const tbody = document.getElementById('organizersTbody');
const pastTbody = document.getElementById('pastTbody');
const emptyState = document.getElementById('emptyState');
const pastEmptyState = document.getElementById('pastEmptyState');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refreshBtn');
const ORG_COLLECTION = 'organizers';

// --- Helper logging ---
function log(...args) { console.log('[AdminApproval]', ...args); }
function err(...args) { console.error('[AdminApproval]', ...args); }

// ===============================
//  Auth + Access Check
// ===============================
async function ensureAdminAccess(user) {
  if (!user) return false;
  const token = await getIdTokenResult(user, true);
  return token.claims?.admin === true;
}

// ===============================
//  Row Builder
// ===============================
function createRow(id, data, showActions = true) {
  const tr = document.createElement('tr');
  const displayName = data?.displayName || '(No name)';
  const email = data?.email || '';
  const uid = data?.uid || id;
  const status = (data?.status && String(data.status).toLowerCase()) || 'pending';
  const requestedAt = (data?.createdAt?.seconds)
    ? new Date(data.createdAt.seconds * 1000).toLocaleString()
    : '-';
  const reviewedAt = (data?.approvedAt?.seconds)
    ? new Date(data.approvedAt.seconds * 1000).toLocaleString()
    : '-';

  tr.innerHTML = `
    <td>
      <span class="main">${displayName}</span>
      <span class="sub">${data?.university || ''}</span>
    </td>
    <td>
      <span class="main">${email}</span>
      <span class="sub">${uid}</span>
    </td>
    <td>
      <span class="badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </td>
    <td>${showActions ? requestedAt : reviewedAt}</td>
    ${showActions
      ? `<td>
          <button class="action-approve" data-id="${id}">Approve</button>
          <button class="action-dis" data-id="${id}">Disapprove</button>
        </td>`
      : ''}
  `;
  return tr;
}

// ===============================
//  Fetch organizers (manual refresh)
// ===============================
async function loadOrganizers() {
  try {
    tbody.innerHTML = '';
    pastTbody.innerHTML = '';

    // 🔹 Pending organizers
    const pendingQuery = query(
      collection(db, ORG_COLLECTION),
      where('status', 'in', ['pending', null]),
      orderBy('createdAt', 'desc')
    );
    const pendingSnap = await getDocs(pendingQuery);

    if (pendingSnap.empty) {
      emptyState.style.display = '';
      emptyState.textContent = 'No pending requests.';
    } else {
      emptyState.style.display = 'none';
      pendingSnap.forEach(d => tbody.appendChild(createRow(d.id, d.data(), true)));
    }

    // 🔹 Past organizers (approved/disapproved)
    const pastQuery = query(
      collection(db, ORG_COLLECTION),
      where('status', 'in', ['approved', 'disapproved']),
      orderBy('approvedAt', 'desc')
    );
    const pastSnap = await getDocs(pastQuery);

    if (pastSnap.empty) {
      pastEmptyState.style.display = '';
      pastEmptyState.textContent = 'No past decisions yet.';
    } else {
      pastEmptyState.style.display = 'none';
      pastSnap.forEach(d => pastTbody.appendChild(createRow(d.id, d.data(), false)));
    }
  } catch (e) {
    err('loadOrganizers failed', e);
    emptyState.textContent = 'Error loading data.';
  }
}

// ===============================
//  Approval Actions
// ===============================
tbody?.addEventListener('click', async (ev) => {
  const approve = ev.target.closest('button.action-approve');
  const disapprove = ev.target.closest('button.action-dis');
  if (!approve && !disapprove) return;

  const id = approve ? approve.dataset.id : disapprove.dataset.id;
  const approved = !!approve;

  try {
    // Delegate to backend helper (dependency-injected) so logic is testable headless
    await backendHandleApproval({
      id,
      approved,
      authInstance: auth,
      dbInstance: db,
      docFn: doc,
      updateDocFn: updateDoc,
      serverTimestampFn: serverTimestamp,
      ORG_COLLECTION
    });

    // ✅ Just log success — no live move, handled next refresh
    log(`Organizer ${id} marked as ${approved ? 'approved' : 'disapproved'}`);
  } catch (e) {
    err('handleApproval failed', e);
    alert('Action failed — see console.');
  }
});

// ===============================
//  Refresh + Auth Handling
// ===============================
refreshBtn?.addEventListener('click', loadOrganizers);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Please sign in as admin.';
    return;
  }

  const isAdmin = await ensureAdminAccess(user);
  if (isAdmin) {
    log('✅ Admin verified — loading organizer requests...');
    await loadOrganizers();
  } else {
    tbody.innerHTML = '';
    emptyState.textContent = 'Access denied — admin privileges required.';
  }
});

logoutBtn?.addEventListener('click', async () => {
  try { await signOut(auth); } catch (e) { err('Logout failed', e); }
});
