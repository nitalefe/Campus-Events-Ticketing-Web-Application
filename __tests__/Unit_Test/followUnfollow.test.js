// Tests for followUnfollow.js using a mocked shared firebase import

const path = require('path');

const firebaseImportPath = path.resolve(__dirname, '../../js/Shared/firebase_import.js');

describe('followUnfollow module', () => {
  let mocked;
  let followModule;

  beforeEach(async () => {
    jest.resetModules();

    // Install the mock for the shared firebase helpers
    jest.doMock(firebaseImportPath, () => ({
      getAuth: jest.fn(() => ({ currentUser: { uid: 'current-user-1' } })),
      doc: jest.fn((db, col, id) => ({ db, col, id })),
      db: {},
      getDoc: jest.fn(),
      setDoc: jest.fn(),
      updateDoc: jest.fn(),
      arrayUnion: jest.fn((v) => ({ arrayUnion: v })),
      arrayRemove: jest.fn((v) => ({ arrayRemove: v })),
    }));

    // Require the mocked module so tests can configure it
    mocked = require(firebaseImportPath);

    // Spy on console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Now require the module under test (it will perform dynamic imports when called)
    followModule = require('../../js/feature-follow/followUnfollow.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('followUser creates user doc when missing', async () => {
    mocked.getDoc.mockResolvedValueOnce({ exists: () => false });

    await followModule.followUser('target-123');

    expect(mocked.getAuth).toHaveBeenCalled();
    expect(mocked.doc).toHaveBeenCalledWith(mocked.db, 'users', 'current-user-1');
    expect(mocked.setDoc).toHaveBeenCalled();
    const [calledRef, calledData] = mocked.setDoc.mock.calls[0];
    expect(calledData).toEqual({ following: ['target-123'] });
  });

  test('unfollowUser removes target when present', async () => {
    mocked.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ following: ['target-123', 'other'] }) });

    await followModule.unfollowUser('target-123');

    expect(mocked.getAuth).toHaveBeenCalled();
    expect(mocked.doc).toHaveBeenCalledWith(mocked.db, 'users', 'current-user-1');
    expect(mocked.updateDoc).toHaveBeenCalledWith(expect.any(Object), { following: { arrayRemove: 'target-123' } });
  });

});
