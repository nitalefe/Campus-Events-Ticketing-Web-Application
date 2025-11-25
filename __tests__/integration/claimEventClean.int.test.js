// __tests__/integration/claimEventClean.int.test.js

const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { doc, setDoc, getDoc } = require("firebase/firestore");

const claimModule = require("../Extractions/claimEvent.cjs");  // ✅ import ONCE

jest.setTimeout(30000);


async function waitForDoc(ref, attempts = 50, delay = 80) {
  for (let i = 0; i < attempts; i++) {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap;
    await new Promise(r => setTimeout(r, delay));
  }
  return await getDoc(ref);
}

let testEnv;
const studentUid = "student1";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "evently-demo",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  claimModule.__setTestDB(null); // ✅ reset for safety
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Integration — Claim Ticket Logic (stable)", () => {

 test("User successfully claims a ticket", async () => {
  const user = {
    uid: studentUid,
    email: "test@concordia.ca",
    firstName: "John",
    lastName: "Doe"
  };

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();

    // Seed
    await setDoc(doc(adminDb, "events", "event1"), {
      eventName: "Test Event",
      capacity: 100,
      ticketsSold: 0
    });

    await setDoc(doc(adminDb, "users", studentUid), {
      claimedEvents: []
    });

    // Connect module
    claimModule.__setTestDB(adminDb);

    // Run claim
    const result = await claimModule.claimTicket("event1", user);
    expect(result).toBe(true);

    // Wait for attendee doc
    const attendeeRef = doc(adminDb, "attendees", `event1_${studentUid}`);
    const attendeeSnap = await waitForDoc(attendeeRef);
    expect(attendeeSnap.exists()).toBe(true);

    // Verify event update
    const eventSnap = await waitForDoc(doc(adminDb, "events", "event1"));
    expect(eventSnap.data().ticketsSold).toBe(1);

    // Verify user update
    const userSnap = await waitForDoc(doc(adminDb, "users", studentUid));
    expect(userSnap.data().claimedEvents).toContain("event1");
  });
});
});