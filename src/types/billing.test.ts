import {describe,it,expect} from 'vitest';
import {PRICING_PLANS,PRICING_FAQ,getPlanById,getApplicationLimit,getPlanDisplayName} from './billing';
describe('retired self-service offer',()=>{
  it('offers only Free and Agent-Supported and rejects an old checkout link',()=>{
    expect(PRICING_PLANS.map(p=>p.id)).toEqual(['free','agent_supported']);
    expect(getPlanById('self_service')).toBeUndefined();
    expect(JSON.stringify(PRICING_FAQ)).not.toMatch(/Self-Service|\$49/);
    expect(getPlanById('agent_supported')?.price).toBe(20000);
  });
  it('does not advertise visa help on the Agent-Supported plan',()=>{
    const plan=getPlanById('agent_supported');
    expect(plan?.description).toBe('Full guidance from choosing a course to accepting your offer');
    expect(plan?.features).toContain('Review of your university application documents');
    expect(plan?.features).toContain('Personalised university application guidance');
    expect(plan?.features).not.toContain('Links to official visa information (GOV.UK and university pages)');
    expect(plan?.featureNote).toBe('Visa and immigration advice is not included. We link to official visa information, which is free for everyone.');
    const blob=JSON.stringify(plan);
    expect(blob).not.toMatch(/Full guidance from application to visa/);
    expect(blob).not.toMatch(/Visa preparation assistance/);
    expect(blob).not.toMatch(/comprehensive visa support/i);
    expect(blob).not.toMatch(/95% visa success/i);
    expect(plan?.features.join(' ')).not.toMatch(/Document review and verification|Personalized application guidance/);
  });

  it('keeps previously purchased self-service application access',()=>{
    expect(getApplicationLimit('self_service')).toBeNull();
    expect(getPlanDisplayName('self_service')).toContain('Legacy Self-Service');
    expect(getApplicationLimit('free')).toBe(1);
  });
});
