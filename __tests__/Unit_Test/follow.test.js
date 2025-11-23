import { followUser, unfollowUser } from '../../js/feature-follow/followUnfollow.js';
// TOP OF YOUR TEST FILE (follow.test.js)

// 1. Define the variables for the current user and the database reference
const mockCurrentUser = { uid: 'test-user-id-123' };
const mockUserRef = { db: 'mock-db', collection: 'users', docId: mockCurrentUser.uid };

// 2. Define the mock functions (use 'export const' for robustness)
export const mockGetAuth = jest.fn(() => ({ currentUser: mockCurrentUser }));
export const mockDoc = jest.fn(() => mockUserRef);
export const mockGetDoc = jest.fn();
export const mockUpdateDoc = jest.fn();
export const mockSetDoc = jest.fn();
export const mockArrayUnion = jest.fn(val => ({ type: 'arrayUnion', value: val }));
export const mockArrayRemove = jest.fn(val => ({ type: 'arrayRemove', value: val }));


// 3. MOCK YOUR LOCAL CONFIG FILE INSTEAD OF THE FIREBASE LIBRARIES
jest.mock('../../js/Shared/firebase-config.js', () => ({
  // We mock the things your source file imports from firebase-config.js
  app: {},
  db: 'db', // Use a simple identifier so tests can assert it was passed to doc()
  // We provide the mocked auth object that contains our controlled currentUser
  auth: {
    currentUser: mockCurrentUser,
    // Add other common auth methods if they cause errors later
    onAuthStateChanged: jest.fn(), 
  },
}));

// Also mock the shared re-export module used by the implementation. The
// follow/unfollow implementation dynamically imports from `js/Shared/firebase_import.js`.
jest.mock('../../js/Shared/firebase_import.js', () => ({
  getAuth: mockGetAuth,
  doc: mockDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  setDoc: mockSetDoc,
  arrayUnion: mockArrayUnion,
  arrayRemove: mockArrayRemove,
  db: 'db',
}));

// Remove the following blocks from your test file:
/*
jest.mock('firebase/auth', ...);
jest.mock('firebase/firestore', ...);
*/

describe('User Follow/Unfollow Actions', () => {
  const targetUserID = 'target-user-456';
  const userRef = { db: 'mock-db', collection: 'users', docId: mockCurrentUser.uid };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Ensure getAuth is set up for a signed-in user by default
    mockGetAuth.mockReturnValue({ currentUser: mockCurrentUser });
    mockDoc.mockReturnValue(userRef); // Ensure doc always returns a consistent mock ref
  });

  beforeAll(() => {
    // Create console spies used in assertions
    global.consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore the original console functions
    global.consoleErrorSpy.mockRestore();
    global.consoleLogSpy.mockRestore();
  });

  // --- Tests for followUser ---

  describe('followUser', () => {
    it('should create the user document and add the target user if the doc does not exist', async () => {
      // Setup: Mock getDoc to return a snapshot that doesn't exist
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      await followUser(targetUserID);

      // Assertions
      expect(mockDoc).toHaveBeenCalledWith('db', 'users', mockCurrentUser.uid);
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockSetDoc).toHaveBeenCalledWith(userRef, {
        following: [targetUserID],
      });
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should add the target user to the existing following array if not already present', async () => {
      // Setup: Mock getDoc to return an existing doc with an empty following array
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ following: ['other-user-789'] }),
      });

      await followUser(targetUserID);

      // Assertions
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockSetDoc).not.toHaveBeenCalled(); // Should not call setDoc
      expect(mockArrayUnion).toHaveBeenCalledWith(targetUserID);
      expect(mockUpdateDoc).toHaveBeenCalledWith(userRef, {
        following: mockArrayUnion(targetUserID),
      });
    });

    it('should do nothing and not call updateDoc if the target user is already being followed', async () => {
      // Setup: Mock getDoc to return an existing doc where the target user is present
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ following: [targetUserID, 'another-user'] }),
      });

      await followUser(targetUserID);

      // Assertions
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled(); // Crucial: No update call
      expect(consoleLogSpy).toHaveBeenCalledWith(`Already following ${targetUserID}`);
    });

    it('should log an error if no user is signed in', async () => {
      // Setup: Mock getAuth to return no current user
      mockGetAuth.mockReturnValue({ currentUser: null });

      await followUser(targetUserID);

      // Assertions
      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('No user is signed in.');
    });
  });

  // --- Tests for unfollowUser ---

  describe('unfollowUser', () => {
    it('should remove the target user from the following array', async () => {
      // Setup: Mock getDoc to return a document where the target user is being followed
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ following: [targetUserID, 'other-user-789'] }),
      });

      await unfollowUser(targetUserID);

      // Assertions
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockArrayRemove).toHaveBeenCalledWith(targetUserID);
      expect(mockUpdateDoc).toHaveBeenCalledWith(userRef, {
        following: mockArrayRemove(targetUserID),
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Unfollowed ${targetUserID}`);
    });

    it('should do nothing and not call updateDoc if the target user is NOT followed', async () => {
      // Setup: Mock getDoc to return a document where the target user is NOT followed
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ following: ['other-user-789'] }),
      });

      await unfollowUser(targetUserID);

      // Assertions
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(`You are not following ${targetUserID}.`);
    });

    it('should create the user doc with an empty following array if it does not exist', async () => {
      // Setup: Mock getDoc to return a snapshot that doesn't exist
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      await unfollowUser(targetUserID);

      // Assertions
      expect(mockGetDoc).toHaveBeenCalledWith(userRef);
      expect(mockSetDoc).toHaveBeenCalledWith(userRef, {
        following: [],
      });
      expect(mockUpdateDoc).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Created user document (was missing). Nothing to unfollow yet.");
    });

    it('should log an error if no user is signed in', async () => {
      // Setup: Mock getAuth to return no current user
      mockGetAuth.mockReturnValue({ currentUser: null });

      await unfollowUser(targetUserID);

      // Assertions
      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('No user is signed in.');
    });
  });
});