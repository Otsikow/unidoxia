import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { firstPaintCss, renderFirstPaint, homeFirstPaint } from './first-paint.mjs';
import { homeHeadline, homePhoto, studentSignup } from '../src/lib/homepage.mjs';

describe('public first paint', () => {
  it('ships the registration-first hero and adviser-led pathway before the app loads', () => {
    const doc = new JSDOM(renderFirstPaint({
      path: '/',
      body: homeFirstPaint('<div><h3>Featured universities</h3></div>'),
      nav: '',
      footer: '<footer>Registered company</footer>',
    })).window.document;
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1').textContent).toBe(homeHeadline.join(' '));
    const photo = doc.querySelector('.udx-hero-photo');
    expect(photo.getAttribute('src')).toBe(homePhoto.src);
    expect(photo.getAttribute('srcset')).toBe(homePhoto.srcSet);
    expect(photo.getAttribute('fetchpriority')).toBe('high');
    expect(doc.querySelector('form[action="/courses"]')).toBeNull();
    expect(doc.querySelectorAll('.udx-registration-steps li')).toHaveLength(4);
    expect(doc.querySelectorAll('.udx-steps li')).toHaveLength(6);
    for (const id of ['destinations', 'how-it-works']) {
      expect(doc.querySelector(`a[href="#${id}"]`)).not.toBeNull();
      expect(doc.getElementById(id)).not.toBeNull();
    }
    expect([...doc.querySelectorAll('a')].filter(a=>a.getAttribute('href')===studentSignup).length).toBeGreaterThanOrEqual(3);
    expect(doc.querySelector('main')).not.toBeNull();
    expect(doc.querySelector('footer').textContent).toBe('Registered company');
    expect(doc.querySelector('#site-first-paint').hasAttribute('hidden')).toBe(false);
    expect(doc.querySelectorAll('script')).toHaveLength(0);
  });

  it('keeps the pending React loader hidden and non-interactive until route commit', () => {
    const doc = new JSDOM(renderFirstPaint({
      path: '/faq', body: '<h1>FAQ</h1>', nav: '<nav>Help</nav>', footer: '<footer>Company</footer>',
    })).window.document;
    const root = doc.getElementById('root');
    expect(root.hasAttribute('data-startup-pending')).toBe(true);
    expect(root.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(firstPaintCss).toContain('#root[data-startup-pending]{display:none!important}');
    expect(firstPaintCss).not.toMatch(/@import/);
    expect(doc.querySelector('#site-first-paint h1').textContent).toBe('FAQ');
  });
});
