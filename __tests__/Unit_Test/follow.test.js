import assert from "node:assert";
import { followUser, unfollowUser } from "../../js/feature-follow/followUnfollow.js";


// ---- Mock Firebase ----
global.db = {};

global.getAuth = () => ({
  currentUser: { uid: "currentUser123" }
});

global.doc = (...args) => "mockUserRef";

let mockData = {};

global.getDoc = async () => ({
  exists: () => "following" in mockData,
  data: () => mockData
});

global.setDoc = async (ref, data) => {
  mockData = data;
};

global.updateDoc = async (ref, data) => {
  mockData.following = [ ...mockData.following, data.following ];
};

global.arrayUnion = (val) => val;

// ---- Test ----

(async () => {
  console.log("Running tests...");

  // Reset
  mockData = {};

  await followUser("userA");
  assert.deepStrictEqual(mockData.following, ["userA"]);
  console.log("followUser creates new doc");

  await followUser("userA");
  assert.deepStrictEqual(mockData.following, ["userA"]);
  console.log("followUser does not duplicate");

  await followUser("userB");
  assert.deepStrictEqual(mockData.following, ["userA", "userB"]);
  console.log("followUser appends correctly");

  console.log("All tests passed!");
})();