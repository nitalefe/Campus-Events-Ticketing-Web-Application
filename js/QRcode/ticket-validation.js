//dont think were using this file but keeping it here for reference in case we need to come back to it for

// ticket-validation.js
// Read-only verification (no auth required, no writes)
import { db } from "../../Shared/firebase-config.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ---- Decrypt (fixed Caesar-style; generator used +7 → apply -7) ----
function decryptString(str, increment = 7) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) - increment);
  }
  return out;
}

// ---- Lightweight popup for feedback ----
function showPopup(message, isSuccess = true) {
  const el = document.createElement("div");
  el.textContent = message;
  Object.assign(el.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "14px 22px",
    borderRadius: "8px",
    color: "#fff",
    zIndex: "1000",
    boxShadow: "0 4px 10px rgba(0,0,0,.2)",
    opacity: "0",
    transition: "opacity .4s ease",
    background: isSuccess ? "#1e90ff" : "#ff4d4d",
    fontFamily: "Inter, system-ui, Arial",
    fontSize: "15px",
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => (el.style.opacity = "1"));
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }, 2200);
}

/**
 * Validate (read-only): confirm the attendee exists under the event.
 * QR plaintext after decrypt: "eventId/attendeeId"
 */
export async function validateTicket(scannedText, increment = 7) {
  try {
    // 1) Decrypt & parse
    const decrypted = decryptString(scannedText, increment);
    const parts = (decrypted || "").split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      showPopup("❌ Invalid QR format", false);
      return { ok: false, message: "Invalid QR format" };
    }
    const [eventId, attendeeId] = parts;

    // 2) Confirm event exists
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      showPopup("❌ Event not found", false);
      return { ok: false, message: "Event not found" };
    }

    // 3) Confirm attendee doc exists in subcollection
    const attendeeRef = doc(db, "events", eventId, "attendees", attendeeId);
    const attendeeSnap = await getDoc(attendeeRef);
    if (!attendeeSnap.exists()) {
      showPopup("❌ Not registered for this event", false);
      return { ok: false, message: "Attendee not found for this event" };
    }

    // (Optional) If you store `registered: true`, enforce it:
    const att = attendeeSnap.data() || {};
    if (att.hasOwnProperty("registered") && !att.registered) {
      showPopup("❌ Not registered for this event", false);
      return { ok: false, message: "Attendee not registered" };
    }

    showPopup("✅ Attendee found for this event.", true);
    return { ok: true, message: "Attendee found for this event" };

  } catch (err) {
    console.error("Validation error:", err);
    showPopup("❌ Validation failed", false);
    return { ok: false, message: "Validation failed" };
  }
}
