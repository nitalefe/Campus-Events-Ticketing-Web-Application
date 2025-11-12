// =====================================
// Personalized Feed (Student + Montreal)
// Plain JS module for your HTML site
// File: js/User/feed.js
// Depends on: js/Shared/firebase-config.js exporting { db, auth }
// =====================================

// Firebase
import { db, auth } from "../Shared/firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/*
  Flow
  1) Pull upcoming events (next 60 days) as a candidate pool.
  2) Score events for the user (followed organizer, category, tag overlap, starts soon, freshness, popularity).
  3) Sort by score, cap per organizer, render into #feed as .event-card items.
*/

// ---------------------------
// Weights (tune here)
// ---------------------------
const WEIGHTS = {
  followOrganizer: 80,
  followCategory: 40,
  tagEach: 10,
  tagCap: 40,
  startSoonMax: 40,
  freshnessMax: 20,
  popScale: 8,
  perOrganizerCap: 2,
};

// Helpers
const expDecay = (ageDays, max = 20, halfLife = 7) =>
  Math.min(max, max * Math.exp(-ageDays / halfLife));

const daysBetween = (newer, older) =>
  Math.max(0, (newer.getTime() - older.getTime()) / (1000 * 60 * 60 * 24));

// ---------------------------
// Mapping (adjust here if field names differ)
// ---------------------------
function mapUser(u) {
  return {
    follows: {
      organizers: u?.follows?.organizers || [],
      categories: u?.follows?.categories || [],
    },
    interests: {
      tags: u?.interests?.tags || {}, // e.g., { "hackathon": 2 }
    },
  };
}

function mapEvent(e) {
  return {
    id: e.id,
    title: e.title || "Untitled Event",
    organizerId: e.organizerId || "unknown",
    categories: e.categories || [],
    tags: e.tags || [],
    startAt: e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt),
    createdAt: e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt),
    popularity: {
      saves: e.popularity?.saves || 0,
      rsvp:  e.popularity?.rsvp  || 0,
    },
  };
}

// ---------------------------
// Firestore reads
// ---------------------------
async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return mapUser(snap.exists() ? snap.data() : {});
}

async function fetchCandidateEvents(poolSize = 200, cursor = null) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 3600 * 1000); // next 60 days

  let qy = query(
    collection(db, "events"),
    where("startAt", ">=", Timestamp.fromDate(now)),
    where("startAt", "<=", Timestamp.fromDate(horizon)),
    orderBy("startAt", "asc"),
    limit(poolSize)
  );
  if (cursor) qy = query(qy, startAfter(cursor));

  const snap = await getDocs(qy);
  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { events, nextCursor };
}

// ---------------------------
// Scoring
// ---------------------------
function scoreEvent(user, ev) {
  let s = 0;

  // followed organizer
  if (user.follows.organizers.includes(ev.organizerId)) s += WEIGHTS.followOrganizer;

  // category similarity
  const userCats = new Set(user.follows.categories);
  if (ev.categories.some((c) => userCats.has(c))) s += WEIGHTS.followCategory;

  // tag overlap
  const userTags = user.interests.tags;
  let tagPts = 0;
  for (const t of ev.tags) if (userTags[t]) tagPts += WEIGHTS.tagEach;
  s += Math.min(tagPts, WEIGHTS.tagCap);

  // starts soon (0–3 days max, 3–7 taper)
  const daysUntilStart = (ev.startAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilStart >= 0 && daysUntilStart <= 3) {
    s += WEIGHTS.startSoonMax;
  } else if (daysUntilStart > 3 && daysUntilStart <= 7) {
    s += Math.round(WEIGHTS.startSoonMax * (1 - (daysUntilStart - 3) / 4));
  }

  // freshness (newly posted)
  const ageDays = daysBetween(new Date(), ev.createdAt);
  s += expDecay(ageDays, WEIGHTS.freshnessMax, 7);

  // popularity (RSVP counts 2x)
  s += Math.round(
    WEIGHTS.popScale * Math.log(1 + ev.popularity.saves + 2 * ev.popularity.rsvp)
  );

  return Math.round(s);
}

// ---------------------------
// Rendering (compatible with your Search + Date filter)
// ---------------------------
function renderFeedItem(e) {
  const div = document.createElement("div");
  div.className = "event-card"; // IMPORTANT: class your page logic expects
  div.setAttribute("data-event-id", e.id);
  div.setAttribute("data-start", String(e.startAt.getTime())); // for date filter

  // Click -> event page
  const target = document.body?.dataset?.eventPage || "eventPageStu.html";
  div.addEventListener("click", () => {
    window.location.href = `${target}?id=${e.id}`;
  });
  div.style.cursor = "pointer";

  div.innerHTML = `
    <h3 class="event-title">${e.title}</h3>
    <div class="meta">${(e.categories || []).join(" • ")}</div>
    <div class="event-date">
      <b>Starts:</b>
      <time datetime="${e.startAt.toISOString()}">${e.startAt.toLocaleString()}</time>
    </div>
    <small style="opacity:.6">Score: ${e._score}</small>
  `;
  return div;
}

function renderFeed(items) {
  const feedEl = document.getElementById("feed");
  if (!feedEl) {
    console.warn("feed.js: #feed container not found.");
    return;
  }
  if (items.length === 0 && !feedEl.hasChildNodes()) {
    feedEl.innerHTML = `<div class="feed-empty">No events to show yet.</div>`;
    return;
  }
  for (const e of items) feedEl.appendChild(renderFeedItem(e));
}

// ---------------------------
// Paging
// ---------------------------
let _cursor = null;
let _loading = false;
let _exhausted = false;
let _userProfile = null;

async function loadFeedPage(uid, { pageSize = 20, poolSize = 200 } = {}) {
  if (_loading || _exhausted) return;
  _loading = true;

  try {
    if (!_userProfile) _userProfile = await fetchUserProfile(uid);

    const { events, nextCursor } = await fetchCandidateEvents(poolSize, _cursor);
    if (events.length === 0) {
      _exhausted = true;
      renderFeed([]); // trigger empty state on first load
      return;
    }

    const scored = events
      .map((e) => {
        const ev = mapEvent(e);
        return { ...ev, _score: scoreEvent(_userProfile, ev) };
      })
      .sort((a, b) => b._score - a._score);

    // cap per organizer
    const count = {};
    const page = [];
    for (const ev of scored) {
      const org = ev.organizerId || "unknown";
      count[org] = (count[org] || 0) + 1;
      if (count[org] <= WEIGHTS.perOrganizerCap) page.push(ev);
      if (page.length >= pageSize) break;
    }

    renderFeed(page);
    _cursor = nextCursor;
    if (!nextCursor) _exhausted = true;
  } finally {
    _loading = false;
  }
}

// ---------------------------
// Auth + bootstrap
// ---------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("feed.js: user not logged in");
    return;
  }
  await loadFeedPage(user.uid);

  const btn = document.getElementById("loadMore");
  if (btn) btn.onclick = () => loadFeedPage(user.uid);
});
