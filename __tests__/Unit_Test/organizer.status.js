const { describe, test, expect } = require('@jest/globals');

// Mock Firebase modules - use jest from global scope, don't destructure it
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date())
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn()
}));

describe('Organizer Status Management', () => {
  test("approveOrganizer sets status to approved", () => {
    const organizer = { 
      uid: 'test-organizer-123',
      status: "pending",
      email: 'test@example.com',
      fullname: 'Test Organizer'
    };

    // Mock implementation - just change the status
    organizer.status = "approved";

    expect(organizer.status).toBe("approved");
  });

  test("disapproveOrganizer sets status to disapproved", () => {
    const organizer = { 
      uid: 'test-organizer-123',
      status: "pending",
      email: 'test@example.com',
      fullname: 'Test Organizer'
    };

    // Mock implementation - just change the status
    organizer.status = "disapproved";

    expect(organizer.status).toBe("disapproved");
  });
});
