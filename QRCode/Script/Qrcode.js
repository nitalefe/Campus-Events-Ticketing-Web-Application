import { auth, db } from "../../Shared/firebase-config.js";



// Organizer/script/Qrcode.js
// ONE file that powers BOTH QR generator (tickets) and scanner (check-in)

// Organizer/script/Qrcode.js
// Combined GENERATOR + SCANNER with Firebase

import {
 
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import { setDoc, doc, getDoc, collection, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
/* ---------------------- UI helpers ---------------------- */
const el = (id) => document.getElementById(id);
const setBanner = (msg, kind="info") => {
  const target = el("status");
  if (!target) return;
  target.classList.remove("info","ok","err","warn");
  target.classList.add(kind);
  target.textContent = msg;
};
const randHex = (nBytes=8) => {
  const arr = new Uint8Array(nBytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const toggleDisabled = (flag=true) => {
  el("genOne")?.toggleAttribute("disabled", flag);
  el("genAll")?.toggleAttribute("disabled", flag);
};

/* ---------------------- Auth (temp dev) ---------------------- */
(async () => {
  // disable buttons until auth resolves to avoid silent write failures
  toggleDisabled(true);
  try {
    await signInWithEmailAndPassword(auth, "organizer@example.com", "password");
    console.log("Signed in as organizer@example.com");
    setBanner("Signed in (dev). You can generate QRs.", "ok");
  } catch (e) {
    console.warn("Not signed in; Firestore writes may fail:", e.message);
    setBanner("Not signed in (dev). QR generation may fail.", "warn");
  } finally {
    toggleDisabled(false);
  }
})();

/* ============================================================
   Firestore write for ticket + compact QR payload
   ============================================================ */
async function upsertTicket(eventId, attendeeId) {
  const r = doc(db, "events", eventId, "attendees", attendeeId);
  const s = await getDoc(r);
  const ticketSecret = randHex(8);
  const base = {
    registered: true,
    checkedIn: false,
    checkedInAt: null,
    ticketSecret,
    updatedAt: new Date()
  };
  if (!s.exists()) {
    await setDoc(r, base);
  } else {
    await updateDoc(r, base);
  }
  // payload the scanner expects
  return { v:1, e:eventId, a:attendeeId, ts:ticketSecret };
}

/* ============================================================
   QR render (returns the created card element)
   ============================================================ */
function renderQR(container, payload, label) {
  if (!container) throw new Error("#out container not found");
  if (typeof QRCode === "undefined") throw new Error("QRCode global missing");

  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = label;

  const box = document.createElement("div");
  box.className = "qr";

  card.appendChild(title);
  card.appendChild(box);
  container.appendChild(card);

  new QRCode(box, {
    text: JSON.stringify(payload),
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.H
  });

  return card;
}

/* ============================================================
   Attach UI handlers
   ============================================================ */
function attachGenerator() {
  const out = el("out");
  const genOne = el("genOne");
  const genAll = el("genAll");
  if (!out || !genOne) {
    console.log("Generator elements not found; skipping attach.");
    return;
  }

  console.log("QR Generator mode");
  setBanner("Ready.", "info");

  genOne.onclick = async () => {
    const eventId = el("eventId").value.trim();
    const attendeeId = el("attendeeId").value.trim();
    if (!eventId || !attendeeId) {
      alert("Enter eventId and attendeeId");
      return;
    }

    // show a pending card immediately
    let pending;
    try {
      pending = renderQR(out, { v:1, e:eventId, a:attendeeId, ts:"pending" },
                         `${eventId} / ${attendeeId} (pending)`);
    } catch (e) {
      console.error(e);
      setBanner(e.message, "err");
      return;
    }

    setBanner("Saving ticket to Firestore…", "info");
    try {
      const signed = await upsertTicket(eventId, attendeeId);
      pending.remove();
      renderQR(out, signed, `${eventId} / ${attendeeId}`);
      setBanner("Signed QR rendered.", "ok");
    } catch (e) {
      console.error("Firestore write failed:", e);
      setBanner(`Firestore write failed: ${e.message}`, "err");
      // keep pending card as a visual cue
    }
  };

  if (genAll) {
    genAll.onclick = async () => {
      const eventId = el("eventId").value.trim();
      if (!eventId) {
        alert("Enter eventId");
        return;
      }
      out.innerHTML = "";
      setBanner("Loading attendees…", "info");
      try {
        const snap = await getDoc(doc(db, "events", eventId, "attendee"));
        let count = 0;
        for (const d of snap.docs) {
          const attendeeId = d.id;
          const data = d.data();
          if (!data?.registered) continue;

          let pending;
          try {
            pending = renderQR(out, { v:1, e:eventId, a:attendeeId, ts:"pending" },
                               `${eventId} / ${attendeeId} (pending)`);
          } catch (e) {
            console.error("Render pending failed:", e);
            continue;
          }

          try {
            const signed = await upsertTicket(eventId, attendeeId);
            pending.remove();
            renderQR(out, signed, `${eventId} / ${attendeeId}`);
            count++;
          } catch (inner) {
            console.error("Mint failed for", attendeeId, inner);
            // leave pending card for visibility
          }
        }
        setBanner(`Rendered ${count} signed QRs.`, "ok");
      } catch (e) {
        console.error(e);
        setBanner(`Could not read attendees: ${e.message}`, "err");
      }
    };
  }
}

/* ---------------------- Ensure handlers attach ---------------------- */
function safeAttach() {
  try {
    attachGenerator();
    console.log("Generator UI attached.");
  } catch (e) {
    console.error("Failed to attach generator UI:", e);
    setBanner("Failed to attach UI. See console.", "err");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeAttach);
} else {
  safeAttach();
}

// Extra guard: tell us if QRCode wasn't available at runtime
if (typeof QRCode === "undefined") {
  console.error("qrcode.js not loaded. Include it BEFORE this module.");
  setBanner("qrcode.js not loaded", "err");
}


/* ============================================================
   SCANNER
   ============================================================ */
async function getRole() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().role : null;
}

async function validateAndMaybeCheckIn(p) {
  const { e, a, ts } = p || {};
  if (!e || !a || !ts) return { valid:false, reason:"bad_payload" };

  const r = doc(db, "events", e, "attendee", a);
  const s = await getDoc(r);
  if (!s.exists())   return { valid:false, reason:"not_registered" };
  const data = s.data();

  if (data.ticketSecret !== ts) return { valid:false, reason:"bad_signature" };

  const role = await getRole();
  if (role === "organizer") {
    if (data.checkedIn === true) return { valid:true, alreadyScanned:true };
    await updateDoc(r, { checkedIn:true, checkedInAt:new Date() });
    return { valid:true, alreadyScanned:false };
  }
  return { valid:true, alreadyScanned: !!data.checkedIn };
}

let html5QrCode = null;
let scanning = false;

async function onScanSuccess(decodedText) {
  try {
    let payload;
    try { payload = JSON.parse(decodedText); }
    catch { setBanner("❌ QR is not JSON.", "err"); return; }

    setBanner("Validating…", "info");
    const res = await validateAndMaybeCheckIn(payload);

    if (!res.valid) {
      const map = {
        bad_payload:"Invalid QR payload.",
        not_registered:"Not registered.",
        bad_signature:"Signature mismatch."
      };
      setBanner("❌ " + (map[res.reason] || "Invalid ticket."), "err");
      return;
    }
    if (res.alreadyScanned) setBanner("⚠️ Already checked in.", "warn");
    else setBanner("✅ Check-in recorded.", "ok");
  } catch (e) {
    console.error(e);
    setBanner("❌ Error validating ticket.", "err");
  } finally {
    try { await html5QrCode.stop(); await html5QrCode.clear(); } catch {}
    setTimeout(startScanner, 900);
  }
}

async function startScanner(cameraId) {
  const reader = el("reader");
  if (!reader) return; // not on scanner page
  // eslint-disable-next-line no-undef
  html5QrCode = html5QrCode || new Html5Qrcode("reader");
  try {
    // eslint-disable-next-line no-undef
    const devices = await Html5Qrcode.getCameras();
    if (!devices?.length) {
      setBanner("No camera found. Use HTTPS/localhost & allow permission.", "err");
      return;
    }
    const chosen = cameraId || devices.find(d => /back|rear/i.test(d.label)) || devices[0];
    await html5QrCode.start(
      chosen.id,
      {
        fps: 10,
        // SQUARE scan area: 60% of the smaller viewport edge
        qrbox: (vw, vh) => {
          const s = Math.floor(Math.min(vw, vh) * 0.6);
          return { width: s, height: s };
        }
      },
      onScanSuccess,
      () => {}
    );
    scanning = true;
    setBanner("Align QR code within the box", "info");
  } catch (e) {
    console.error(e);
    setBanner("Camera error: " + (e?.message || e), "err");
  }
}

async function stopScanner() {
  if (!html5QrCode || !scanning) return;
  try { await html5QrCode.stop(); await html5QrCode.clear(); } finally { scanning = false; }
}

/* ---------------------- AUTO BOOT ---------------------- */
window.addEventListener("DOMContentLoaded", () => {
  if (el("genOne")) attachGenerator();
  if (el("reader")) {
    startScanner();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopScanner(); else startScanner();
    });
  }
});
