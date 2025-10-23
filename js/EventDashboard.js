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
  where,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db } from "../../Shared/firebase-config.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id"); // ✅ Single-event mode if ?id=
const windowTitle = document.getElementById("pageTitle");

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
// Display events (multi or single)
// ------------------------------
function displayEvents(events) {
  console.log("[displayEvents] Received events:", events);

  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = "";

  if (!events || events.length === 0) {
    eventsList.innerHTML = `
      <div class="status info">
        No events found.<br>
        <a href="../Organizer/eventCreation.html" style="color:#367bfc;font-weight:600;text-decoration:none;">
          Create your first event →
        </a>
      </div>`;
    return;
  }

  // Render each event as an analytics card
  events.forEach((event) => {
    const capacity = event.capacity || 0;
    const sold = event.ticketsSold || 0;
    const available = Math.max(0, capacity - sold);
    const fillRate = capacity > 0 ? ((sold / capacity) * 100).toFixed(1) : 0;

    const div = document.createElement("div");
    div.className = "event-item";
    div.style.marginBottom = "1.5rem";

    div.innerHTML = `
      <h4 style="color:#002976;">${event.eventName || "Unnamed Event"}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div>
          <p><strong>Category:</strong> ${event.eventCategory || "N/A"}</p>
          <p><strong>Hosted By:</strong> ${event.school || "No school specified"}</p>
          <p><strong>Date:</strong> ${formatDate(event.eventDateTime)}</p>
        </div>
        <div>
          <p><strong>Location:</strong> ${event.eventLocation || "N/A"}</p>
          <p><strong>Organizer:</strong> ${event.createdBy || "Unknown"}</p>
          <p><strong>Price:</strong> $${(event.ticketPrice || 0).toFixed(2)}</p>
        </div>
      </div>
      <div class="event-stats">
        <div class="stat-box"><div class="stat-value">${capacity}</div><div class="stat-label">Total Capacity</div></div>
        <div class="stat-box"><div class="stat-value">${sold}</div><div class="stat-label">Tickets Sold</div></div>
        <div class="stat-box"><div class="stat-value">${available}</div><div class="stat-label">Available</div></div>
        <div class="stat-box"><div class="stat-value">${fillRate}%</div><div class="stat-label">Fill Rate</div></div>
      </div>
    `;

    eventsList.appendChild(div);
  });
}

// ------------------------------
// Load analytics (single or all)
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

      // 🔒 Only allow the event’s creator to view analytics
      if (!user || data.createdBy !== user.uid) {
        status.textContent =
          "Access denied: You can only view analytics for your own event.";
        status.className = "status error";
        return;
      }

      windowTitle.textContent = `Analytics: ${data.eventName}`;
      events = [
        {
          id: eventId,
          ...data,
          eventDateTime: data.eventDateTime?.toDate(),
        },
      ];
      window.currentFilteredEvents = events;
      status.textContent = `Showing analytics for "${data.eventName}"`;
      status.className = "status success";
      displayEvents(events);
      return;
    }

    // 🌍 MULTI-EVENT ANALYTICS MODE (all events by this organizer)
    const uidParam = params.get("uid") || user.uid;

    const q = query(
      collection(db, "events"),
      where("createdBy", "==", uidParam),
      orderBy("eventDateTime", "desc")
    );
    const snapshot = await getDocs(q);

    events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      eventDateTime: doc.data().eventDateTime?.toDate(),
    }));

    if (events.length === 0) {
      status.textContent = "No events found for your account.";
      status.className = "status info";
    } else {
      status.textContent = `Showing analytics for ${events.length} of your events`;
      status.className = "status success";
    }

    // Store globally for export & render
    window.currentFilteredEvents = events;
    displayEvents(events);
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
  const status = document.getElementById("eventsStatus");

  if (events.length === 0) {
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
  link.download = `event_analytics_${new Date()
    .toISOString()
    .split("T")[0]}.csv`;
  link.click();

  status.textContent = "CSV file exported successfully";
  status.className = "status success";
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
