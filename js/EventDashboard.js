// ------------------------------
// EventDashboard.js
// Shows analytics for either all events or one event (if ?id=... in URL)
// ------------------------------

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db } from "../Shared/firebase-config.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id"); // ✅ Single event mode if exists
let windowTitle = document.getElementById("pageTitle");

// ------------------------------
// Utility: Format Date
// ------------------------------
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

// ------------------------------
// Display events
// ------------------------------
function displayEvents(events) {
  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = "";

  if (events.length === 0) {
    eventsList.innerHTML = '<div class="status info">No events found.</div>';
    return;
  }

  events.forEach((event) => {
    const div = document.createElement("div");
    div.className = "event-item";
    div.innerHTML = `
      <h4>${event.eventName || "Unnamed Event"}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div>
          <p><strong>Category:</strong> ${event.eventCategory || "No category"}</p>
          <p><strong>Hosted By:</strong> ${event.school || "No school specified"}</p>
          <p><strong>Date:</strong> ${formatDate(event.eventDateTime)}</p>
        </div>
        <div>
          <p><strong>Location:</strong> ${event.eventLocation || "No location"}</p>
          <p><strong>Organizer:</strong> ${event.createdBy || "Unknown"}</p>
          <p><strong>Price:</strong> $${(event.ticketPrice || 0).toFixed(2)}</p>
        </div>
      </div>
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
          <div class="stat-label">Available</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${(
            ((event.ticketsSold || 0) / (event.capacity || 1)) *
            100
          ).toFixed(1)}%</div>
          <div class="stat-label">Fill Rate</div>
        </div>
      </div>`;
    eventsList.appendChild(div);
  });
}

// ------------------------------
// Apply filters / Load events
// ------------------------------
async function applyFilters(user) {
  const status = document.getElementById("eventsStatus");
  status.textContent = "Loading event analytics...";
  status.className = "status info";

  try {
    let events = [];

    if (eventId) {
      // 🎯 SINGLE-EVENT MODE
      const eventRef = doc(db, "events", eventId);
      const snap = await getDoc(eventRef);

      if (!snap.exists()) {
        status.textContent = "Event not found.";
        status.className = "status error";
        return;
      }

      const data = snap.data();

      // 🔒 Only show if this user created the event
      if (!user || data.createdBy !== user.uid) {
        status.textContent = "Access denied: You can only view your own event analytics.";
        status.className = "status error";
        return;
      }

      windowTitle.textContent = `Analytics: ${data.eventName}`;
      events = [{ id: eventId, ...data, eventDateTime: data.eventDateTime?.toDate() }];
      status.textContent = `Showing analytics for "${data.eventName}"`;
    } else {
      // 🌍 DASHBOARD MODE (all events)
      const q = query(collection(db, "events"), orderBy("eventDateTime", "desc"));
      const snapshot = await getDocs(q);
      events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        eventDateTime: doc.data().eventDateTime?.toDate(),
      }));
      status.textContent = `Found ${events.length} total events`;
    }

    displayEvents(events);
    status.className = "status success";
  } catch (error) {
    console.error("Error loading analytics:", error);
    status.textContent = "Error: " + error.message;
    status.className = "status error";
  }
}

// ------------------------------
// CSV Export
// ------------------------------
function exportToCSV() {
  const events = window.currentFilteredEvents || [];
  if (events.length === 0) {
    const status = document.getElementById("eventsStatus");
    status.textContent = "No data to export";
    status.className = "status error";
    return;
  }

  const fields = [
    "eventName",
    "eventCategory",
    "eventLocation",
    "createdBy",
    "ticketPrice",
    "capacity",
    "ticketsSold",
    "eventDateTime",
  ];

  let csv = fields.join(",") + "\n";
  events.forEach((event) => {
    const row = fields.map((field) => {
      let value = event[field];
      if (field === "eventDateTime") value = formatDate(value);
      else if (field === "ticketPrice") value = (value || 0).toFixed(2);
      else if (value === undefined || value === null) value = "";
      value = String(value).replace(/"/g, '""');
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = `"${value}"`;
      }
      return value;
    });
    csv += row.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `event_analytics_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  document.getElementById("eventsStatus").textContent = "CSV file exported successfully";
  document.getElementById("eventsStatus").className = "status success";
}

// ------------------------------
// Auth state → load analytics
// ------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please sign in to view analytics.");
    window.location.href = "../../Registration/SignIn.html";
    return;
  }
  applyFilters(user);
});

// Expose for HTML buttons
window.displayEvents = displayEvents;
window.applyFilters = applyFilters;
window.exportToCSV = exportToCSV;

console.log("[EventDashboard] ✅ Ready");
