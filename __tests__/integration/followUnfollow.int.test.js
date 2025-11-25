// __tests__/integration/followUnfollow.int.test.js

const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { doc, setDoc, getDoc } = require("firebase/firestore");

const followModule = require("../Extractions/followUnfollow.cjs");

jest.setTimeout(20000);

// small polling helper to avoid emulator race conditions
async function waitForDoc(ref, attempts = 40, delay = 60) {
  for (let i = 0; i < attempts; i++) {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap;
    await new Promise(res => setTimeout(res, delay));
  }
  return await getDoc(ref);
}

let testEnv;
let db;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "evently-demo",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8")
    }
  });

  db = testEnv.authenticatedContext("userA").firestore();
  followModule.__setTestDB(db);
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed userA intentionally (no undefined-following errors)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();
    await setDoc(doc(adminDb, "users", "userA"), { following: [] });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Integration — Follow/Unfollow Feature", () => {

  test("UserA follows UserB", async () => {
    await followModule.followUser("userA", "userB");

    const snap = await waitForDoc(doc(db, "users", "userA"));
    expect(snap.exists()).toBe(true);

    const data = snap.data();
    expect(data.following).toContain("userB");
  });

  test("UserA cannot follow the same user twice", async () => {
    await followModule.followUser("userA", "userB");
    await followModule.followUser("userA", "userB");

    const snap = await waitForDoc(doc(db, "users", "userA"));
    const { following } = snap.data();

    expect(following.length).toBe(1);
  });

  test("UserA cannot follow themselves", async () => {
    await expect(followModule.followUser("userA", "userA"))
      .rejects.toThrow("Cannot follow yourself");
  });

  test("UserA unfollows UserB successfully", async () => {
    await followModule.followUser("userA", "userB");
    await followModule.unfollowUser("userA", "userB");

    const snap = await waitForDoc(doc(db, "users", "userA"));
    const { following } = snap.data();

    expect(following).not.toContain("userB");
  });

  test("Unfollowing a user not followed does nothing (no crash)", async () => {
    // this time userA has following: []
    await followModule.unfollowUser("userA", "userB");

    const snap = await waitForDoc(doc(db, "users", "userA"));
    const data = snap.data();

    // stable: following always exists because we seed it
    expect(data.following).toEqual([]);
  });
});
