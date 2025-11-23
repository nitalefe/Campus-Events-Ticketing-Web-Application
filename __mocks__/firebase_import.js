// __mocks__/firebase_import.js
export const auth = {};
export const db = {};
export const collection = jest.fn();
export const addDoc = jest.fn();
export const updateDoc = jest.fn();
export const doc = jest.fn();
export const getDoc = jest.fn();
export const getDocs = jest.fn();
export const query = jest.fn();
export const orderBy = jest.fn();
export const serverTimestamp = jest.fn();
export const Timestamp = {
  fromDate: jest.fn(),
};

export const onAuthStateChanged = jest.fn((auth, callback) => {
  // Simulate logged-in user
  callback({ uid: "testUserId" });
});


export const getAuth = jest.fn(() => auth);
