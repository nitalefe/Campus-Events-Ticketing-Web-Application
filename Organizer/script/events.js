// Use the same Firebase CDN version as your Registration page
import { auth, db } from "../../Shared/firebase-config.js";
import { 
  collection, addDoc, serverTimestamp, Timestamp, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Sanity check
console.log("[eventD] Loaded; Firebase initialized OK");

// Detect which mode we're in
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id"); // if present → edit mode
const formEl = document.getElementById("eventForm") || document.getElementById("editEventForm");

if (!formEl) {
  console.error("[eventD] ❌ No form element found. Check your HTML file name and script path.");
}

// Track auth state
onAuthStateChanged(auth, (user) => {
  console.log("[eventD] Auth state:", user ? `✅ signed in as ${user.uid}` : "❌ no user");
});

// Temporary fallback (for local testing without auth)
const currentUser = auth.currentUser || { uid: "testUser123" };

// Load event data if in EDIT mode
async function loadEventForEdit() {
  if (!eventId) return; // creation page
  console.log("[eventD] Editing event:", eventId);

  try {
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      alert("Event not found.");
      return;
    }

    const data = snap.data();
    // Fill in fields
    document.getElementById("eventName").value = data.eventName || "";
    document.getElementById("eventDescription").value = data.eventDescription || "";
    document.getElementById("eventLocation").value = data.eventLocation || "";
    document.getElementById("eventCategory").value = data.eventCategory || "";
    document.getElementById("capacity").value = data.capacity || "";
    document.getElementById("ticketPrice").value = data.ticketPrice || "";

    // Extract date + time
    const dt = data.eventDateTime?.toDate?.();
    if (dt) {
      document.getElementById("eventDate").value = dt.toISOString().split("T")[0];
      document.getElementById("eventTime").value = dt.toTimeString().slice(0, 5);
    }

    console.log("[eventD] Event data loaded into form");
  } catch (err) {
    console.error("[eventD] Error loading event for edit:", err);
    alert("Error loading event details.");
  }
}

// Handle form submission
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const f = e.target;
  const eventName = f.eventName.value.trim();
  const eventDescription = f.eventDescription.value.trim();
  const eventDate = f.eventDate.value;
  const eventTime = f.eventTime.value;
  const eventLocation = f.eventLocation.value.trim();
  const eventCategory = f.eventCategory.value;

  // Open To (if exists in the form)
  const openTo = f.openTo
    ? Array.from(f.openTo.selectedOptions).map(o => o.value)
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
        eventDateTime: Timestamp.fromDate(eventDateObj),
        eventLocation,
        eventCategory,
        openTo,
        capacity,
        ticketPrice
      });
      alert("Event updated successfully!");
      console.log("[eventD] ✅ Updated:", eventId);
      window.location.href = `eventPage.html?id=${eventId}`;
    } else {
      // ➕ CREATE MODE
      const docRef = await addDoc(collection(db, "events"), {
        eventName,
        eventDescription,
        eventDateTime: Timestamp.fromDate(eventDateObj),
        eventLocation,
        eventCategory,
        openTo,
        capacity,
        ticketPrice,
        createdBy: currentUser.uid,
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
      alert("Permission denied. Ensure the user has the 'organizer' role.");
    } else {
      alert("Error saving event. Please try again.");
    }
  }
});

// Optional helper (add new university)
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

// Run loader if edit mode
if (eventId) loadEventForEdit();

// Sanity check
console.log("[eventD] ✅ eventD.js ready");
