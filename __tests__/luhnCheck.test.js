const luhnCheck = require("../js/User/luhnCheck.js"); 
// adjust path as needed

describe("luhnCheck", () => {

  test("valid credit card numbers should pass", () => {
    expect(luhnCheck("4539578763621486")).toBe(true);  // Visa
    expect(luhnCheck("371449635398431")).toBe(true);   // Amex
    expect(luhnCheck("5555555555554444")).toBe(true);  // MasterCard
  });
  
  test("invalid credit card numbers should fail", () => {
    expect(luhnCheck("4539578763621487")).toBe(false);
    expect(luhnCheck("1111111111111111")).toBe(false);
    expect(luhnCheck("0000000000000001")).toBe(false);
  });

  test("numbers that are too short or long return false", () => {
    expect(luhnCheck("123")).toBe(false);
    expect(luhnCheck("123456789012345678901")).toBe(false);
  });

  test("non‐digit input should fail", () => {
    expect(luhnCheck("abcd1234")).toBe(false);
    expect(luhnCheck("1234-5678-9012-3456")).toBe(false);
    expect(luhnCheck(" ")).toBe(false);
  });

});
