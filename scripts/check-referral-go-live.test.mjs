import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// QC N7: the prebuild guard must block a '£500' build and pass the default 'no-figure' build.
const runGuard = extraEnv => {
  const env = { ...process.env, ...extraEnv };
  delete env.VITEST;
  if (!('VITE_REFERRAL_HEADLINE_MODE' in extraEnv)) delete env.VITE_REFERRAL_HEADLINE_MODE;
  return spawnSync(process.execPath, ['scripts/check-referral-go-live.mjs'], { cwd: process.cwd(), env, encoding: 'utf8' });
};

describe('referral prebuild guard', () => {
  it('is wired as the npm prebuild step', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toBe('node scripts/check-referral-go-live.mjs');
  });

  it('passes the default no-figure build', () => {
    const result = runGuard({});
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[referral guard] ok: headline mode 'no-figure'");
  });

  it('blocks a £500 build', () => {
    const result = runGuard({ VITE_REFERRAL_HEADLINE_MODE: '£500' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[referral guard] build blocked');
  });

  it('blocks an unknown mode value', () => {
    const result = runGuard({ VITE_REFERRAL_HEADLINE_MODE: '500' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('is not a known mode');
  });
});

describe('Refer page money copy is build time only (QC N6)', () => {
  const page = fs.readFileSync(path.resolve('src/pages/Refer.tsx'), 'utf8');
  const config = fs.readFileSync(path.resolve('src/config/referral.ts'), 'utf8');

  it('keeps every £ figure out of the always-bundled referral config', () => {
    for (const figure of ['£250', '£100', '£2,000', '£1,000', '£400', 'Earn up to', 'capped at']) {
      expect(config).not.toContain(figure);
    }
  });

  it('gates the £500 headline and reward table behind the build-time constant', () => {
    expect(page).toMatch(/REFERRAL_FIGURES_IN_BUILD\s*=\s*REFERRAL_HEADLINE_MODE === "£500"/);
    expect(page).toMatch(/showMoney\s*=\s*REFERRAL_FIGURES_IN_BUILD &&/);
  });
});
