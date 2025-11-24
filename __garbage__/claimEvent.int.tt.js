// __tests__/integration/claimEvent.int.test.js
const { JSDOM } = require("jsdom");

// ---- MOCK DOM ----
const dom = new JSDOM(`
  <div id="toast-wrap"></div>
  <div id="ticket-card"></div>
  <button id="add-ticket"></button>
  <button id="confirm"></button>
  <div id="event-title"></div>
  <div id="org-name"></div>
  <div id="event-date"></div>
  <div id="event-location"></div>
  <div id="event-description"></div>
  <div id="ticket-price"></div>
  <div class="ticket-name"></div>
  <div id="payment-section"></div>
  <div id="remaining-text"></div>
  <div id="tickets-left-text"></div>
  <div id="ticket-details"></div>
  <div id="spinner"></div>
`, { url: "https://evently.com/claim?id=testEvent" });

global.window = dom.window;
global.document = dom.window.document;

// Safe location mock
delete global.window.location;
global.window.location = { href: "", assign: jest.fn() };

// Mock toast system
global.showToast = jest.fn();

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

// ---- MOCK FIREBASE ----
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock("../../js/Shared/firebase_import.js", () => ({
  auth: {},
  db: {},
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  arrayUnion: jest.fn(),
  increment: jest.fn(),
  onAuthStateChanged: (auth, cb) => cb({ uid: "user123" }),
}));

// Dispatch DOMContentLoaded so script listeners attach
global.document.dispatchEvent(new global.window.Event("DOMContentLoaded"));

// ---- REQUIRE SCRIPT UNDER TEST ----
require("../../js/User/claimEvent.js");

// ---- TEST SUITE ----
describe("Claim Event Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully claims a ticket", async () => {
    // Mock event exists with available tickets
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ capacity: 10, ticketsSold: 0, createdBy: "org1" }),
    });

    // User has not claimed ticket yet
    mockGetDocs.mockResolvedValueOnce({ empty: true });

    // Simulate selecting ticket
    document.getElementById("add-ticket").click();

    // Simulate clicking confirm
    await document.getElementById("confirm").click();

    // Attendee added
    expect(mockSetDoc).toHaveBeenCalled();

    // Event ticket count updated
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ticketsSold: expect.anything() })
    );

    // Success toast shown
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining("Successfully claimed"),
      "success"
    );
  });

  test("prevents claiming if user already attended", async () => {
    // Event exists
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ capacity: 10, ticketsSold: 1, createdBy: "org1" }),
    });

    // User already claimed ticket
    mockGetDocs.mockResolvedValueOnce({ empty: false });

    document.getElementById("add-ticket").click();
    await document.getElementById("confirm").click();

    // Should NOT add attendee or update event
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();

    // Error toast
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining("already claimed"),
      "error"
    );
  });

  test("prevents claiming if tickets are sold out", async () => {
    // Event exists but sold out
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ capacity: 5, ticketsSold: 5, createdBy: "org1" }),
    });

    // User has not claimed
    mockGetDocs.mockResolvedValueOnce({ empty: true });

    document.getElementById("add-ticket").click();
    await document.getElementById("confirm").click();

    // Should NOT add attendee or update event
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();

    // Error toast
    expect(global.showToast).toHaveBeenCalledWith(
      expect.stringContaining("sold out"),
      "error"
    );
  });
});
