/**
 * Integration-like test for claimEvent without rendering the full DOM.
 * This test mocks the Firestore helpers exported by `js/Shared/firebase_import.js`
 * and creates minimal DOM elements the module expects before requiring it.
 */

jest.mock('../../js/Shared/firebase_import.js', () => {
  const getDoc = jest.fn();
  const getDocs = jest.fn();
  const setDoc = jest.fn().mockResolvedValue(true);
  const updateDoc = jest.fn().mockResolvedValue(true);
  const doc = (...args) => args.join('/');
  const collection = (...args) => args.join('/');
  const query = (...args) => ({ args });
  const where = (...args) => ({ args });
  const increment = (n) => ({ _increment: n });
  const arrayUnion = (v) => ({ _arrayUnion: v });
  const serverTimestamp = () => ({ _serverTimestamp: true });
  const auth = {};
  const db = {};
  // Call the callback immediately with a fake user to avoid redirect branch
  const onAuthStateChanged = (a, cb) => cb({ uid: 'user1', email: 'test@example.com' });

  return {
    auth,
    db,
    doc,
    query,
    where,
    getDoc,
    updateDoc,
    getDocs,
    setDoc,
    increment,
    collection,
    arrayUnion,
    serverTimestamp,
    onAuthStateChanged
  };
});

describe('Claim Event (no DOM full page) integration', () => {
  beforeEach(() => {
    // Minimal DOM elements the module expects
    document.body.innerHTML = `
      <div id="event-title"></div>
      <div id="org-name"></div>
      <div id="event-date"></div>
      <div id="event-location"></div>
      <div id="event-description"></div>
      <div id="ticket-price"></div>
      <div class="ticket-name"></div>
      <div id="payment-section"></div>
      <button id="confirm">Confirm</button>
      <div id="remaining-text"></div>
      <div id="tickets-left-text"></div>
      <div id="ticket-details"></div>
      <div id="spinner" style="display:none"></div>
      <div id="toast-wrap"></div>
      <div id="ticket-card"></div>
      <button id="add-ticket"></button>
    `;

    // Ensure URL has event id
    // Use history.pushState to set the query string instead of redefining window.location
    window.history.pushState({}, '', '?id=testEvent');
  });

  afterEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  test('successfully claims a ticket (mocked firestore)', async () => {
    // Grab the mocked functions so we can configure/inspect them
    const firebaseMock = require('../../js/Shared/firebase_import.js');

    // Some helpers are referenced as globals in the original module (not imported),
    // so attach them to the global scope so the module finds them at runtime.
    global.getDocs = firebaseMock.getDocs;
    global.setDoc = firebaseMock.setDoc;
    global.serverTimestamp = firebaseMock.serverTimestamp;

    // getDoc should return event and user documents based on the doc path
    firebaseMock.getDoc.mockImplementation(async (ref) => {
      const str = String(ref);
      if (str.includes('/events/')) {
        return {
          exists: () => true,
          id: 'testEvent',
          data: () => ({ capacity: 10, ticketsSold: 0, createdBy: 'org1', eventName: 'Test Event' })
        };
      }
      if (str.includes('/users/')) {
        return {
          exists: () => true,
          data: () => ({ firstname: 'Test', lastname: 'User', email: 'test@example.com' })
        };
      }
      return { exists: () => false };
    });

    // getDocs for attendees should return empty (no attendees)
    firebaseMock.getDocs.mockResolvedValue({ empty: true });

    // Now require the module under test - it will run initialization
    require('../../js/User/claimEvent.js');

    // Wait a tick for any async initialization
    await new Promise((res) => setTimeout(res, 0));

    // Simulate selecting a ticket then clicking confirm
    const ticketCard = document.getElementById('ticket-card');
    ticketCard.classList.add('selected');
    const confirmBtn = document.getElementById('confirm');
    confirmBtn.click();

    // Wait for claim flow to complete
    await new Promise((res) => setTimeout(res, 20));

    // Assertions: setDoc (attendee) and updateDoc (event/users) should be called
    expect(firebaseMock.setDoc).toHaveBeenCalled();
    expect(firebaseMock.updateDoc).toHaveBeenCalled();

    // A success toast element should have been added to the DOM
    const successToast = document.querySelector('#toast-wrap .toast.success');
    expect(successToast).not.toBeNull();
    expect(successToast.textContent).toMatch(/Successfully claimed/i);
  });
});
