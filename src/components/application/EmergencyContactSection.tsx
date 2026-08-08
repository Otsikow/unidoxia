import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { LifeBuoy, User, Users, Phone, Mail, Globe } from 'lucide-react';
import type { EmergencyContact } from '@/types/application';

export const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Guardian',
  'Spouse',
  'Sibling',
  'Child',
  'Other relative',
  'Friend',
  'Employer',
  'Other',
];

export function isEmergencyContactComplete(contact: EmergencyContact): boolean {
  const phone = contact.phone.trim();
  return (
    contact.fullName.trim().length > 1 &&
    contact.relationship.trim() !== '' &&
    phone.startsWith('+') &&
    phone.replace(/\D/g, '').length >= 8 &&
    contact.country.trim() !== ''
  );
}

interface EmergencyContactSectionProps {
  data: EmergencyContact;
  onChange: (data: EmergencyContact) => void;
}

export default function EmergencyContactSection({ data, onChange }: EmergencyContactSectionProps) {
  const handleChange = (field: keyof EmergencyContact, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const emailInvalid = data.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const phoneInvalid = data.phone.trim().length > 1 && !isEmergencyContactComplete({ ...data, fullName: 'x', relationship: 'x', country: 'x' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LifeBuoy className="h-5 w-5" />
          Emergency Contact
        </CardTitle>
        <CardDescription>
          Someone we can contact on your behalf if we cannot reach you. This is kept private and is
          only visible to you and authorised UniDoxia staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ecName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name *
            </Label>
            <Input
              id="ecName"
              value={data.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Full name of your emergency contact"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ecRelationship" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Relationship to You *
            </Label>
            <Select
              value={data.relationship || undefined}
              onValueChange={(value) => handleChange('relationship', value)}
            >
              <SelectTrigger id="ecRelationship" className="w-full">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ecPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number (with country code) *
            </Label>
            <Input
              id="ecPhone"
              type="tel"
              value={data.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+233 501 234 567"
              inputMode="tel"
            />
            {phoneInvalid && (
              <p className="text-xs text-destructive">
                Include the country code, e.g. +44 7700 900123.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ecEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address (if available)
            </Label>
            <Input
              id="ecEmail"
              type="email"
              value={data.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@example.com"
            />
            {emailInvalid && (
              <p className="text-xs text-destructive">Enter a valid email address.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ecCountry" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Country of Residence *
          </Label>
          <Select
            value={data.country || undefined}
            onValueChange={(value) => handleChange('country', value)}
          >
            <SelectTrigger id="ecCountry" className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
