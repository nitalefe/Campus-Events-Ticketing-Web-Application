import {
  doc,
  query,
  where,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  increment,
  collection,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db } from "../../js/Shared/firebase-config.js";
import luhnCheck from "./luhnCheck.js";

const params = new URLSearchParams(window.location.search);
const eventID = params.get("id");

// User data
let currentUser = null;
let currentUserData = null;

// Event data
const LOW_AVAILABILITY_PERCENT = 0.2; // 20%
let eventData = null;
let paymentRequired = false;

console.log("Event ID:", eventID);

let hasRun = false;

if (!hasRun) {
  loadEventData();
  console.log(currentUserData);
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is signed in:", user.email);
    currentUser = user;

    // Fetch user data
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        currentUserData = userDoc.data();
        console.log("User data loaded:", currentUserData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }

    // Load event data
    if (eventID) {
      await loadEventData();
    } else {
      showToast("No event ID provided", "error");
    }
  } else {
    console.log("No user signed in, redirecting...");
    window.location.href = "../Registration/SignIn.html"; // Redirect to sign-in page
  }
});

// Load event data from Firebase
async function loadEventData() {
  hasRun = true;
  try {
    const eventDoc = await getDoc(doc(db, "events", eventID));

    if (!eventDoc.exists()) {
      showToast("Event not found", "error");
      return;
    }

    eventData = { id: eventDoc.id, ...eventDoc.data() };
    console.log("Event data loaded:", eventData);

    // Update UI with event data
    updateEventUI();

  } catch (error) {
    console.error("Error loading event data:", error);
    showToast("Error loading event data", "error");
  }
}

// Update UI with event information
function updateEventUI() {
  if (!eventData) return;

  // Update event title
  document.getElementById("event-title").textContent = eventData.eventName || "Event";

  // Update organization (fetch organizer name from users/{createdBy})
  const orgNameEl = document.getElementById("org-name");
  if (orgNameEl) orgNameEl.textContent = "Organizer"; // default while loading
  setOrganizerName();

  // Update event date
  if (eventData.eventDateTime) {
    const date = eventData.eventDateTime.toDate ? eventData.eventDateTime.toDate() : new Date(eventData.eventDateTime);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    document.getElementById("event-date").textContent = dateStr;
  }

  // Update location
  document.getElementById("event-location").textContent = eventData.eventLocation || "Location TBD";

  // Update description
  document.getElementById("event-description").textContent = eventData.eventDescription || "No description available.";

  // Update price
  const price = eventData.ticketPrice || 0;
  const priceText = price === 0 ? "Free" : `$${price.toFixed(2)}`;
  document.getElementById("ticket-price").textContent = priceText;
  document.querySelector(".ticket-name").textContent = priceText;
  // Toggle payment section
  paymentRequired = price > 0;
  const paymentSection = document.getElementById("payment-section");
  if (paymentSection) paymentSection.style.display = paymentRequired ? "block" : "none";
  const confirmBtn = document.getElementById("confirm");
  if (confirmBtn) confirmBtn.textContent = paymentRequired ? `Pay & Confirm` : `Confirm reservation`;

  // Update availability
  updateAvailability();
}

// Update ticket availability display
function updateAvailability() {
  if (!eventData) return;

  const capacity = eventData.capacity || 0;
  const sold = eventData.ticketsSold || 0;
  const remaining = capacity - sold;

  // Update remaining tickets text
  document.getElementById("remaining-text").textContent = `${remaining} left!`;
  document.getElementById("tickets-left-text").textContent = `${remaining} tickets left`;

  // Update ticket details
  const ticketDetails = eventData.ticketDetails || "General admission ticket";
  document.getElementById("ticket-details").textContent = ticketDetails;

  // Disable confirm button if sold out
  const confirmBtn = document.getElementById("confirm");
  if (remaining <= 0) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Sold Out";
    showToast("This event is sold out", "error");
  }

  // Show low availability warning
  if (remaining > 0 && remaining <= capacity * LOW_AVAILABILITY_PERCENT) {
    showToast(`Only ${remaining} tickets left!`, "error");
  }
}

// Get available tickets
function getAvailableTickets() {
  if (!eventData) return 0;
  const capacity = eventData.capacity || 0;
  const sold = eventData.ticketsSold || 0;
  return capacity - sold;
}

document.addEventListener("DOMContentLoaded", () => {
  const ticketCard = document.getElementById("ticket-card");
  const addBtn = document.getElementById("add-ticket");

  if (!ticketCard || !addBtn) return;

  // Clicking the ticket card itself toggles selection
  ticketCard.addEventListener("click", (e) => {
    // Avoid toggling when clicking the button inside
    if (e.target === addBtn || addBtn.contains(e.target)) return;
    ticketCard.classList.toggle("selected");
  });

  // Clicking the "Select" button only adds highlight
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent card toggle
    ticketCard.classList.add("selected");
    showToast("Ticket ready to claim", "success");
  });
});

// Confirm reservation
document.getElementById("confirm").addEventListener("click", async (e) => {
  e.preventDefault();

  const ticketCard = document.getElementById("ticket-card");
  if (!ticketCard.classList.contains("selected")) {
    showToast("Please select a ticket before confirming.", "error");
    return;
  }

  // const qty = parseInt(document.getElementById("qty").value) || 1;
  const qty = 1;
  const available = getAvailableTickets();

  if (qty > available) {
    showToast(`Only ${available} tickets available`, "error");
    return;
  }

  // If payment required, validate card info (simulated)
  if (paymentRequired) {
    const valid = validatePaymentForm();
    if (!valid) return; // validatePaymentForm shows its own toast
  }

  // Show spinner
  document.getElementById("spinner").style.display = "block";
  document.getElementById("confirm").disabled = true;

  try {
    // Simulate payment processing if needed
    if (paymentRequired) {
      await new Promise((res) => setTimeout(res, 600));
    }

    if (await checkIfUserIsAttending(eventID, currentUser.uid)) {
      // if (await checkIfUserIsAttending(eventID, currentUserData.uid)) {
      throw new Error("You have already claimed a ticket for this event.");
    }

    // Add attendee(s)
    for (let i = 0; i < qty; i++) {
      await addAttendee(paymentRequired ? true : true); // mark as paid when simulated payment passes
    }

    // Update event ticket count
    await updateDoc(doc(db, "events", eventID), {
      ticketsSold: increment(qty),
      // capacity: increment(-qty)
    });
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        claimedEvents: arrayUnion(eventID)
      });
      console.log(`Added ${eventID} to user's claimedEvents`);
    } catch (err) {
      console.error("Error updating claimedEvents:", err);
    }

    // showToast(`Successfully claimed ${qty} ticket(s)!`, "success");
    showToast(`Successfully claimed ticket!`, "success");

    // Redirect after success
    setTimeout(() => {
      window.location.href = "../../website/Student/student-dashboard.html";
    }, 2000);

  } catch (error) {
    console.error("Error claiming tickets:", error);
    showToast("Error claiming tickets: " + error.message, "error");
  } finally {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("confirm").disabled = false;
  }
});

async function checkIfUserIsAttending(eventID, userID) {
  if (!eventID || !userID) {
    console.error("Missing eventID or userID when checking attendee");
    return false;
  }

  try {
    const attendeesRef = collection(db, "events", eventID, "attendees");

    const q = query(attendeesRef, where("userID", "==", userID));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log("User is already an attendee!");
      return true; // user already claimed a ticket
    } else {
      console.log("User has not claimed a ticket yet.");
      return false;
    }
  } catch (error) {
    console.error("Error checking attendee:", error);
    return false;
  }
};

// Add attendee to event
async function addAttendee(paid = true) {
  const attendeeData = {
    firstName: currentUserData.firstname || "",
    lastName: currentUserData.lastname || "",
    email: currentUserData.email || currentUser.email,
    userID: currentUser.uid,
    // userID: currentUserData.uid,
    isScanned: false,
    isPaid: paid,
    registeredAt: serverTimestamp()
  };

  // Create unique attendee ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  // const attendeeID = currentUser.uid;
  const attendeeID = currentUser.uid;
  // const attendeeID = `${currentUserData.uid}_${timestamp}_${random}`;
  // const attendeeID = `${currentUser.uid}_${timestamp}_${random}`;

  const attendeeRef = doc(db, "events", eventID, "attendees", attendeeID);

  try {
    await setDoc(attendeeRef, attendeeData);
    console.log(`Attendee added with ID: ${attendeeID}`);
    return attendeeID;
  } catch (error) {
    console.error("Error adding attendee:", error);
    throw error;
  }
}

// Toast notification system
function showToast(message, type = "success") {
  const toastWrap = document.getElementById("toast-wrap");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastWrap.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Fetch and set organizer name based on eventData.createdBy
async function setOrganizerName() {
  try {
    if (!eventData || !eventData.createdBy) return;
    const orgNameEl = document.getElementById("org-name");
    if (!orgNameEl) return;

    const userRef = doc(db, "events", eventID);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const u = userSnap.data();
      const composedName = [u?.firstName, u?.lastName].filter(Boolean).join(" ");
      const name = u?.displayName || composedName || u?.name || u?.organization || u?.school || u?.email || "Organizer";
      orgNameEl.textContent = name;
    } else {
      // Fallback if user document missing
      orgNameEl.textContent = "Organizer";
    }
  } catch (e) {
    console.error("Failed to load organizer name:", e);
    const orgNameEl = document.getElementById("org-name");
    if (orgNameEl) orgNameEl.textContent = "Organizer";
  }
}

// Basic front-end validation for payment form (no real processing)
function validatePaymentForm() {
  const name = (document.getElementById("cc-name")?.value || "").trim();
  const numberRaw = (document.getElementById("cc-number")?.value || "").replace(/\s+/g, "");
  const exp = (document.getElementById("cc-exp")?.value || "").trim();
  const cvc = (document.getElementById("cc-cvc")?.value || "").trim();

  if (!name || !numberRaw || !exp || !cvc) {
    showToast("Please fill in all card fields", "error");
    return false;
  }

  // Luhn check for card number (simple)
  if (!luhnCheck(numberRaw)) {
    showToast("Invalid card number", "error");
    return false;
  }

  // Expiry MM/YY
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
    showToast("Invalid expiry format (MM/YY)", "error");
    return false;
  }
  const [mm, yy] = exp.split("/").map((s) => parseInt(s, 10));
  if (mm < 1 || mm > 12) {
    showToast("Invalid expiry month", "error");
    return false;
  }
  const now = new Date();
  const curY = now.getFullYear() % 100;
  const curM = now.getMonth() + 1;
  if (yy < curY || (yy === curY && mm < curM)) {
    showToast("Card has expired", "error");
    return false;
  }

  if (!/^\d{3,4}$/.test(cvc)) {
    showToast("Invalid CVC", "error");
    return false;
  }
  return true;
}