import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Initialize Firestore and Auth
const db = getFirestore();
const auth = getAuth();

// Handle event form submission
document.getElementById('eventForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("You must be logged in to create an event.");
        return;
    }

    // Get form values
    const form = e.target;
    const eventName = form.eventName.value;
    const eventDescription = form.eventDescription.value;
    const eventDate = form.eventDate.value;
    const eventTime = form.eventTime.value;
    const eventLocation = form.eventLocation.value;
    const eventCategory = form.eventCategory.value;

    // Get selected universities (multiple)
    const openToSelect = form.openTo;
    const openTo = Array.from(openToSelect.selectedOptions).map(option => option.value);

    const capacity = parseInt(form.capacity.value, 10);
    const ticketPrice = parseFloat(form.ticketPrice.value);

    // Combine date and time into a Firestore Timestamp
    const eventDateTimeString = `${eventDate}T${eventTime}:00`;
    const eventDateObj = new Date(eventDateTimeString);

    // Organizer info from account
    const organizer = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || ""
    };

    try {
        // Add event to Firestore
        const docRef = await addDoc(collection(db, "events"), {
            eventName,
            eventDescription,
            eventDateTime: Timestamp.fromDate(eventDateObj),
            eventLocation,
            eventCategory,
            openTo,
            capacity,
            ticketPrice,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            ticketsSold: 0
        });
        alert('Event created successfully! Document ID: ' + docRef.id);
        form.reset();
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Error creating event. Please try again.");
    }
});

// Add a new university to the openTo select field
document.getElementById('addUniversity').addEventListener('click', function() {
    const university = prompt("Enter the name of the university:");
    if (university) {
        const option = document.createElement('option');
        option.value = university;
        option.text = university;
        document.getElementById('openTo').add(option);
    }
});
