import { describe, it, expect } from 'vitest';
import { spaRoutePatterns } from './hosting-routes.mjs';
describe('host SPA allowlist', () => {
  it('preserves nested, auth and scoped wildcard routes without allowing arbitrary public records', () => {
    const patterns = spaRoutePatterns();
    for (const route of ['/auth/callback', '/student/applications/:id', '/admin/users', '/dashboard/settings/*']) expect(patterns).toContain(route);
    for (const route of ['/*', '/courses/:id', '/universities/:id', '/blog/:slug', '/scholarships/:slug']) expect(patterns).not.toContain(route);
  });
});
