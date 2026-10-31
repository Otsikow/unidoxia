import {describe,it,expect} from 'vitest';
import {PRICING_PLANS,PRICING_FAQ,getPlanById,getApplicationLimit,getPlanDisplayName} from './billing';
describe('retired self-service offer',()=>{
  it('offers only Free and Agent-Supported and rejects an old checkout link',()=>{
    expect(PRICING_PLANS.map(p=>p.id)).toEqual(['free','agent_supported']);
    expect(getPlanById('self_service')).toBeUndefined();
    expect(JSON.stringify(PRICING_FAQ)).not.toMatch(/Self-Service|\$49/);
    expect(getPlanById('agent_supported')?.price).toBe(20000);
  });
  it('keeps previously purchased self-service application access',()=>{
    expect(getApplicationLimit('self_service')).toBeNull();
    expect(getPlanDisplayName('self_service')).toContain('Legacy Self-Service');
    expect(getApplicationLimit('free')).toBe(1);
  });
});
