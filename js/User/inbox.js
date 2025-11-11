import { auth, db } from "../../js/Shared/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const loading = document.getElementById("loading");
const messagesEl = document.getElementById("messages");

function renderMessage(doc) {
  const data = doc.data();
  const wrapper = document.createElement("div");
  wrapper.className = "broadcast";
  const title = data.title ? `<div class="title">${escapeHtml(data.title)}</div>` : "";
  const meta = `<div class="meta">From: ${escapeHtml(data.senderName || "Unknown")} — ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ""}</div>`;
  wrapper.innerHTML = `${title}<div>${escapeHtml(data.message)}</div>${meta}`;
  messagesEl.appendChild(wrapper);
}

// basic escaping
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (s) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));
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
