import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  collection, 
  updateDoc, 
  increment,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db } from "../Shared/firebase-config.js";

// Get event ID from URL parameters
const params = new URLSearchParams(window.location.search);
const eventID = params.get("id");

// User data
let currentUser = null;
let currentUserData = null;

// Event data
let eventData = null;
const LOW_AVAILABILITY_PERCENT = 0.2; // 20%
let paymentRequired = false;

console.log("Event ID:", eventID);

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
    window.location.href = "../Registration/SignIn.html";
  }
});

// Load event data from Firebase
async function loadEventData() {
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

// Quantity controls
document.getElementById("increase").addEventListener("click", () => {
  const qtyInput = document.getElementById("qty");
  const currentQty = parseInt(qtyInput.value) || 1;
  const maxQty = Math.min(10, getAvailableTickets());
  if (currentQty < maxQty) {
    qtyInput.value = currentQty + 1;
  }
});

document.getElementById("decrease").addEventListener("click", () => {
  const qtyInput = document.getElementById("qty");
  const currentQty = parseInt(qtyInput.value) || 1;
  if (currentQty > 1) {
    qtyInput.value = currentQty - 1;
  }
});

// Get available tickets
function getAvailableTickets() {
  if (!eventData) return 0;
  const capacity = eventData.capacity || 0;
  const sold = eventData.ticketsSold || 0;
  return capacity - sold;
}

// Add ticket button (optional - can be used to add to cart before confirming)
document.getElementById("add-ticket").addEventListener("click", () => {
  const qty = parseInt(document.getElementById("qty").value) || 1;
  showToast(`${qty} ticket(s) ready to claim`, "success");
});

// Confirm reservation
document.getElementById("confirm").addEventListener("click", async (e) => {
  e.preventDefault();
  
  if (!currentUser || !currentUserData || !eventData) {
    showToast("Please sign in to claim tickets", "error");
    return;
  }
  
  const qty = parseInt(document.getElementById("qty").value) || 1;
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
    // Add attendee(s)
    for (let i = 0; i < qty; i++) {
      await addAttendee(paymentRequired ? true : true); // mark as paid when simulated payment passes
    }
    
    // Update event ticket count
    await updateDoc(doc(db, "events", eventID), {
      ticketsSold: increment(qty),
      capacity: increment(-qty)
    });
    
    showToast(`Successfully claimed ${qty} ticket(s)!`, "success");
    
    // Redirect after success
    setTimeout(() => {
      window.location.href = "../Organizer/organizer-dashboard.html";
    }, 2000);
    
  } catch (error) {
    console.error("Error claiming tickets:", error);
    showToast("Error claiming tickets: " + error.message, "error");
  } finally {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("confirm").disabled = false;
  }
});

// Add attendee to event
async function addAttendee(paid = true) {
  const attendeeData = {
    firstName: currentUserData.firstname || "",
    lastName: currentUserData.lastname || "",
    email: currentUserData.email || currentUser.email,
    userID: currentUser.uid,
    isScanned: false,
    isPaid: paid,
    registeredAt: serverTimestamp()
  };
  
  // Create unique attendee ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const attendeeID = `${currentUser.uid}_${timestamp}_${random}`;
  
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

    const userRef = doc(db, "users", eventData.createdBy);
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

function luhnCheck(num) {
  if (!/^\d{13,19}$/.test(num)) return false;
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num.charAt(i), 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}