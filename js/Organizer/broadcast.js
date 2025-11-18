import { auth, db } from "../../js/Shared/firebase-config.js";
import { onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

function renderPrevBroadcast(doc) {
  const data = doc.data();
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

  // If this broadcast is tied to an event, show a small badge with the event name
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

  // prepend so newest on top when inserting sequentially
  prevContainer.appendChild(wrapper);
}

async function loadPreviousBroadcasts(uid) {
  if (!prevContainer) return;
  prevContainer.innerHTML = "";
  if (prevLoading) prevLoading.style.display = "block";

  try {
    const broadcastsRef = collection(db, "broadcasts");
    // Avoid composite index requirement by querying by senderUid only,
    // then sorting client-side by createdAt (desc).
    const q = query(broadcastsRef, where("senderUid", "==", uid));
    const snap = await getDocs(q);
    if (prevLoading) prevLoading.style.display = "none";
    if (snap.empty) {
      prevContainer.innerHTML = "<p class='muted'>You haven't sent any broadcasts yet.</p>";
      return;
    }

    // Convert to array and sort by createdAt desc (handle missing timestamps)
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

// Load events created by this organizer and populate eventSelect
async function loadOrganizerEvents(uid) {
  if (!eventSelect) return;
  eventSelect.innerHTML = "<option value=''>All events / No specific event</option>";
  try {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("createdBy", "==", uid));
    const snap = await getDocs(q);
    snap.forEach(s => {
      const data = s.data();
      const opt = document.createElement("option");
      opt.value = s.id;
      const dt = data.eventDateTime?.toDate ? data.eventDateTime.toDate().toLocaleDateString() : "";
      opt.textContent = `${data.eventName || "Untitled"}${dt ? ` — ${dt}` : ""}`;
      eventSelect.appendChild(opt);
    });
  } catch (e) {
    console.error("Error loading organizer events:", e);
  }
}

function showError(msg) {
  formMsg.textContent = msg;
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    accessNote.textContent = "You must be signed in as an organizer or admin to send broadcasts.";
    form.style.display = "none";
    return;
  }

  // Fetch user role from users collection and token claims for admin
  try {
    const usersRef = await (await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js")).doc;
  } catch (e) {
    // no-op: using simpler path below
  }

  try {
    // get user doc to read role
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const role = userData?.role || "student";

    // also check admin custom claim
    let isAdmin = false;
    try {
      const tokenResult = await getIdTokenResult(user);
      isAdmin = tokenResult?.claims?.admin === true;
    } catch (e) {
      console.warn("Could not read token claims:", e);
    }

    // If user is an organizer, ensure they have been approved (mirror auth.js behavior)
    if (role === "organizer") {
      try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
        const orgSnap = await getDoc(doc(db, "organizers", user.uid));
        if (orgSnap.exists()) {
          const org = orgSnap.data();
          const approved = org.approved === true;
          const status = (org.status || "").toLowerCase();
          if (!approved || status !== "approved") {
            let reason = "Your organizer account is not approved yet. An administrator must approve your request.";
            if (status === "disapproved") reason = "Your organizer account has been disapproved. Please contact the administrator.";
            accessNote.textContent = reason;
            form.style.display = "none";
            return;
          }
        } else {
          // no organizers doc; block until admin creates one or fixes records
          accessNote.textContent = "Organizer record not found. Contact support.";
          form.style.display = "none";
          return;
        }
      } catch (e) {
        console.error("Failed to verify organizer approval:", e);
        accessNote.textContent = "Could not verify organizer approval. Try refreshing.";
        form.style.display = "none";
        return;
      }
    }

    if (role === "organizer" || isAdmin) {
      accessNote.textContent = `Signed in as ${userData.fullname || user.email} (${role}${isAdmin ? ", admin" : ""}). You can send broadcasts.`;
      form.style.display = "block";
      // load organizer's previous broadcasts
        try { await loadPreviousBroadcasts(user.uid); } catch (e) { console.warn(e); }
        // load events created by this organizer into the event select
        try { await loadOrganizerEvents(user.uid); } catch (e) { console.warn("Could not load organizer events", e); }
      return;
    }

    // not allowed
    accessNote.textContent = "Access denied — only organizers and admins can send broadcasts.";
    form.style.display = "none";
    // Optional: sign out non-authorized users trying to access organizer pages
    // await signOut(auth);
  } catch (e) {
    console.error("Error checking role:", e);
    accessNote.textContent = "Could not verify access. Try refreshing.";
    form.style.display = "none";
  }
});

// Send broadcast
sendBtn.addEventListener("click", async () => {
  formMsg.textContent = "";
  if (!currentUser) return showError("Not signed in.");
  const text = messageInput.value.trim();
  const title = titleInput.value.trim();
  const target = targetSelect.value; // event_only | followers | event_and_followers

  if (!text) return showError("Please enter a message to send.");

  // Determine recipient groups for organizers: only student recipients are allowed.
  const targets = ["student"];
  let followersOnly = false;

  // If target requires an event, ensure an event is selected
  const eventId = (document.getElementById("eventSelect") || {}).value || null;
  if (target === "event_only") {
    if (!eventId) return showError("Please choose an event to message its ticket-holders.");
    // eventId will be attached below
  } else if (target === "followers") {
    followersOnly = true;
  } else if (target === "event_and_followers") {
    if (!eventId) return showError("Please choose an event to message its ticket-holders and your followers.");
    followersOnly = true;
    // eventId will be attached below
  } else {
    return showError("Invalid target selected.");
  }

  try {
    const senderName = (await (await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js")).getDoc((await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js")).doc(db, "users", currentUser.uid))).data()?.fullname || currentUser.email || "";

    // Re-check approval server-side equivalent: if not admin, ensure organizer approved
    let isAdmin = false;
    try {
      const tokenResult = await getIdTokenResult(currentUser);
      isAdmin = tokenResult?.claims?.admin === true;
    } catch (e) { /* ignore */ }

    if (!isAdmin) {
      try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
        const orgSnap = await getDoc(doc(db, "organizers", currentUser.uid));
        if (!orgSnap.exists()) throw new Error("Organizer record not found.");
        const org = orgSnap.data();
        const approved = org.approved === true;
        const status = (org.status || "").toLowerCase();
        if (!approved || status !== "approved") throw new Error("Organizer not approved.");
      } catch (e) {
        console.error("Organizer approval check failed before send:", e);
        return showError("You are not approved to send broadcasts.");
      }
    }

    const payload = {
      title: title || null,
      message: text,
      targets: targets,
      senderUid: currentUser.uid,
      senderName: senderName,
      createdAt: serverTimestamp(),
    };
    // Attach followers flag and/or eventId based on selection
    if (followersOnly) payload.followersOnly = true;
    if (eventId) payload.eventId = eventId;

    await addDoc(collection(db, "broadcasts"), payload);

    messageInput.value = "";
    titleInput.value = "";
    formMsg.style.color = "green";
    formMsg.textContent = "Broadcast sent.";
    setTimeout(() => (formMsg.textContent = ""), 3000);
    // refresh previous broadcasts list
    try { await loadPreviousBroadcasts(currentUser.uid); } catch (e) { console.warn("refresh failed", e); }
  } catch (e) {
    console.error("Failed to send broadcast:", e);
    showError("Failed to send broadcast. Try again.");
  }
});

// Simple logout wiring (matches project behavior)
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => { try { await signOut(auth); window.location.href = "../Registration/SignIn.html"; } catch (e) { alert("Error logging out."); } });
});
