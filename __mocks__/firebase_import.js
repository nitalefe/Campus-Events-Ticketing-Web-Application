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
  // Simulate logged-in user (include email for tests that log it)
  callback({ uid: "testUserId", email: 'test@example.com' });
});


export const getAuth = jest.fn(() => auth);

// Default mock behaviors used by integration tests
getDoc.mockImplementation(async (ref) => {
  const s = String(ref);
  if (s.includes('/events/')) {
    return {
      exists: () => true,
      id: 'testEvent',
      data: () => ({ capacity: 10, ticketsSold: 0, createdBy: 'org1', eventName: 'Test Event' })
    };
  }
  if (s.includes('/users/')) {
    return {
      exists: () => true,
      data: () => ({ firstname: 'Test', lastname: 'User', email: 'test@example.com' })
    };
  }
  return { exists: () => false };
});

getDocs.mockResolvedValue({ empty: true });
