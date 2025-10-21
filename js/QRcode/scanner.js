//dont think were using this file but keeping it here for reference in case we need to come back to it for

// scaning and ticket validation logic

// --- Decrypt exactly as your teammate described: minus the increment ---
export function decryptString(encryptedText, increment = 7) {
  let result = "";
  for (let i = 0; i < encryptedText.length; i++) {
    result += String.fromCharCode(encryptedText.charCodeAt(i) - increment);
  }
  return result;
}

/**
 * Input must be "eventID/attendeeID" after decryption (matches your generator).
 * Returns { ok:true, eventId, attendeeId } or { ok:false, message }.
 */
export function parseEventAndAttendee(decryptedText) {
  if (!decryptedText || typeof decryptedText !== "string") {
    return { ok: false, message: "Invalid decrypted text." };
  }
  const parts = decryptedText.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, message: "Invalid QR format. Expected eventID/attendeeID." };
  }
  const [eventId, attendeeId] = parts;
  return { ok: true, eventId, attendeeId };
}

/* -----------------------------------------------------------
   MOCK VALIDATION (use now; no database required)
   -----------------------------------------------------------
   - Keeps a mock "registration list" in memory.
   - Persists "used tickets" in localStorage so re-scan is blocked.
   - Later, replace this with Firestore calls (function below).
*/

// Pretend these are attendees registered for an event
// You can edit freely for testing.
const MOCK_REGISTRY = {
  "myEvent123": new Set(["alice001", "bob002", "carol003"]),
  "devfest25" : new Set(["x1", "x2", "x3"])
};

const USED_KEY = "ticket_used_set_v1";

/** Persist & read used tickets as "eventId/attendeeId" strings */
function loadUsedSet() {
  try {
    const raw = localStorage.getItem(USED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function saveUsedSet(usedSet) {
  localStorage.setItem(USED_KEY, JSON.stringify(Array.from(usedSet)));
}

/**
 * Validate a ticket against the mock registry and mark it used.
 * @returns {Promise<{ok:boolean, message:string}>}
 */
export async function validateTicketMock(eventId, attendeeId) {
  // 1) Is this event known?
  if (!MOCK_REGISTRY[eventId]) {
    return { ok: false, message: "❌ Event not found (mock)." };
  }

  // 2) Is the attendee registered to that event?
  if (!MOCK_REGISTRY[eventId].has(attendeeId)) {
    return { ok: false, message: "❌ Attendee not registered for this event (mock)." };
  }

  // 3) Block double use
  const used = loadUsedSet();
  const key = `${eventId}/${attendeeId}`;
  if (used.has(key)) {
    return { ok: false, message: "❌ Ticket already used (mock)." };
  }

  // 4) Mark used
  used.add(key);
  saveUsedSet(used);

  return { ok: true, message: "✅ Ticket validated (mock). Entry granted." };
}

/* -----------------------------------------------------------
   FIRESTORE VALIDATION (wire this later)
   Replace validateTicketMock(...) with validateTicketFirestore(...)
   in scanner.html once your DB is ready.
----------------------------------------------------------- */

// Uncomment when DB is ready:
//
// import { db } from "../../Shared/firebase-config.js";
// import {
//   doc, getDoc, runTransaction
// } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
//
// export async function validateTicketFirestore(eventId, attendeeId) {
//   // 1) Check event
//   const eventRef = doc(db, "events", eventId);
//   const eventSnap = await getDoc(eventRef);
//   if (!eventSnap.exists()) return { ok:false, message:"❌ Event not found." };
//
//   // 2) Load attendee
//   const attendeeRef = doc(db, "attendee", attendeeId);
//   const attendeeSnap = await getDoc(attendeeRef);
//   if (!attendeeSnap.exists()) return { ok:false, message:"❌ Attendee not found." };
//
//   const data = attendeeSnap.data();
//   if (data.eventId !== eventId) return { ok:false, message:"❌ Wrong event for this attendee." };
//   if (data.used === true)       return { ok:false, message:"❌ Ticket already used." };
//
//   // 3) Atomic consume
//   await runTransaction(db, async (tx) => {
//     const fresh = await tx.get(attendeeRef);
//     if (!fresh.exists()) throw new Error("Attendee missing.");
//     if (fresh.data().used === true) throw new Error("ALREADY_USED");
//     tx.update(attendeeRef, { used: true, usedAt: new Date().toISOString() });
//   });
//
//   return { ok:true, message:"✅ Ticket validated. Entry granted." };
// }
