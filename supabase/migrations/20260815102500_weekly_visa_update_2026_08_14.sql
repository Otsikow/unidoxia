-- Publish the UniDoxia weekly international student visa and policy update.
-- Sources were verified against official government/regulator pages on 15 August 2026.

DO $$
DECLARE
  v_tenant_id uuid;
  v_author_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;

  SELECT id INTO v_author_id
  FROM public.profiles
  WHERE role IN ('admin', 'staff')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL OR v_author_id IS NULL THEN
    RAISE NOTICE 'Skipping weekly visa blog insert because tenant or author is unavailable.';
    RETURN;
  END IF;

  INSERT INTO public.blog_posts (
    tenant_id,
    author_id,
    slug,
    title,
    excerpt,
    content_html,
    cover_image_url,
    tags,
    status,
    featured,
    seo_title,
    seo_description,
    published_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    v_author_id,
    'international-student-visa-updates-14-august-2026',
    'International Student Visa Updates: Week Ending 14 August 2026',
    'Key visa and study-policy updates for students considering the UK, USA, Canada, France and Australia, verified from official sources.',
    $article$
<p><strong>Updated 15 August 2026.</strong> International student rules continue to change across major study destinations. This week, UniDoxia has reviewed the most important developments and current requirements that prospective students should understand before paying deposits, submitting visa applications or making travel plans.</p>

<h2>United Kingdom: the student visa brake remains in force</h2>
<p>The UK government's visa brake continues to affect overseas Student visa applications from nationals of <strong>Afghanistan, Cameroon, Myanmar and Sudan</strong>. The Home Office states that qualifying Student visa applications submitted from outside the UK on or after 26 March 2026 are refused while the brake remains in place. The restriction is based on nationality, so submitting the application from another country does not avoid the rule.</p>
<p>For UniDoxia's African student community, the most significant impact is on prospective students from <strong>Cameroon and Sudan</strong>. Students in these countries should not make UK university deposit or visa decisions based on outdated social-media information.</p>
<p><a href="https://www.gov.uk/guidance/visa-brake-changes-to-the-uk-visa-system" target="_blank" rel="noopener noreferrer">Check the official UK Home Office visa-brake guidance</a>.</p>

<h2>United Kingdom: universities face tighter sponsor compliance</h2>
<p>UK universities and other Student sponsors are operating under stricter compliance requirements. From 1 June 2026, the visa-refusal threshold used in sponsor compliance assessments is below 5%, while the enrolment requirement is at least 95%. During the period from 1 June 2026 to 31 May 2027, sponsors must also meet an 85% course-completion threshold.</p>
<p>This matters to applicants because universities have a stronger incentive to admit students whose academic progression, finances, documents and study intentions can withstand scrutiny. A rushed or weak application can therefore affect both the student and the institution.</p>
<p><a href="https://www.gov.uk/government/publications/student-sponsor-guidance/student-sponsor-compliance-accessible" target="_blank" rel="noopener noreferrer">Read the official UK student sponsor compliance guidance</a>.</p>

<h2>United States: fixed admission periods begin on 15 September 2026</h2>
<p>The U.S. Department of Homeland Security has finalised a major change affecting F-1 academic students and certain other nonimmigrant categories. From <strong>15 September 2026</strong>, F-1 students will generally be admitted for the programme period shown on their Form I-20, subject to a maximum fixed period of four years, rather than the previous open-ended duration-of-status framework.</p>
<p>Students who need additional time may have to use the formal extension-of-stay process. The final rule also shortens the standard F-1 post-completion departure period from 60 days to 30 days. Students beginning longer degrees, changing programmes or planning extended study should understand the new date-driven compliance requirements before travelling.</p>
<p><a href="https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant" target="_blank" rel="noopener noreferrer">Read the U.S. Department of Homeland Security final rule</a>.</p>

<h2>Canada: financial evidence remains a critical part of study-permit applications</h2>
<p>IRCC requires study-permit applicants to show that they can pay tuition, living expenses and transportation without relying on work in Canada. The current public guidance lists <strong>CAN$22,895</strong> in first-year living expenses for one applicant outside Quebec, excluding tuition and transportation, for applications made on or after 1 September 2025.</p>
<p>IRCC's public guidance also lists four months of bank statements as one common form of proof, while reminding applicants that additional documents can be required depending on the case and local visa-office instructions. Applicants should be ready to explain the source and availability of their funds rather than focusing only on the closing bank balance.</p>
<p><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html" target="_blank" rel="noopener noreferrer">Check Canada's official study-permit financial-support guidance</a>.</p>

<h2>France: the higher financial requirement is now in effect</h2>
<p>France-Visas confirms that long-stay student visa applications submitted from <strong>1 August 2026</strong> must include proof of resources corresponding to at least <strong>€877.50 per month</strong>. Students preparing for France should make sure their financial documents reflect the new figure rather than older guidance.</p>
<p><a href="https://www.france-visas.gouv.fr/en/web/france-visas" target="_blank" rel="noopener noreferrer">Check the official France-Visas information</a>.</p>

<h2>Australia: your education provider can affect processing priority</h2>
<p>For offshore Student visa applications lodged on or after 14 November 2025, Australia uses <strong>Ministerial Direction 115</strong>. Higher Education and VET applications may be assigned Priority 1, 2 or 3 depending on the relevant provider's progress towards its indicative overseas-student allocation.</p>
<p>The Department of Home Affairs emphasises that processing priority is <strong>not a visa cap and does not determine whether an application will be granted or refused</strong>. It affects the order in which applications are processed. Students should check their provider's status when they lodge their application and avoid treating estimated processing windows as guarantees.</p>
<p><a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/visa-processing-priorities/student-visa" target="_blank" rel="noopener noreferrer">Read Australia's official Student visa processing-priority guidance</a>.</p>

<h2>What should international students do now?</h2>
<ul>
  <li>Check current government guidance before paying a university deposit or visa fee.</li>
  <li>Make sure financial evidence is genuine, traceable and consistent with the information in your application.</li>
  <li>Do not rely on old TikTok, WhatsApp or YouTube advice for current immigration rules.</li>
  <li>Choose institutions and programmes that make sense academically and financially for your circumstances.</li>
  <li>Keep copies of the official guidance that applied when you prepared and submitted your application.</li>
</ul>

<h2>Planning to study abroad?</h2>
<p>UniDoxia helps prospective international students explore universities and courses and understand the application journey from course selection through the visa-preparation stage.</p>
<p><strong>Explore your study options with UniDoxia and make decisions using current, verified information.</strong></p>

<p><em>Disclaimer: This article provides general information and is not legal or immigration advice. Rules, fees, institutional requirements and processing practices can change. Always check the relevant government's official guidance and your institution's requirements before making financial or immigration decisions.</em></p>
    $article$,
    '/blog/2026-08-14-international-student-visa-updates-cover.png',
    ARRAY['Student Visa', 'Study Abroad', 'UK', 'USA', 'Canada', 'France', 'Australia'],
    'published',
    true,
    'Student Visa Updates: UK, USA, Canada & More',
    'Weekly student visa updates for the UK, USA, Canada, France and Australia, including key rules and financial requirements for international students.',
    NOW(),
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content_html = EXCLUDED.content_html,
    cover_image_url = EXCLUDED.cover_image_url,
    tags = EXCLUDED.tags,
    status = EXCLUDED.status,
    featured = EXCLUDED.featured,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
    updated_at = NOW();
END $$;
