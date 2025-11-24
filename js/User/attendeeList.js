import { collection, doc, getDocs, setDoc, getDoc, serverTimestamp, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db, app } from "../../js/Shared/firebase-config.js";

let DEBUG = true;
// For testing purposes, please dont remove it this time

let currentUserRole = "organizer";
// let currentUserRole = null;
// let testEventID = "6w3Q4k4LRLazZzJnHjil";

console.log("Firebase app initialized", app);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            console.log("User is signed in:", user.uid);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) return console.log("User record not found");
            const data = userDoc.data();
            const { role } = data || {};
            currentUserRole = role || currentUserRole;
            console.log("User role set to:", currentUserRole);
        } catch (err) {
            console.error("Failed to load user doc:", err);
        }
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
        // ensure a registeredAt timestamp exists for manual adds
        if (!attendeeData.registeredAt) {
            attendeeData.registeredAt = serverTimestamp();
        }
        await setDoc(attendeeRef, attendeeData);
        console.log(`Attendee added with ID: ${attendeeID}`);

        // Update event analytics: increment ticketsSold for this event
        try {
            await updateDoc(doc(db, "events", eventID), {
                ticketsSold: increment(1)
            });
            if (DEBUG) console.log(`Incremented ticketsSold for event ${eventID}`);
        } catch (e) {
            console.error("Failed to update event analytics:", e);
        }

        return attendeeID;
    } catch (err) {
        console.error("Error adding attendee:", err);
        throw err;
    }
}

// Modal helper: show confirmation dialog and return boolean Promise
function showConfirmModal(message, opts = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        if (!modal || !msgEl || !okBtn || !cancelBtn) {
            // fallback to native confirm if modal not present
            resolve(confirm(message));
            return;
        }

        msgEl.textContent = message;
        okBtn.textContent = opts.okText || 'OK';
        cancelBtn.textContent = opts.cancelText || 'Cancel';

        function cleanup(result) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            modal.querySelector('.modal-overlay')?.removeEventListener('click', onCancel);
            resolve(result);
        }

        function onOk(e) { e.preventDefault(); cleanup(true); }
        function onCancel(e) { e.preventDefault(); cleanup(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        modal.querySelector('.modal-overlay')?.addEventListener('click', onCancel);

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        // focus the cancel button as default to avoid accidental destructive clicks
        cancelBtn.focus();
    });
}

export async function getAttendees(eventID) {
    if (!eventID) throw new Error('Missing eventID');
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return [];
    }

    const attendeesRef = collection(db, "events", eventID, "attendees");
    try {
        const snapshot = await getDocs(attendeesRef);
        const attendees = [];
        snapshot.forEach(d => {
            attendees.push({ id: d.id, ...d.data() });
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
    const eventID = resolveEventID();
    if (!eventID) {
        alert('Event ID is required. Provide it in the URL as `?id=<EVENT_ID>` before adding attendees.');
        return;
    }

    const attendeeData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        isScanned: (form.isScanned && form.isScanned.checked) ? "True" : "False",
        isPaid: (form.isPaid && form.isPaid.checked) ? "True" : "False"
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
    // reload table after successful add
    try { await loadAttendees(eventID); } catch (err) { console.error(err); }
});

// helper: determine event id from query string or form
function resolveEventID() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('id');
    if (q) return q;
    const form = document.getElementById('attendeeForm');
    if (form && form.eventID && form.eventID.value) return form.eventID.value;
    return null;
}

// implement loadAttendees used by the page
async function loadAttendees(eventID) {
    const id = eventID || resolveEventID();
    if (!id) {
        alert('Event ID is missing. Provide it in the URL or the Event ID field.');
        return;
    }

    try {
        const attendees = await getAttendees(id);
        const tbody = document.querySelector('#attendeeTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        // debug: log fetched attendees
        if (DEBUG) console.log('Loaded attendees:', attendees);

        // helper to read multiple possible field names
        const pickString = (obj, ...keys) => {
            for (const k of keys) {
                if (!obj) continue;
                const v = obj[k];
                if (v === undefined || v === null) continue;
                if (typeof v === 'string' && v.trim() !== '') return v.trim();
                if (typeof v === 'number') return String(v);
            }
            return '';
        };

        attendees.forEach(a => {
            const row = document.createElement('tr');
            // build full name from multiple potential fields
            const first = pickString(a, 'firstName', 'first_name', 'first', 'givenName');
            const last = pickString(a, 'lastName', 'last_name', 'last', 'familyName');
            const email = pickString(a, 'email', 'emailAddress', 'mail');
            let fullName = pickString(a, 'fullName', 'full_name', 'displayName', 'name');
            if (!fullName) fullName = ((first || '') + ' ' + (last || '')).trim();
            // Final fallback: use email local-part (before @) if no name is available
            if (!fullName) {
                if (email) {
                    try {
                        const local = email.split('@')[0] || email;
                        // replace dots/underscores with spaces and capitalize words
                        fullName = local.replace(/[._]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    } catch (e) {
                        fullName = email;
                    }
                } else {
                    fullName = '—';
                }
            }

            // scanned value may be boolean, string, or missing
            let rawScanned = a.isScanned ?? a.scanned ?? a.is_scanned ?? a.scanStatus ?? '';
            if (typeof rawScanned === 'boolean') rawScanned = rawScanned ? 'true' : 'false';
            else if (typeof rawScanned === 'number') rawScanned = rawScanned ? 'true' : 'false';
            else rawScanned = String(rawScanned || '').trim();

            // Normalize scanned label for display: explicit positives => 'Scanned', explicit negatives/empty => 'Not scanned'
            const normalizedRaw = rawScanned.toLowerCase();
            let scannedLabel;
            if (/\b(true|yes|scanned|1)\b/.test(normalizedRaw)) scannedLabel = 'Scanned';
            else if (normalizedRaw === '' || /\b(false|no|not|0)\b/.test(normalizedRaw) || /not scanned/.test(normalizedRaw)) scannedLabel = 'Not scanned';
            else scannedLabel = rawScanned;

            const reg = a.registeredAt ?? a.registered_at ?? a.registeredAtTimestamp ?? null;
            let regStr = '';
            if (reg && reg.seconds) regStr = new Date(reg.seconds * 1000).toLocaleString();
            else if (typeof reg === 'string' && reg) regStr = reg;
            else if (reg && reg.toDate) {
                try { regStr = reg.toDate().toLocaleString(); } catch(e) { regStr = String(reg); }
            }

            // store scanned flag for stats: true only when label is normalized to 'Scanned'
            const scannedFlag = scannedLabel === 'Scanned';
            row.dataset.scanned = scannedFlag ? 'true' : 'false';

            row.innerHTML = `
                <td title="${fullName}">${fullName}</td>
                <td title="${email}">${email}</td>
                <td>${scannedLabel}</td>
                <td>${regStr}</td>
                <td style="white-space:nowrap;">
                    <button class="btn outline delete-btn" data-attendee-id="${a.id}">Remove</button>
                </td>
            `;
            tbody.appendChild(row);

            // wire delete button
            const delBtn = row.querySelector('.delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    if (currentUserRole !== 'organizer') {
                        alert('🚫 Access denied. Only organizers can remove attendees.');
                        return;
                    }
                    const attendeeId = delBtn.dataset.attendeeId;
                    // Use custom modal for confirmation
                    const modalMsg = `Remove attendee "${fullName}" (${email})? This cannot be undone.`;
                    const ok = await showConfirmModal(modalMsg, {okText: 'Remove', cancelText: 'Cancel'});
                    if (!ok) return;
                    try {
                        await deleteAttendee(id, attendeeId, row);
                    } catch (err) {
                        console.error('Failed to delete attendee:', err);
                        alert('Failed to remove attendee. See console for details.');
                    }
                });
            }
        });

        // update stats after populate
        updateStatsFromRows();
    } catch (err) {
        console.error('Failed to load attendees:', err);
    }
}

// Delete an attendee and update event analytics
async function deleteAttendee(eventID, attendeeID, rowEl) {
    if (currentUserRole !== 'organizer') {
        alert('🚫 Access denied. Only organizers can remove attendees.');
        return;
    }
    if (!eventID || !attendeeID) throw new Error('Missing eventID or attendeeID');

    try {
        // remove attendee doc
        await deleteDoc(doc(db, 'events', eventID, 'attendees', attendeeID));
        // decrement ticketsSold (guard not to go below zero)
        try {
            await updateDoc(doc(db, 'events', eventID), {
                ticketsSold: increment(-1)
            });
        } catch (e) {
            console.error('Failed to decrement ticketsSold:', e);
        }

        // remove row from table and refresh stats
        if (rowEl && rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
        updateStatsFromRows();
        if (DEBUG) console.log(`Deleted attendee ${attendeeID} from event ${eventID}`);
    } catch (err) {
        console.error('Error deleting attendee:', err);
        throw err;
    }
}

document.getElementById('loadAttendeesBtn').addEventListener('click', async (e) => {
    loadAttendees();
});

// compute stats from table rows
function updateStatsFromRows() {
    const tbody = document.querySelector('#attendeeTable tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const visible = rows.filter(r => r.style.display !== 'none');
    const total = visible.length;
    let scanned = 0;
    visible.forEach(r => { if (r.dataset && r.dataset.scanned === 'true') scanned++; });
    const notScanned = Math.max(0, total - scanned);
    const pct = total === 0 ? 0 : Math.round((scanned / total) * 100);
    const now = new Date().toLocaleString();
    const elTotal = document.getElementById('statTotal');
    const elScanned = document.getElementById('statScanned');
    const elNot = document.getElementById('statNotScanned');
    const elPct = document.getElementById('statPercent');
    const elUpdated = document.getElementById('statUpdated');
    if (elTotal) elTotal.textContent = total;
    if (elScanned) elScanned.textContent = scanned;
    if (elNot) elNot.textContent = notScanned;
    if (elPct) elPct.textContent = pct + '%';
    if (elUpdated) elUpdated.textContent = now;
}

// search/filter wiring
const searchInputEl = document.getElementById('attendeeSearch');
if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
        const term = (e.target.value || '').toLowerCase();
        const tbody = document.querySelector('#attendeeTable tbody');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.forEach(r => {
            const text = (r.textContent || '').toLowerCase();
            r.style.display = text.includes(term) ? '' : 'none';
        });
        updateStatsFromRows();
    });
}

document.getElementById('exportCsvBtn').addEventListener('click', async () => {
    if (currentUserRole !== "organizer") {
        alert("🚫 Access denied! You do not have permission to perform this action.");
        return;
    }

    try {
        const id = resolveEventID();
        if (!id) {
            alert('Event ID required to export CSV.');
            return;
        }
        const attendees = await getAttendees(id);
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