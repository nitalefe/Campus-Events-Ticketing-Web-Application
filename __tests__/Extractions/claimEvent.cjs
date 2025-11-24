const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} = require("firebase/firestore");

let _db = null;

// small helper to wait until a document is visible (retries)
async function waitForDoc(ref, attempts = 20, delayMs = 100) {
  for (let i = 0; i < attempts; i++) {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap;
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return await getDoc(ref);
}

// Force a collection/query read to increase emulator visibility
async function forceQueryRead(collRef) {
  try {
    await getDocs(collRef);
  } catch (e) {
    // swallow - best-effort to surface writes
  }
}

// Allow injection of test Firestore DB
function __setTestDB(testDb) {
  _db = testDb;
}

// Check if user is already attending
async function checkIfUserIsAttending(eventId, userId) {
  const attendeesRef = collection(_db, "events", eventId, "attendees");
  const q = query(attendeesRef, where("userID", "==", userId));
  const snap = await getDocs(q);
  return !snap.empty;
}

// Create attendee document
async function addAttendee(eventId, user, isPaid = true) {
  const attendeeData = {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    userID: user.uid,
    isScanned: false,
    isPaid,
    registeredAt: serverTimestamp()
  };

  const attendeeRef = doc(_db, "events", eventId, "attendees", user.uid);
  await setDoc(attendeeRef, attendeeData);

  // ensure visibility
  await waitForDoc(attendeeRef);
  await forceQueryRead(collection(_db, "events", eventId, "attendees"));

  return attendeeRef.id;
}

// Claim ticket flow
async function claimTicket(eventId, user) {
  if (!_db) throw new Error("Database not initialized");
  if (!eventId) throw new Error("Missing eventId");
  if (!user) throw new Error("Missing user");

  const already = await checkIfUserIsAttending(eventId, user.uid);
  if (already) throw new Error("User already claimed a ticket");

  await addAttendee(eventId, user, true);

  const eventRef = doc(_db, "events", eventId);
  const eventSnap = await getDoc(eventRef);
  const currentTickets = eventSnap.exists() && typeof eventSnap.data().ticketsSold === "number"
    ? eventSnap.data().ticketsSold : 0;
  await setDoc(eventRef, { ticketsSold: currentTickets + 1 }, { merge: true });
  await waitForDoc(eventRef);

  const userRef = doc(_db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const currentClaimed = userSnap.exists() && Array.isArray(userSnap.data().claimedEvents)
    ? userSnap.data().claimedEvents : [];
  if (!currentClaimed.includes(eventId)) {
    await setDoc(userRef, { claimedEvents: currentClaimed.concat(eventId) }, { merge: true });
    await waitForDoc(userRef);
  }

  return true;
}

module.exports = {
  __setTestDB,
  claimTicket,
  addAttendee,
  checkIfUserIsAttending
};
