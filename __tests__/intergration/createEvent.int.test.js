// createEvent.int.test.js
// Note: We recommend installing an extension to run jest tests.

const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { doc, getDoc } = require("firebase/firestore");
const organizerModule = require("../Extractions/organizerCreateEvent.cjs");

jest.setTimeout(20000); // increase timeout for emulator operations

let testEnv;
let db;
const organizerUid = "org_12345"; // ensure defined before using in beforeAll

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "evently-demo",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  // Create an authenticated context for the organizer and get its Firestore instance
  db = testEnv.authenticatedContext({ uid: organizerUid }).firestore();

  // Inject emulator db into the extracted module
  organizerModule.__setTestDB(db);
});

beforeEach(async () => {
  // Clear emulator between tests to ensure isolation
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Integration Test — Organizer Creates Event", () => {
  test("Organizer successfully creates a new event", async () => {
    const input = {
      eventName: "AI & Robotics Workshop",
      eventDescription: "Learn about robots and AI.",
      eventBanner: "/assets/images/event3.jpeg",
      eventDate: "2025-03-21",
      eventTime: "18:30",
      eventLocation: "EV 11.155",
      eventCategory: "Workshop",
      openTo: ["Concordia", "Polytechnique"],
      capacity: 80,
      ticketPrice: 15.5
    };

    const result = await organizerModule.createEvent(organizerUid, input);
    expect(result.eventId).toBeDefined();

    const snap = await getDoc(doc(db, "events", result.eventId));
    expect(snap.exists()).toBe(true);

    const stored = snap.data();

    expect(stored.eventName).toBe(input.eventName);
    expect(stored.eventLocation).toBe("EV 11.155");
    expect(stored.capacity).toBe(80);
    expect(stored.ticketPrice).toBe(15.5);
    expect(stored.eventCategory).toBe("Workshop");
    expect(stored.openTo).toContain("Concordia");
    expect(stored.createdBy).toBe(organizerUid);
    expect(stored.ticketsSold).toBe(0);

    // Validate date storage
    expect(stored.eventDateTime.toDate().toISOString())
      .toBe(new Date("2025-03-21T18:30:00").toISOString());
  });

  test("Throws when organizer UID is missing", async () => {
    const input = {
      eventName: "Test",
      eventDate: "2025-01-01",
      eventTime: "12:00",
    };

    await expect(organizerModule.createEvent(null, input)).rejects.toThrow("Missing organizer UID");
  });

  test("Throws when form data is invalid or missing eventName", async () => {
    await expect(organizerModule.createEvent(organizerUid, {})).rejects.toThrow("Invalid form data");
  });

  test("Parses numeric fields from strings and defaults openTo to empty array", async () => {
    const input = {
      eventName: "Numeric Parsing Test",
      eventDescription: "Check capacity and price parsing",
      eventBanner: "/img.png",
      eventDate: "2025-06-10",
      eventTime: "09:15",
      eventLocation: "Room 1",
      eventCategory: "Talk",
      // omit openTo to test default
      capacity: "120",
      ticketPrice: "7.25"
    };

    const result = await organizerModule.createEvent(organizerUid, input);
    expect(result.eventId).toBeDefined();

    const snap = await getDoc(doc(db, "events", result.eventId));
    expect(snap.exists()).toBe(true);

    const stored = snap.data();

    expect(typeof stored.capacity).toBe("number");
    expect(stored.capacity).toBe(120);
    expect(typeof stored.ticketPrice).toBe("number");
    expect(stored.ticketPrice).toBeCloseTo(7.25, 5);
    expect(Array.isArray(stored.openTo)).toBe(true);
    expect(stored.openTo.length).toBe(0);
  });
});
