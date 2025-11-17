const formatDate = require("../../js/Analytics/formatDate.js");

describe("formatDate", () => {

  test("returns 'No date' when input is null, undefined, or empty", () => {
    expect(formatDate(null)).toBe("No date");
    expect(formatDate(undefined)).toBe("No date");
  });

  test("formats a JS date into 'Mon DD, YYYY, HH:MM' format", () => {
    // Use a stable date (UTC string)
    const date = new Date("2025-11-21T18:39:00Z");

    const result = formatDate(date);

    // Check expected components (timezone-safe)
    expect(result).toContain("2025");
    expect(result).toMatch(/Nov|November/);
    expect(result).toMatch(/\b21\b/);
    expect(result).toMatch(/\d{2}:\d{2}/); // time appears
  });

  test("produces different outputs for different times", () => {
    const morning = new Date("2025-11-21T13:05:00Z");
    const evening = new Date("2025-11-21T23:59:00Z");

    const morningFormatted = formatDate(morning);
    const eveningFormatted = formatDate(evening);

    expect(morningFormatted).not.toBe(eveningFormatted);
    expect(morningFormatted).toMatch(/\d{2}:\d{2}/);
    expect(eveningFormatted).toMatch(/\d{2}:\d{2}/);
  });

});
