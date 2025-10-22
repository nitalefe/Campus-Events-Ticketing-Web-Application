// ======================================================
// eventD.js (Events Script)
// Handles both Event Creation and Event Editing
// ======================================================

// ------------------------------
// Firebase Imports
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
if (!formEl) {
  console.error("[eventD] ❌ No form element found. Check your HTML and script paths.");
}


// ======================================================
// SECTION 2: Load existing event data in EDIT mode
// ======================================================
async function loadEventForEdit() {
  // Only run if we actually have an event ID
  if (!eventId) return;
  console.log("[eventD] Editing event:", eventId);

  try {
    // Reference the Firestore document for this event
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);

    // If event doesn't exist, notify the user
    if (!snap.exists()) {
      alert("Event not found.");
      return;
    }

    // Get the event data
    const data = snap.data();

    // Fill input fields with existing data
    document.getElementById("eventName").value = data.eventName || "";
    document.getElementById("eventDescription").value = data.eventDescription || "";
    document.getElementById("eventBanner").value = data.banner || "";
    document.getElementById("eventLocation").value = data.eventLocation || "";
    document.getElementById("eventCategory").value = data.eventCategory || "";
    document.getElementById("capacity").value = data.capacity || "";
    document.getElementById("ticketPrice").value = data.ticketPrice || "";

    // Preview banner image if one is selected
    if (data.banner && typeof previewBanner === "function") previewBanner();

    // Convert Firestore timestamp to HTML date & time inputs
    const dt = data.eventDateTime?.toDate?.();
    if (dt) {
      document.getElementById("eventDate").value = dt.toISOString().split("T")[0];
      document.getElementById("eventTime").value = dt.toTimeString().slice(0, 5);
    }

    // Small delay to ensure preview updates after DOM loads
    if (typeof updatePreview === "function") {
      setTimeout(updatePreview, 50);
    }

    console.log("[eventD] ✅ Event data loaded successfully for editing");
  } catch (err) {
    console.error("[eventD] Error loading event:", err);
    alert("Error loading event details.");
  }
}


// ======================================================
// SECTION 3: Handle Authentication & Form Submission
// ======================================================
onAuthStateChanged(auth, (user) => {
  // If user not logged in, redirect them to sign-in page
  if (!user) {
    alert("You must be logged in to create or edit events.");
    window.location.href = "../Registration/SignIn.html";
    return;
  }

  console.log("[eventD] Authenticated as:", user.uid);

  // Add listener for form submission (works for both create/edit)
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form reload on submit

    const f = e.target; // Shortcut reference to the form

    // Extract all input values
    const eventName = f.eventName.value.trim();
    const eventDescription = f.eventDescription.value.trim();
    const eventBanner = f.eventBanner.value;
    const eventDate = f.eventDate.value;
    const eventTime = f.eventTime.value;
    const eventLocation = f.eventLocation.value.trim();
    const eventCategory = f.eventCategory.value;

    // Handle multi-select list of universities (if present)
    const openTo = f.openTo
      ? Array.from(f.openTo.selectedOptions).map((o) => o.value)
      : [];

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

        // Redirect to event page (to view changes)
        window.location.href = `eventPage.html?id=${eventId}`;
      }
      // ======================================================
      // CREATE MODE
      // ======================================================
      else {
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
          createdBy: user.uid,      // Track who created the event
          createdAt: serverTimestamp(),
          ticketsSold: 0            // Initialize ticket counter
        });

        alert("Event created successfully!");
        console.log("[eventD] ✅ Created new event:", docRef.id);

        // Clear form after creation
        f.reset();
      }
    } catch (error) {
      console.error("[eventD] Firestore error:", error);

      // Display specific Firestore permission errors
      if (error?.code === "permission-denied") {
        alert("Permission denied. Ensure your account has 'organizer' permissions.");
      } else {
        alert("Error saving event. Please try again.");
      }
    }
  });
});


// ======================================================
// SECTION 4: Add “Add University” Feature
// ======================================================

// Allows organizer to manually add a new university option to the dropdown
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


// ======================================================
// SECTION 5: Initialize Edit Mode (if applicable)
// ======================================================

// Automatically load event details if the URL contains ?id=...
if (eventId) loadEventForEdit();

console.log("[eventD] ✅ Script ready");


