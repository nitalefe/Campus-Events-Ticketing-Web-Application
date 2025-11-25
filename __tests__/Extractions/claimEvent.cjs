// Extra / Extractions / claimEvent.cjs

const {
  doc,
  getDoc,
  setDoc,
  collection,
} = require("firebase/firestore");

let _db = null;

/** Inject clean DB for tests */
function __setTestDB(testDb) {
  _db = testDb;
}

/** Add attendee doc (overwrite allowed) */
async function addAttendee(eventId, user, isPaid = true) {
  const attendeeData = {
    eventId,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    userID: user.uid,
    isScanned: false,
    isPaid,
    registeredAt: new Date().toISOString()
  };

  const attendeeRef = doc(_db, "attendees", `${eventId}_${user.uid}`);
  await setDoc(attendeeRef, attendeeData);
  return attendeeRef.id;
}

/** Claim ticket — duplicates allowed */
async function claimTicket(eventId, user) {
  if (!_db) throw new Error("Database not initialized");
  if (!eventId) throw new Error("Missing eventId");
  if (!user) throw new Error("Missing user");

  await addAttendee(eventId, user, true);

  // Increment ticketsSold (manual increment)
  const eventRef = doc(_db, "events", eventId);
  const snap = await getDoc(eventRef);
  const current =
    snap.exists() && typeof snap.data().ticketsSold === "number"
      ? snap.data().ticketsSold
      : 0;

  await setDoc(eventRef, { ticketsSold: current + 1 }, { merge: true });

  // Add event to user's claimed list (no duplicates)
  const userRef = doc(_db, "users", user.uid);
  const usrSnap = await getDoc(userRef);

  const claimed = usrSnap.exists() && Array.isArray(usrSnap.data().claimedEvents)
    ? usrSnap.data().claimedEvents
    : [];

  if (!claimed.includes(eventId)) {
    await setDoc(
      userRef,
      { claimedEvents: [...claimed, eventId] },
      { merge: true }
    );
  }

  return true;
}

module.exports = {
  __setTestDB,
  claimTicket,
  addAttendee
};
