import {
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  db
} from "../../js/Shared/firebase_import.js";

// Check whether a user is already attending
export async function checkIfUserIsAttending(eventID, userID) {
  if (!eventID || !userID) return false;
  try {
    const attendeesRef = collection(db, "events", eventID, "attendees");
    const q = query(attendeesRef, where("userID", "==", userID));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (err) {
    console.error("Error checking attendee (backend):", err);
    return false;
  }
}

// Add a single attendee record
export async function addAttendee(currentUser, currentUserData, eventID, paid = true) {
  const attendeeData = {
    firstName: (currentUserData && currentUserData.firstname) || "",
    lastName: (currentUserData && currentUserData.lastname) || "",
    email: (currentUserData && currentUserData.email) || (currentUser && currentUser.email) || "",
    userID: currentUser.uid,
    isScanned: false,
    isPaid: paid,
    registeredAt: serverTimestamp()
  };

  const attendeeID = currentUser.uid;
  const attendeeRef = doc(db, "events", eventID, "attendees", attendeeID);

  await setDoc(attendeeRef, attendeeData);
  return attendeeID;
}

// Claim tickets: high-level orchestration used by UI code and tests
export async function claimTickets({ eventID, currentUser, currentUserData, qty = 1, paymentRequired = false }) {
  if (!eventID || !currentUser) throw new Error("Missing eventID or user");

  // Ensure user hasn't already claimed
  if (await checkIfUserIsAttending(eventID, currentUser.uid)) {
    throw new Error("You have already claimed a ticket for this event.");
  }

  // Add attendees
  for (let i = 0; i < qty; i++) {
    await addAttendee(currentUser, currentUserData, eventID, paymentRequired ? true : true);
  }

  // Update event tickets sold
  await updateDoc(doc(db, "events", eventID), {
    ticketsSold: increment(qty)
  });

  // Update user's claimedEvents
  await updateDoc(doc(db, "users", currentUser.uid), {
    claimedEvents: arrayUnion(eventID)
  });

  return { success: true };
}

export default {
  checkIfUserIsAttending,
  addAttendee,
  claimTickets
};
