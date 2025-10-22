// ------------------------------
// eventD.js
// Handles both event creation and editing
// ------------------------------


import { auth, db } from "../../Shared/firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// 🧭 Detect if this is edit or create mode
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const formEl = document.getElementById("eventForm") || document.getElementById("editEventForm");

if (!formEl) {
  console.error("[eventD] ❌ No form element found. Check your HTML and script paths.");
}

// 🔄 Load event data in EDIT mode
async function loadEventForEdit() {
  if (!eventId) return;
  console.log("[eventD] Editing event:", eventId);

  try {
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      alert("Event not found.");
      return;
    }

    const data = snap.data();
    document.getElementById("eventName").value = data.eventName || "";
    document.getElementById("eventDescription").value = data.eventDescription || "";
    document.getElementById("eventBanner").value = data.banner || "";
    document.getElementById("eventLocation").value = data.eventLocation || "";
    document.getElementById("eventCategory").value = data.eventCategory || "";
    document.getElementById("capacity").value = data.capacity || "";
    document.getElementById("ticketPrice").value = data.ticketPrice || "";

    // Trigger banner preview if available
    if (data.banner && typeof previewBanner === "function") previewBanner();

    // Fill date & time
    const dt = data.eventDateTime?.toDate?.();
    if (dt) {
      document.getElementById("eventDate").value = dt.toISOString().split("T")[0];
      document.getElementById("eventTime").value = dt.toTimeString().slice(0, 5);
    }

    // ✅ FIX: Delay preview update until DOM is ready
    if (typeof updatePreview === "function") {
      setTimeout(updatePreview, 50);
    }

    console.log("[eventD] ✅ Event data loaded for editing");
  } catch (err) {
    console.error("[eventD] Error loading event:", err);
    alert("Error loading event details.");
  }
}

// 🧠 Wait for authentication before enabling form submission
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be logged in to create or edit events.");
    window.location.href = "../Registration/SignIn.html";
    return;
  }

  console.log("[eventD] Authenticated as:", user.uid);

  // Handle form submission
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const f = e.target;
    const eventName = f.eventName.value.trim();
    const eventDescription = f.eventDescription.value.trim();
    const eventBanner = f.eventBanner.value;
    const eventDate = f.eventDate.value;
    const eventTime = f.eventTime.value;
    const eventLocation = f.eventLocation.value.trim();
    const eventCategory = f.eventCategory.value;
    const openTo = f.openTo
      ? Array.from(f.openTo.selectedOptions).map((o) => o.value)
      : [];

    const capacity = parseInt(f.capacity.value, 10);
    const ticketPrice = parseFloat(f.ticketPrice.value);
    const eventDateObj = new Date(`${eventDate}T${eventTime}:00`);

    try {
      if (eventId) {
        // ✏️ EDIT MODE
        const docRef = doc(db, "events", eventId);
        await updateDoc(docRef, {
          eventName,
          eventDescription,
          banner: eventBanner,
          eventDateTime: Timestamp.fromDate(eventDateObj),
          eventLocation,
          eventCategory,
          openTo,
          capacity,
          ticketPrice
        });
        alert("Event updated successfully!");
        console.log("[eventD] ✅ Updated event:", eventId);
        window.location.href = `eventPage.html?id=${eventId}`;
      } else {
        // ➕ CREATE MODE
        const docRef = await addDoc(collection(db, "events"), {
          eventName,
          eventDescription,
          banner: eventBanner,
          eventDateTime: Timestamp.fromDate(eventDateObj),
          eventLocation,
          eventCategory,
          openTo,
          capacity,
          ticketPrice,
          createdBy: user.uid, // ✅ Real authenticated UID
          createdAt: serverTimestamp(),
          ticketsSold: 0
        });
        alert("Event created successfully!");
        console.log("[eventD] ✅ Created new event:", docRef.id);
        f.reset();
      }
    } catch (error) {
      console.error("[eventD] Firestore error:", error);
      if (error?.code === "permission-denied") {
        alert("Permission denied. Ensure your account has 'organizer' permissions.");
      } else {
        alert("Error saving event. Please try again.");
      }
    }
  });
});

// ➕ Optional: Add University feature
document.getElementById("addUniversity")?.addEventListener("click", () => {
  const university = prompt("Enter the name of the university:");
  if (university) {
    const sel = document.getElementById("openTo");
    if (sel) {
      const opt = document.createElement("option");
      opt.value = university;
      opt.text = university;
      sel.add(opt);
    }
  }
});

// Load existing event if in edit mode
if (eventId) loadEventForEdit();

console.log("[eventD] ✅ Script ready");

