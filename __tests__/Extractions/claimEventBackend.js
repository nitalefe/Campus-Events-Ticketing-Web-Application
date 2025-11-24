// This is a benign stub kept in place so Jest's test discovery doesn't attempt
// to import the real Firebase SDK via this file. The real test helper lives in
// `tests/helpers/claimEventBackend.js`. Keep this file a no-op shim.

module.exports = {
  checkIfUserIsAttending: async () => false,
  addAttendee: async () => 'stub-attendee-id',
  claimTickets: async () => ({ success: true })
};
