// Build guard for /refer (Akosua QC N7). Runs as the npm prebuild step, so `npm run build` fails when:
// - the money-figure mode is not 'no-figure' (Kojo v2.3 section I: no £ figure until Kojo and Eric clear a
//   named list of courses with signed commission rates), or
// - REFERRAL_LIVE_READY is true while a draft setting is still on or a "[...]" placeholder is left in
//   src/pages/Refer.tsx.
// It reads VITE_REFERRAL_HEADLINE_MODE the same way vite.config.ts does (shell env first, then .env files).
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const mode = process.env.REFERRAL_BUILD_MODE || 'production';
const fileEnv = loadEnv(mode, process.cwd(), 'VITE_REFERRAL_');
if (process.env.VITE_REFERRAL_HEADLINE_MODE === undefined && fileEnv.VITE_REFERRAL_HEADLINE_MODE !== undefined) {
  process.env.VITE_REFERRAL_HEADLINE_MODE = fileEnv.VITE_REFERRAL_HEADLINE_MODE;
}

const { REFERRAL_GO_LIVE_CONFIG, getReferralGoLiveProblems } = await import('../src/config/referral.ts');

export const findPlaceholders = source =>
  [...source.matchAll(/<ForEric>\s*(\[[^\]]*\])/g)].map(match => match[1].replace(/\s+/g, ' '));

const problems = [...getReferralGoLiveProblems()];
const requested = process.env.VITE_REFERRAL_HEADLINE_MODE;
if (requested !== undefined && requested !== 'no-figure' && REFERRAL_GO_LIVE_CONFIG.headlineMode === 'no-figure') {
  problems.push(`VITE_REFERRAL_HEADLINE_MODE "${requested}" is not a known mode; use 'no-figure'`);
}
if (REFERRAL_GO_LIVE_CONFIG.liveReady) {
  const placeholders = findPlaceholders(fs.readFileSync(path.resolve('src/pages/Refer.tsx'), 'utf8'));
  if (placeholders.length) problems.push(`Refer.tsx still has ${placeholders.length} "[...]" placeholders, e.g. ${placeholders[0].slice(0, 80)}...`);
}

if (problems.length) {
  console.error(`[referral guard] build blocked:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`[referral guard] ok: headline mode '${REFERRAL_GO_LIVE_CONFIG.headlineMode}', live ready ${REFERRAL_GO_LIVE_CONFIG.liveReady}`);
