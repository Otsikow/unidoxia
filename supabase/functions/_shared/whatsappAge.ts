export function isAdultForWhatsApp(dateOfBirth?: string | null, now = new Date()): boolean {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const birth = new Date(dateOfBirth + 'T00:00:00Z');
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth) return false;
  const age = now.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayReached = now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  return age > 18 || (age === 18 && birthdayReached);
}
