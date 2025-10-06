// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js';
// import 'dotenv/config.js';

// Firebase config
// const firebaseConfig = {
//     apiKey: process.env.FIREBASE_API_KEY,
//     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//     projectId: process.env.FIREBASE_PROJECT_ID
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase app initialized", app);

// ----- FUNCTIONS -----

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
export async function getAttendees() {
    const attendeesRef = collection(db, "attendee");
    try {
        const snapshot = await getDocs(attendeesRef);
        const attendees = [];
        snapshot.forEach(doc => {
            attendees.push({ id: doc.id, ...doc.data() });
        });
        return attendees;
    } catch (err) {
        console.error("Error fetching attendees:", err);
        return [];
    }
}

const tableBody = document.querySelector("#attendeeTable tbody");
async function loadAttendees() {
    tableBody.innerHTML = ""; // clear table

    try {
        const attendees = await getAttendees();

        attendees.forEach(attendee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${attendee.id}</td>
                <td>${attendee.firstName || ''}</td>
                <td>${attendee.lastName || ''}</td>
                <td>${attendee.email || ''}</td>
                <td>${attendee.ticketType || ''}</td>
                <td>${attendee.paymentStatus || ''}</td>
                <td>${attendee.registeredAt ? new Date(attendee.registeredAt.seconds * 1000).toLocaleString() : ''}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading attendees:", err);
    }
}

// ---- Button / Form Integration ----

document.getElementById('attendeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;

    const attendeeData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        ticketType: form.ticketType.value,
        paymentStatus: form.paymentStatus.checked ? "Paid" : "Unpaid"
    };

    const id = await addAttendee(attendeeData);
});

const form = document.getElementById('loadAttendeesBtn').addEventListener('click', async (e) => {
    console.log("Button clicked");

    // Refresh table after adding
    loadAttendees();
});

// When the form is submitted, call addAttendee()

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