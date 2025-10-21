//same thing here were not using this file but keeping it here for reference in case we need to come back to it for


// --- Ticket Validation Module ---

// Import Firebase setup (same as your project)
import { db } from "../../Shared/firebase-config.js";
import {
  doc,
  getDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/**
 * Decrypt a string by reversing the Caesar-style increment.
 * If the generator used +N, we apply -N here.
 */
function decryptString(str, increment) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const newChar = String.fromCharCode(charCode - increment);
    result += newChar;
  }
  return result;
}

/**
 * Simple popup notification
 * Displays a small message in the center or top corner of the screen.
 */
function showPopup(message, isSuccess = true) {
  const popup = document.createElement("div");
  popup.textContent = message;

  // Styling
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.padding = "15px 25px";
  popup.style.borderRadius = "8px";
  popup.style.fontSize = "16px";
  popup.style.fontFamily = "Inter, sans-serif";
  popup.style.zIndex = "1000";
  popup.style.color = "white";
  popup.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  popup.style.transition = "opacity 0.5s ease";
  popup.style.opacity = "0";

  // Color based on result
  popup.style.background = isSuccess ? "#1e90ff" : "#ff4d4d";

  document.body.appendChild(popup);

  // Fade-in
  setTimeout(() => {
    popup.style.opacity = "1";
  }, 50);

  // Fade-out and remove
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}

/**
 * Validate and consume (mark used) a ticket based on the scanned QR code.
 */
export async function validateTicket(scannedText, increment = 7) {
  try {
    // 1️⃣ Decrypt QR text
    const decryptedText = decryptString(scannedText, increment);
    console.log("Decrypted QR text:", decryptedText);

    // 2️⃣ Split eventID and attendeeID
    const parts = decryptedText.split("/");
    if (parts.length !== 2) {
      showPopup("❌ Invalid QR format", false);
      return { ok: false, message: "Invalid QR format" };
    }

    const [eventID, attendeeID] = parts;

    // 3️⃣ Verify event exists
    const eventRef = doc(db, "events", eventID);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      showPopup("❌ Event not found", false);
      return { ok: false, message: "Event not found" };
    }

    // 4️⃣ Verify attendee exists
    const attendeeRef = doc(db, "attendee", attendeeID);
    const attendeeSnap = await getDoc(attendeeRef);
    if (!attendeeSnap.exists()) {
      showPopup("❌ Attendee not found", false);
      return { ok: false, message: "Attendee not found" };
    }

    const attendeeData = attendeeSnap.data();

    // 5️⃣ Check if attendee belongs to event
    if (attendeeData.eventId !== eventID) {
      showPopup("❌ Wrong event", false);
      return { ok: false, message: "Wrong event" };
    }

    // 6️⃣ Check if already used
    if (attendeeData.used === true) {
      showPopup("⚠️ Already scanned", false);
      return { ok: false, message: "Already used" };
    }

    // 7️⃣ Mark as used safely
    await runTransaction(db, async (tx) => {
      const freshSnap = await tx.get(attendeeRef);
      if (!freshSnap.exists()) throw new Error("Attendee no longer exists.");
      const freshData = freshSnap.data();
      if (freshData.used === true) throw new Error("ALREADY_USED");

      tx.update(attendeeRef, {
        used: true,
        usedAt: new Date().toISOString(),
      });
    });

    // ✅ Success
    showPopup("✅ Ticket validated successfully!", true);
    return { ok: true, message: "Ticket validated successfully" };

  } catch (error) {
    console.error("Validation error:", error);
    if (String(error).includes("ALREADY_USED")) {
      showPopup("⚠️ Ticket already used", false);
      return { ok: false, message: "Ticket already used" };
    }
    showPopup("❌ Validation failed", false);
    return { ok: false, message: "Validation failed" };
  }
}
