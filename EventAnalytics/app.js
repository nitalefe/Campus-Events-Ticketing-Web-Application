// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtCLGcR_sDwb6wDE7NpVz8vghrxLZFYB8",
  authDomain: "campus-events-ticketing-e648f.firebaseapp.com",
  projectId: "campus-events-ticketing-e648f",
  storageBucket: "campus-events-ticketing-e648f.firebasestorage.app",
  messagingSenderId: "844285609905",
  appId: "1:844285609905:web:c8913b71b2991d128c9f90",
  measurementId: "G-1TMVH5DRF3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch all events from the database
window.fetchAllEvents = async function () {
  try {
    document.getElementById("eventsStatus").textContent = "Fetching events...";
    document.getElementById("eventsStatus").className = "status info";

    // Query all events (no authentication required for this test)
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(eventsQuery);

    const events = [];
    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      events.push({
        id: doc.id,
        ...eventData,
        // Convert Firestore timestamp to JavaScript Date
        eventDateTime: eventData.eventDateTime?.toDate() || new Date(),
        createdAt: eventData.createdAt?.toDate() || new Date(),
      });
    });

    document.getElementById(
      "eventsStatus"
    ).textContent = `Found ${events.length} events`;
    document.getElementById("eventsStatus").className = "status success";

    // Display events
    displayEvents(events);
  } catch (error) {
    document.getElementById(
      "eventsStatus"
    ).textContent = `Error: ${error.message}`;
    document.getElementById("eventsStatus").className = "status error";
    console.error("Error fetching events:", error);
  }
};

// Display events in the UI
function displayEvents(events) {
  const eventsList = document.getElementById("eventsList");

  if (events.length === 0) {
    eventsList.innerHTML = "<p>No events found in the database.</p>";
    return;
  }

  eventsList.innerHTML = events
    .map(
      (event) => `
          <div class="event-item">
              <h4>${event.eventName || "Unnamed Event"}</h4>
              <p><strong>Description:</strong> ${
                event.eventDescription || "No description"
              }</p>
              <p><strong>Date:</strong> ${formatDate(event.eventDateTime)}</p>
              <p><strong>Location:</strong> ${
                event.eventLocation || "No location"
              }</p>
              <p><strong>Category:</strong> ${
                event.eventCategory || "No category"
              }</p>
              <p><strong>Created By:</strong> ${
                event.createdBy || "Unknown"
              }</p>
              
              <div class="event-stats">
                  <div class="stat-box">
                      <div class="stat-value">${event.capacity || 0}</div>
                      <div class="stat-label">Total Capacity</div>
                  </div>
                  <div class="stat-box">
                      <div class="stat-value">${event.ticketsSold || 0}</div>
                      <div class="stat-label">Tickets Sold</div>
                  </div>
                  <div class="stat-box">
                      <div class="stat-value">${Math.max(
                        0,
                        (event.capacity || 0) - (event.ticketsSold || 0)
                      )}</div>
                      <div class="stat-label">Remaining</div>
                  </div>
                  <div class="stat-box">
                      <div class="stat-value">$${(
                        event.ticketPrice || 0
                      ).toFixed(2)}</div>
                      <div class="stat-label">Ticket Price</div>
                  </div>
              </div>
          </div>
      `
    )
    .join("");
}

// Utility function to format dates
function formatDate(date) {
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
