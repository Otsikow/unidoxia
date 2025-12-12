import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Plus, Trash2, Calendar, Globe, Building } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { EDUCATION_LEVEL_OPTIONS, normalizeEducationLevel } from '@/lib/education';

interface EducationRecord {
  id: string;
  level: string;
  institutionName: string;
  country: string;
  startDate: string;
  endDate: string;
  gpa: string;
  gradeScale: string;
}

interface EducationHistoryStepProps {
  data: EducationRecord[];
  onChange: (data: EducationRecord[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const GRADE_SCALES = ['4.0', '5.0', '10.0', '100', 'Percentage', 'Other'];

export default function EducationHistoryStep({
  data,
  onChange,
  onNext,
  onBack,
}: EducationHistoryStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addEducationRecord = () => {
    const newRecord: EducationRecord = {
      id: uuidv4(),
      level: '',
      institutionName: '',
      country: '',
      startDate: '',
      endDate: '',
      gpa: '',
      gradeScale: '4.0',
    };
    onChange([...data, newRecord]);
    setEditingId(newRecord.id);
  };

  const updateRecord = (id: string, field: keyof EducationRecord, value: string) => {
    const updated = data.map((record) =>
      record.id === id
        ? {
            ...record,
            [field]: field === 'level' ? normalizeEducationLevel(value) : value,
          }
        : record
    );
    onChange(updated);
  };

  const deleteRecord = (id: string) => {
    const filtered = data.filter((record) => record.id !== id);
    onChange(filtered);
  };

  const isRecordValid = (record: EducationRecord) => {
    return (
      record.level !== '' &&
      record.institutionName.trim() !== '' &&
      record.country.trim() !== '' &&
      record.startDate !== ''
    );
  };

  const isValid = () => {
    return data.length > 0 && data.every(isRecordValid);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education History
          </CardTitle>
          <CardDescription>
            Add your educational background. Include at least your most recent qualification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No education records added yet</p>
              <Button onClick={addEducationRecord} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Education Record
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((record, index) => (
                <Card key={record.id} className="border-2">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        Education Record {index + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRecord(record.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Education Level */}
                    <div className="space-y-2">
                      <Label htmlFor={`level-${record.id}`} className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education Level *
                      </Label>
                      <Select
                        value={record.level}
                        onValueChange={(value) => updateRecord(record.id, 'level', value)}
                      >
                        <SelectTrigger id={`level-${record.id}`}>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Institution Name & Country */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`institution-${record.id}`} className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Institution Name *
                        </Label>
                        <Input
                          id={`institution-${record.id}`}
                          value={record.institutionName}
                          onChange={(e) =>
                            updateRecord(record.id, 'institutionName', e.target.value)
                          }
                          placeholder="University name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`country-${record.id}`} className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Country *
                        </Label>
                        <Input
                          id={`country-${record.id}`}
                          value={record.country}
                          onChange={(e) => updateRecord(record.id, 'country', e.target.value)}
                          placeholder="e.g., United States"
                        />
                      </div>
                    </div>

                    {/* Start Date & End Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`startDate-${record.id}`} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Start Date *
                        </Label>
                        <Input
                          id={`startDate-${record.id}`}
                          type="date"
                          value={record.startDate}
                          onChange={(e) => updateRecord(record.id, 'startDate', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`endDate-${record.id}`} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          End Date
                        </Label>
                        <Input
                          id={`endDate-${record.id}`}
                          type="date"
                          value={record.endDate}
                          onChange={(e) => updateRecord(record.id, 'endDate', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Leave blank if currently enrolled</p>
                      </div>
                    </div>

                    {/* GPA & Grade Scale */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`gpa-${record.id}`}>GPA / Grade</Label>
                        <Input
                          id={`gpa-${record.id}`}
                          value={record.gpa}
                          onChange={(e) => updateRecord(record.id, 'gpa', e.target.value)}
                          placeholder="e.g., 3.5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`gradeScale-${record.id}`}>Grade Scale</Label>
                        <Select
                          value={record.gradeScale}
                          onValueChange={(value) => updateRecord(record.id, 'gradeScale', value)}
                        >
                          <SelectTrigger id={`gradeScale-${record.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_SCALES.map((scale) => (
                              <SelectItem key={scale} value={scale}>
                                {scale}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addEducationRecord} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Education Record
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNext} disabled={!isValid()}>
              Continue to Course Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
