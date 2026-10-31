import {Suspense} from 'react';
import {render,cleanup,screen} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import {InitialPageReady} from './InitialPageReady';
afterEach(()=>{cleanup();document.getElementById('site-first-paint')?.remove();document.getElementById('root')?.remove();});
function setup(){document.body.insertAdjacentHTML('beforeend','<div id="site-first-paint">Styled public content</div><div id="root" data-startup-pending aria-hidden="true" inert></div>');return document.getElementById('root')!;}
describe('initial route handoff',()=>{
 it('exposes the finished route and removes the static shell on the same commit',()=>{const root=setup();render(<><p>Finished route</p><InitialPageReady/></>,{container:root});expect(document.getElementById('site-first-paint')).toBeNull();for(const name of ['data-startup-pending','aria-hidden','inert'])expect(root.hasAttribute(name)).toBe(false);expect(screen.getByText('Finished route')).toBeInTheDocument();});
 it('retains the readable first paint while route code is suspended',()=>{const root=setup();function Pending(): never {throw new Promise(()=>{});}render(<Suspense fallback={<p>Route loading</p>}><Pending/><InitialPageReady/></Suspense>,{container:root});expect(document.getElementById('site-first-paint')).not.toBeNull();expect(root.hasAttribute('data-startup-pending')).toBe(true);});
});
