import {supabase} from '@/integrations/supabase/client';
import type {StudentPlanType} from '@/types/billing';

export const CHECKOUT_UNAVAILABLE = 'Secure payment could not be started. Your plan has not changed. Please try again or contact payments@unidoxia.com.';

/** A checkout handoff is not a payment receipt or an entitlement activation. */
export async function startStudentCheckout(planId:StudentPlanType, origin:string, cancelPath:string):Promise<string> {
  if(planId!=='agent_supported')throw new Error('This plan is not available for purchase.');
  const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
  if(sessionError||!sessionData.session?.access_token)throw new Error('Sign in before starting a payment.');
  const {data,error}=await supabase.functions.invoke('create-checkout-session',{
    body:{planCode:planId,successUrl:`${origin}/student/dashboard?payment=success`,cancelUrl:`${origin}${cancelPath}`},
    headers:{Authorization:`Bearer ${sessionData.session.access_token}`},
  });
  if(error||data?.demo||typeof data?.url!=='string')throw new Error(CHECKOUT_UNAVAILABLE);
  let url:URL;
  try{url=new URL(data.url);}catch{throw new Error(CHECKOUT_UNAVAILABLE);}
  // This integration uses Stripe-hosted Checkout, not a custom payment domain.
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.port||url.username||url.password)throw new Error(CHECKOUT_UNAVAILABLE);
  return url.href;
}
