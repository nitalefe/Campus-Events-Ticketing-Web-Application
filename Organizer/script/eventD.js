// Use the same Firebase CDN version as your Registration page
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

//Firebase configuration 
const firebaseConfig = {
  apiKey: "AIzaSyCtCLGcR_sDwb6wDE7NpVz8vghrxLZFYB8",
  authDomain: "campus-events-ticketing-e648f.firebaseapp.com",
  projectId: "campus-events-ticketing-e648f",
  storageBucket: "campus-events-ticketing-e648f.appspot.com", // ✅ must be appspot.com
  messagingSenderId: "844285609905",
  appId: "1:844285609905:web:72005bbb5915856e8c9f90",
  measurementId: "G-RCMW33FV3L"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

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

  try {
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
      alert("Error creating event. Please try again.");
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
