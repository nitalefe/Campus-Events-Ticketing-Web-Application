//import { doc, getDoc, updateDoc, setDoc, arrayUnion } from "firebase/firestore";
//import { getAuth } from "firebase/auth";
//import { db } from "./firebase-config.js"; // adjust path to your config


/**
 * Adds a user to the "following" array of the current user.
 * - Creates the array if it doesn't exist.
 * - Prevents duplicates automatically.
 *
 * @param {string} targetUserID - The ID of the user being followed
 */
async function followUser(targetUserID) {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error("No user is signed in.");
    return;
  }

  const currentUserID = currentUser.uid;
  const userRef = doc(db, "users", currentUserID);

  try {
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // Create user doc if missing, with the "following" field
      await setDoc(userRef, {
        following: [targetUserID]
      });
      console.log(`Created new user doc and started following ${targetUserID}`);
      return;
    }

    const data = snapshot.data();
    const currentFollowing = data.following || [];

    // Prevent duplicates manually (arrayUnion also prevents, but this ensures clarity)
    if (currentFollowing.includes(targetUserID)) {
      console.log(`Already following ${targetUserID}`);
      return;
    }

    // Append new follow using arrayUnion (safe, deduplicates automatically)
    await updateDoc(userRef, {
      following: arrayUnion(targetUserID)
    });

    console.log(`Now following ${targetUserID}`);
  } catch (err) {
    console.error("Error updating following list:", err);
  }
}


/**
 * Removes a user from the "following" array of the current user.
 * - Creates the user doc if missing (with empty following array).
 * - Does nothing if the target user is not currently followed.
 *
 * @param {string} targetUserID - The ID of the user to unfollow
 */
async function unfollowUser(targetUserID) {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error("No user is signed in.");
    return;
  }

  const currentUserID = currentUser.uid;
  const userRef = doc(db, "users", currentUserID);

  try {
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // If user doc doesn’t exist, create one
      await setDoc(userRef, { following: [] });
      console.log("Created user document (was missing). Nothing to unfollow yet.");
      return;
    }

    const data = snapshot.data();
    const currentFollowing = data.following || [];

    if (!currentFollowing.includes(targetUserID)) {
      console.log(`You are not following ${targetUserID}.`);
      return;
    }

    // Remove the target user
    await updateDoc(userRef, {
      following: arrayRemove(targetUserID)
    });

    console.log(`Unfollowed ${targetUserID}`);
  } catch (err) {
    console.error("Error updating following list:", err);
  }
}

export { followUser, unfollowUser };
