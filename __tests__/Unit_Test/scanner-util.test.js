// __tests__/Unit_Test/scanner-util.test.js
const { setStatus, onDecoded } = require("../../js/QRcode/scanner-util.js");

describe("setStatus", () => {
    test("updates textContent and className", () => {
        const el = { textContent: "", className: "" };
        setStatus(el, "Loading...", "ok");
        expect(el.textContent).toBe("Loading...");
        expect(el.className).toBe("status ok");
    });

    test("works without a state", () => {
        const el = { textContent: "", className: "" };
        setStatus(el, "Waiting");
        expect(el.textContent).toBe("Waiting");
        expect(el.className).toBe("status");
    });

    test("does nothing if element is null", () => {
        expect(() => setStatus(null, "Test")).not.toThrow();
    });
});

describe("onDecoded", () => {
    test("handles ticket validation success (ok: true)", async () => {
        const el = { textContent: "", className: "" };
        const validateTicket = jest.fn().mockResolvedValue({ ok: true, message: "Valid" });

        await onDecoded("ticket123", validateTicket, el);

        expect(validateTicket).toHaveBeenCalledWith("ticket123");
        expect(el.textContent).toBe("Valid");
        expect(el.className).toBe("status ok");
    });

    test("handles ticket validation failure (ok: false)", async () => {
        const el = { textContent: "", className: "" };
        const validateTicket = jest.fn().mockResolvedValue({ ok: false, message: "Invalid" });

        await onDecoded("ticket456", validateTicket, el);

        expect(el.textContent).toBe("Invalid");
        expect(el.className).toBe("status err");
    });

    test("handles errors thrown by validateTicket", async () => {
        const el = { textContent: "", className: "" };
        const validateTicket = jest.fn().mockRejectedValue(new Error("Network failed"));

        await onDecoded("ticket789", validateTicket, el);

        expect(el.textContent).toContain("Unexpected error");
        expect(el.className).toBe("status err");
    });

    test("handles errors thrown as non-Error values", async () => {
        const el = { textContent: "", className: "" };
        const validateTicket = jest.fn().mockRejectedValue("some string");

        await onDecoded("ticket000", validateTicket, el);

        expect(el.textContent).toContain("Unexpected error");
        expect(el.className).toBe("status err");
    });

});
