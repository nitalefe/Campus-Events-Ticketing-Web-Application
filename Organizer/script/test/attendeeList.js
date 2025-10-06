// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
// import 'dotenv/config.js';

// Firebase config
// const firebaseConfig = {
//     apiKey: process.env.FIREBASE_API_KEY,
//     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//     projectId: process.env.FIREBASE_PROJECT_ID
// };
const firebaseConfig = {
    apiKey: "AIzaSyCtCLGcR_sDwb6wDE7NpVz8vghrxLZFYB8",
    authDomain: "campus-events-ticketing-e648f.firebaseapp.com",
    projectId: "campus-events-ticketing-e648f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase app initialized", app);

// ----- FUNCTIONS -----

// const docRef = await addDoc(attendeesRef, {
//   eventId,
//   ...attendeeData,
//   checkedIn: false,
//   registeredAt: serverTimestamp()
// });
// console.log("Document reference:", docRef.id);

/**
 * Add a new attendee to the top-level collection "attendeeList"
 * @param {string} eventId - ID of the event
 * @param {Object} attendeeData - { firstName, lastName, email, phone (optional) }
 */
export async function addAttendee(attendeeData) {

    const attendeesRef = collection(db, "attendee"); // or "attendeeList"
    try {
        const docRef = await addDoc(attendeesRef, {
            ...attendeeData,
            // checkedIn: false,
            registeredAt: serverTimestamp()
        });
        console.log(`Attendee added with ID: ${docRef.id}`);
        return docRef.id;
    } catch (err) {
        console.error("Error adding attendee:", err);
        throw err;
    }
}

/**
 * Get all attendees for a given event
 * @param {string} eventId
 */
export async function getAttendees(eventId) {
    const attendeesRef = collection(db, "attendee"); // or "attendeeList"
    try {
        const snapshot = await getDocs(attendeesRef);
        const attendees = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.eventId === eventId) {
                attendees.push({ id: doc.id, ...data });
            }
        });
        return attendees;
    } catch (err) {
        console.error("Error fetching attendees:", err);
        return [];
    }
}

// ---- Button / Form Integration ----

document.getElementById('attendeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const eventId = form.eventId.value;

    const attendeeData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        phone: form.phone.value,
    };

    console.log("Attendee Data:", {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        phone: form.phone.value
    });

    const id = await addAttendee(attendeeData);
});

// When the form is submitted, call addAttendee()
// document.addEventListener('DOMContentLoaded', () => {
//   const addBtn = document.getElementById('addAttendeeBtn');

//   addBtn.addEventListener('click', async () => {
//     // Example hardcoded eventId — replace with your real event document ID
//     const eventId = "event123";

//     // Collect attendee info (you can replace these with actual input fields)
//     const attendeeData = {
//       firstName: prompt("Enter first name:"),
//       lastName: prompt("Enter last name:"),
//       email: prompt("Enter email:")
//     };

//     try {
//       const id = await addAttendee(eventId, attendeeData);
//       alert(`✅ Attendee added with ID: ${id}`);
//     } catch (err) {
//       console.error("Error adding attendee:", err);
//       alert(`❌ Failed to add attendee: ${err.message}`);
//     }
//   });
// });


// /**
//  * Check in an attendee
//  * @param {string} attendeeId
//  */
// export async function checkInAttendee(attendeeId) {
//     const attendeeDoc = doc(db, "attendee", attendeeId);
//     try {
//         await updateDoc(attendeeDoc, { checkedIn: true, checkInTime: serverTimestamp() });
//         console.log(`Attendee ${attendeeId} checked in`);
//     } catch (err) {
//         console.error("Error checking in attendee:", err);
//     }
// }


// --------------------------------------------- Test Connection to DB ---------------------------------------------

// async function test() {
//     try {
//         const docRef = await addDoc(collection(db, "attendee"), {
//             message: "Ping test...",
//             timestamp: serverTimestamp()
//         });
//         console.log("Success! Document ID:", docRef.id);
//     } catch (err) {
//         console.error("Error:", err);
//     }
// }

// test();