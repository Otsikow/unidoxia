/** Admin aliases preserve existing shared tools without changing other roles. */
export const ADMIN_DASHBOARD_ALIASES: Readonly<Record<string, string>> = {
  '/dashboard': '/admin/overview',
  '/dashboard/applications': '/admin/applications',
  '/dashboard/students': '/admin/students',
  '/dashboard/agents': '/admin/agents',
  '/dashboard/website-leads': '/admin/leads',
  '/dashboard/notifications': '/admin/notifications',
  '/dashboard/analytics': '/admin/analytics',
  '/dashboard/tasks': '/admin/tasks',
  '/dashboard/messages': '/admin/messages',
  '/dashboard/commissions': '/admin/commissions',
  '/dashboard/offers': '/admin/offers',
  '/dashboard/requests': '/admin/document-requests',
  '/dashboard/leads': '/admin/recruitment-leads',
  '/dashboard/reports': '/admin/team-reports',
  '/dashboard/blog': '/admin/content-workspace',
  '/dashboard/ranking': '/admin/agent-ranking',
  '/dashboard/payments': '/admin/payment-history',
  '/dashboard/import': '/admin/import',
  '/dashboard/resources': '/admin/resource-library',
  '/dashboard/partners': '/admin/partner-directory',
  '/dashboard/settings': '/admin/preferences',
  '/dashboard/ai-insights': '/admin/ai-insights',
  '/profile/settings': '/admin/profile',
  '/agent/settings': '/admin/agent-profile',
};
export function getAdminDestination(pathname: string, search = '', hash = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Only these routes accept a known child path. Unknown URLs must not be
  // guessed into a different resource or turned into an open redirect.
  const canonical = ADMIN_DASHBOARD_ALIASES[path] ?? (
    path === '/dashboard/applications/new' ? '/admin/applications/new' :
    path.startsWith('/dashboard/settings/') ? `/admin/preferences/${path.slice('/dashboard/settings/'.length)}` :
    /^\/agent\/students\/[^/]+$/.test(path) ? `/admin/students/${path.slice('/agent/students/'.length)}` : null
  );
  return canonical ? `${canonical}${search}${hash}` : null;
}

export const ADMIN_ADDITIONAL_WORKSPACES = [
  { to: '/admin/offers', label: 'Offers & CAS / LOA' },
  { to: '/admin/document-requests', label: 'Document requests' },
  { to: '/admin/recruitment-leads', label: 'Recruitment leads' },
  { to: '/admin/team-reports', label: 'Team reports' },
  { to: '/admin/content-workspace', label: 'Team content workspace' },
  { to: '/admin/agent-ranking', label: 'Agent ranking' },
  { to: '/admin/payment-history', label: 'Student payment history' },
  { to: '/admin/import', label: 'Import records' },
  { to: '/admin/resource-library', label: 'Shared resource library' },
  { to: '/admin/partner-directory', label: 'Partner directory' },
  { to: '/admin/ai-insights', label: 'Team AI insights' },
  { to: '/admin/agent-profile', label: 'Agent profile' },
] as const;
