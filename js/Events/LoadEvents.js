//load events from firestore and display them in their respective sections


import { auth, db } from "../../Shared/firebase-config.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const upcomingSection = document.getElementById("upcoming-events");
const newSection = document.getElementById("new-events");
const recommendedSection = document.getElementById("recommended-events");
const discoverSection = document.getElementById("discover-events");

// Helper to create clickable cards
function createEventCard(eventData, eventId) {
  const card = document.createElement("div");
  card.className = "event-card";

  // Use the banner from Firebase or fallback to placeholder
  const bannerSrc = eventData.banner || "https://via.placeholder.com/260x140";

  card.innerHTML = `
    <img src="${bannerSrc}" class="event-banner" alt="Event Banner" onerror="this.src='https://via.placeholder.com/260x140'">
    <div class="event-title">${eventData.eventName}</div>
    <div class="event-date">${eventData.eventDateTime?.toDate().toDateString()}</div>
    <div class="event-location">${eventData.eventLocation}</div>
  `;
  card.addEventListener("click", () => {
    window.location.href = `eventPage.html?id=${eventId}`;
  });
  return card;
}

// Fetch events
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // auth.js handles redirect

  try {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("eventDateTime", "asc"));
    const snapshot = await getDocs(q);

    const now = new Date();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const eventId = doc.id;
      const eventDate = data.eventDateTime?.toDate() || new Date();

      // Upcoming Events (organizer's own)
      if (data.createdBy === user.uid && eventDate > now)
        upcomingSection?.appendChild(createEventCard(data, eventId));

      // New Events (within 7 days)
      if (data.createdAt?.toDate() > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        newSection?.appendChild(createEventCard(data, eventId));

      // Recommended (specific categories)
      if (["Technology", "Education", "Business"].includes(data.eventCategory))
        recommendedSection?.appendChild(createEventCard(data, eventId));

      // Discover (everything else)
      discoverSection?.appendChild(createEventCard(data, eventId));
    });
  } catch (err) {
    console.error("[loadEvents] Error fetching events:", err);
  }
});
