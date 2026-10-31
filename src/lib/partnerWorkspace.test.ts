import {describe,it,expect,vi} from 'vitest';
import {ensurePartnerWorkspace} from './partnerWorkspace';
const profile={id:'owner',role:'partner',tenant_id:'shared',active:true};
const deps=()=>({ensure:vi.fn().mockResolvedValue({tenantId:'private',error:false}),reload:vi.fn().mockResolvedValue({...profile,tenant_id:'private'})});
describe('safe partner workspace preparation',()=>{
 it('reloads the exact server-assigned profile before allowing the workspace',async()=>{const service=deps();const result=await ensurePartnerWorkspace(profile,service);expect(service.ensure).toHaveBeenCalledWith('owner');expect(service.reload).toHaveBeenCalledWith('owner');expect(result).toMatchObject({id:'owner',tenant_id:'private',_isolationFailed:false});});
 it.each([{role:'student',active:true},{role:'admin',active:true},{role:'partner',active:false},{role:'partner',active:null}])('does not provision unrelated or inactive accounts: %j',async values=>{const service=deps(),input={...profile,...values};expect(await ensurePartnerWorkspace(input,service)).toBe(input);expect(service.ensure).not.toHaveBeenCalled();});
 it.each([null,{...profile,id:'other',tenant_id:'private'},{...profile,tenant_id:'different'},{...profile,tenant_id:'private',active:false}])('blocks missing, mismatched or inactive read-back: %j',async refreshed=>{const service=deps();service.reload.mockResolvedValue(refreshed);expect(await ensurePartnerWorkspace(profile,service)).toMatchObject({tenant_id:'shared',_isolationFailed:true});});
 it('blocks missing deployment without falling back to browser writes',async()=>{const service=deps();service.ensure.mockResolvedValue({tenantId:null,error:true});expect(await ensurePartnerWorkspace(profile,service)).toMatchObject({_isolationFailed:true});expect(service.reload).not.toHaveBeenCalled();});
 it('blocks network errors without opening the shared workspace',async()=>{const service=deps();service.ensure.mockRejectedValue(new Error('network'));expect(await ensurePartnerWorkspace(profile,service)).toMatchObject({_isolationFailed:true});});
});
