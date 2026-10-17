import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { WHATSAPP_CONSENT_LABEL } from '@/config/whatsapp';
export function WhatsAppConsent({ checked, onChange, id = 'whatsapp-opt-in', disabled = false }: { checked: boolean; onChange: (value: boolean) => void; id?: string; disabled?: boolean }) {
  return <div className="flex items-start gap-3 py-2"><Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={value => onChange(value === true)} /><Label htmlFor={id} className="text-sm leading-relaxed font-normal">{WHATSAPP_CONSENT_LABEL}</Label></div>;
}
