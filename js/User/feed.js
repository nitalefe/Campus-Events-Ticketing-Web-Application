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
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const WEIGHTS = {
  followOrganizer: 40,
  categoryPreference: 30,
  sameSchool: 10,
  perOrganizerCap: null, // no cap so we can show more than 2 events
  pageSize: 20,
  poolSize: 200,
};

const DEFAULT_BANNER =
  "https://via.placeholder.com/260x140";

// ----- User + Event mapping -----

function mapUser(u) {
  // Normalize school to lower-case
  const school = (u?.school || "").toLowerCase();

  // Following organizers
  const organizers = Array.isArray(u?.following) ? u.following : [];

  // Category preferences (from dropdown) saved under preferences.categories
  const categoryPrefsRaw = Array.isArray(u?.preferences?.categories)
    ? u.preferences.categories
    : [];

  // Normalize all categories to lower-case
  const categoryPrefs = categoryPrefsRaw
    .filter(Boolean)
    .map((c) => c.toLowerCase());

  const categorySet = new Set(categoryPrefs);

  return {
    follows: {
      organizers,
    },
    categories: categorySet, // Set of lower-case strings
    school,
  };
}

function mapEvent(e) {
  const startAt =
    e.startAt?.toDate ? e.startAt.toDate() : e.startAt ? new Date(e.startAt) : null;

  const createdAt =
    e.createdAt?.toDate
      ? e.createdAt.toDate()
      : e.createdAt
      ? new Date(e.createdAt)
      : new Date();

  // Category: prefer eventCategory; fallback to categories[]
  const categories = [];
  if (e.eventCategory) categories.push(e.eventCategory);
  if (Array.isArray(e.categories)) {
    for (const c of e.categories) if (!categories.includes(c)) categories.push(c);
  }

  // Universities / schools this event is open to
  const openTo = Array.isArray(e.openTo)
    ? e.openTo.map((s) => (s || "").toLowerCase())
    : [];

  const title = e.eventName || e.title || "Untitled Event";

  // 🔑 IMAGE FIELD: use banner first (same as other sections), then other fallbacks,
  // and finally the default placeholder so the card always has an image.
  const bannerUrl =
    e.banner ||
    e.eventImageURL ||
    e.eventImageUrl ||
    e.eventImage ||
    e.imageUrl ||
    e.bannerUrl ||
    e.image ||
    DEFAULT_BANNER;

  // Debug log so you can inspect what’s going on
  console.log("[feed] image debug:", {
    id: e.id,
    title,
    banner: e.banner,
    eventImageURL: e.eventImageURL,
    eventImageUrl: e.eventImageUrl,
    eventImage: e.eventImage,
    imageUrl: e.imageUrl,
    bannerUrlRaw: e.bannerUrl,
    image: e.image,
    computedBannerUrl: bannerUrl,
  });

  return {
    id: e.id,
    title,
    organizerId: e.organizerId || e.createdBy || e.organizer || "unknown",
    categories,
    openTo,
    startAt,
    createdAt,
    popularity: {
      saves: e.popularity?.saves || 0,
      rsvp: e.popularity?.rsvp || 0,
    },
    bannerUrl,
    location: e.eventLocation || e.location || e.venue || "Montreal",
  };
}

// ----- Firestore fetch helpers -----

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
    where("eventDateTime", ">=", Timestamp.fromDate(startWindow)),
    where("eventDateTime", "<=", Timestamp.fromDate(endWindow)),
    orderBy("eventDateTime", "asc"),
    limit(poolSize)
  );
  if (cursor) qy = query(qy, startAfter(cursor));

  try {
    const snap = await getDocs(qy);
    const events = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      startAt: d.data().eventDateTime, // keep compatibility with older code
    }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { events, nextCursor };
  } catch (err) {
    console.warn("[feed] primary query failed; fallback to orderBy eventDateTime desc", err);
    let fb = query(collection(db, "events"), orderBy("eventDateTime", "desc"), limit(poolSize));
    if (cursor) fb = query(fb, startAfter(cursor));
    const snap = await getDocs(fb);
    const events = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      startAt: d.data().eventDateTime,
    }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { events, nextCursor };
  }
}

// ----- Scoring (ONLY the 3 rules you want) -----

function scoreEvent(user, ev) {
  let s = 0;
  let preferred = false;

  const breakdown = {
    followOrganizer: 0,
    categoryPreference: 0,
    sameSchool: 0,
  };

  // 1) Followed organizer
  if (ev.organizerId && user.follows.organizers.includes(ev.organizerId)) {
    s += WEIGHTS.followOrganizer;
    breakdown.followOrganizer += WEIGHTS.followOrganizer;
    preferred = true;
  }

  // 2) Category preference
  if (ev.categories && ev.categories.length && user.categories.size > 0) {
    const evCatsLower = ev.categories.map((c) => (c || "").toLowerCase());
    for (const c of evCatsLower) {
      if (user.categories.has(c)) {
        s += WEIGHTS.categoryPreference;
        breakdown.categoryPreference += WEIGHTS.categoryPreference;
        preferred = true;
        break;
      }
    }
  }

  // 3) Same school
  if (user.school && ev.openTo && ev.openTo.length) {
    if (ev.openTo.some((sName) => sName.includes(user.school))) {
      s += WEIGHTS.sameSchool;
      breakdown.sameSchool += WEIGHTS.sameSchool;
      preferred = true;
    }
  }

  const totalScore = Math.round(s);
  return { score: totalScore, preferred, breakdown };
}

// ----- Rendering -----

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
  if (e.startAt instanceof Date)
    div.setAttribute("data-start", String(e.startAt.getTime()));

  div.innerHTML = `
    <img 
      src="${e.bannerUrl || DEFAULT_BANNER}" 
      alt="${e.title}" 
      class="event-banner"
      style="width:100%;height:180px;object-fit:cover;border-radius:16px 16px 0 0;"
      onerror="this.src='${DEFAULT_BANNER}'"
    />
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
      No tailored events yet. Follow organizers or choose some categories to see recommendations.
    </div>`;
}

// ----- Paging state -----
let _cursor = null;
let _loading = false;
let _exhausted = false;
let _userProfile = null;

// To handle live category changes
let _activeUid = null;

// ----- Infinite Scroll -----
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

// ----- Category preferences dropdown hookup -----

async function saveCategoryPreferences(uid, values) {
  try {
    await setDoc(
      doc(db, "users", uid),
      { preferences: { categories: values } },
      { merge: true }
    );
  } catch (err) {
    console.error("[feed] failed to save category preferences:", err);
  }
}

function wireCategoryDropdown(uid) {
  const selectEl = document.getElementById("feed-category-select");
  if (!selectEl) return;

  // 1) Load existing preferences and preselect
  (async () => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.exists() ? snap.data() : {};
      const savedCats = Array.isArray(data?.preferences?.categories)
        ? data.preferences.categories
        : [];
      const savedLower = savedCats.map((c) => (c || "").toLowerCase());
      Array.from(selectEl.options).forEach((opt) => {
        opt.selected = savedLower.includes(opt.value.toLowerCase());
      });
    } catch (err) {
      console.error("[feed] failed to preload category preferences:", err);
    }
  })();

  // 2) Save on change and refresh the feed completely
  selectEl.addEventListener("change", async () => {
    const chosen = Array.from(selectEl.selectedOptions).map((o) => o.value);
    await saveCategoryPreferences(uid, chosen);

    // Reset feed state and reload from scratch with new preferences
    const feedEl = document.getElementById("feed");
    if (feedEl) {
      feedEl.innerHTML = `<div class="feed-empty">Loading your recommended events...</div>`;
    }
    _cursor = null;
    _exhausted = false;
    _userProfile = null;
    await loadFeedPage(uid);
  });
}

// ----- Main loading logic -----

async function loadFeedPage(
  uid,
  { pageSize = WEIGHTS.pageSize, poolSize = WEIGHTS.poolSize } = {}
) {
  if (_loading || _exhausted) return;
  _loading = true;
  try {
    if (!_userProfile) {
      const uRaw = await fetchUserProfile(uid);
      _userProfile = mapUser(uRaw || {});
      console.log("[feed] user profile used for scoring:", _userProfile);
    }

    const { events, nextCursor } = await fetchCandidateEvents(poolSize, _cursor);
    if (events.length === 0) {
      _exhausted = true;
      if (!document.getElementById("feed")?.querySelector(".event-card")) renderEmpty();
      return;
    }

    // Map & score
    const scored = events.map((raw) => {
      const ev = mapEvent(raw);
      const { score, preferred, breakdown } = scoreEvent(_userProfile, ev);

      console.log("[feed] scored event:", {
        id: ev.id,
        title: ev.title,
        totalScore: score,
        breakdown,
      });

      return { ...ev, _score: score, _preferred: preferred, _breakdown: breakdown };
    });

    // If user has category preferences, filter to events that match.
    // ALSO include "same school" events so Concordia events still show even
    // if their categories don't match the dropdown.
    let usable = scored;
    const hasCategoryPrefs = _userProfile.categories && _userProfile.categories.size > 0;
    if (hasCategoryPrefs) {
      const byCategory = scored.filter((ev) => {
        if (!ev.categories || !ev.categories.length) return false;
        const evCatsLower = ev.categories.map((c) => (c || "").toLowerCase());
        return evCatsLower.some((c) => _userProfile.categories.has(c));
      });

      const bySchool = scored.filter(
        (ev) =>
          _userProfile.school &&
          ev.openTo &&
          ev.openTo.some((sName) => sName.includes(_userProfile.school))
      );

      const mergedMap = new Map();
      for (const ev of [...byCategory, ...bySchool]) {
        mergedMap.set(ev.id, ev);
      }
      const merged = Array.from(mergedMap.values());

      if (merged.length > 0) {
        usable = merged;
      }
      // else: fallback to all scored events so feed is not empty
    }

    usable.sort(
      (a, b) =>
        b._score - a._score ||
        (a.startAt?.getTime?.() || 0) - (b.startAt?.getTime?.() || 0)
    );

    // Per organizer cap & page size
    const count = {};
    const page = [];
    for (const ev of usable) {
      const org = ev.organizerId || "unknown";
      count[org] = (count[org] || 0) + 1;

      if (
        WEIGHTS.perOrganizerCap == null || // no cap
        count[org] <= WEIGHTS.perOrganizerCap
      ) {
        page.push(ev);
      }

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

// ----- Auth wiring -----

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("feed.js: User not logged in");
    return;
  }
  _activeUid = user.uid;

  // Wire dropdown now that we know the user
  wireCategoryDropdown(user.uid);

  // First batch
  await loadFeedPage(user.uid);
  initInfiniteScroll(user.uid);
});
