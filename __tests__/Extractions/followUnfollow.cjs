// followUnfollow.cjs (CommonJS)
const { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } = require("firebase/firestore");

let _db = null;

/**
 * Inject db from emulator (like createEvent)
 */
function __setTestDB(testDb) {
  _db = testDb;
}

/**
 * Follow a user (currentUserUid follows targetUid)
 */
async function followUser(currentUserUid, targetUid) {
  if (!_db) throw new Error("Database not initialized. Call __setTestDB()");
  if (!currentUserUid) throw new Error("Missing current user UID");
  if (!targetUid) throw new Error("Missing target user UID");
  if (currentUserUid === targetUid) throw new Error("Cannot follow yourself");

  const userRef = doc(_db, "users", currentUserUid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { following: [targetUid] });
    return;
  }

  const data = snap.data();
  const following = data.following || [];

  if (following.includes(targetUid)) {
    return; // already followed
  }

  await updateDoc(userRef, {
    following: arrayUnion(targetUid)
  });
}

/**
 * Unfollow a user
 */
async function unfollowUser(currentUserUid, targetUid) {
  if (!_db) throw new Error("Database not initialized. Call __setTestDB()");
  if (!currentUserUid) throw new Error("Missing current user UID");
  if (!targetUid) throw new Error("Missing target user UID");

  const userRef = doc(_db, "users", currentUserUid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { following: [] });
    return;
  }

  const data = snap.data();
  const following = data.following || [];

  if (!following.includes(targetUid)) {
    return; // nothing to remove
  }

  await updateDoc(userRef, {
    following: arrayRemove(targetUid)
  });
}

module.exports = {
  __setTestDB,
  followUser,
  unfollowUser
};