export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor Degree' },
  { value: 'master', label: 'Master Degree' },
  { value: 'doctorate', label: 'Doctorate/PhD' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Certificate' },
];

const EDUCATION_LEVEL_SYNONYMS: Record<string, string> = {
  bachelors: 'bachelor',
  'bachelor degree': 'bachelor',
  'bachelor degrees': 'bachelor',
  undergraduate: 'bachelor',
  masters: 'master',
  "master's": 'master',
  "master's degree": 'master',
  'master degree': 'master',
  postgraduate: 'master',
  phd: 'doctorate',
  'ph.d.': 'doctorate',
  'doctorate/phd': 'doctorate',
  'highschool': 'high_school',
  'high school': 'high_school',
  'associate degree': 'associate',
};

export const normalizeEducationLevel = (rawLevel: string): string => {
  const normalized = rawLevel.trim().toLowerCase();

  const byValue = EDUCATION_LEVEL_OPTIONS.find(
    (option) => option.value === normalized,
  );
  if (byValue) return byValue.value;

  const byLabel = EDUCATION_LEVEL_OPTIONS.find(
    (option) => option.label.toLowerCase() === normalized,
  );
  if (byLabel) return byLabel.value;

  const synonym = EDUCATION_LEVEL_SYNONYMS[normalized];
  if (synonym) return synonym;

  return rawLevel;
};

export const getEducationLevelLabel = (value: string): string =>
  EDUCATION_LEVEL_OPTIONS.find((option) => option.value === value)?.label || value;

