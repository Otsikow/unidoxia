import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_ADDITIONAL_WORKSPACES, ADMIN_DASHBOARD_ALIASES, getAdminDestination } from './adminNavigation';
describe('canonical admin destinations', () => {
  it('keeps every known shared admin tool under the admin workspace', () => {
    for (const [source, target] of Object.entries(ADMIN_DASHBOARD_ALIASES)) {
      expect(getAdminDestination(source)).toBe(target);
      expect(target.startsWith('/admin/')).toBe(true);
      expect(getAdminDestination(target)).toBeNull();
    }
  });
  it('preserves application references, selected students and fragments', () => {
    expect(getAdminDestination('/dashboard/applications', '?application=example', '#history')).toBe('/admin/applications?application=example#history');
    expect(getAdminDestination('/dashboard/applications/new', '?studentId=example')).toBe('/admin/applications/new?studentId=example');
    expect(getAdminDestination('/agent/students/example', '?tab=documents')).toBe('/admin/students/example?tab=documents');
    expect(getAdminDestination('/dashboard/settings/security')).toBe('/admin/preferences/security');
    expect(getAdminDestination('/dashboard/')).toBe('/admin/overview');
  });
  it('does not invent destinations for unknown or unrelated portal routes', () => {
    for (const path of ['/student/dashboard', '/university/overview', '/dashboard/unknown', '/dashboard/applications/unknown', 'https://example.test/dashboard', '/agent/students/example/unknown']) expect(getAdminDestination(path)).toBeNull();
  });
  it('registers every alias and additional workspace in the real admin route tree', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const adminTree = source.split('path="/admin"')[1].split('path="/university"')[0];
    const paths = [...adminTree.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1]);
    const destinations = [...Object.values(ADMIN_DASHBOARD_ALIASES), ...ADMIN_ADDITIONAL_WORKSPACES.map(item => item.to), '/admin/applications/new'];
    for (const destination of destinations) {
      const relative = destination.slice('/admin/'.length);
      expect(paths.some(path => path === relative || (path.endsWith('/*') && relative === path.slice(0, -2))), destination).toBe(true);
    }
  });
  it('preserves distinct payment, reporting and resource tools', () => {
    expect(getAdminDestination('/dashboard/payments')).toBe('/admin/payment-history');
    expect(getAdminDestination('/dashboard/reports')).toBe('/admin/team-reports');
    expect(getAdminDestination('/dashboard/resources')).toBe('/admin/resource-library');
  });
});
