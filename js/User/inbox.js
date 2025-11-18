import { auth, db } from "../../js/Shared/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const loading = document.getElementById("loading");
const messagesEl = document.getElementById("messages");

function renderMessage(snap) {
  const data = snap.data();
  const wrapper = document.createElement("div");
  wrapper.className = "broadcast";

  // Title
  if (data.title) {
    const titleEl = document.createElement("div");
    titleEl.className = "title";
    titleEl.textContent = data.title;
    wrapper.appendChild(titleEl);
  }

  // Meta: sender badge + timestamp
  const metaEl = document.createElement("div");
  metaEl.className = "meta";
  const senderBadge = document.createElement("span");
  senderBadge.className = "sender-badge";
  senderBadge.textContent = data.senderName || "Unknown";
  metaEl.appendChild(senderBadge);

  const timeEl = document.createElement("span");
  timeEl.style.marginLeft = "8px";
  const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  timeEl.textContent = ts ? formatTimestamp(ts) : "";
  metaEl.appendChild(timeEl);
  wrapper.appendChild(metaEl);

  // If the message targets a specific event, show its name near the meta (async)
  if (data.eventId) {
    (async () => {
      try {
        const evRef = doc(db, "events", data.eventId);
        const evSnap = await getDoc(evRef);
        if (evSnap.exists()) {
          const ev = evSnap.data();
          const evSpan = document.createElement("span");
          evSpan.className = "sender-badge";
          evSpan.style.marginLeft = "10px";
          evSpan.textContent = `Event: ${ev.eventName || data.eventId}`;
          metaEl.insertBefore(evSpan, timeEl);
        }
      } catch (e) {
        console.warn("Could not fetch event for inbox message", e);
      }
    })();
  }

  // Message body with collapse/expand
  const msgEl = document.createElement("div");
  msgEl.className = "message-text";
  msgEl.textContent = data.message || "";

  // Collapse long messages by default
  const COLLAPSE_THRESHOLD = 300; // characters
  let isCollapsed = (msgEl.textContent.length > COLLAPSE_THRESHOLD);
  if (isCollapsed) msgEl.classList.add("collapsed");

  wrapper.appendChild(msgEl);

  if (isCollapsed) {
    const toggle = document.createElement("span");
    toggle.className = "show-more";
    toggle.textContent = "Show more";
    toggle.addEventListener("click", () => {
      const nowCollapsed = msgEl.classList.toggle("collapsed");
      toggle.textContent = nowCollapsed ? "Show more" : "Show less";
    });
    wrapper.appendChild(toggle);
  }

  messagesEl.appendChild(wrapper);
}

// basic escaping
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (s) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));
}

// Friendly timestamp: show relative time for recent messages, otherwise locale date
function formatTimestamp(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleString();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Registration/SignIn.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? (userDoc.data().role || "student") : "student";
    const claimedEvents = userDoc.exists() ? (userDoc.data().claimedEvents || []) : [];

    // Query broadcasts targeted at this role and event-specific broadcasts for events the user has tickets for.
    const broadcastsRef = collection(db, "broadcasts");
    // Prepare queries: one for role-targeted broadcasts, plus event-targeted queries for claimed events
    const queries = [];
    queries.push({ q: query(broadcastsRef, where("targets", "array-contains", role)), type: "role" });
    if (claimedEvents.length > 0) {
      // Firestore 'in' supports up to 10 items — batch if necessary
      for (let i = 0; i < claimedEvents.length; i += 10) {
        const batch = claimedEvents.slice(i, i + 10);
        queries.push({ q: query(broadcastsRef, where("eventId", "in", batch)), type: "event" });
      }
    }

    // Run queries sequentially and merge unique docs, applying additional client-side filtering:
    // - role queries: include all returned docs
    // - event queries: include only docs whose targets include 'student' (so students don't see organizer-only messages for an event)
    const docsMap = new Map();
    for (const item of queries) {
      const snap = await getDocs(item.q);
      snap.forEach(d => {
        const data = d.data();
        if (item.type === "role") {
          // Include role-targeted broadcasts that are not tied to a specific event.
          // Additionally:
          // - include broadcasts sent by administrators even if they include an eventId,
          // - include broadcasts that set `followersOnly === true` so organizers can target their followers
          //   even when the broadcast also references an event (we'll separately ensure followers actually follow).
          if (!data.eventId || data.senderRole === 'admin' || data.followersOnly === true) docsMap.set(d.id, d);
        } else if (item.type === "event") {
          // only include if the broadcast is intended for students as well
          const t = data.targets || [];
          if (Array.isArray(t) && t.includes("student")) docsMap.set(d.id, d);
        }
      });
    }

    // At this point we have candidate broadcasts in docsMap. Apply additional filtering
    // so that students do NOT see broadcasts from organizers they do not follow.
    const following = userDoc.exists() ? (userDoc.data().following || []) : [];

    // Build a set of unique sender UIDs that are not in the student's following list
    const sendersToCheck = new Set();
    docsMap.forEach(d => {
      const s = d.data().senderUid;
      if (s && !following.includes(s)) sendersToCheck.add(s);
    });

    // For all senders not followed, check if they are organizers. If so, remove their messages.
    if (sendersToCheck.size > 0) {
      const senderArray = Array.from(sendersToCheck);
      try {
        // load organizer docs for these senders in parallel
        const organizerChecks = await Promise.all(senderArray.map(sid => getDoc(doc(db, "organizers", sid))));
        organizerChecks.forEach((snap, idx) => {
          const sid = senderArray[idx];
          if (snap.exists()) {
            // sender is an organizer and not followed by this student — remove their broadcasts
            for (const [k, v] of docsMap.entries()) {
              if (v.data().senderUid === sid) docsMap.delete(k);
            }
          }
        });
      } catch (e) {
        console.warn("Could not verify organizer senders for follow filtering:", e);
      }
    }

    // Additionally, enforce followersOnly broadcasts: if a broadcast has followersOnly=true,
    // ensure the student actually follows the sender.
    for (const [k, v] of docsMap.entries()) {
      const data = v.data();
      if (data.followersOnly === true) {
        const s = data.senderUid;
        if (!s || !following.includes(s)) {
          docsMap.delete(k);
        }
      }
    }

    loading.style.display = "none";
    messagesEl.innerHTML = "";

    if (docsMap.size === 0) {
      messagesEl.innerHTML = "<p>No messages found.</p>";
      return;
    }

    // Convert to array and sort client-side by createdAt desc
    const docs = Array.from(docsMap.values());
    docs.sort((a, b) => {
      const aTs = a.data().createdAt?.toDate ? a.data().createdAt.toDate().getTime() : 0;
      const bTs = b.data().createdAt?.toDate ? b.data().createdAt.toDate().getTime() : 0;
      return bTs - aTs;
    });

    docs.forEach(d => renderMessage(d));
  } catch (e) {
    console.error("Failed to load messages:", e);
    loading.textContent = "Could not load messages.";
  }
});

// Simple logout wiring
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => { try { await signOut(auth); window.location.href = "../Registration/SignIn.html"; } catch (e) { alert("Error logging out."); } });
});


