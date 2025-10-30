import { collection, doc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { auth, db, app } from "../../Shared/firebase-config.js";

let DEBUG = true;
// For testing purposes, please dont remove it this time

let currentUserRole = "organizer";
// let currentUserRole = null;
// let testEventID = "6w3Q4k4LRLazZzJnHjil";

console.log("Firebase app initialized", app);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is signed in:", user);

        const userSnap = await getDocs(doc(db, "users", user.uid));
        if (!userSnap.exists()) return console.log("User record not found");

        const { role } = userSnap.data();
        currentUserRole = role;
    } else {
        console.log("No user signed in.");
    }
});

// ----- FUNCTIONS -----

/**
 * Add a new attendee to the attendee list in collection "events"
 * @param {Object} attendeeData - { ID, firstName, lastName, email, Scan status, registeredAt}
 */
export async function addAttendee(attendeeData, eventID) {
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return console.log("🚫 Access denied");
    }

    let attendeeID = `${attendeeData.firstName}-${attendeeData.lastName}-${attendeeData.email}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[@.]/g, '_');

    const attendeeRef = doc(db, "events", eventID, "attendees", attendeeID);
    try {
        await setDoc(attendeeRef, attendeeData);
        console.log(`Attendee added with ID: ${attendeeID}`);
        return attendeeID;
    } catch (err) {
        console.error("Error adding attendee:", err);
        throw err;
    }
}

export async function getAttendees(eventID) {
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return console.log("🚫 Access denied");
    }

    const attendeesRef = collection(db, "events", eventID, "attendees");
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

// const tableBody = document.querySelector("#attendeeTable tbody");
// async function loadAttendees() {
//     if (currentUserRole !== "organizer") {
//         alert("🚫 Access denied! You do not have permission to perform this action.");
//         return console.log("🚫 Access denied");
//     }
//     tableBody.innerHTML = ""; // clear table

//     try {
//         const attendees = await getAttendees();

//         attendees.forEach(attendee => {
//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${attendee.id}</td>
//                 <td>${attendee.firstName || ''}</td>
//                 <td>${attendee.lastName || ''}</td>
//                 <td>${attendee.email || ''}</td>
//                 <td>${attendee.isScanned || ''}</td>
//                 <td>${attendee.registeredAt ? new Date(attendee.registeredAt.seconds * 1000).toLocaleString() : ''}</td>
//             `;
//             tableBody.appendChild(row);
//         });
//     } catch (err) {
//         console.error("Error loading attendees:", err);
//     }
// }

/**
 * Add a new attendee to the top-level collection "attendeeList"
 * @param {Object} data - { ID, firstName, lastName, email, Scan Status, registeredAt}
 */
function exportToCsv(data, eventName) {
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return console.log("🚫 Access denied");
    }

    if (!data.length) {
        alert("No attendee data to export.");
        return;
    }

    // const rawEventName = eventName || "attendees";
    // const safeEventName = rawEventName.replace(/[^\w\-]/g, "_"); // replace spaces & special chars

    const columns = [
        { key: "id", label: "ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "isScanned", label: "Scan Status" },
        { key: "isPaid", label: "Payment Status" },
    ];

    const headerRow = columns.map(col => col.label).join(",");
    const rows = data.map(obj =>
        columns.map(col => {
            let value = obj[col.key];
            if (col.key === "registeredAt" && value?.seconds) {
                value = new Date(value.seconds * 1000).toLocaleString();
            }
            return JSON.stringify(value ?? ""); // safely quote strings
        }).join(",")
    );

    const csvContent = [headerRow, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // a.download = `${safeEventName}_attendee.csv`;
    a.download = `attendee.csv`;
    a.click();

    URL.revokeObjectURL(url);
}

// ---- Button / Form Integration ----

document.getElementById('attendeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return console.log("🚫 Access denied");
    }

    const form = e.target;
    const eventID = form.eventID.value;

    const attendeeData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        isScanned: form.isScanned.checked ? "True" : "False",
        isPaid: form.isPaid.checked ? "True" : "False"
    };

    // const form = e.target;

    // // Get form values
    // const firstName = form.firstName.value.trim();
    // const lastName = form.lastName.value.trim();
    // const email = form.email.value.trim();
    // const isScanned = form.isScanned.checked ? "True" : "False";

    // let attendeeID = `${firstName}-${lastName}-${email}`
    //     .toLowerCase()
    //     .replace(/\s+/g, '-')    // replace spaces with dash
    //     .replace(/[@.]/g, '_');  // replace @ and . with underscore

    // const attendeeData = {
    //     firstName,
    //     lastName,
    //     email,
    //     isScanned
    // };

    const id = await addAttendee(attendeeData, eventID);
});

const form = document.getElementById('loadAttendeesBtn').addEventListener('click', async (e) => {
    // Refresh table after adding
    loadAttendees();
});

document.getElementById('exportCsvBtn').addEventListener('click', async () => {
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return console.log("🚫 Access denied");
    }

    try {
        const attendees = await getAttendees(testEventID);
        if (attendees.length === 0) {
            alert("No data to export.");
            return;
        }
        exportToCsv(attendees);
    } catch (err) {
        console.error("Error exporting CSV:", err);
        alert("Failed to export CSV.");
    }
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