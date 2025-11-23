// __mocks__/firebase-config-mock.js

// Define the mock user for testing authentication logic
const mockCurrentUser = { uid: 'test-user-id-123' };

// This object replaces the content of your real firebase-config.js file
module.exports = {
  // Your source file imports 'app', 'db', and 'auth', so we must export them.
  app: {},
  db: {}, 
  // The crucial part: Mock the 'auth' object to include the current user.
  auth: {
    currentUser: mockCurrentUser,
    // Add other methods your source code might use from 'auth', like onAuthStateChanged
    onAuthStateChanged: jest.fn(), 
  }
};