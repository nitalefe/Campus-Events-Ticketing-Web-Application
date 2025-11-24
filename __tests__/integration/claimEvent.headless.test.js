/**
 * Headless integration test for claim flow.
 * Uses the test-only extraction `__tests__/Extractions/claimEventBackend.js`
 * and mocks `js/Shared/firebase_import.js` so no DOM or real Firebase is used.
 */

describe('Claim Event (headless backend)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('claimTickets calls setDoc and updateDoc', async () => {
    let fbMock;
    jest.isolateModules(() => {
      jest.doMock('../../js/Shared/firebase_import.js', () => {
        const getDoc = jest.fn(async (ref) => ({ exists: () => true, data: () => ({}) }));
        const getDocs = jest.fn(async () => ({ empty: true }));
        const setDoc = jest.fn().mockResolvedValue(true);
        const updateDoc = jest.fn().mockResolvedValue(true);
        const doc = (...args) => args.join('/');
        const collection = (...args) => args.join('/');
        const query = (...args) => ({ args });
        const where = (...args) => ({ args });
        const increment = (n) => ({ _increment: n });
        const arrayUnion = (v) => ({ _arrayUnion: v });
        const serverTimestamp = () => ({ _serverTimestamp: true });
        const db = {};

        fbMock = { getDoc, getDocs, setDoc, updateDoc, doc, collection, query, where, increment, arrayUnion, serverTimestamp, db };
        return fbMock;
      });

      // require the test-only extraction which imports the shared shim
      // path from this file: __tests__/integration -> ../Extractions/claimEventBackend.js
      // the extraction uses '../../js/Shared/firebase_import.js' which we've mocked above
      // so when the extraction is required it will use our mock
      // eslint-disable-next-line global-require
      const backend = require('../Extractions/claimEventBackend.js');
      // attach for assertions outside isolateModules
      fbMock.backend = backend;
    });

    // require the module again in test scope
    // eslint-disable-next-line global-require
    const backend = require('../Extractions/claimEventBackend.js');

    const fakeUser = { uid: 'user1', email: 'test@example.com' };
    const fakeUserData = { firstname: 'Test', lastname: 'User', email: 'test@example.com' };

    await backend.claimTickets({ eventID: 'testEvent', currentUser: fakeUser, currentUserData: fakeUserData, qty: 1, paymentRequired: false });

    // fetch the mock we registered
    const registeredMock = jest.requireMock('../../js/Shared/firebase_import.js');

    expect(registeredMock.setDoc).toHaveBeenCalled();
    expect(registeredMock.updateDoc).toHaveBeenCalled();
  });
});
