import { useLayoutEffect } from 'react';

/** Commit inside the route Suspense boundary; never expose an intermediate loader. */
export function InitialPageReady() {
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    root?.removeAttribute('data-startup-pending');
    root?.removeAttribute('aria-hidden');
    root?.removeAttribute('inert');
    document.getElementById('site-first-paint')?.remove();
  }, []);
  return null;
}
