import { UKDateInput } from '@/components/ui/uk-date-input';
import { applicationDateBounds } from '@/lib/applicationDates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import type { ApplicationFormData } from '@/types/application';

type PersonalInfo = ApplicationFormData['personalInfo'];

export default function AdditionalPersonalDetails({ data, onChange }: {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}) {
  const update = (field: keyof PersonalInfo, value: string | boolean) => onChange({ ...data, [field]: value });
  const textField = (field: keyof PersonalInfo, label: string, type = 'text') => (
    <div className="space-y-2" key={field}>
      <Label htmlFor={field}>{label} *</Label>
      <Input id={field} type={type} value={String(data[field] ?? '')} required onChange={(event) => update(field, event.target.value)} />
    </div>
  );
  const selectField = (field: keyof PersonalInfo, label: string, options: readonly string[]) => (
    <div className="space-y-2" key={field}>
      <Label htmlFor={field}>{label} *</Label>
      <Select value={String(data[field] || '')} onValueChange={(value) => update(field, value)}>
        <SelectTrigger id={field}><SelectValue placeholder="Select an option" /></SelectTrigger>
        <SelectContent>{options.map((value) => <SelectItem key={value} value={value}>{value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {selectField('gender', 'Gender', ['Female', 'Male', 'Other', 'Prefer not to say'])}
        {selectField('maritalStatus', 'Marital status', ['Single', 'Married', 'Civil partnership', 'Divorced', 'Separated', 'Widowed'])}
        {textField('cityOfBirth', 'City of birth')}
        {selectField('countryOfBirth', 'Country of birth', COUNTRIES)}
        <div className="space-y-2">
          <Label htmlFor="passportIssueDate">Passport issue date *</Label>
          <UKDateInput id="passportIssueDate" value={data.passportIssueDate} bounds={applicationDateBounds().passportIssue} required onValueChange={(value) => update('passportIssueDate', value)} />
        </div>
        {textField('passportPlaceOfIssue', 'Passport place of issue')}
        {textField('mailingPostcode', 'Mailing address postcode')}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sameAsMailingAddress" checked={data.sameAsMailingAddress} onCheckedChange={(checked) => update('sameAsMailingAddress', checked === true)} />
        <Label htmlFor="sameAsMailingAddress">Permanent address is the same as mailing address</Label>
      </div>
      {!data.sameAsMailingAddress && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {textField('permanentAddress', 'Permanent address')}
        {textField('permanentPostcode', 'Permanent address postcode')}
      </div>}
      {([
        ['otherCitizenship', 'Do you hold any other citizenship?', 'otherCitizenshipCountry', 'Other country of citizenship'],
        ['previousStudyAbroad', 'Have you previously studied abroad?', 'previousStudyAbroadDetails', 'Previous study abroad details'],
        ['previousResidenceAbroad', 'Have you previously lived abroad?', 'previousResidenceAbroadDetails', 'Previous residence abroad details'],
        ['visaRefusals', 'Have you ever been refused a visa for any country?', 'visaRefusalsDetails', 'Visa refusal details'],
      ] as const).map(([answer, label, detail, detailLabel]) => <div className="space-y-2" key={answer}>
        {selectField(answer, label, ['yes', 'no'])}
        {data[answer] === 'yes' && (answer === 'otherCitizenship'
          ? selectField(detail, detailLabel, COUNTRIES)
          : textField(detail, detailLabel))}
      </div>)}
    </div>
  );
}
