/**
 * Headless tests for admin approval backend helper.
 */

const { handleApproval } = require('../../js/Administrator/adminApprovalBackend.js');

describe('adminApprovalBackend.handleApproval', () => {
  test('calls updateDoc with correct payload when approved', async () => {
    const mockUpdateDoc = jest.fn().mockResolvedValue(true);
    const mockDoc = jest.fn((db, col, id) => ({ path: `${col}/${id}` }));
    const mockServerTs = jest.fn(() => ({ _s: true }));
    const auth = { currentUser: { uid: 'admin1' } };
    const db = {}; // not used by mockDoc

    const res = await handleApproval({
      id: 'org123',
      approved: true,
      authInstance: auth,
      dbInstance: db,
      docFn: mockDoc,
      updateDocFn: mockUpdateDoc,
      serverTimestampFn: mockServerTs,
      ORG_COLLECTION: 'organizers'
    });

    expect(mockDoc).toHaveBeenCalledWith(db, 'organizers', 'org123');
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'organizers/org123' }, expect.objectContaining({ approved: true, approvedBy: 'admin1' }));
    expect(res).toEqual({ id: 'org123', approved: true });
  });

  test('throws when not signed in', async () => {
    const mockUpdateDoc = jest.fn();
    const mockDoc = jest.fn();
    const mockServerTs = jest.fn();

    await expect(handleApproval({
      id: 'org1',
      approved: false,
      authInstance: { currentUser: null },
      dbInstance: {},
      docFn: mockDoc,
      updateDocFn: mockUpdateDoc,
      serverTimestampFn: mockServerTs
    })).rejects.toThrow(/Not signed in/);
  });
});
