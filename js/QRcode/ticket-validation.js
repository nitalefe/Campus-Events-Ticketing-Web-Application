//dont think were using this file but keeping it here for reference in case we need to come back to it for

// ticket-validation.js
// Read-only verification (no auth required, no writes)
import { db } from "../../js/Shared/firebase-config.js";
import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// If your QR text is already plain "eventId/attendeeId", keep 0.
// If you actually shifted characters when encoding, set to that shift and keep the '-' in decrypt.
const FIXED_INCREMENT = 0;

function decryptString(encryptedText, increment = FIXED_INCREMENT) {
  if (!increment) return encryptedText;
  let out = "";
  for (let i = 0; i < encryptedText.length; i++) {
    out += String.fromCharCode(encryptedText.charCodeAt(i) - increment);
  }
  return out;
}

function parseEventAndAttendee(decryptedText) {
  const parts = (decryptedText || "").split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, message: "Invalid QR format. Expected eventID/attendeeID." };
  }
  return { ok: true, eventId: parts[0], attendeeId: parts[1] };
}

/**
 * Validate a ticket AND consume it atomically (first scan = valid, second = invalid).
 */
export async function validateAndConsumeTicket(encryptedText) {
  try {
    const decrypted = decryptString(encryptedText);
    console.log("[SCAN] decrypted:", decrypted);

    const parsed = parseEventAndAttendee(decrypted);
    if (!parsed.ok) return parsed;

    const { eventId, attendeeId } = parsed;
    const attRef = doc(db, "events", eventId, "attendees", attendeeId);

    const message = await runTransaction(db, async (tx) => {
      const snap = await tx.get(attRef);

      if (!snap.exists()) {
        return { ok: false, message: "❌ Not registered for this event" };
      }

      const data = snap.data() || {};

      if (data.checkedIn) {
        const when = data.checkedInAt?.toDate?.()?.toLocaleString?.() || "previously";
        return { ok: false, message: `❌ Already checked in (${when})` };
      }

      tx.update(attRef, {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
      });

      return { ok: true, message: "✅ Check-in successful." };
    });

    return message;
  } catch (e) {
    console.error("[SCAN] transaction error; attempting read-only check:", e);
    // Optional read-only fallback (if Firestore rules block writes)
    try {
      const decrypted = decryptString(encryptedText);
      const parsed = parseEventAndAttendee(decrypted);
      if (!parsed.ok) return parsed;

      const { eventId, attendeeId } = parsed;
      const attRef = doc(db, "events", eventId, "attendees", attendeeId);
      const snap = await getDoc(attRef);

      if (!snap.exists()) return { ok: false, message: "❌ Not registered for this event" };

      const data = snap.data() || {};
      if (data.checkedIn) {
        const when = data.checkedInAt?.toDate?.()?.toLocaleString?.() || "previously";
        return { ok: false, message: `❌ Already checked in (${when})` };
      }
      return { ok: true, message: "✅ Valid ticket (read-only). Enable write access to auto-consume." };
    } catch (e2) {
      console.error("[SCAN] read-only fallback error:", e2);
      return { ok: false, message: "Unexpected error validating ticket." };
    }
  }
}
