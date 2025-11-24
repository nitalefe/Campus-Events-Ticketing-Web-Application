// __tests__/integration/claimEventClean.int.test.js

const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { doc, setDoc, getDoc } = require("firebase/firestore");

const claimModule = require("../Extractions/claimEvent.cjs");

jest.setTimeout(30000);

let testEnv, db, adminDb;

beforeAll(async () => {
  const hasEnvHost = !!process.env.FIRESTORE_EMULATOR_HOST;

  const firestoreConfig = {
    rules: readFileSync("firestore.rules", "utf8"),
    ...(hasEnvHost ? {} : { host: "127.0.0.1", port: 8080 }),
  };

  testEnv = await initializeTestEnvironment({
    projectId: "evently-demo",
    firestore: firestoreConfig,
  });

  // keep an authenticated client if needed later
  db = testEnv.authenticatedContext({ uid: "student1" }).firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed using a rules-disabled admin context (do not persist ctx.firestore outside)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDbLocal = ctx.firestore();
    await setDoc(doc(adminDbLocal, "events", "event1"), {
      eventName: "Test Event",
      capacity: 100,
      ticketsSold: 0
    });

    await setDoc(doc(adminDbLocal, "users", "student1"), {
      claimedEvents: []
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Integration — Claim Ticket Logic", () => {
  test("User successfully claims a ticket", async () => {
    const user = {
      uid: "student1",
      email: "test@concordia.ca",
      firstName: "John",
      lastName: "Doe"
    };

    // Run claim and verification inside the same admin callback so the admin client stays valid
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDbLocal = ctx.firestore();

      // Inject admin DB into the module so writes are deterministic in tests
      claimModule.__setTestDB(adminDbLocal);

      // Perform the claim under admin DB and assert it returned true
      const res = await claimModule.claimTicket("event1", user);
      expect(res).toBe(true);

      // small delay to give emulator a moment to surface writes
      await new Promise((r) => setTimeout(r, 200));

      // Check attendee added (use adminDb + poll)
      async function waitForDocInTest(ref, attempts = 80, delayMs = 125) {
        for (let i = 0; i < attempts; i++) {
          const snap = await getDoc(ref);
          if (snap.exists()) return snap;
          await new Promise((r) => setTimeout(r, delayMs));
        }
        return await getDoc(ref);
      }

      const attendeeRef = doc(adminDbLocal, "events", "event1", "attendees", user.uid);
      const attendeeSnap = await waitForDocInTest(attendeeRef);
      expect(attendeeSnap.exists()).toBe(true);

      // Check event updated
      const eventSnap = await getDoc(doc(adminDbLocal, "events", "event1"));
      expect(eventSnap.data().ticketsSold).toBe(1);

      // Check user updated
      const userSnap = await getDoc(doc(adminDbLocal, "users", "student1"));
      expect(userSnap.data().claimedEvents).toContain("event1");
    });
  });
});
