import { auth, db } from "../Shared/firebase-config.js";
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
  
  // Default SVG placeholder
  const defaultPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='140'%3E%3Crect fill='%23367bfc' width='260' height='140'/%3E%3Ctext fill='%23ffffff' font-family='Arial' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EEvent Image%3C/text%3E%3C/svg%3E";
  
  // Use banner if provided, otherwise use placeholder
  // Accept full URLs (http/https), data URIs, or relative paths that look valid
  let bannerSrc = defaultPlaceholder;
  if (eventData.banner) {
    const banner = eventData.banner.trim();
    // Accept if it starts with http/https/data OR if it doesn't have spaces/special chars that indicate an invalid path
    if (banner.startsWith('http://') || 
        banner.startsWith('https://') || 
        banner.startsWith('data:') ||
        banner.startsWith('/') ||
        banner.startsWith('./') ||
        banner.startsWith('../') ||
        (!banner.includes(' ') && banner.includes('.'))) {
      bannerSrc = banner;
    }
  }
  
  card.innerHTML = `
    <img src="${bannerSrc}" class="event-banner" alt="Event Banner" onerror="this.onerror=null; this.src='${defaultPlaceholder}'">
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
      if (data.createdAt?.toDate() > new Date(Date.now() - 7*24*60*60*1000))
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
