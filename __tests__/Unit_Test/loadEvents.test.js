/* @jest-environment jsdom */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// We'll dynamically mock the shared firebase import in `beforeEach` using
// `jest.doMock` so the mock isn't hoisted before we compute an absolute path.
const firebaseImportPath = path.resolve(__dirname, '../../js/Shared/firebase_import.js');


// Helper to load a module script into the JSDOM document
function loadScript(filePath) {
    const script = document.createElement("script");
    script.src = "file://" + filePath.replace(/\\/g, "/");
    script.type = "module";
    document.body.appendChild(script);
}

describe('LoadEvents module', () => {
    beforeEach(() => {
        jest.resetModules();

        // Use the local mock file so we can configure the firebase helpers used by LoadEvents
        const mockedPath = path.resolve(__dirname, '../../__mocks__/firebase_import.js');
        // Require the mock module (Jest will load and transform it) and expose it
        const mocked = require(mockedPath);
        global.__mockedFirebase = mocked;

        // Minimal DOM used by LoadEvents.js
        document.body.innerHTML = `
            <div id="upcoming-events"></div>
            <div id="new-events"></div>
            <div id="recommended-events"></div>
            <div id="discover-events"></div>
            <div id="following-events"></div>
            <div id="saved-events"></div>
            <div id="myEventsSection"></div>
        `;

        jest.clearAllMocks();
    });

    test('appends upcoming event cards for a student user', async () => {
        // Mock auth -> logged-in user
        global.__mockedFirebase.onAuthStateChanged.mockImplementation((auth, cb) => cb({ uid: 'student-1' }));

        // Mock getDoc for the user document (role: student)
        global.__mockedFirebase.getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'student', claimedEvents: [], savedEvents: [], following: [] }),
        });
        // Create a future event and a past event
        const futureDate = { toDate: () => new Date(Date.now() + 24*60*60*1000) };
        const pastDate = { toDate: () => new Date(Date.now() - 24*60*60*1000) };

        const eventDocs = [
            { id: 'evt1', data: () => ({ eventName: 'Future Event', eventDateTime: futureDate, createdBy: 'org1', eventCategory: 'Technology', banner: '', eventLocation: 'Hall A' }) },
            { id: 'evt2', data: () => ({ eventName: 'Past Event', eventDateTime: pastDate, createdBy: 'org1', eventCategory: 'Music', banner: '', eventLocation: 'Hall B' }) },
        ];

        // getDocs should return an object exposing forEach
        global.__mockedFirebase.getDocs.mockResolvedValue({
            forEach: (cb) => eventDocs.forEach(cb),
        });


    // Require the module so Jest's module mock system intercepts the shared imports.
    // Requiring executes the module top-level code (including the auth listener)
    require('../../js/Events/LoadEvents.js');

    // Give any microtasks a moment to run
    await new Promise((resolve) => setTimeout(resolve, 0));

        // Ensure the firebase helpers were called
    expect(global.__mockedFirebase.onAuthStateChanged).toHaveBeenCalled();
    expect(global.__mockedFirebase.getDoc).toHaveBeenCalled();
    expect(global.__mockedFirebase.getDocs).toHaveBeenCalled();

        // The upcoming-events section should have at least one child (the future event)
        const upcoming = document.getElementById('upcoming-events');
        // If no children, dump innerHTML to help debugging
        if (upcoming.children.length === 0) {
            // eslint-disable-next-line no-console
            console.log('UPCOMING HTML:', upcoming.innerHTML);
        }
        expect(upcoming.children.length).toBeGreaterThanOrEqual(1);

        // Ensure the created card contains the event's title
        const cardText = upcoming.innerHTML;
        expect(cardText).toContain('Future Event');
    });
});
