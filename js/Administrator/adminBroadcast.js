import { auth, db } from "../../js/Shared/firebase-config.js";
import { onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const accessNote = document.getElementById("accessNote");
const form = document.getElementById("broadcastForm");
const titleInput = document.getElementById("title");
const messageInput = document.getElementById("message");
const targetSelect = document.getElementById("targetSelect");
const sendBtn = document.getElementById("sendBtn");
const formMsg = document.getElementById("formMsg");

let currentUser = null;

const prevLoading = document.getElementById("prevLoading");
const prevContainer = document.getElementById("prevBroadcasts");
const eventSelect = document.getElementById("eventSelect");

function renderPrevBroadcast(docSnap) {
  const data = docSnap.data();
  const wrapper = document.createElement("div");
  wrapper.className = "broadcast";

  if (data.title) {
    const titleEl = document.createElement("div");
    titleEl.className = "title";
    titleEl.textContent = data.title;
    wrapper.appendChild(titleEl);
  }

  const metaEl = document.createElement("div");
  metaEl.className = "meta";
  const time = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "";
  metaEl.textContent = `Sent: ${time}`;
  wrapper.appendChild(metaEl);

  const msgEl = document.createElement("div");
  msgEl.className = "message-text";
  msgEl.textContent = data.message || "";
  wrapper.appendChild(msgEl);

  if (data.eventId) {
    (async () => {
      try {
        const evRef = doc(db, "events", data.eventId);
        const evSnap = await getDoc(evRef);
        if (evSnap.exists()) {
          const ev = evSnap.data();
          const evBadge = document.createElement("div");
          evBadge.className = "meta";
          evBadge.style.marginTop = "6px";
          evBadge.textContent = `Event: ${ev.eventName || data.eventId}`;
          wrapper.insertBefore(evBadge, msgEl);
        }
      } catch (e) {
        console.warn("Could not load event name for broadcast", e);
      }
    })();
  }

  prevContainer.appendChild(wrapper);
}

async function loadPreviousBroadcasts(uid) {
  if (!prevContainer) return;
  prevContainer.innerHTML = "";
  if (prevLoading) prevLoading.style.display = "block";

  try {
    const broadcastsRef = collection(db, "broadcasts");
    const q = query(broadcastsRef, where("senderUid", "==", uid));
    const snap = await getDocs(q);
    if (prevLoading) prevLoading.style.display = "none";
    if (snap.empty) {
      prevContainer.innerHTML = "<p class='muted'>No broadcasts sent yet.</p>";
      return;
    }

    const docs = [];
    snap.forEach(d => docs.push(d));
    docs.sort((a, b) => {
      const aTs = a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : 0;
      const bTs = b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : 0;
      return bTs - aTs;
    });

    docs.forEach(d => renderPrevBroadcast(d));
  } catch (e) {
    console.error("Failed to load previous broadcasts:", e);
    if (prevLoading) prevLoading.textContent = "Could not load broadcasts.";
  }
}

// Load events created by any organizer? For admin we'll leave eventSelect default; optionally populate with events
async function loadAllEvents() {
  if (!eventSelect) return;
  eventSelect.innerHTML = "<option value=''>All events / No specific event</option>";
  try {
    const eventsRef = collection(db, "events");
    const snap = await getDocs(eventsRef);
    snap.forEach(s => {
      const data = s.data();
      const opt = document.createElement("option");
      opt.value = s.id;
      const dt = data.eventDateTime?.toDate ? data.eventDateTime.toDate().toLocaleDateString() : "";
      opt.textContent = `${data.eventName || 'Untitled'}${dt ? ` — ${dt}` : ''}`;
      eventSelect.appendChild(opt);
    });
  } catch (e) {
    console.error("Error loading events for admin page:", e);
  }
}

function showError(msg) {
  formMsg.textContent = msg;
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    accessNote.textContent = "You must be signed in as an administrator to access this page.";
    form.style.display = "none";
    return;
  }

  try {
    let isAdmin = false;
    try {
      const tokenResult = await getIdTokenResult(user);
      isAdmin = tokenResult?.claims?.admin === true;
    } catch (e) {
      console.warn("Could not read token claims:", e);
    }

    if (!isAdmin) {
      accessNote.textContent = "Access denied — administrators only.";
      form.style.display = "none";
      return;
    }

    // show form and load previous broadcasts
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
      const userDoc = await getDoc(doc(db, "users", user.uid));
      accessNote.textContent = `Signed in as ${userDoc.exists() ? (userDoc.data().fullname || user.email) : user.email} (administrator).`;
    } catch (e) {
      accessNote.textContent = `Signed in (administrator).`;
    }

    form.style.display = "block";
    try { await loadPreviousBroadcasts(user.uid); } catch (e) { console.warn(e); }
    try { await loadAllEvents(); } catch (e) { console.warn(e); }
    return;
  } catch (e) {
    console.error("Error checking admin role:", e);
    accessNote.textContent = "Could not verify access. Try refreshing.";
    form.style.display = "none";
  }
});

// Send broadcast (admin)
sendBtn.addEventListener("click", async () => {
  formMsg.textContent = "";
  if (!currentUser) return showError("Not signed in.");
  const text = messageInput.value.trim();
  const title = titleInput.value.trim();
  const target = targetSelect.value; // students | organizers | both

  if (!text) return showError("Please enter a message to send.");

  const targets = [];
  if (target === "students") targets.push("student");
  else if (target === "organizers") targets.push("organizer");
  else targets.push("student", "organizer");

  try {
    const senderName = (await (await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js")).getDoc((await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js")).doc(db, "users", currentUser.uid))).data()?.fullname || currentUser.email || "";

    const eventId = (document.getElementById("eventSelect") || {}).value || null;
    const payload = {
      title: title || null,
      message: text,
      targets: targets,
      senderUid: currentUser.uid,
      senderName: senderName,
      senderRole: 'admin',
      createdAt: serverTimestamp(),
    };
    if (eventId) payload.eventId = eventId;

    await addDoc(collection(db, "broadcasts"), payload);

    messageInput.value = "";
    titleInput.value = "";
    formMsg.style.color = "green";
    formMsg.textContent = "Broadcast sent.";
    setTimeout(() => (formMsg.textContent = ""), 3000);
    try { await loadPreviousBroadcasts(currentUser.uid); } catch (e) { console.warn("refresh failed", e); }
  } catch (e) {
    console.error("Failed to send broadcast:", e);
    showError("Failed to send broadcast. Try again.");
  }
});

// Simple logout wiring
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => { try { await signOut(auth); window.location.href = "../Registration/SignIn.html"; } catch (e) { alert("Error logging out."); } });
});
