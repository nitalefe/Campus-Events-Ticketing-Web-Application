// js/User/interest.js

import { auth, db } from "../Shared/firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const form = document.getElementById("interests-form");
const statusEl = document.getElementById("interests-status");

// Load existing interests and pre-check boxes
async function preloadInterests(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.exists() ? snap.data() : {};
    const saved = Array.isArray(data?.preferences?.categories)
      ? data.preferences.categories
      : [];

    const savedLower = saved.map((c) =>
      (c || "").toString().toLowerCase()
    );

    const boxes = document.querySelectorAll(
      'input[name="interestCategory"]'
    );
    boxes.forEach((box) => {
      const val = box.value.toLowerCase();
      box.checked = savedLower.includes(val);
    });
  } catch (err) {
    console.error("[interests] failed to preload interests:", err);
  }
}

async function saveInterests(uid, values) {
  try {
    // normalize to lowercase for scoring logic
    const normalized = values
      .map((v) => (v || "").toString().toLowerCase())
      .filter(Boolean);

    await setDoc(
      doc(db, "users", uid),
      { preferences: { categories: normalized } },
      { merge: true }
    );

    console.log("[interests] saved categories:", normalized);

    if (statusEl) {
      statusEl.style.display = "";
      statusEl.style.color = "#0b8b37";
      statusEl.textContent = "Saved!";
      setTimeout(() => {
        statusEl.style.display = "none";
      }, 2000);
    }
  } catch (err) {
    console.error("[interests] failed to save interests:", err);
    if (statusEl) {
      statusEl.style.display = "";
      statusEl.style.color = "#b31414";
      statusEl.textContent = "Error saving. Please try again.";
    }
  }
}

// Auth wiring
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("[interests] not logged in");
    return;
  }

  console.log("[interests] logged in as", user.uid);
  await preloadInterests(user.uid);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selected = Array.from(
        document.querySelectorAll(
          'input[name="interestCategory"]:checked'
        )
      ).map((box) => box.value);

      await saveInterests(user.uid, selected);
    });
  }
});
