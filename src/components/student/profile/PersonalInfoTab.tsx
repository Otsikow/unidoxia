import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';
import {
  buildInternationalNumber,
  COUNTRY_PHONE_OPTIONS,
  getDialCodeByCountry,
  isLikelyValidInternational,
  parseInternationalNumber,
  toWhatsAppLink,
} from '@/lib/phone';
import { RESIDENCE_COUNTRIES } from '@/lib/residenceCountries';
import {
  formatResidentialAddress,
  postalCodeRequired,
  stateRegionRequired,
  trimAddress,
  validateResidentialAddress,
  type ResidentialAddress,
  type ResidentialAddressErrors,
} from '@/lib/residentialAddress';
import {
  getAcademicYearOptions,
  getIntakeOptionsForYear,
} from '@/lib/intakeOptions';

// Common study areas/disciplines
const STUDY_AREAS = [
  'Business & Management',
  'Computer Science & IT',
  'Engineering',
  'Medicine & Health Sciences',
  'Law',
  'Arts & Humanities',
  'Social Sciences',
  'Natural Sciences',
  'Education',
  'Architecture & Design',
  'Media & Communications',
  'Agriculture & Environmental Sciences',
  'Hospitality & Tourism',
  'Finance & Accounting',
  'Other'
] as const;

import { STUDY_DESTINATIONS } from '@/lib/studyDestinations';

const PREFERRED_COUNTRIES = STUDY_DESTINATIONS;

interface PersonalInfoTabProps {
  student: Tables<'students'>;
  onUpdate: () => void;
}

type AddressData = { 
  phone?: string; 
  whatsapp?: string;
  line1?: string; 
  line2?: string; 
  city?: string; 
  postal_code?: string; 
  country?: string; 
} | null;

const extractFormData = (student: Tables<'students'>) => {
  const addressData = student.address as AddressData;
  const contactPhoneRaw = student.contact_phone || addressData?.phone || '';
  const whatsappRaw = addressData?.whatsapp || addressData?.phone || student.contact_phone || '';
  const contactPhone = parseInternationalNumber(contactPhoneRaw);
  const whatsappPhone = parseInternationalNumber(whatsappRaw);
  return {
    legal_name: student.legal_name || '',
    preferred_name: student.preferred_name || '',
    date_of_birth: student.date_of_birth || '',
    nationality: student.nationality || '',
    passport_number: student.passport_number || '',
    passport_expiry: student.passport_expiry || '',
    contact_email: student.contact_email || '',
    contact_phone_country_code: contactPhone.dialCode || getDialCodeByCountry(student.current_country),
    contact_phone_local: contactPhone.localNumber,
    whatsapp_country_code: whatsappPhone.dialCode || getDialCodeByCountry(student.current_country),
    whatsapp_local: whatsappPhone.localNumber,
    current_country: student.current_country || '',
    preferred_course: (student as any).preferred_course || '',
    preferred_study_area: (student as any).preferred_study_area || '',
    preferred_country: (student as any).preferred_country || '',
    preferred_intake_year: (student as any).preferred_intake_year || 0,
    preferred_intake_month: (student as any).preferred_intake_month || 0,
    address_line_1: (student as any).address_line_1 || addressData?.line1 || '',
    address_line_2: (student as any).address_line_2 || addressData?.line2 || '',
    city: (student as any).city || addressData?.city || '',
    state_region: (student as any).state_region || '',
    postal_code: (student as any).postal_code || addressData?.postal_code || '',
    country_of_residence:
      (student as any).country_of_residence || addressData?.country || student.current_country || ''
  };
};

export function PersonalInfoTab({ student, onUpdate }: PersonalInfoTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ contactPhone?: string; whatsappNumber?: string }>({});
  const [addressErrors, setAddressErrors] = useState<ResidentialAddressErrors>({});
  
  const [formData, setFormData] = useState(() => extractFormData(student));

  // Sync form data when student prop changes (e.g., after refetch)
  useEffect(() => {
    setFormData(extractFormData(student));
  }, [student]);

  const validateNumbers = useCallback((data: typeof formData) => {
    const validationErrors: { contactPhone?: string; whatsappNumber?: string } = {};

    if (!isLikelyValidInternational(data.contact_phone_country_code, data.contact_phone_local)) {
      validationErrors.contactPhone = 'Enter a valid number without leading zero. Country code is required.';
    }

    if (!isLikelyValidInternational(data.whatsapp_country_code, data.whatsapp_local)) {
      validationErrors.whatsappNumber = 'Enter a valid WhatsApp number without leading zero. Country code is required.';
    }

    return validationErrors;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));

    if (e.target.name.startsWith('contact_phone') || e.target.name.startsWith('whatsapp')) {
      const nextData = {
        ...formData,
        [e.target.name]: e.target.value,
      };
      setErrors(validateNumbers(nextData));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateNumbers(formData);
    if (validationErrors.contactPhone || validationErrors.whatsappNumber) {
      setErrors(validationErrors);
      toast({
        title: 'Invalid phone format',
        description: 'Please correct your phone and WhatsApp numbers before saving.',
        variant: 'destructive',
      });
      return;
    }

    const addressValue: ResidentialAddress = trimAddress({
      address_line_1: formData.address_line_1,
      address_line_2: formData.address_line_2,
      city: formData.city,
      state_region: formData.state_region,
      postal_code: formData.postal_code,
      country_of_residence: formData.country_of_residence,
    });

    const addressValidation = validateResidentialAddress(addressValue);
    setAddressErrors(addressValidation);
    if (Object.keys(addressValidation).length > 0) {
      toast({
        title: 'Residential address incomplete',
        description: 'Please complete the highlighted address fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const fullContactPhone = buildInternationalNumber(formData.contact_phone_country_code, formData.contact_phone_local);
    const fullWhatsappNumber = buildInternationalNumber(formData.whatsapp_country_code, formData.whatsapp_local);

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          legal_name: formData.legal_name,
          preferred_name: formData.preferred_name,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          passport_number: formData.passport_number,
          passport_expiry: formData.passport_expiry,
          contact_email: formData.contact_email,
          contact_phone: fullContactPhone,
          current_country: formData.current_country,
          preferred_course: formData.preferred_course,
          preferred_study_area: formData.preferred_study_area,
          preferred_country: formData.preferred_country,
          preferred_intake_year: formData.preferred_intake_year || null,
          preferred_intake_month: formData.preferred_intake_month || null,
          address_line_1: addressValue.address_line_1 || null,
          address_line_2: addressValue.address_line_2 || null,
          city: addressValue.city || null,
          state_region: addressValue.state_region || null,
          postal_code: addressValue.postal_code || null,
          country_of_residence: addressValue.country_of_residence || null,
          address: {
            line1: addressValue.address_line_1,
            line2: addressValue.address_line_2,
            city: addressValue.city,
            postal_code: addressValue.postal_code,
            country: addressValue.country_of_residence,
            phone: fullContactPhone,
            whatsapp: fullWhatsappNumber || null
          }
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      // Immediately update the form with the saved data
      if (data) {
        setFormData(extractFormData(data));
      }

      // Invalidate and refetch the student record query to update all consumers
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });

      toast({
        title: 'Success',
        description: 'Personal information updated successfully'
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast({
        title: 'Error',
        description: 'Failed to update personal information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your legal name and identification details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name (as on passport) *</Label>
              <Input
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input
                id="preferred_name"
                name="preferred_name"
                value={formData.preferred_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality *</Label>
              <Input
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passport_number">Passport Number *</Label>
              <Input
                id="passport_number"
                name="passport_number"
                value={formData.passport_number}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passport_expiry">Passport Expiry *</Label>
              <Input
                id="passport_expiry"
                name="passport_expiry"
                type="date"
                value={formData.passport_expiry}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How we can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email *</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2">
                <Select
                  value={formData.contact_phone_country_code}
                  onValueChange={(value) => {
                    const nextData = { ...formData, contact_phone_country_code: value };
                    setFormData(nextData);
                    setErrors(validateNumbers(nextData));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country code" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_PHONE_OPTIONS.map((option) => (
                      <SelectItem key={`${option.country}-${option.dialCode}`} value={option.dialCode}>
                        {option.flag} {option.country} ({option.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="contact_phone"
                  name="contact_phone_local"
                  type="tel"
                  value={formData.contact_phone_local}
                  onChange={handleChange}
                  placeholder="7360961803"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your number without the leading zero. Country code will be added automatically.
              </p>
              {errors.contactPhone && <p className="text-xs text-destructive">{errors.contactPhone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2">
                <Select
                  value={formData.whatsapp_country_code}
                  onValueChange={(value) => {
                    const nextData = { ...formData, whatsapp_country_code: value };
                    setFormData(nextData);
                    setErrors(validateNumbers(nextData));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country code" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_PHONE_OPTIONS.map((option) => (
                      <SelectItem key={`whatsapp-${option.country}-${option.dialCode}`} value={option.dialCode}>
                        {option.flag} {option.country} ({option.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="whatsapp_number"
                  name="whatsapp_local"
                  type="tel"
                  value={formData.whatsapp_local}
                  onChange={handleChange}
                  placeholder="7360961803"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your number without the leading zero. Country code will be added automatically.
              </p>
              {errors.whatsappNumber && <p className="text-xs text-destructive">{errors.whatsappNumber}</p>}
              {isLikelyValidInternational(formData.whatsapp_country_code, formData.whatsapp_local) && (
                <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
                  <a
                    href={toWhatsAppLink(buildInternationalNumber(formData.whatsapp_country_code, formData.whatsapp_local))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Message on WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_country">Current Country of Residence *</Label>
            <Input
              id="current_country"
              name="current_country"
              value={formData.current_country}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Residential Address</h3>
              <p className="text-xs text-muted-foreground">
                Your current residential address. This may be used to support your university
                applications.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_of_residence">Country of Residence *</Label>
              <Select
                value={formData.country_of_residence || undefined}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, country_of_residence: value }));
                  setAddressErrors((prev) => ({ ...prev, country_of_residence: undefined }));
                }}
              >
                <SelectTrigger id="country_of_residence">
                  <SelectValue placeholder="Select your country of residence" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {RESIDENCE_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addressErrors.country_of_residence && (
                <p className="text-xs text-destructive">{addressErrors.country_of_residence}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_1">Address Line 1 *</Label>
              <Input
                id="address_line_1"
                name="address_line_1"
                value={formData.address_line_1}
                onChange={handleChange}
                placeholder="House number and street"
              />
              {addressErrors.address_line_1 && (
                <p className="text-xs text-destructive">{addressErrors.address_line_1}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address Line 2 (optional)</Label>
              <Input
                id="address_line_2"
                name="address_line_2"
                value={formData.address_line_2}
                onChange={handleChange}
                placeholder="Apartment, suite, district"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City / Town *</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                {addressErrors.city && (
                  <p className="text-xs text-destructive">{addressErrors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state_region">
                  State / Region{stateRegionRequired(formData.country_of_residence) ? ' *' : ''}
                </Label>
                <Input
                  id="state_region"
                  name="state_region"
                  value={formData.state_region}
                  onChange={handleChange}
                />
                {addressErrors.state_region && (
                  <p className="text-xs text-destructive">{addressErrors.state_region}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">
                  Postal / ZIP Code{postalCodeRequired(formData.country_of_residence) ? ' *' : ''}
                </Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                />
                {addressErrors.postal_code && (
                  <p className="text-xs text-destructive">{addressErrors.postal_code}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Study Preferences</CardTitle>
          <CardDescription>
            Tell us about your study goals so we can better support your journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_course">Preferred Course</Label>
              <Input
                id="preferred_course"
                name="preferred_course"
                value={formData.preferred_course}
                onChange={handleChange}
                placeholder="e.g., MBA, Computer Science, Nursing"
              />
              <p className="text-xs text-muted-foreground">
                The specific program or degree you want to pursue
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_study_area">Preferred Study Area</Label>
              <Select
                value={formData.preferred_study_area}
                onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_study_area: value }))}
              >
                <SelectTrigger id="preferred_study_area">
                  <SelectValue placeholder="Select a study area" />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The broader field or discipline
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_country">Preferred Country</Label>
            <Select
              value={formData.preferred_country}
              onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_country: value }))}
            >
              <SelectTrigger id="preferred_country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred destination for studying abroad
            </p>
          </div>

          {/* Preferred Intake Year & Month */}
          {(() => {
            const academicYears = getAcademicYearOptions();
            const selectedYear =
              academicYears.find((y) => y.startYear === formData.preferred_intake_year)?.startYear ||
              formData.preferred_intake_year ||
              0;
            const intakeOptions = selectedYear ? getIntakeOptionsForYear(selectedYear) : [];
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_intake_year">Preferred Academic Year</Label>
                  <Select
                    value={formData.preferred_intake_year ? String(formData.preferred_intake_year) : ''}
                    onValueChange={(value) => {
                      const year = parseInt(value, 10);
                      const opts = getIntakeOptionsForYear(year);
                      const stillValid = opts.some((o) => o.month === formData.preferred_intake_month);
                      const month = stillValid ? formData.preferred_intake_month : opts[0]?.month ?? 0;
                      setFormData((prev) => ({
                        ...prev,
                        preferred_intake_year: year,
                        preferred_intake_month: month,
                      }));
                    }}
                  >
                    <SelectTrigger id="preferred_intake_year">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((y) => (
                        <SelectItem key={y.startYear} value={String(y.startYear)}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The academic year you plan to begin your studies
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_intake_month">Preferred Intake</Label>
                  <Select
                    value={formData.preferred_intake_month ? String(formData.preferred_intake_month) : ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, preferred_intake_month: parseInt(value, 10) }))
                    }
                    disabled={!selectedYear}
                  >
                    <SelectTrigger id="preferred_intake_month">
                      <SelectValue placeholder={selectedYear ? 'Select intake month' : 'Select academic year first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {intakeOptions.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          No upcoming intakes
                        </div>
                      ) : (
                        intakeOptions.map((opt) => (
                          <SelectItem key={opt.month} value={String(opt.month)}>
                            {opt.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Your preferred intake start date
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full hover-scale">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Personal Information
      </Button>
    </form>
  );
}
