// Testable backend helper for admin approval actions.
// Keeps logic separate from DOM and SDK imports so tests can exercise it headless.

export async function handleApproval({
  id,
  approved,
  authInstance,
  dbInstance,
  docFn,
  updateDocFn,
  serverTimestampFn,
  ORG_COLLECTION = 'organizers'
}) {
  if (!id) throw new Error('Missing id');
  const user = authInstance && authInstance.currentUser;
  if (!user) throw new Error('Not signed in');

  const ref = docFn(dbInstance, ORG_COLLECTION, id);
  await updateDocFn(ref, {
    approved,
    status: approved ? 'approved' : 'disapproved',
    approvedBy: user.uid,
    approvedAt: serverTimestampFn()
  });

  return { id, approved };
}

export default { handleApproval };
