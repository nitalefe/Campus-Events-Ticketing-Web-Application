// loadEvents.js — works for both Organizer and Student dashboards

import { auth, db } from "../../js/Shared/firebase-config.js";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Grab all possible sections (some may not exist depending on role)
const upcomingSection = document.getElementById("upcoming-events");
const newSection = document.getElementById("new-events");
const recommendedSection = document.getElementById("recommended-events");
const discoverSection = document.getElementById("discover-events");
const followingSection = document.getElementById("following-events");
const savedSection = document.getElementById("saved-events"); // student only
const myEventsSection = document.getElementById("myEventsSection"); // ✅ your updated ID

// --------------------------------------------------
// Helper: Create clickable event card
// --------------------------------------------------
function createEventCard(eventData, eventId) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.setAttribute("data-event-id", eventId);
  // expose the event category on the card for client-side filters
  card.setAttribute("data-category", eventData.eventCategory || "");
  // expose openTo from the event (can be array or string) for university filtering
  const openToAttr = Array.isArray(eventData.openTo) ? eventData.openTo.join(',') : (eventData.openTo || '');
  if (openToAttr) card.setAttribute('data-open-to', openToAttr);

  const bannerSrc = eventData.banner || "https://via.placeholder.com/260x140";

  card.innerHTML = `
    <img src="${bannerSrc}" class="event-banner" alt="Event Banner"
      onerror="this.src='https://via.placeholder.com/260x140'">
    <div class="event-title">${eventData.eventName}</div>
    <div class="event-date">${eventData.eventDateTime?.toDate().toDateString()}</div>
    <div class="event-location">${eventData.eventLocation}</div>
    <div class="event-category" style="display:none">${eventData.eventCategory || ''}</div>
    <div class="event-open-to" style="display:none">${Array.isArray(eventData.openTo) ? eventData.openTo.join(',') : (eventData.openTo || '')}</div>
  `;

  card.addEventListener("click", () => {
    const target = document.body?.dataset?.eventPage || "eventPage.html";
    window.location.href = `${target}?id=${eventId}`;
  });

  return card;
}

// --------------------------------------------------
// 🔹 Auth Listener
// --------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // Redirect handled elsewhere

  try {
    // 🔹 Determine user role
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    const role = userData.role || "student";

    // 🔹 Fetch all events
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("eventDateTime", "asc"));
    const snapshot = await getDocs(q);
    const now = new Date();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const eventId = docSnap.id;
      const eventDate = data.eventDateTime?.toDate() || new Date();
      const organizerID = data.createdBy;





      // --------------------------------------------------
      // Organizer Dashboard Logic
      // --------------------------------------------------
      if (role === "organizer") {
        // Upcoming (future events they created)
        if (data.createdBy === user.uid && eventDate > now)
          upcomingSection?.appendChild(createEventCard(data, eventId));

        // New (recently created)
        if (
          data.createdAt?.toDate() >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )
          newSection?.appendChild(createEventCard(data, eventId));

        // Recommended / Discover sections
        if (["Technology", "Education", "Business"].includes(data.eventCategory))
          recommendedSection?.appendChild(createEventCard(data, eventId));

        discoverSection?.appendChild(createEventCard(data, eventId));
      }

      // --------------------------------------------------
      // Student Dashboard Logic
      // --------------------------------------------------
      if (role === "student") {
        const claimedEvents = userData.claimedEvents || [];
        const savedEvents = userData.savedEvents || [];
        const followedOrganizers = userData.following || [];
        const organizerID = data.createdBy;


        // 🟢 My Events (tickets the student claimed)
        if (claimedEvents.includes(eventId)) {
          myEventsSection?.appendChild(createEventCard(data, eventId));
        }

        // Saved Events
        if (savedEvents.includes(eventId)) {
          savedSection?.appendChild(createEventCard(data, eventId));
        }

        // Upcoming On Campus
        if (eventDate > now) {
          upcomingSection?.appendChild(createEventCard(data, eventId));
        }

        //Following
        if(followedOrganizers.includes(organizerID)){
            followingSection?.appendChild(createEventCard(data, eventId));
        }

        // Recommended (optional: based on category)
        if (
          ["Technology", "Education", "Business"].includes(data.eventCategory)
        ) {
          discoverSection?.appendChild(createEventCard(data, eventId));
        }

        // Discover (everything else)
        discoverSection?.appendChild(createEventCard(data, eventId));
      }
    }); // ✅ closes snapshot.forEach

  } catch (err) {
    console.error("[loadEvents] Error fetching events:", err);
  }
}); // ✅ closes onAuthStateChanged
