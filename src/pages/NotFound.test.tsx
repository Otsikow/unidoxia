import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotFound from './NotFound';
import { SEO } from '@/components/SEO';
vi.mock('@/components/BackButton', () => ({ default: () => <a href="/">Return to Home</a> }));
afterEach(() => { cleanup(); document.head.innerHTML = ''; });
describe('missing-route SEO', () => {
  it('shows Page not found and noindex for an unmatched route, then clears noindex on valid navigation', async () => {
    const router = createMemoryRouter([
      { path: '/courses', element: <SEO title="Courses | UniDoxia" description="Browse courses" /> },
      { path: '*', element: <NotFound /> },
    ], { initialEntries: ['/this-page-does-not-exist'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await router.navigate('/courses');
    await waitFor(() => expect(document.title).toBe('Courses | UniDoxia'));
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://unidoxia.com/courses');
  });
  it('preserves static schema on its page and removes it on navigation', async () => {
    document.head.innerHTML = '<meta name="prerender-path" content="/courses/a"><script type="application/ld+json" data-prerender-seo="1">{"@type":"Course"}</script>';
    const router = createMemoryRouter([{ path: '/courses/:id', element: <SEO title="Course" description="Details" /> }], { initialEntries: ['/courses/a'] });
    render(<RouterProvider router={router} />);
    expect(document.querySelector('script[data-prerender-seo]')).not.toBeNull();
    await router.navigate('/courses/b');
    await waitFor(() => expect(document.querySelector('script[data-prerender-seo]')).toBeNull());
  });
});
