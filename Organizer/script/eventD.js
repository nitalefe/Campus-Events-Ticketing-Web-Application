// Use the same Firebase CDN version as your Registration page
/*
// import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { /*getFirestore, */collection, addDoc, serverTimestamp, Timestamp }
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs, doc, updateDoc }

  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { /*getAuth, */onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db, app} from "../../Shared/firebase-config.js";

//Sanity check
console.log("[eventD] loaded; Firebase init ok");

//See auth state changes in console
onAuthStateChanged(auth, (user) => {
  console.log("[eventD] auth state:", user ? `signed in as ${user.uid}` : "no user");
});

// Handle form submission
const formEl = document.getElementById('eventForm');
if (!formEl) {
  console.error("[eventD] #eventForm not found. Is the script path correct and tag at end of <body>?");
}

// Listen for form submit
formEl?.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log("[eventD] submit fired");

  // TEMPORARY: skip auth requirement for testing
  const currentUser = auth.currentUser || { uid: "testUser123" };

  /*const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("You must be logged in to create an event.");
    console.warn("[eventD] currentUser is null (enable provider in Firebase Console → Authentication)");
    return;
  } */

  // Get form values
  const f = e.target;
  const eventName        = f.eventName.value.trim();
  const eventDescription = f.eventDescription.value.trim();
  const eventDate        = f.eventDate.value; // "YYYY-MM-DD"
  const eventTime        = f.eventTime.value; // "HH:MM"
  const eventLocation    = f.eventLocation.value.trim();
  const eventCategory    = f.eventCategory.value;

  // Open to (multiple select)
  const openTo = Array.from(f.openTo.selectedOptions).map(o => o.value);

  const capacity    = parseInt(f.capacity.value, 10);
  const ticketPrice = parseFloat(f.ticketPrice.value);

  // Combine date + time → Date → Firestore Timestamp
  const eventDateObj = new Date(`${eventDate}T${eventTime}:00`);
  const eventTimestamp = Timestamp.fromDate(eventDateObj);

  try {
    // Check for duplicate events with same name, date/time, and location
    const duplicateQuery = query(
      collection(db, "events"),
      where("eventName", "==", eventName),
      where("eventDateTime", "==", eventTimestamp),
      where("eventLocation", "==", eventLocation)
    );

    const duplicateSnapshot = await getDocs(duplicateQuery);
    
    if (!duplicateSnapshot.empty) {
      // Event with same name, date/time, and location exists
      const existingDoc = duplicateSnapshot.docs[0];
      const existingData = existingDoc.data();
      
      // Ask user if they want to update the existing event
      const updateConfirmed = confirm(
        `An event with the same name "${eventName}" at "${eventLocation}" on ${eventDate} at ${eventTime} already exists.\n\n` +
        `Current description: "${existingData.eventDescription}"\n` +
        `Current category: ${existingData.eventCategory}\n` +
        `Current capacity: ${existingData.capacity}\n` +
        `Current ticket price: $${existingData.ticketPrice}\n\n` +
        `Do you want to update this existing event with the new information?`
      );

      if (updateConfirmed) {
        // Update the existing event
        await updateDoc(doc(db, "events", existingDoc.id), {
          eventDescription,
          eventCategory,
          openTo,
          capacity,
          ticketPrice,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp()
        });

        alert("Event updated successfully!");
        console.log("[eventD] updated existing doc:", existingDoc.id);
        f.reset();
        return;
      } else {
        // User chose not to update, don't create duplicate
        alert("Event creation cancelled. No changes were made.");
        return;
      }
    }

    // No duplicate found, create new event
    const docRef = await addDoc(collection(db, "events"), {
      eventName,
      eventDescription,
      eventDateTime: eventTimestamp,
      eventLocation,
      eventCategory,
      openTo,
      capacity,
      ticketPrice,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      ticketsSold: 0
    });

    //Confirmation message
    alert("Event created successfully!");
    console.log("[eventD] created doc:", docRef.id);

    f.reset();
  } catch (error) {
    console.error("[eventD] Firestore error:", error);
    // Surface common rule errors clearly
    if (error?.code === "permission-denied") {
      alert("Permission denied. Make sure your user has role=organizer or the rules allow your user to write.");
    } else {
      alert("Error creating/updating event. Please try again.");
    }
  }
});

//Optional helper (safe if the button isn't present)
document.getElementById('addUniversity')?.addEventListener('click', () => {
  const university = prompt("Enter the name of the university:");
  if (university) {
    const sel = document.getElementById('openTo');
    if (sel) {
      const opt = document.createElement('option');
      opt.value = university;
      opt.text  = university;
      sel.add(opt);
    }
  }
});
