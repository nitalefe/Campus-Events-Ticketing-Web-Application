// Use CommonJS syntax
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Mock Firebase functions
jest.mock("../js/Shared/firebase_import.js", () => ({
    auth: {},
    db: {},
    doc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    increment: jest.fn(),
    collection: jest.fn(),
    serverTimestamp: jest.fn(),
    arrayUnion: jest.fn(),
    onAuthStateChanged: jest.fn(),
}));

const { getDoc, onAuthStateChanged } = require("../js/Shared/firebase_import.js");

// Load your HTML + JS helper
function loadScript(filePath) {
    const script = document.createElement("script");
    script.src = "file://" + filePath.replace(/\\/g, "/");
    script.type = "module";
    document.body.appendChild(script);
}

describe("Claim Event Integration Test", () => {

    beforeEach(() => {
        jest.resetModules();

        // Load HTML
        document.body.innerHTML = fs.readFileSync(
            path.resolve(__dirname, "../website/Student/claimEvent.html"),
            "utf8"
        );

        // Mock window.location
        delete window.location;
        window.location = {
            href: "https://evently.com/claim?id=abc123",
            search: "?id=abc123",
            assign: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test("loads event data & updates UI", async () => {
        onAuthStateChanged.mockImplementation((auth, cb) => cb({ uid: "user1" }));

        getDoc.mockResolvedValueOnce({
            exists: () => true,
            id: "abc123",
            data: () => ({ eventName: "Fein concert" }),
        });

        loadScript(path.resolve(__dirname, "../js/User/claimEvent.js"));

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.getElementById("event-title").textContent).toBe("Fein concert");
    });

});
