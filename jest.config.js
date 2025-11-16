export default {
  testEnvironment: "jest-environment-jsdom",
  transformIgnorePatterns: [
    "/node_modules/(?!@firebase).+\\.js$"
  ],
};
