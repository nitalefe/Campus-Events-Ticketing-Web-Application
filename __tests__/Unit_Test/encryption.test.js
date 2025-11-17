const encryption = require("../../js/QRcode/encryption.js"); // adjust path

describe("encryption", () => {
  test("encrypts a simple string with positive increment", () => {
    expect(encryption("abc", 1)).toBe("bcd");
    expect(encryption("Hello", 2)).toBe("Jgnnq");
  });

  test("decrypts a string using negative increment", () => {
    expect(encryption("bcd", -1)).toBe("abc");
    expect(encryption("Jgnnq", -2)).toBe("Hello");
  });

  test("returns empty string when input is empty", () => {
    expect(encryption("", 5)).toBe("");
  });

  test("works with zero increment", () => {
    expect(encryption("Test123", 0)).toBe("Test123");
  });
});
