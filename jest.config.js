// jest.config.js

module.exports = {
  // Use 'jsdom' so DOM-based tests (integration tests that manipulate document) run under Jest
  testEnvironment: 'jsdom', 
  
  // Array of file extensions Jest should look for
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],

  // The directories to scan for tests
  testMatch: [
    "**/__tests__/**/*.js?(x)", 
    "**/?(*.)+(spec|test).js?(x)"
  ],

  // 1. Module Name Mapper (The Crucial Fix)
  // This tells Jest to replace the import of your config file 
  // with a controlled mock file, bypassing the CDN URLs.
  moduleNameMapper: {
    // Map any import that ends with `firebase-config.js` to the mock, so modules
    // that import the file via different relative paths (e.g. '../../js/Shared/firebase-config.js')
    // will receive the mock during tests.
      ".*firebase-config\\.js$": "<rootDir>/__mocks__/firebase-config-mock.js",
      // Map the Firebase CDN imports (used in browser source files) to our local mock
      // so Jest doesn't attempt to fetch remote modules.
      "^https:\\/\\/www\\.gstatic\\.com\\/firebasejs\\/.*$": "<rootDir>/__mocks__/firebase_import.js"
  },

  // 2. Setup Files (Optional but good practice for global fetch and console spies)
  // This runs code before your tests load.
  setupFilesAfterEnv: [
    // This is where you would include a setup file if you created one 
    // for mocking global fetch (like `jest.setup.js` from earlier)
    "<rootDir>/jest.setup.js" 
  ]
};