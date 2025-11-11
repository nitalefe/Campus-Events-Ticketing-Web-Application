import { auth, db } from "../../js/Shared/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const loading = document.getElementById("loading");
const messagesEl = document.getElementById("messages");

function renderMessage(doc) {
  const data = doc.data();
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
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? (userDoc.data().role || "student") : "student";

    // Query broadcasts targeted at this role (no server-side ordering to avoid index requirement)
    const broadcastsRef = collection(db, "broadcasts");
    const q = query(broadcastsRef, where("targets", "array-contains", role));
    const snap = await getDocs(q);

    loading.style.display = "none";
    messagesEl.innerHTML = "";

    if (snap.empty) {
      messagesEl.innerHTML = "<p>No messages found.</p>";
      return;
    }

    // Convert to array and sort client-side by createdAt desc
    const docs = [];
    snap.forEach(d => docs.push(d));
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
