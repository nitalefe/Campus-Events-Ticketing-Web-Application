<<<<<<< HEAD
// loadEvents.js — works for both Organizer and Student dashboards

import { auth, db } from "../../Shared/firebase-config.js";
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
=======
//load events from firestore and display them in their respective sections


import { auth, db } from "../../Shared/firebase-config.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

>>>>>>> main
const upcomingSection = document.getElementById("upcoming-events");
const newSection = document.getElementById("new-events");
const recommendedSection = document.getElementById("recommended-events");
const discoverSection = document.getElementById("discover-events");
<<<<<<< HEAD
const savedSection = document.getElementById("saved-events"); // student only

// --------------------------------------------------
// Helper: Create clickable event card
// --------------------------------------------------
function createEventCard(eventData, eventId) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.setAttribute("data-event-id", eventId);

  const bannerSrc = eventData.banner || "https://via.placeholder.com/260x140";

  card.innerHTML = `
    <img src="${bannerSrc}" class="event-banner" alt="Event Banner"
      onerror="this.src='https://via.placeholder.com/260x140'">
=======

// Helper to create clickable cards
function createEventCard(eventData, eventId) {
  const card = document.createElement("div");
  card.className = "event-card";

  // Use the banner from Firebase or fallback to placeholder
  const bannerSrc = eventData.banner || "https://via.placeholder.com/260x140";

  card.innerHTML = `
    <img src="${bannerSrc}" class="event-banner" alt="Event Banner" onerror="this.src='https://via.placeholder.com/260x140'">
>>>>>>> main
    <div class="event-title">${eventData.eventName}</div>
    <div class="event-date">${eventData.eventDateTime?.toDate().toDateString()}</div>
    <div class="event-location">${eventData.eventLocation}</div>
  `;
<<<<<<< HEAD

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
    const savedEvents = userData.savedEvents || [];

    // 🔹 Fetch all events
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("eventDateTime", "asc"));
    const snapshot = await getDocs(q);
    const now = new Date();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const eventId = docSnap.id;
      const eventDate = data.eventDateTime?.toDate() || new Date();

      // --------------------------------------------------
      // Organizer Dashboard Logic
      // --------------------------------------------------
      if (role === "organizer") {
        // Upcoming (future events they created)
        if (data.createdBy === user.uid && eventDate > now)
          upcomingSection?.appendChild(createEventCard(data, eventId));

        // New (recently created)
        if (data.createdAt?.toDate() > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          newSection?.appendChild(createEventCard(data, eventId));

        // Recommended or Discover sections can be reused if needed
        if (["Technology", "Education", "Business"].includes(data.eventCategory))
          recommendedSection?.appendChild(createEventCard(data, eventId));

        discoverSection?.appendChild(createEventCard(data, eventId));
      }

      // --------------------------------------------------
      // Student Dashboard Logic
      // --------------------------------------------------
      if (role === "student") {
        // Saved Events
        if (savedEvents.includes(eventId))
          savedSection?.appendChild(createEventCard(data, eventId));

        // Upcoming On Campus
        if (eventDate > now)
          upcomingSection?.appendChild(createEventCard(data, eventId));

        // Recommended
        if (["Technology", "Education", "Business"].includes(data.eventCategory))
          recommendedSection?.appendChild(createEventCard(data, eventId));

        // Discover (everything else)
        discoverSection?.appendChild(createEventCard(data, eventId));
      }
    });

    // Optional: hide empty saved section for students
    if (role === "student" && savedSection && savedSection.children.length === 0) {
      const savedContainer = savedSection.closest(".events-container")?.previousElementSibling;
      if (savedContainer) savedContainer.style.display = "none"; // hide section title too
    }
=======
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
>>>>>>> main
  } catch (err) {
    console.error("[loadEvents] Error fetching events:", err);
  }
});
