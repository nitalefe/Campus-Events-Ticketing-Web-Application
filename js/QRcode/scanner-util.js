// scanner-utils.js

/**
 * Update a DOM element's text and class for status messages.
 * @param {HTMLElement} el - The element to update
 * @param {string} msg - The message text
 * @param {string} state - Optional state, e.g., "ok", "err"
 */
function setStatus(el, msg, state = "") {
  if (!el) return;
  el.textContent = msg;
  el.className = "status" + (state ? ` ${state}` : "");
}

/**
 * Handle a decoded ticket string.
 * @param {string} encryptedText
 * @param {Function} validateTicket - async function to validate ticket
 * @param {HTMLElement} statusEl - DOM element to show status
 */
async function onDecoded(encryptedText, validateTicket, statusEl) {
  try {
    const result = await validateTicket(encryptedText);
    setStatus(statusEl, result.message, result.ok ? "ok" : "err");
  } catch (e) {
    setStatus(statusEl, `Unexpected error: ${e?.message || e}`, "err");
  }
}

export { setStatus, onDecoded };
