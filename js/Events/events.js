<<<<<<< HEAD
// ======================================================
// eventD.js (Events Script)
// Handles both Event Creation and Event Editing
// ======================================================

// ------------------------------
// Firebase Imports
// ------------------------------
=======
// ------------------------------
// eventD.js
// Handles both event creation and editing
// ------------------------------

>>>>>>> main
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

<<<<<<< HEAD

// ======================================================
// SECTION 1: Detect whether we're in CREATE or EDIT mode
// ======================================================

// Grab query parameters from the current URL
const params = new URLSearchParams(window.location.search);

// Extract the "id" parameter (if present)
// Example: eventEdit.html?id=BrBgOwaVSMx1y2gc3X4s
const eventId = params.get("id");

// Find the form element (works for both create and edit pages)
const formEl =
  document.getElementById("eventForm") ||
  document.getElementById("editEventForm");

// If no form found, log a clear error (useful for debugging wrong script paths)
=======
// 🧭 Detect if this is edit or create mode
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const formEl = document.getElementById("eventForm") || document.getElementById("editEventForm");

>>>>>>> main
if (!formEl) {
  console.error("[eventD] ❌ No form element found. Check your HTML and script paths.");
}

<<<<<<< HEAD

// ======================================================
// SECTION 2: Load existing event data in EDIT mode
// ======================================================
async function loadEventForEdit() {
  // Only run if we actually have an event ID
=======
// 🔄 Load event data in EDIT mode
async function loadEventForEdit() {
>>>>>>> main
  if (!eventId) return;
  console.log("[eventD] Editing event:", eventId);

  try {
<<<<<<< HEAD
    // Reference the Firestore document for this event
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);

    // If event doesn't exist, notify the user
=======
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);
>>>>>>> main
    if (!snap.exists()) {
      alert("Event not found.");
      return;
    }

<<<<<<< HEAD
    // Get the event data
    const data = snap.data();

    // Fill input fields with existing data
=======
    const data = snap.data();
>>>>>>> main
    document.getElementById("eventName").value = data.eventName || "";
    document.getElementById("eventDescription").value = data.eventDescription || "";
    document.getElementById("eventBanner").value = data.banner || "";
    document.getElementById("eventLocation").value = data.eventLocation || "";
    document.getElementById("eventCategory").value = data.eventCategory || "";
    document.getElementById("capacity").value = data.capacity || "";
    document.getElementById("ticketPrice").value = data.ticketPrice || "";

<<<<<<< HEAD
    // Preview banner image if one is selected
    if (data.banner && typeof previewBanner === "function") previewBanner();

    // Convert Firestore timestamp to HTML date & time inputs
=======
    // Trigger banner preview if available
    if (data.banner && typeof previewBanner === "function") previewBanner();

    // Fill date & time
>>>>>>> main
    const dt = data.eventDateTime?.toDate?.();
    if (dt) {
      document.getElementById("eventDate").value = dt.toISOString().split("T")[0];
      document.getElementById("eventTime").value = dt.toTimeString().slice(0, 5);
    }

<<<<<<< HEAD
    // Small delay to ensure preview updates after DOM loads
=======
    // ✅ FIX: Delay preview update until DOM is ready
>>>>>>> main
    if (typeof updatePreview === "function") {
      setTimeout(updatePreview, 50);
    }

<<<<<<< HEAD
    console.log("[eventD] ✅ Event data loaded successfully for editing");
=======
    console.log("[eventD] ✅ Event data loaded for editing");
>>>>>>> main
  } catch (err) {
    console.error("[eventD] Error loading event:", err);
    alert("Error loading event details.");
  }
}

<<<<<<< HEAD

// ======================================================
// SECTION 3: Handle Authentication & Form Submission
// ======================================================
onAuthStateChanged(auth, (user) => {
  // If user not logged in, redirect them to sign-in page
=======
// 🧠 Wait for authentication before enabling form submission
onAuthStateChanged(auth, (user) => {
>>>>>>> main
  if (!user) {
    alert("You must be logged in to create or edit events.");
    window.location.href = "../Registration/SignIn.html";
    return;
  }

  console.log("[eventD] Authenticated as:", user.uid);

<<<<<<< HEAD
  // Add listener for form submission (works for both create/edit)
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form reload on submit

    const f = e.target; // Shortcut reference to the form

    // Extract all input values
=======
  // Handle form submission
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const f = e.target;
>>>>>>> main
    const eventName = f.eventName.value.trim();
    const eventDescription = f.eventDescription.value.trim();
    const eventBanner = f.eventBanner.value;
    const eventDate = f.eventDate.value;
    const eventTime = f.eventTime.value;
    const eventLocation = f.eventLocation.value.trim();
    const eventCategory = f.eventCategory.value;
<<<<<<< HEAD

    // Handle multi-select list of universities (if present)
=======
>>>>>>> main
    const openTo = f.openTo
      ? Array.from(f.openTo.selectedOptions).map((o) => o.value)
      : [];

<<<<<<< HEAD
    // Convert numeric inputs
    const capacity = parseInt(f.capacity.value, 10);
    const ticketPrice = parseFloat(f.ticketPrice.value);

    // Combine date and time into a single Date object
    const eventDateObj = new Date(`${eventDate}T${eventTime}:00`);

    try {
      // ======================================================
      // EDIT MODE
      // ======================================================
      if (eventId) {
=======
    const capacity = parseInt(f.capacity.value, 10);
    const ticketPrice = parseFloat(f.ticketPrice.value);
    const eventDateObj = new Date(`${eventDate}T${eventTime}:00`);

    try {
      if (eventId) {
        // ✏️ EDIT MODE
>>>>>>> main
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
<<<<<<< HEAD

        alert("Event updated successfully!");
        console.log("[eventD] ✅ Updated event:", eventId);

        // Redirect to event page (to view changes)
        window.location.href = `eventPage.html?id=${eventId}`;
      }
      // ======================================================
      // CREATE MODE
      // ======================================================
      else {
=======
        alert("Event updated successfully!");
        console.log("[eventD] ✅ Updated event:", eventId);
        window.location.href = `eventPage.html?id=${eventId}`;
      } else {
        // ➕ CREATE MODE
>>>>>>> main
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
<<<<<<< HEAD
          createdBy: user.uid,      // Track who created the event
          createdAt: serverTimestamp(),
          ticketsSold: 0            // Initialize ticket counter
        });

        alert("Event created successfully!");
        console.log("[eventD] ✅ Created new event:", docRef.id);

        // Clear form after creation
=======
          createdBy: user.uid, // ✅ Real authenticated UID
          createdAt: serverTimestamp(),
          ticketsSold: 0
        });
        alert("Event created successfully!");
        console.log("[eventD] ✅ Created new event:", docRef.id);
>>>>>>> main
        f.reset();
      }
    } catch (error) {
      console.error("[eventD] Firestore error:", error);
<<<<<<< HEAD

      // Display specific Firestore permission errors
=======
>>>>>>> main
      if (error?.code === "permission-denied") {
        alert("Permission denied. Ensure your account has 'organizer' permissions.");
      } else {
        alert("Error saving event. Please try again.");
      }
    }
  });
});

<<<<<<< HEAD

// ======================================================
// SECTION 4: Add “Add University” Feature
// ======================================================

// Allows organizer to manually add a new university option to the dropdown
=======
// ➕ Optional: Add University feature
>>>>>>> main
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

<<<<<<< HEAD

// ======================================================
// SECTION 5: Initialize Edit Mode (if applicable)
// ======================================================

// Automatically load event details if the URL contains ?id=...
if (eventId) loadEventForEdit();

console.log("[eventD] ✅ Script ready");


=======
// Load existing event if in edit mode
if (eventId) loadEventForEdit();

console.log("[eventD] ✅ Script ready");
>>>>>>> main
