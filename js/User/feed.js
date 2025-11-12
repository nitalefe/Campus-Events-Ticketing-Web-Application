// =====================================
// Personalized Feed (Recommended) — Infinite Scroll
// Location: js/User/feed.js
// Depends on: js/Shared/firebase-config.js exporting { db, auth }
// =====================================

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

const WEIGHTS = {
  followOrganizer: 80,
  followCategory: 40,
  tagEach: 10,
  tagCap: 40,
  startSoonMax: 40,
  freshnessMax: 20,
  popScale: 8,
  perOrganizerCap: 2,
  pageSize: 20,
  poolSize: 200,
};

const expDecay = (ageDays, max = 20, halfLife = 7) =>
  Math.min(max, max * Math.exp(-ageDays / halfLife));
const daysBetween = (newer, older) =>
  Math.max(0, (newer.getTime() - older.getTime()) / (1000 * 60 * 60 * 24));

function mapUser(u) {
  return {
    follows: {
      organizers: u?.follows?.organizers || [],
      categories: u?.follows?.categories || [],
    },
    interests: {
      tags: u?.interests?.tags || {},
    },
  };
}

function mapEvent(e) {
  const startAt =
    e.startAt?.toDate ? e.startAt.toDate() : e.startAt ? new Date(e.startAt) : null;
  const createdAt =
    e.createdAt?.toDate ? e.createdAt.toDate() : e.createdAt ? new Date(e.createdAt) : new Date();

  return {
    id: e.id,
    title: e.title || "Untitled Event",
    organizerId: e.organizerId || "unknown",
    categories: e.categories || [],
    tags: e.tags || [],
    startAt,
    createdAt,
    popularity: {
      saves: e.popularity?.saves || 0,
      rsvp: e.popularity?.rsvp || 0,
    },
    bannerUrl: e.bannerUrl || e.imageUrl || null,
    location: e.location || e.venue || "Montreal",
  };
}

async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function fetchCandidateEvents(poolSize = WEIGHTS.poolSize, cursor = null) {
  const now = new Date();
  const startWindow = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  const endWindow = new Date(now.getTime() + 180 * 24 * 3600 * 1000);

  let qy = query(
    collection(db, "events"),
    where("startAt", ">=", Timestamp.fromDate(startWindow)),
    where("startAt", "<=", Timestamp.fromDate(endWindow)),
    orderBy("startAt", "asc"),
    limit(poolSize)
  );
  if (cursor) qy = query(qy, startAfter(cursor));

  try {
    const snap = await getDocs(qy);
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { events, nextCursor };
  } catch (err) {
    console.warn("[feed] primary query failed; fallback to orderBy startAt desc", err);
    let fb = query(collection(db, "events"), orderBy("startAt", "desc"), limit(poolSize));
    if (cursor) fb = query(fb, startAfter(cursor));
    const snap = await getDocs(fb);
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { events, nextCursor };
  }
}

function scoreEvent(user, ev) {
  let s = 0;
  if (ev.organizerId && user.follows.organizers.includes(ev.organizerId)) {
    s += WEIGHTS.followOrganizer;
  }
  const userCats = new Set(user.follows.categories);
  if (ev.categories?.some((c) => userCats.has(c))) s += WEIGHTS.followCategory;

  const userTags = user.interests.tags || {};
  let tagPts = 0;
  for (const t of ev.tags || []) if (userTags[t]) tagPts += WEIGHTS.tagEach;
  s += Math.min(tagPts, WEIGHTS.tagCap);

  if (ev.startAt instanceof Date) {
    const daysUntilStart = (ev.startAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilStart >= 0 && daysUntilStart <= 3) {
      s += WEIGHTS.startSoonMax;
    } else if (daysUntilStart > 3 && daysUntilStart <= 7) {
      s += Math.round(WEIGHTS.startSoonMax * (1 - (daysUntilStart - 3) / 4));
    }
  }

  if (ev.createdAt instanceof Date) {
    const ageDays = daysBetween(new Date(), ev.createdAt);
    s += expDecay(ageDays, WEIGHTS.freshnessMax, 7);
  }

  s += Math.round(
    WEIGHTS.popScale *
      Math.log(1 + (ev.popularity?.saves || 0) + 2 * (ev.popularity?.rsvp || 0))
  );
  return Math.round(s);
}

function fmtEventDate(d) {
  try {
    return d?.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function renderFeedItem(e) {
  const div = document.createElement("div");
  div.className = "event-card";
  div.setAttribute("data-event-id", e.id);
  if (e.startAt instanceof Date) div.setAttribute("data-start", String(e.startAt.getTime()));
  div.innerHTML = `
    <div class="event-image">
      ${e.bannerUrl ? `<img src="${e.bannerUrl}" alt="${e.title}" />` : ""}
    </div>
    <div class="event-content">
      <h3 class="event-title">${e.title}</h3>
      <div class="event-meta">
        <time datetime="${e.startAt instanceof Date ? e.startAt.toISOString() : ""}">
          ${e.startAt instanceof Date ? fmtEventDate(e.startAt) : ""}
        </time>
        <div class="event-location">${e.location || "Montreal"}</div>
      </div>
    </div>
  `;
  const target = document.body?.dataset?.eventPage || "eventPageStu.html";
  div.style.cursor = "pointer";
  div.addEventListener("click", () => {
    window.location.href = `${target}?id=${encodeURIComponent(e.id)}`;
  });
  return div;
}

function renderFeed(items) {
  const feedEl = document.getElementById("feed");
  if (!feedEl) return;
  const placeholder = feedEl.querySelector(".feed-empty");
  if (placeholder) placeholder.remove();
  for (const e of items) feedEl.appendChild(renderFeedItem(e));
}

function renderEmpty() {
  const feedEl = document.getElementById("feed");
  if (!feedEl) return;
  feedEl.innerHTML = `
    <div class="feed-empty" style="padding:16px 24px;">
      No tailored events yet. Follow a few organizers or set your interests to see recommendations.
    </div>`;
}

// ----- Paging state -----
let _cursor = null;
let _loading = false;
let _exhausted = false;
let _userProfile = null;

// ----- Infinite Scroll state -----
let _ioInit = false;
let _ioInstance = null;

function initInfiniteScroll(uid) {
  if (_ioInit) return;
  const host = document.getElementById("feed")?.parentElement;
  if (!host) return;

  const sentinel = document.createElement("div");
  sentinel.id = "feed-sentinel";
  sentinel.style.height = "1px";
  sentinel.style.width = "100%";
  host.appendChild(sentinel);

  _ioInstance = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        !_loading &&
        !_exhausted &&
        auth.currentUser &&
        auth.currentUser.uid === uid
      ) {
        loadFeedPage(uid);
      }
    },
    { rootMargin: "600px" }
  );
  _ioInstance.observe(sentinel);
  _ioInit = true;
}

async function loadFeedPage(uid, { pageSize = WEIGHTS.pageSize, poolSize = WEIGHTS.poolSize } = {}) {
  if (_loading || _exhausted) return;
  _loading = true;
  try {
    if (!_userProfile) {
      const uRaw = await fetchUserProfile(uid);
      _userProfile = mapUser(uRaw || {});
    }

    const { events, nextCursor } = await fetchCandidateEvents(poolSize, _cursor);
    if (events.length === 0) {
      _exhausted = true;
      if (!document.getElementById("feed")?.querySelector(".event-card")) renderEmpty();
      return;
    }

    const scored = events
      .map((e) => {
        const ev = mapEvent(e);
        return { ...ev, _score: scoreEvent(_userProfile, ev) };
      })
      .sort(
        (a, b) =>
          b._score - a._score ||
          (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0)
      );

    const count = {};
    const page = [];
    for (const ev of scored) {
      const org = ev.organizerId || "unknown";
      count[org] = (count[org] || 0) + 1;
      if (count[org] <= WEIGHTS.perOrganizerCap) page.push(ev);
      if (page.length >= pageSize) break;
    }

    if (page.length > 0) {
      renderFeed(page);
    } else if (!document.getElementById("feed")?.querySelector(".event-card")) {
      renderEmpty();
    }

    _cursor = nextCursor;
    if (!nextCursor) _exhausted = true;
  } catch (err) {
    console.error("[feed] loadFeedPage error:", err);
    if (!document.getElementById("feed")?.querySelector(".event-card")) renderEmpty();
  } finally {
    _loading = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("feed.js: User not logged in");
    return;
  }
  // First batch
  await loadFeedPage(user.uid);
  // Enable infinite scroll once the feed container exists
  initInfiniteScroll(user.uid);
});
