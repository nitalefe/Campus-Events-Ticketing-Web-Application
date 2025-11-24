// organizerCreateEvent.cjs
const { collection, addDoc, Timestamp } = require("firebase/firestore");

let _db = null; // default, overwritten in tests

/**
 * Allows test to inject the emulator Firestore instance
 */
function __setTestDB(testDb) {
  _db = testDb;
}

/**
 * Creates an event in Firestore
 */
async function createEvent(organizerUid, formData) {
  if (!_db) throw new Error("Database not initialized. Call __setTestDB() first.");
  if (!organizerUid) throw new Error("Missing organizer UID");
  if (!formData || !formData.eventName) throw new Error("Invalid form data");

  const eventDateObj = new Date(`${formData.eventDate}T${formData.eventTime}:00`);

  const payload = {
    eventName: formData.eventName,
    eventDescription: formData.eventDescription,
    banner: formData.eventBanner,
    eventDateTime: Timestamp.fromDate(eventDateObj),
    eventLocation: formData.eventLocation,
    eventCategory: formData.eventCategory,
    openTo: formData.openTo || [],
    capacity: parseInt(formData.capacity),
    ticketPrice: parseFloat(formData.ticketPrice),
    createdBy: organizerUid,
    ticketsSold: 0,
  };

  const docRef = await addDoc(collection(_db, "events"), payload);

  return {
    eventId: docRef.id,
    data: payload,
  };
}

module.exports = {
  createEvent,
  __setTestDB
};
