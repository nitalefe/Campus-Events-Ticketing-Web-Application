import { doc, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { auth, db, app } from "../../Shared/firebase-config.js";

const DEBUG = true;

const LOW_AVAILABILITY_PERCENT = 0.1; // 10%

if (DEBUG) {
    let currentUserRole = "student";
    let firstName = "Hehe";
    let lastName = "haha";
    let email = "hahahehe@g.c";
    let organization = "googoogaagaa";
    const eventID = "khBBjlAZtTMYtrqOtZ8J"; // Thity thirstaday
} else {
    const params = new URLSearchParams(window.location.search);
    const eventID = params.get("id");
    let currentUserRole = null;
    let firstName = "";
    let lastName = "";
    let email = "";
    let organization = "";
}

console.log("Firebase app initialized", app);
console.error("CHECK IF WE CAN BUY MULTIPLE TICKET");


onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is signed in:", user);

        const userSnap = await getDocs(doc(db, "users", user.uid));
        if (!userSnap.exists()) return console.log("User record not found");

        const data = userSnap.data();

        currentUserRole = data.role;
        firstName = data.firstname;
        lastName = data.lastname;
        email = data.email;
        organization = data.organization;

    } else {
        console.log("No user signed in.");
    }
});

// ----- FUNCTIONS -----

/**
 * Add a new attendee to the attendee list in collection "events"
 * @param {Object} attendeeData - { ID, firstName, lastName, email, Scan status, registeredAt}
 */
export async function addAttendee() {
    // if (currentUserRole !== "organizer") {
    //     alert("🚫 Access denied! You do not have permission to perform this action.");
    //     return console.log("🚫 Access denied");
    // }

    const attendeeData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        isScanned: "False",
        isPaid: isEventPaid()
    };

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

// ---- Helper Fucntions ----

// Returns a string for availability status TO PUT ON THE FRONTEND
async function getAttendeeCountString() {
    const attendeesRef = collection(db, "events", eventID, "attendees");
    try {
        count = getAttendeeRemaining();
        low = totalSpace * LOW_AVAILABILITY_PERCENT;

        if (count > low) {
            return "Available";

        } else if (count <= low) {
            return "Low stock";

        } else {
            return "Sold out";
        }

    } catch (err) {
        console.error("Error fetching attendees:", err);
        return 0;
    }
}

async function getAttendeeRemaining() {
    const attendeesRef = collection(db, "events", eventID, "attendees");
    try {
        const snapshot = await getDocs(attendeesRef);
        const data = snapshot.data();

        const totalSpace = data.capacity;
        const spaceBought = data.ticketSold;

        let count = totalSpace - spaceBought;

        return count;

    } catch (err) {
        console.error("Error fetching attendees:", err);
        return 0;
    }
}

// Return false if event is paid to indicate payment is required and null if free event
async function isEventPaid() {
    try {
        const userSnap = await getDocs(doc(db, "events", eventID));
        if (!userSnap.exists()) return console.log("User record not found");

        const data = userSnap.data();

        return data.ticketPrice == 0 ? "False" : null;

    } catch (err) {
        console.error("Error checking event payment status:", err);
        return null;
    }
}

// ---- Button / Form Integration ----

document.getElementById('confirm').addEventListener('submit', async function (e) {
    e.preventDefault();
    // if (currentUserRole !== "organizer") {
    //     alert("🚫 Access denied! You do not have permission to perform this action.");
    //     return console.log("🚫 Access denied");
    // }

    const id = await addAttendee();
});

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