-- Migration: Populate real university and course data
-- This migration removes placeholder/fake universities and adds comprehensive real university data

-- First, remove any obviously fake or placeholder universities (with mismatched city/country data)
-- This includes universities like "InHistTime University" which has Toronto listed in United Kingdom
DELETE FROM public.universities 
WHERE 
  -- Remove universities with obviously fake names
  name ILIKE '%inhist%' OR
  name ILIKE '%placeholder%' OR
  name ILIKE '%test university%' OR
  name ILIKE '%sample university%' OR
  name ILIKE '%demo university%' OR
  -- Remove universities with mismatched locations (Toronto is not in UK)
  (city = 'Toronto' AND country = 'United Kingdom') OR
  -- Remove universities with empty or null essential fields
  (name IS NULL OR name = '');

-- ============================================================================
-- UNITED KINGDOM UNIVERSITIES
-- ============================================================================

INSERT INTO public.universities (
  id, tenant_id, name, country, city, logo_url, website, description, ranking, active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Imperial College London',
    'United Kingdom',
    'London',
    NULL,
    'https://www.imperial.ac.uk',
    'Imperial College London is a world-renowned science-based university in central London. Known for its focus on science, engineering, medicine, and business, Imperial is consistently ranked among the top universities globally.',
    '{"world_rank": 6, "uk_rank": 3}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University College London',
    'United Kingdom',
    'London',
    NULL,
    'https://www.ucl.ac.uk',
    'UCL is one of the world''s leading multidisciplinary universities, with a diverse global community and a commitment to challenging conventional thinking.',
    '{"world_rank": 9, "uk_rank": 4}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Edinburgh',
    'United Kingdom',
    'Edinburgh',
    NULL,
    'https://www.ed.ac.uk',
    'Founded in 1582, the University of Edinburgh is Scotland''s leading research university and is consistently ranked among the world''s top universities.',
    '{"world_rank": 15, "uk_rank": 5}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'London School of Economics and Political Science',
    'United Kingdom',
    'London',
    NULL,
    'https://www.lse.ac.uk',
    'LSE is the world''s foremost social science university, renowned for its research and teaching across the full range of social, political and economic sciences.',
    '{"world_rank": 45, "uk_rank": 8}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Manchester',
    'United Kingdom',
    'Manchester',
    NULL,
    'https://www.manchester.ac.uk',
    'The University of Manchester is a leading global research university and a member of the prestigious Russell Group. It has produced 25 Nobel Prize winners.',
    '{"world_rank": 28, "uk_rank": 6}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'King''s College London',
    'United Kingdom',
    'London',
    NULL,
    'https://www.kcl.ac.uk',
    'King''s College London is one of England''s oldest universities, founded in 1829 by King George IV. It is a research-led university with an outstanding reputation for teaching.',
    '{"world_rank": 37, "uk_rank": 7}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Bristol',
    'United Kingdom',
    'Bristol',
    NULL,
    'https://www.bristol.ac.uk',
    'The University of Bristol is a red brick research university with a global reputation for excellence in research and teaching across all disciplines.',
    '{"world_rank": 62, "uk_rank": 12}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Warwick',
    'United Kingdom',
    'Coventry',
    NULL,
    'https://warwick.ac.uk',
    'The University of Warwick is a world-leading university with the highest academic and research standards. It is one of the UK''s best universities.',
    '{"world_rank": 67, "uk_rank": 10}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CANADA UNIVERSITIES  
-- ============================================================================

INSERT INTO public.universities (
  id, tenant_id, name, country, city, logo_url, website, description, ranking, active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Toronto',
    'Canada',
    'Toronto',
    NULL,
    'https://www.utoronto.ca',
    'The University of Toronto is Canada''s leading institution of learning, discovery and knowledge creation. It is consistently ranked among the top 25 universities globally.',
    '{"world_rank": 21, "canada_rank": 1}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'McGill University',
    'Canada',
    'Montreal',
    NULL,
    'https://www.mcgill.ca',
    'McGill University is one of Canada''s best-known institutions of higher learning and one of the leading universities in the world. Located in Montreal, it attracts students from over 150 countries.',
    '{"world_rank": 30, "canada_rank": 2}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of British Columbia',
    'Canada',
    'Vancouver',
    NULL,
    'https://www.ubc.ca',
    'UBC is a global centre for research and teaching, consistently ranked among the top 40 universities in the world. Its campuses in Vancouver and Kelowna offer stunning natural environments.',
    '{"world_rank": 34, "canada_rank": 3}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Alberta',
    'Canada',
    'Edmonton',
    NULL,
    'https://www.ualberta.ca',
    'The University of Alberta is one of Canada''s largest and most prestigious universities, known for its research strength and comprehensive programs across all disciplines.',
    '{"world_rank": 111, "canada_rank": 5}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Waterloo',
    'Canada',
    'Waterloo',
    NULL,
    'https://uwaterloo.ca',
    'The University of Waterloo is a public research university with a main campus in Waterloo, Ontario. It is known for its cooperative education program and engineering excellence.',
    '{"world_rank": 112, "canada_rank": 6}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Western University',
    'Canada',
    'London',
    NULL,
    'https://www.uwo.ca',
    'Western University is a public research university in London, Ontario. It is a member of the U15, a group of research-intensive universities in Canada.',
    '{"world_rank": 114, "canada_rank": 7}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AUSTRALIA UNIVERSITIES
-- ============================================================================

INSERT INTO public.universities (
  id, tenant_id, name, country, city, logo_url, website, description, ranking, active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Melbourne',
    'Australia',
    'Melbourne',
    NULL,
    'https://www.unimelb.edu.au',
    'The University of Melbourne is Australia''s leading university and one of the world''s finest. It is renowned for its excellence in research, learning and teaching.',
    '{"world_rank": 14, "australia_rank": 1}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Sydney',
    'Australia',
    'Sydney',
    NULL,
    'https://www.sydney.edu.au',
    'Founded in 1850, the University of Sydney is Australia''s first university and is consistently ranked among the top 20 universities globally.',
    '{"world_rank": 18, "australia_rank": 2}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Australian National University',
    'Australia',
    'Canberra',
    NULL,
    'https://www.anu.edu.au',
    'ANU is Australia''s national university and is ranked among the world''s best. Located in Canberra, it offers unique opportunities for policy engagement.',
    '{"world_rank": 30, "australia_rank": 3}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of Queensland',
    'Australia',
    'Brisbane',
    NULL,
    'https://www.uq.edu.au',
    'The University of Queensland is one of Australia''s leading research and teaching institutions. It is a member of the prestigious Group of Eight.',
    '{"world_rank": 43, "australia_rank": 4}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Monash University',
    'Australia',
    'Melbourne',
    NULL,
    'https://www.monash.edu',
    'Monash University is Australia''s largest university and is ranked among the world''s top 60. It has campuses in Australia and internationally.',
    '{"world_rank": 42, "australia_rank": 5}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University of New South Wales',
    'Australia',
    'Sydney',
    NULL,
    'https://www.unsw.edu.au',
    'UNSW Sydney is a global university with a focus on research excellence and innovation. It is ranked among the world''s top 50 universities.',
    '{"world_rank": 19, "australia_rank": 3}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GERMANY UNIVERSITIES
-- ============================================================================

INSERT INTO public.universities (
  id, tenant_id, name, country, city, logo_url, website, description, ranking, active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Technical University of Munich',
    'Germany',
    'Munich',
    NULL,
    'https://www.tum.de',
    'TUM is one of Europe''s leading research universities, with outstanding programs in engineering, natural sciences, and technology management.',
    '{"world_rank": 37, "germany_rank": 1}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Ludwig Maximilian University of Munich',
    'Germany',
    'Munich',
    NULL,
    'https://www.lmu.de',
    'LMU Munich is one of Europe''s premier academic and research institutions. It has been a place of learning for over 500 years.',
    '{"world_rank": 54, "germany_rank": 2}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Heidelberg University',
    'Germany',
    'Heidelberg',
    NULL,
    'https://www.uni-heidelberg.de',
    'Founded in 1386, Heidelberg is Germany''s oldest university and one of Europe''s most distinguished research universities.',
    '{"world_rank": 65, "germany_rank": 3}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'RWTH Aachen University',
    'Germany',
    'Aachen',
    NULL,
    'https://www.rwth-aachen.de',
    'RWTH Aachen is one of Europe''s leading universities of technology, known for its strong engineering and science programs.',
    '{"world_rank": 90, "germany_rank": 4}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Humboldt University of Berlin',
    'Germany',
    'Berlin',
    NULL,
    'https://www.hu-berlin.de',
    'Founded in 1810, Humboldt-Universität is one of Berlin''s oldest universities and a leading global research institution.',
    '{"world_rank": 87, "germany_rank": 5}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Free University of Berlin',
    'Germany',
    'Berlin',
    NULL,
    'https://www.fu-berlin.de',
    'Freie Universität Berlin is one of the leading research universities in Germany and one of the largest universities in the country.',
    '{"world_rank": 118, "germany_rank": 6}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- IRELAND UNIVERSITIES
-- ============================================================================

INSERT INTO public.universities (
  id, tenant_id, name, country, city, logo_url, website, description, ranking, active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Trinity College Dublin',
    'Ireland',
    'Dublin',
    NULL,
    'https://www.tcd.ie',
    'Trinity College Dublin is Ireland''s leading university and one of the world''s leading research-intensive universities. Founded in 1592, it is Ireland''s oldest university.',
    '{"world_rank": 81, "ireland_rank": 1}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University College Dublin',
    'Ireland',
    'Dublin',
    NULL,
    'https://www.ucd.ie',
    'UCD is Ireland''s largest university by student enrolment and is ranked among the top 1% of institutions worldwide. It offers a wide range of undergraduate and graduate programs.',
    '{"world_rank": 126, "ireland_rank": 2}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'National University of Ireland, Galway',
    'Ireland',
    'Galway',
    NULL,
    'https://www.universityofgalway.ie',
    'University of Galway is a research-led university with a strong reputation for excellence in teaching and research. It is Ireland''s third-oldest university.',
    '{"world_rank": 289, "ireland_rank": 3}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'University College Cork',
    'Ireland',
    'Cork',
    NULL,
    'https://www.ucc.ie',
    'UCC is a world-class research university that has made an exceptional contribution to global research and scholarship. Founded in 1845, it is one of Ireland''s oldest universities.',
    '{"world_rank": 303, "ireland_rank": 4}'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Dublin City University',
    'Ireland',
    'Dublin',
    NULL,
    'https://www.dcu.ie',
    'DCU is a young, dynamic and ambitious university with a distinctive approach to education and research. It has a strong focus on innovation and entrepreneurship.',
    '{"world_rank": 471, "ireland_rank": 5}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PROGRAMS - UK UNIVERSITIES
-- ============================================================================

-- Insert programs for UK universities
WITH uk_unis AS (
  SELECT id, name FROM public.universities 
  WHERE country = 'United Kingdom'
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months, 
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'GBP',
  p.tuition_amount,
  ARRAY[9, 1],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM uk_unis u
CROSS JOIN (
  VALUES
    -- Imperial College London Programs
    ('Imperial College London', 'MSc Computing', 'Master', 'Computer Science', 12, 35900, 7.0, 100, 
     'A rigorous program in computing fundamentals and advanced topics for career changers and graduates.', 
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    ('Imperial College London', 'MSc Artificial Intelligence', 'Master', 'Computer Science', 12, 38000, 7.0, 100,
     'This MSc provides a comprehensive introduction to the fundamentals of AI, machine learning and data science.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    ('Imperial College London', 'MEng Mechanical Engineering', 'Undergraduate', 'Engineering', 48, 38000, 6.5, 92,
     'A world-class engineering degree covering thermodynamics, mechanics, materials and design.',
     '{"min_gpa": 3.3, "a_levels": "A*A*A"}'),
    ('Imperial College London', 'MSc Finance', 'Master', 'Business', 12, 42500, 7.0, 100,
     'This program offers rigorous training in finance theory and practice, preparing graduates for careers in investment banking and asset management.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second", "gmat": 700}'),
    
    -- UCL Programs
    ('University College London', 'MSc Computer Science', 'Master', 'Computer Science', 12, 35000, 7.0, 100,
     'A conversion course designed for graduates from non-computing backgrounds who want to enter the computing industry.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('University College London', 'MSc Data Science', 'Master', 'Computer Science', 12, 34000, 7.0, 100,
     'This program provides advanced training in data science methodologies, statistics, and machine learning.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    ('University College London', 'MA Education', 'Master', 'Education', 12, 26400, 7.0, 100,
     'A flexible program allowing students to tailor their studies across multiple areas of educational research.',
     '{"min_gpa": 3.0, "degree_class": "Upper Second"}'),
    ('University College London', 'LLM Law', 'Master', 'Law', 12, 32000, 7.5, 105,
     'One of the world''s leading law programs offering specializations in international law, commercial law, and human rights.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    
    -- University of Edinburgh Programs
    ('University of Edinburgh', 'MSc Artificial Intelligence', 'Master', 'Computer Science', 12, 38500, 7.0, 100,
     'One of the oldest AI programs in the world, offering comprehensive training in machine learning and AI systems.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    ('University of Edinburgh', 'MSc International Business', 'Master', 'Business', 12, 29900, 7.0, 100,
     'This program develops analytical and strategic thinking skills for international business careers.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('University of Edinburgh', 'MA Philosophy', 'Undergraduate', 'Arts & Humanities', 48, 26500, 6.5, 92,
     'A rigorous program exploring fundamental questions about reality, knowledge, ethics, and meaning.',
     '{"min_gpa": 3.0}'),
    
    -- LSE Programs
    ('London School of Economics and Political Science', 'MSc Finance', 'Master', 'Business', 12, 40000, 7.0, 107,
     'A rigorous program preparing students for careers in investment banking, asset management, and corporate finance.',
     '{"min_gpa": 3.6, "degree_class": "First", "gmat": 700}'),
    ('London School of Economics and Political Science', 'MSc Economics', 'Master', 'Economics', 12, 32000, 7.0, 107,
     'A leading economics program providing advanced training in economic theory and quantitative methods.',
     '{"min_gpa": 3.6, "degree_class": "First"}'),
    ('London School of Economics and Political Science', 'MSc Data Science', 'Master', 'Computer Science', 12, 35000, 7.0, 107,
     'An interdisciplinary program combining statistics, computer science, and social science applications.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second"}'),
    
    -- University of Manchester Programs
    ('University of Manchester', 'MSc Computer Science', 'Master', 'Computer Science', 12, 29000, 6.5, 90,
     'A comprehensive program covering core computer science topics with options to specialize in AI, data science, or cybersecurity.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('University of Manchester', 'MBA', 'Master', 'Business', 12, 48000, 7.0, 100,
     'Alliance Manchester Business School''s flagship MBA program for experienced professionals.',
     '{"min_gpa": 3.3, "work_experience_years": 3, "gmat": 650}'),
    ('University of Manchester', 'MSc Mechanical Engineering', 'Master', 'Engineering', 12, 28500, 6.5, 90,
     'Advanced training in mechanical engineering with opportunities for research and industry projects.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    
    -- King''s College London Programs
    ('King''s College London', 'MSc Nursing', 'Master', 'Healthcare', 24, 25500, 7.0, 100,
     'A leading nursing program preparing graduates for advanced clinical practice and leadership roles.',
     '{"min_gpa": 3.0, "degree_class": "Upper Second"}'),
    ('King''s College London', 'LLM International Law', 'Master', 'Law', 12, 26000, 7.0, 100,
     'A comprehensive program in international law covering human rights, international trade, and conflict resolution.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('King''s College London', 'MSc Psychology', 'Master', 'Psychology', 12, 28800, 7.0, 100,
     'An advanced program in psychology providing training in research methods and psychological theory.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    
    -- University of Bristol Programs
    ('University of Bristol', 'MSc Computer Science', 'Master', 'Computer Science', 12, 28300, 6.5, 88,
     'A conversion program for graduates from other disciplines wanting to enter the computing industry.',
     '{"min_gpa": 3.0, "degree_class": "Upper Second"}'),
    ('University of Bristol', 'MSc Economics', 'Master', 'Economics', 12, 25600, 6.5, 88,
     'An advanced economics program with strong emphasis on quantitative methods and applied research.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    
    -- University of Warwick Programs
    ('University of Warwick', 'MSc Computer Science', 'Master', 'Computer Science', 12, 32100, 6.5, 92,
     'A rigorous program in computer science with specializations in AI, cybersecurity, and software engineering.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('University of Warwick', 'MSc Finance', 'Master', 'Business', 12, 42500, 7.0, 100,
     'Warwick Business School''s leading finance program preparing students for careers in financial services.',
     '{"min_gpa": 3.5, "degree_class": "First or Upper Second", "gmat": 680}'),
    ('University of Warwick', 'MBA', 'Master', 'Business', 12, 52500, 7.0, 100,
     'A transformational MBA program from one of Europe''s leading business schools.',
     '{"min_gpa": 3.3, "work_experience_years": 3, "gmat": 680}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PROGRAMS - CANADIAN UNIVERSITIES
-- ============================================================================

WITH canada_unis AS (
  SELECT id, name FROM public.universities 
  WHERE country = 'Canada'
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'CAD',
  p.tuition_amount,
  ARRAY[9, 1],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM canada_unis u
CROSS JOIN (
  VALUES
    -- University of Toronto Programs
    ('University of Toronto', 'Master of Science in Computer Science', 'Master', 'Computer Science', 16, 52000, 7.0, 93,
     'A research-focused program in computer science from Canada''s top university.',
     '{"min_gpa": 3.5, "degree_class": "First Class or equivalent"}'),
    ('University of Toronto', 'Master of Business Administration', 'Master', 'Business', 20, 125000, 7.0, 100,
     'Rotman School of Management''s flagship MBA program, ranked among the best in Canada.',
     '{"min_gpa": 3.3, "work_experience_years": 2, "gmat": 680}'),
    ('University of Toronto', 'Master of Engineering', 'Master', 'Engineering', 12, 58000, 6.5, 93,
     'Professional master''s degree in engineering with specializations in various engineering fields.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('University of Toronto', 'Master of Information', 'Master', 'Computer Science', 24, 48000, 7.0, 93,
     'An interdisciplinary program at the intersection of information, technology, and society.',
     '{"min_gpa": 3.3}'),
    
    -- McGill University Programs
    ('McGill University', 'Master of Science in Computer Science', 'Master', 'Computer Science', 24, 22000, 6.5, 90,
     'A research-intensive program in computer science with excellent faculty and resources.',
     '{"min_gpa": 3.3, "degree_class": "Upper Second"}'),
    ('McGill University', 'MBA', 'Master', 'Business', 20, 90000, 7.0, 100,
     'Desautels Faculty of Management''s MBA program with a focus on integrated management.',
     '{"min_gpa": 3.0, "work_experience_years": 2, "gmat": 650}'),
    ('McGill University', 'Master of Arts in Economics', 'Master', 'Economics', 16, 24000, 6.5, 90,
     'A rigorous economics program preparing students for careers in policy, finance, or doctoral studies.',
     '{"min_gpa": 3.3}'),
    
    -- UBC Programs
    ('University of British Columbia', 'Master of Science in Computer Science', 'Master', 'Computer Science', 24, 48000, 7.0, 100,
     'A world-class program with strong research in AI, machine learning, and human-computer interaction.',
     '{"min_gpa": 3.3, "degree_class": "First Class or equivalent"}'),
    ('University of British Columbia', 'Master of Data Science', 'Master', 'Computer Science', 10, 42000, 7.0, 100,
     'An intensive professional program training students in data science and analytics.',
     '{"min_gpa": 3.3}'),
    ('University of British Columbia', 'MBA', 'Master', 'Business', 16, 65000, 7.0, 100,
     'Sauder School of Business MBA with a focus on leadership and strategic thinking.',
     '{"min_gpa": 3.0, "work_experience_years": 2, "gmat": 620}'),
    
    -- University of Waterloo Programs
    ('University of Waterloo', 'Master of Mathematics in Computer Science', 'Master', 'Computer Science', 16, 32000, 7.0, 90,
     'A research program in computer science at one of North America''s top tech universities.',
     '{"min_gpa": 3.3}'),
    ('University of Waterloo', 'Master of Engineering', 'Master', 'Engineering', 16, 35000, 7.0, 90,
     'Professional master''s in engineering with excellent co-op and industry connections.',
     '{"min_gpa": 3.3}'),
    ('University of Waterloo', 'Master of Applied Science', 'Master', 'Engineering', 24, 28000, 7.0, 90,
     'A research-focused master''s degree in engineering with thesis requirement.',
     '{"min_gpa": 3.3}'),
    
    -- University of Alberta Programs
    ('University of Alberta', 'MSc Computing Science', 'Master', 'Computer Science', 24, 18000, 6.5, 90,
     'A research program in computing science with strengths in AI, machine learning, and systems.',
     '{"min_gpa": 3.0}'),
    ('University of Alberta', 'MBA', 'Master', 'Business', 20, 48000, 7.0, 95,
     'Alberta School of Business MBA with a focus on natural resources and technology management.',
     '{"min_gpa": 3.0, "work_experience_years": 2}'),
    
    -- Western University Programs
    ('Western University', 'Master of Science in Computer Science', 'Master', 'Computer Science', 24, 20000, 6.5, 86,
     'A research program in computer science with strengths in AI, software engineering, and bioinformatics.',
     '{"min_gpa": 3.0}'),
    ('Western University', 'MBA', 'Master', 'Business', 12, 85000, 7.0, 100,
     'Ivey Business School''s case-based MBA program, ranked among the best in Canada.',
     '{"min_gpa": 3.0, "work_experience_years": 2, "gmat": 650}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PROGRAMS - AUSTRALIAN UNIVERSITIES
-- ============================================================================

WITH aus_unis AS (
  SELECT id, name FROM public.universities 
  WHERE country = 'Australia'
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'AUD',
  p.tuition_amount,
  ARRAY[2, 7],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM aus_unis u
CROSS JOIN (
  VALUES
    -- University of Melbourne Programs
    ('University of Melbourne', 'Master of Information Technology', 'Master', 'Computer Science', 24, 49000, 6.5, 79,
     'A comprehensive IT program preparing graduates for careers in software development, data science, and cybersecurity.',
     '{"min_gpa": 3.0}'),
    ('University of Melbourne', 'Master of Data Science', 'Master', 'Computer Science', 24, 48000, 6.5, 79,
     'An interdisciplinary program combining statistics, computer science, and domain expertise.',
     '{"min_gpa": 3.3}'),
    ('University of Melbourne', 'MBA', 'Master', 'Business', 12, 98000, 7.0, 100,
     'Melbourne Business School''s flagship MBA program, ranked among the best in Australia.',
     '{"min_gpa": 3.0, "work_experience_years": 3, "gmat": 650}'),
    ('University of Melbourne', 'Master of Engineering', 'Master', 'Engineering', 24, 47000, 6.5, 79,
     'An advanced engineering program with specializations in civil, mechanical, electrical, and software engineering.',
     '{"min_gpa": 3.0}'),
    
    -- University of Sydney Programs
    ('University of Sydney', 'Master of Information Technology', 'Master', 'Computer Science', 18, 52500, 6.5, 85,
     'A flexible IT program with specializations in software development, data science, and AI.',
     '{"min_gpa": 3.0}'),
    ('University of Sydney', 'Master of Commerce', 'Master', 'Business', 18, 53500, 7.0, 96,
     'A comprehensive commerce program with specializations in finance, economics, and marketing.',
     '{"min_gpa": 3.3}'),
    ('University of Sydney', 'Master of Professional Engineering', 'Master', 'Engineering', 24, 51000, 6.5, 85,
     'An accredited engineering program preparing graduates for professional engineering practice.',
     '{"min_gpa": 3.0}'),
    
    -- ANU Programs
    ('Australian National University', 'Master of Computing', 'Master', 'Computer Science', 24, 47880, 6.5, 80,
     'A world-class computing program with strengths in AI, cybersecurity, and software engineering.',
     '{"min_gpa": 3.0}'),
    ('Australian National University', 'Master of Finance', 'Master', 'Business', 24, 47880, 6.5, 80,
     'An advanced finance program preparing graduates for careers in investment and financial management.',
     '{"min_gpa": 3.0}'),
    ('Australian National University', 'Master of International Relations', 'Master', 'Arts & Humanities', 24, 47880, 6.5, 80,
     'A leading international relations program with access to government and diplomatic networks.',
     '{"min_gpa": 3.0}'),
    
    -- University of Queensland Programs
    ('University of Queensland', 'Master of Computer Science', 'Master', 'Computer Science', 24, 47264, 6.5, 87,
     'A comprehensive computer science program with specializations in AI, data science, and cybersecurity.',
     '{"min_gpa": 3.0}'),
    ('University of Queensland', 'MBA', 'Master', 'Business', 18, 78000, 6.5, 87,
     'UQ Business School''s MBA program with a focus on leadership and innovation.',
     '{"min_gpa": 3.0, "work_experience_years": 3}'),
    
    -- Monash University Programs
    ('Monash University', 'Master of Information Technology', 'Master', 'Computer Science', 24, 47000, 6.5, 79,
     'A flexible IT program with opportunities for industry experience through internships.',
     '{"min_gpa": 3.0}'),
    ('Monash University', 'Master of Business Administration', 'Master', 'Business', 24, 83000, 6.5, 79,
     'Monash Business School MBA with a focus on responsible leadership and innovation.',
     '{"min_gpa": 3.0, "work_experience_years": 3}'),
    ('Monash University', 'Master of Engineering', 'Master', 'Engineering', 24, 46000, 6.5, 79,
     'An advanced engineering program with specializations in chemical, civil, electrical, and mechanical engineering.',
     '{"min_gpa": 3.0}'),
    
    -- UNSW Programs
    ('University of New South Wales', 'Master of Information Technology', 'Master', 'Computer Science', 24, 48320, 6.5, 90,
     'A comprehensive IT program with specializations in AI, data science, and cybersecurity.',
     '{"min_gpa": 3.0}'),
    ('University of New South Wales', 'Master of Commerce', 'Master', 'Business', 18, 49680, 7.0, 94,
     'A flexible commerce program with specializations in finance, accounting, and economics.',
     '{"min_gpa": 3.0}'),
    ('University of New South Wales', 'Master of Engineering Science', 'Master', 'Engineering', 24, 47760, 6.5, 90,
     'An advanced engineering program with coursework and research components.',
     '{"min_gpa": 3.0}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PROGRAMS - GERMAN UNIVERSITIES
-- ============================================================================

WITH germany_unis AS (
  SELECT id, name FROM public.universities 
  WHERE country = 'Germany'
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'EUR',
  p.tuition_amount,
  ARRAY[10, 4],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM germany_unis u
CROSS JOIN (
  VALUES
    -- TUM Programs (most German public universities have minimal tuition)
    ('Technical University of Munich', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A world-class computer science program with strengths in AI, robotics, and software engineering.',
     '{"min_gpa": 3.0, "degree_class": "Upper Second or equivalent"}'),
    ('Technical University of Munich', 'MSc Mechanical Engineering', 'Master', 'Engineering', 24, 350, 6.5, 88,
     'Advanced mechanical engineering training at one of Europe''s leading technical universities.',
     '{"min_gpa": 3.0}'),
    ('Technical University of Munich', 'MSc Management', 'Master', 'Business', 24, 350, 6.5, 88,
     'TUM School of Management program combining technical and business education.',
     '{"min_gpa": 3.0}'),
    ('Technical University of Munich', 'MSc Data Engineering and Analytics', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'An interdisciplinary program in data science and engineering applications.',
     '{"min_gpa": 3.0}'),
    
    -- LMU Munich Programs
    ('Ludwig Maximilian University of Munich', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A comprehensive computer science program at one of Germany''s premier research universities.',
     '{"min_gpa": 3.0}'),
    ('Ludwig Maximilian University of Munich', 'MSc Economics', 'Master', 'Economics', 24, 350, 6.5, 88,
     'An advanced economics program with strong quantitative training.',
     '{"min_gpa": 3.0}'),
    ('Ludwig Maximilian University of Munich', 'MA Philosophy', 'Master', 'Arts & Humanities', 24, 350, 6.5, 88,
     'A rigorous philosophy program with strengths in analytic philosophy and philosophy of science.',
     '{"min_gpa": 3.0}'),
    
    -- Heidelberg University Programs
    ('Heidelberg University', 'MSc Physics', 'Master', 'Natural Sciences', 24, 350, 6.5, 88,
     'A research-intensive physics program at Germany''s oldest university.',
     '{"min_gpa": 3.0}'),
    ('Heidelberg University', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A comprehensive computer science program with opportunities for interdisciplinary research.',
     '{"min_gpa": 3.0}'),
    
    -- RWTH Aachen Programs
    ('RWTH Aachen University', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A rigorous computer science program at one of Europe''s leading technical universities.',
     '{"min_gpa": 3.0}'),
    ('RWTH Aachen University', 'MSc Mechanical Engineering', 'Master', 'Engineering', 24, 350, 6.5, 88,
     'World-renowned mechanical engineering program with excellent industry connections.',
     '{"min_gpa": 3.0}'),
    ('RWTH Aachen University', 'MSc Electrical Engineering', 'Master', 'Engineering', 24, 350, 6.5, 88,
     'Advanced electrical engineering training covering power systems, electronics, and communications.',
     '{"min_gpa": 3.0}'),
    
    -- Humboldt University Programs
    ('Humboldt University of Berlin', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A research-focused computer science program at one of Germany''s top universities.',
     '{"min_gpa": 3.0}'),
    ('Humboldt University of Berlin', 'MA Economics', 'Master', 'Economics', 24, 350, 6.5, 88,
     'An advanced economics program with strengths in empirical and theoretical economics.',
     '{"min_gpa": 3.0}'),
    
    -- Free University of Berlin Programs
    ('Free University of Berlin', 'MSc Computer Science', 'Master', 'Computer Science', 24, 350, 6.5, 88,
     'A comprehensive computer science program with research opportunities in AI and bioinformatics.',
     '{"min_gpa": 3.0}'),
    ('Free University of Berlin', 'MA Political Science', 'Master', 'Arts & Humanities', 24, 350, 6.5, 88,
     'A leading political science program with strengths in international relations and EU politics.',
     '{"min_gpa": 3.0}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PROGRAMS - IRISH UNIVERSITIES
-- ============================================================================

WITH ireland_unis AS (
  SELECT id, name FROM public.universities 
  WHERE country = 'Ireland'
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'EUR',
  p.tuition_amount,
  ARRAY[9, 1],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM ireland_unis u
CROSS JOIN (
  VALUES
    -- Trinity College Dublin Programs
    ('Trinity College Dublin', 'MSc Computer Science', 'Master', 'Computer Science', 12, 25000, 6.5, 90,
     'A comprehensive computer science program at Ireland''s top university.',
     '{"min_gpa": 3.3}'),
    ('Trinity College Dublin', 'MSc Finance', 'Master', 'Business', 12, 28000, 6.5, 90,
     'A rigorous finance program preparing graduates for careers in financial services.',
     '{"min_gpa": 3.3}'),
    ('Trinity College Dublin', 'MSc Management', 'Master', 'Business', 12, 26500, 6.5, 90,
     'Trinity Business School''s management program for aspiring business leaders.',
     '{"min_gpa": 3.0}'),
    ('Trinity College Dublin', 'LLM', 'Master', 'Law', 12, 22000, 6.5, 90,
     'An advanced law program with specializations in international and European law.',
     '{"min_gpa": 3.3}'),
    
    -- UCD Programs
    ('University College Dublin', 'MSc Computer Science', 'Master', 'Computer Science', 12, 22500, 6.5, 90,
     'A conversion program for graduates from non-computing backgrounds.',
     '{"min_gpa": 3.0}'),
    ('University College Dublin', 'MSc Data & Computational Science', 'Master', 'Computer Science', 12, 22500, 6.5, 90,
     'An interdisciplinary program in data science and computational methods.',
     '{"min_gpa": 3.0}'),
    ('University College Dublin', 'MBA', 'Master', 'Business', 12, 42000, 6.5, 90,
     'UCD Smurfit School''s MBA program with a focus on innovation and leadership.',
     '{"min_gpa": 3.0, "work_experience_years": 3}'),
    ('University College Dublin', 'MSc Finance', 'Master', 'Business', 12, 26500, 6.5, 90,
     'A quantitative finance program at Ireland''s leading business school.',
     '{"min_gpa": 3.3}'),
    
    -- University of Galway Programs
    ('National University of Ireland, Galway', 'MSc Computer Science - Data Analytics', 'Master', 'Computer Science', 12, 18000, 6.5, 88,
     'A specialized program in data analytics and machine learning.',
     '{"min_gpa": 3.0}'),
    ('National University of Ireland, Galway', 'MSc Biotechnology', 'Master', 'Natural Sciences', 12, 18000, 6.5, 88,
     'An advanced biotechnology program with excellent research facilities.',
     '{"min_gpa": 3.0}'),
    ('National University of Ireland, Galway', 'MA International Relations', 'Master', 'Arts & Humanities', 12, 15000, 6.5, 88,
     'A comprehensive program in international relations and global politics.',
     '{"min_gpa": 3.0}'),
    
    -- UCC Programs
    ('University College Cork', 'MSc Computing Science', 'Master', 'Computer Science', 12, 18000, 6.5, 88,
     'A comprehensive computing program with options for specialization.',
     '{"min_gpa": 3.0}'),
    ('University College Cork', 'MSc Food Science', 'Master', 'Natural Sciences', 12, 18000, 6.5, 88,
     'Ireland''s leading food science program with excellent industry connections.',
     '{"min_gpa": 3.0}'),
    ('University College Cork', 'MSc Business Economics', 'Master', 'Economics', 12, 16000, 6.5, 88,
     'An applied economics program preparing graduates for careers in business and policy.',
     '{"min_gpa": 3.0}'),
    
    -- DCU Programs
    ('Dublin City University', 'MSc Computing', 'Master', 'Computer Science', 12, 18000, 6.5, 88,
     'A flexible computing program with options for research or industry pathways.',
     '{"min_gpa": 3.0}'),
    ('Dublin City University', 'MSc FinTech', 'Master', 'Business', 12, 18000, 6.5, 88,
     'Ireland''s first dedicated FinTech program combining finance and technology.',
     '{"min_gpa": 3.0}'),
    ('Dublin City University', 'MA International Relations', 'Master', 'Arts & Humanities', 12, 15000, 6.5, 88,
     'A program in international relations with a focus on EU and global governance.',
     '{"min_gpa": 3.0}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SCHOLARSHIPS
-- ============================================================================

-- Add scholarships for the new universities
INSERT INTO public.scholarships (
  id, tenant_id, university_id, name, amount_cents, currency, coverage_type, active
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  s.scholarship_name,
  s.amount_cents,
  s.currency,
  s.coverage_type,
  true
FROM public.universities u
CROSS JOIN (
  VALUES
    -- UK Scholarships
    ('Imperial College London', 'Imperial President''s Scholarship', 2500000, 'GBP', 'partial_tuition'),
    ('University College London', 'UCL Global Masters Scholarship', 1500000, 'GBP', 'partial_tuition'),
    ('University of Edinburgh', 'Edinburgh Global Scholarship', 1000000, 'GBP', 'partial_tuition'),
    ('London School of Economics and Political Science', 'LSE Graduate Support Scheme', 2000000, 'GBP', 'partial_tuition'),
    ('University of Manchester', 'Manchester Master''s Bursary', 500000, 'GBP', 'partial_tuition'),
    ('King''s College London', 'King''s International Scholarship', 800000, 'GBP', 'partial_tuition'),
    ('University of Bristol', 'Bristol Think Big Scholarship', 2000000, 'GBP', 'partial_tuition'),
    ('University of Warwick', 'Warwick Graduate Scholarship', 1200000, 'GBP', 'partial_tuition'),
    
    -- Canadian Scholarships
    ('University of Toronto', 'U of T Excellence Award', 2500000, 'CAD', 'partial_tuition'),
    ('McGill University', 'McGill Graduate Excellence Fellowship', 1500000, 'CAD', 'partial_tuition'),
    ('University of British Columbia', 'UBC International Leader of Tomorrow Award', 3000000, 'CAD', 'full_tuition'),
    ('University of Alberta', 'Alberta Graduate Excellence Scholarship', 1000000, 'CAD', 'partial_tuition'),
    ('University of Waterloo', 'Waterloo International Master''s Award', 800000, 'CAD', 'partial_tuition'),
    
    -- Australian Scholarships
    ('University of Melbourne', 'Melbourne Graduate Research Scholarship', 3500000, 'AUD', 'full_tuition'),
    ('University of Sydney', 'Sydney International Student Award', 4000000, 'AUD', 'partial_tuition'),
    ('Australian National University', 'ANU Vice-Chancellor''s International Scholarship', 2500000, 'AUD', 'partial_tuition'),
    ('University of Queensland', 'UQ International Excellence Scholarship', 2000000, 'AUD', 'partial_tuition'),
    ('Monash University', 'Monash International Leadership Scholarship', 1000000, 'AUD', 'partial_tuition'),
    ('University of New South Wales', 'UNSW International Scholarship', 1500000, 'AUD', 'partial_tuition'),
    
    -- German Scholarships (even though tuition is minimal, living costs scholarships exist)
    ('Technical University of Munich', 'TUM Excellence Scholarship', 1200000, 'EUR', 'living_expenses'),
    ('Ludwig Maximilian University of Munich', 'LMU Graduate Scholarship', 800000, 'EUR', 'living_expenses'),
    ('Heidelberg University', 'Heidelberg Graduate Academy Scholarship', 900000, 'EUR', 'living_expenses'),
    ('RWTH Aachen University', 'RWTH Excellence Initiative Scholarship', 1000000, 'EUR', 'living_expenses'),
    
    -- Irish Scholarships
    ('Trinity College Dublin', 'Trinity Postgraduate Research Scholarship', 1600000, 'EUR', 'full_tuition'),
    ('University College Dublin', 'UCD Global Excellence Scholarship', 1200000, 'EUR', 'partial_tuition'),
    ('National University of Ireland, Galway', 'NUI Galway Hardiman Scholarship', 1600000, 'EUR', 'full_tuition'),
    ('University College Cork', 'UCC Postgraduate Scholarship', 500000, 'EUR', 'partial_tuition'),
    ('Dublin City University', 'DCU Merit Scholarship', 400000, 'EUR', 'partial_tuition')
) AS s(uni_name, scholarship_name, amount_cents, currency, coverage_type)
WHERE u.name = s.uni_name
ON CONFLICT DO NOTHING;

-- Add additional program for Universities of Oxford and Cambridge that already exist
WITH oxbridge AS (
  SELECT id, name FROM public.universities 
  WHERE name IN ('University of Oxford', 'University of Cambridge')
)
INSERT INTO public.programs (
  id, tenant_id, university_id, name, level, discipline, duration_months,
  tuition_currency, tuition_amount, intake_months, description, active,
  ielts_overall, toefl_overall, entry_requirements
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  p.program_name,
  p.level,
  p.discipline,
  p.duration_months,
  'GBP',
  p.tuition_amount,
  ARRAY[9],
  p.description,
  true,
  p.ielts,
  p.toefl,
  p.entry_requirements::jsonb
FROM oxbridge u
CROSS JOIN (
  VALUES
    -- Oxford Programs
    ('University of Oxford', 'MSc Computer Science', 'Master', 'Computer Science', 12, 33110, 7.5, 110,
     'An intensive course covering core topics in computer science with research opportunities.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}'),
    ('University of Oxford', 'MBA', 'Master', 'Business', 12, 68000, 7.5, 110,
     'Saïd Business School''s transformational MBA program for future leaders.',
     '{"min_gpa": 3.5, "work_experience_years": 3, "gmat": 700}'),
    ('University of Oxford', 'MSc Financial Economics', 'Master', 'Economics', 9, 48000, 7.5, 110,
     'A rigorous program in financial economics and quantitative methods.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}'),
    ('University of Oxford', 'DPhil Computer Science', 'PhD', 'Computer Science', 48, 29500, 7.5, 110,
     'A research degree in computer science at one of the world''s leading departments.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}'),
    
    -- Cambridge Programs  
    ('University of Cambridge', 'MPhil Computer Science', 'Master', 'Computer Science', 9, 35325, 7.5, 110,
     'An advanced course in computer science with research-led teaching.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}'),
    ('University of Cambridge', 'MBA', 'Master', 'Business', 12, 67000, 7.5, 110,
     'Cambridge Judge Business School''s MBA program for future global leaders.',
     '{"min_gpa": 3.5, "work_experience_years": 2, "gmat": 700}'),
    ('University of Cambridge', 'MPhil Economics', 'Master', 'Economics', 9, 36048, 7.5, 110,
     'A rigorous economics program preparing students for doctoral study or careers in research.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}'),
    ('University of Cambridge', 'PhD Computer Science', 'PhD', 'Computer Science', 48, 28410, 7.5, 110,
     'A doctoral program at Cambridge''s world-renowned Computer Laboratory.',
     '{"min_gpa": 3.7, "degree_class": "First Class"}')
) AS p(uni_name, program_name, level, discipline, duration_months, tuition_amount, ielts, toefl, description, entry_requirements)
WHERE u.name = p.uni_name
ON CONFLICT DO NOTHING;

-- Add scholarships for Oxford and Cambridge
INSERT INTO public.scholarships (
  id, tenant_id, university_id, name, amount_cents, currency, coverage_type, active
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  s.scholarship_name,
  s.amount_cents,
  s.currency,
  s.coverage_type,
  true
FROM public.universities u
CROSS JOIN (
  VALUES
    ('University of Oxford', 'Rhodes Scholarship', 5000000, 'GBP', 'full_tuition'),
    ('University of Oxford', 'Clarendon Scholarship', 3000000, 'GBP', 'full_tuition'),
    ('University of Cambridge', 'Gates Cambridge Scholarship', 5000000, 'GBP', 'full_tuition'),
    ('University of Cambridge', 'Cambridge Trust Scholarship', 2500000, 'GBP', 'partial_tuition')
) AS s(uni_name, scholarship_name, amount_cents, currency, coverage_type)
WHERE u.name = s.uni_name
ON CONFLICT DO NOTHING;
