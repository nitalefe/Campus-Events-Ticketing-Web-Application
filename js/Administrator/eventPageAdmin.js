import { auth, db } from "../../js/Shared/firebase-config.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const eventID = params.get("id");

// Event load
const titleEl = document.querySelector(".event-title");
const descEl = document.querySelector(".event-description");
const dateLocEl = document.querySelector(".event-date-location");
const bannerEl = document.getElementById("eventBanner");

// Store loaded event data globally
let loadedEventData = null;

// Pop up
const input = document.getElementById("messageInput");

// --------------------------------------------------
// 1️⃣ Load event details
// --------------------------------------------------
async function loadEventDetails(user) {
    if (!eventID) {
        titleEl.textContent = "Event not found.";
        return;
    }

    const docRef = doc(db, "events", eventID);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
        titleEl.textContent = "Event not found.";
        descEl.textContent = "";
        return;
    }

    const data = snap.data();
    loadedEventData = data; // Store for later use
    titleEl.textContent = data.eventName || "Untitled Event";
    descEl.innerHTML = data.eventDescription || "No description available.";

    const dateObj = data.eventDateTime?.toDate?.();
    const dateStr = dateObj ? dateObj.toDateString() : "Unknown date";
    dateLocEl.innerHTML = `<span>${dateStr}</span><br><span>${data.eventLocation || "Unknown location"}</span>`;

    // Load event banner
    if (data.banner) {
        bannerEl.src = data.banner;
        bannerEl.alt = `${data.eventName} Banner`;
    } else {
        bannerEl.src = "https://via.placeholder.com/900x340";
        bannerEl.alt = "Event Banner";
    }
}

// ----------------------------
// Delete event
// ----------------------------
async function deleteEvent() {
    try {
        // Reference to the document
        const docRef = doc(db, "events", eventID); // collection "events", document "event"
        await deleteDoc(docRef);
        alert("✅ Event deleted successfully!");
    } catch (error) {
        console.error("Error deleting event:", error);
        alert("❌ Failed to delete event. Check console for details.");
    }
}


// ----------------------------
// 🔹 Auth State Listener
// ----------------------------
onAuthStateChanged(auth, async (user) => {
    console.log("[eventPage] Auth user:", user?.uid || "No user");
    await loadEventDetails(user);

    if (user) {
        // Fetch role
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const role = userData?.role || "admin";
    }
});

function showOrganizerPopup(title, callback) {
    const overlay = document.getElementById("overlay-Organizer");
    const popupInput = document.getElementById("popup-Organizer");
    const popupInputField = document.getElementById("popup-input-field");
    const popupInputTitle = document.getElementById("popup-Organizer-title");
    const popupInputOk = document.getElementById("popup-input-ok");
    const popupInputCancel = document.getElementById("popup-input-cancel");

    popupInputTitle.textContent = title;
    popupInputField.value = "";
    overlay.style.display = "block";
    popupInput.style.display = "block";
    popupInputField.focus();

    function close() {
        popupInput.style.display = "none";
        overlay.style.display = "none";
        popupInputOk.removeEventListener("click", send);
        popupInputCancel.removeEventListener("click", cancel);
    }

    function send() {
        const message = popupInputField.value.trim();
        if (message) {
            callback(message);
            showPopupMessage("The message has been sent to the Organizer.");
            close();
        } else {
            showPopupMessage("Please enter a message for the Organizer.");
        }
    }

    function cancel() {
        close();
    }

    popupInputOk.addEventListener("click", send);
    popupInputCancel.addEventListener("click", cancel);
    overlay.addEventListener("click", cancel, { once: true });
}

function showPopupMessage(message) {
    const overlay = document.getElementById("overlay-alert");
    const popupMessage = document.getElementById("popup-alert");
    const popupMessageText = document.getElementById("popup-alert-text");
    const popupMessageOk = document.getElementById("popup-message-ok");

    overlay.style.display = "block";

    popupMessageText.textContent = message;
    popupMessage.style.display = "block";

    function close() {
        popupMessage.style.display = "none";
        overlay.style.display = "none";
        popupMessageOk.removeEventListener("click", close);
    }

    popupMessageOk.addEventListener("click", close);
    overlay.addEventListener("click", close, { once: true });
}

async function sendToOrganizer(message) {

}

// Show organizer email in modal
async function showOrganizerEmail() {
    if (!loadedEventData || !loadedEventData.createdBy) {
        alert("Organizer information not available.");
        return;
    }

    let email = "";
    
    try {
        const organizerRef = doc(db, "users", loadedEventData.createdBy);
        const organizerSnap = await getDoc(organizerRef);
        
        if (organizerSnap.exists()) {
            const organizerData = organizerSnap.data();
            email = organizerData.email || "";
        }
    } catch (error) {
        console.error("Error fetching organizer email:", error);
    }

    const overlay = document.createElement("div");
    overlay.style = `
        position:fixed; inset:0; background:rgba(0,0,0,0.45);
        display:flex; align-items:center; justify-content:center; z-index:9999;
    `;

    const modal = document.createElement("div");
    modal.style = `
        background:#fff; padding:16px 18px; border-radius:10px;
        max-width:420px; width:92%; color:#0b254a;
    `;

    modal.innerHTML = `
        <h3 style="margin:0 0 8px;">Contact Organizer</h3>
        ${email
            ? `<p style="margin:0 0 6px;font-weight:600;">Organizer Email:</p>
               <a style="color:#1a56db;font-weight:600;word-break:break-all;" href="mailto:${email}">
                 ${email}
               </a>`
            : `<p>Organizer contact not available.</p>`
        }
        <div style="text-align:right; margin-top:14px;">
            <button id="closeModal" style="
                padding:8px 12px; border:none; border-radius:8px;
                background:linear-gradient(90deg,#e0e6ff,#cfe0ff); cursor:pointer;">
                Close
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = e => {
        if (e.target === overlay) overlay.remove();
    };
    modal.querySelector("#closeModal").onclick = () => overlay.remove();
}

document.getElementById("deleteBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const confirmation = confirm("Are you sure you want to delete this event?");
    if (!confirmation) return; // User cancelled

    try {
        deleteEvent();
    } catch (error) {
        console.error("Error deleting event: ", err);
    }

    setTimeout(() => {
        window.location.href = "../../website/Administrator/admin-dashboard.html";
    }, 2000);
});

// // open pop up
document.getElementById("contactBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    await showOrganizerEmail();
})

// document.getElementById("okBtn").addEventListener("click", () => {
//     const message = input.value.trim();

//     if (message) {
//         alert("You entered: " + message); // You can replace this with any action
//         console.log("User message:", message);

//     } else {
//         alert("Please enter a message to send to the organizer.");
//         return;
//     }

//     closePopup();
// });

// cancelBtn.addEventListener("click", closePopup);

// // Close popup when clicking outside
// overlay.addEventListener("click", closePopup);

// function closePopup() {
//     popup.style.display = "none";
//     overlay.style.display = "none";
//     input.value = "";
// }

// Logout button handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "../Registration/SignIn.html";
        } catch (error) {
            console.error("Logout error:", error);
            alert("Error logging out.");
        }
    });
}