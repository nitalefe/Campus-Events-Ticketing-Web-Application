// __tests__/events.test.js
import 'whatwg-fetch';
import { getDoc } from "../js/Shared/firebase_import.js";

// ------------------------------
// Mock firebase_import
// ------------------------------
jest.mock("../js/Shared/firebase_import.js", () => ({
  auth: {},
  db: {},
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: { fromDate: jest.fn() },
  onAuthStateChanged: jest.fn((auth, callback) => callback({ uid: "testUserId" })),
}));

// ------------------------------
// Mock DOM & window.location BEFORE importing script
// ------------------------------
beforeAll(() => {
  // Create the form elements
  document.body.innerHTML = `
    <form id="eventForm">
      <input id="eventName" />
      <input id="eventDescription" />
      <input id="eventBanner" />
      <input id="eventLocation" />
      <input id="eventCategory" />
      <input id="capacity" />
      <input id="ticketPrice" />
      <input id="eventDate" />
      <input id="eventTime" />
    </form>
  `;

  // Mock window.location safely
  delete window.location;
  window.location = {
    href: "",
    search: "?id=testId",
  };

  // Mock URLSearchParams
  global.URLSearchParams = class extends URLSearchParams {
    constructor(init) {
      super(init);
      this.get = jest.fn((key) => (key === "id" ? "testId" : null));
    }
  };

  // Mock console
  global.console.error = jest.fn();
  global.console.log = jest.fn();
  global.alert = jest.fn();
});

// ------------------------------
// Import the script AFTER mocks
// ------------------------------
import { loadEventForEdit } from "../js/Events/events.js";

// ------------------------------
// Test Suite
// ------------------------------
describe("Event Script", () => {
  it("loadEventForEdit is a function", () => {
    expect(typeof loadEventForEdit).toBe("function");
  });

  it("loadEventForEdit populates form fields with event data", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        eventName: "Test Event",
        eventDescription: "This is a test",
        banner: "banner.jpg",
        eventLocation: "Test Location",
        eventCategory: "Test Category",
        capacity: 100,
        ticketPrice: 50,
        eventDateTime: {
          toDate: () => new Date("2025-12-31T18:30:00"),
        },
      }),
    });

    await loadEventForEdit();

    expect(document.getElementById("eventName").value).toBe("Test Event");
    expect(document.getElementById("eventDescription").value).toBe("This is a test");
    expect(document.getElementById("eventBanner").value).toBe("banner.jpg");
    expect(document.getElementById("eventLocation").value).toBe("Test Location");
    expect(document.getElementById("eventCategory").value).toBe("Test Category");
    expect(document.getElementById("capacity").value).toBe("100");
    expect(document.getElementById("ticketPrice").value).toBe("50");
    expect(document.getElementById("eventDate").value).toBe("2025-12-31");
    expect(document.getElementById("eventTime").value).toBe("18:30");
  });
});
