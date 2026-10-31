interface PartnerProfile {
  id: string;
  tenant_id: string;
  role: string;
  active: boolean | null;
  _isolationFailed?: boolean;
}
/** Server-only setup, with no fallback to browser tenant/profile writes. */
export async function ensurePartnerWorkspace<T extends PartnerProfile>(
  profile: T,
  service: {
    ensure: (id: string) => Promise<{tenantId: string | null; error: boolean}>;
    reload: (id: string) => Promise<T | null>;
  },
): Promise<T> {
  if (!['partner', 'university'].includes(profile.role) || profile.active !== true) return profile;
  const failed = {...profile, _isolationFailed: true};
  try {
    const result = await service.ensure(profile.id);
    if (result.error || !result.tenantId) return failed;
    const refreshed = await service.reload(profile.id);
    if (!refreshed || refreshed.id !== profile.id || refreshed.tenant_id !== result.tenantId || refreshed.active !== true)
      return failed;
    return {...refreshed, _isolationFailed: false};
  } catch { return failed; }
}
