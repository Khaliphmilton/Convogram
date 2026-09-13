export function installPeopleProfileTap(onOpenProfile) {
  if (typeof document === 'undefined') return () => {};
  const handler = (event) => {
    const row = event.target?.closest?.('.people-list-item');
    if (!row) return;
    const id = row.dataset.profileId;
    if (!id) return;
    onOpenProfile?.(id);
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
