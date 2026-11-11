-- Minimal tables for the internal CourseFinder function, only on a disposable database.
CREATE TABLE public.students (
  id uuid PRIMARY KEY,
  secondary_board text,
  secondary_qualification text,
  secondary_school_country text,
  country_of_education text,
  waec_scratch_card_pin text,
  waec_scratch_card_serial text,
  work_experience jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.education_records (
  student_id uuid NOT NULL,
  level text,
  start_date date,
  end_date date
);
