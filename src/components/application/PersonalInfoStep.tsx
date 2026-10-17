import { UKDateInput } from '@/components/ui/uk-date-input';
import { applicationDateBounds } from '@/lib/applicationDates';
import AdditionalPersonalDetails from './AdditionalPersonalDetails';
import { applicationPersonalInfoSchema, emergencyContactSchema } from '@/lib/applicationValidation';
import type { ApplicationFormData } from '@/types/application';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { User, Mail, Phone, Calendar, Globe, CreditCard, MapPin, MessageCircle } from 'lucide-react';
import EmergencyContactSection from '@/components/application/EmergencyContactSection';
import type { EmergencyContact } from '@/types/application';

type PersonalInfo = ApplicationFormData['personalInfo'];

interface PersonalInfoStepProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
  emergencyContact: EmergencyContact;
  onEmergencyContactChange: (data: EmergencyContact) => void;
  onNext: () => void;
}

export default function PersonalInfoStep({
  data,
  onChange,
  emergencyContact,
  onEmergencyContactChange,
  onNext,
}: PersonalInfoStepProps) {
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const isValid = () => applicationPersonalInfoSchema.safeParse(data).success && emergencyContactSchema.safeParse(emergencyContact).success;

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Your personal details have been pre-filled from your profile. Please review and update if
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Full name *
          </Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Enter your full legal name"
            required
          />
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 234 567 8900"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp Number (with country code) *
          </Label>
          <Input
            id="whatsappNumber"
            type="tel"
            value={data.whatsappNumber}
            onChange={(e) => handleChange('whatsappNumber', e.target.value)}
            placeholder="+233 501 234 567"
            required
          />
        </div>

        {/* Date of birth */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date of birth *
          </Label>
          <UKDateInput
            id="dateOfBirth"
            bounds={applicationDateBounds().birth}
            value={data.dateOfBirth}
            onValueChange={(value) => handleChange('dateOfBirth', value)}
            required
          />
        </div>

        {/* Nationality & Current country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nationality" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Nationality *
            </Label>
            <Select
              value={data.nationality || undefined}
              onValueChange={(value) => handleChange('nationality', value)}
            >
              <SelectTrigger id="nationality" className="w-full">
                <SelectValue placeholder="Select your nationality" />
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

          <div className="space-y-2">
            <Label htmlFor="currentCountry" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current country *
            </Label>
            <Input
              id="currentCountry"
              value={data.currentCountry}
              onChange={(e) => handleChange('currentCountry', e.target.value)}
              placeholder="e.g., Canada"
              required
            />
          </div>
        </div>

        {/* Passport number */}
        <div className="space-y-2">
          <Label htmlFor="passportNumber" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Passport number
          </Label>
          <Input
            id="passportNumber"
            value={data.passportNumber}
            onChange={(e) => handleChange('passportNumber', e.target.value)}
            placeholder="Enter your passport number"
          />
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="homeAddress" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Home Address
            </Label>
            <Input
              id="homeAddress"
              value={data.homeAddress}
              onChange={(e) => handleChange('homeAddress', e.target.value)}
              placeholder="Street address, City, State/Province"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="correspondentAddress" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Mailing address *
            </Label>
            <Input
              id="correspondentAddress"
              value={data.correspondentAddress}
              onChange={(e) => handleChange('correspondentAddress', e.target.value)}
              required
              placeholder="Address for letters and official communication"
            />
          </div>
        </div>

        <AdditionalPersonalDetails data={data} onChange={onChange} />
      </CardContent>
    </Card>

    <EmergencyContactSection data={emergencyContact} onChange={onEmergencyContactChange} />

    <div className="flex justify-end">
      <Button onClick={onNext} disabled={!isValid()} size="lg" className="w-full sm:w-auto">
        Continue to Education History
      </Button>
    </div>
    </div>
  );
}
