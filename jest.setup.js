// jest.setup.js

// Use node-fetch v2 (CommonJS compatible)
const fetch = require("node-fetch");

global.fetch = fetch;

// Polyfill setImmediate for environments (jsdom) where it's not available.
// grpc-js expects setImmediate; provide a safe fallback using setTimeout.
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
if (typeof global.clearImmediate === "undefined") {
  global.clearImmediate = (id) => clearTimeout(id);
}
