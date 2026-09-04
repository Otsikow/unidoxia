DO $$
DECLARE
  v_tenant_id uuid;
  v_author_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;

  SELECT id INTO v_author_id FROM public.profiles WHERE role IN ('admin','staff') ORDER BY created_at ASC LIMIT 1;
  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL OR v_author_id IS NULL THEN
    RAISE NOTICE 'Skipping weekly visa blog insert because tenant or author is unavailable.';
    RETURN;
  END IF;

  INSERT INTO public.blog_posts (
    tenant_id, author_id, slug, title, excerpt, content_html, cover_image_url,
    tags, status, featured, seo_title, seo_description, published_at, updated_at
  ) VALUES (
    v_tenant_id,
    v_author_id,
    'international-student-visa-study-policy-updates-4-september-2026',
    'International Student Visa & Study Policy Updates: Week Ending 4 September 2026',
    'Canada''s higher proof-of-funds figure applies from 1 September, the UK sponsor register was updated twice this week, and key US, French and Australian rules need careful checking.',
    $html$
<p>Here is our verified weekly round-up for international students, written in plain English. Each point links to the official source so you can check it yourself before you pay any money or submit an application.</p>

<h2>Canada: higher proof-of-funds figure from 1 September 2026</h2>
<p>For study permit applications submitted on or after 1 September 2026, a single applicant studying outside Quebec must show <strong>CAN$23,448</strong> for first-year living expenses. This amount is separate from tuition and from travel or transportation costs. The previous figure was CAN$22,895.</p>
<p><strong>What to do:</strong> update your financial documents before you submit. Officers also look at where the money came from, so include clear, well-documented evidence of the source of funds (salary, business income, property sale, sponsor income) rather than a single recent lump-sum deposit with no explanation.</p>
<p>Source: <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html" target="_blank" rel="noopener noreferrer">IRCC &mdash; proof of financial support</a></p>

<h2>Canada: Francophone Minority Communities Student Pilot cap</h2>
<p>The Francophone Minority Communities Student Pilot has an annual cap of <strong>2,970 Part A applications</strong> for the period 26 August 2026 to 25 August 2027. The pilot has strict requirements covering the participating institution, the programme of study, French language ability, finances and admissibility.</p>
<p><strong>Important:</strong> meeting the requirements does not guarantee a visa or permanent residence. Treat it as one possible pathway, not an outcome.</p>
<p>Source: <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/francophone-minority-communities-student-pilot.html" target="_blank" rel="noopener noreferrer">IRCC &mdash; Francophone Minority Communities Student Pilot</a></p>

<h2>UK: sponsor register updated on 3 and 4 September 2026</h2>
<p>The live Register of Student sponsors was updated on <strong>3 September</strong> and again on <strong>4 September 2026</strong>. Institutions can be added or removed at any time.</p>
<p><strong>What to do:</strong> check the register yourself before paying a large deposit or relying on an institution for sponsorship. Confirm the exact legal name of the institution and that it holds Student sponsor status.</p>
<p>Source: <a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-students" target="_blank" rel="noopener noreferrer">Register of licensed student sponsors (GOV.UK)</a></p>

<h2>UK: Basic Compliance Assessment thresholds</h2>
<p>From <strong>1 June 2026</strong>, during the transition period, sponsors must keep a visa refusal rate <strong>below 5%</strong>, an enrolment rate of <strong>at least 95%</strong>, and a course completion rate of <strong>at least 85%</strong>. From <strong>1 June 2027</strong>, the completion requirement rises to <strong>at least 90%</strong>.</p>
<p><strong>Why this matters to you:</strong> sponsors under compliance pressure may become more cautious about offers and CAS issuance. Respond quickly to document requests and keep your enrolment and attendance in order.</p>
<p>Source: <a href="https://www.gov.uk/government/publications/student-sponsor-guidance" target="_blank" rel="noopener noreferrer">Student sponsor guidance (GOV.UK)</a></p>

<h2>UK: the visa brake remains in force</h2>
<p>The visa brake still applies to qualifying out-of-country Student applications from main applicants who are nationals of <strong>Afghanistan, Cameroon, Myanmar or Sudan</strong> and who applied after <strong>26 March 2026</strong>. It is based on nationality, not on where you live or study.</p>
<p>Existing valid visas are <strong>not</strong> cancelled by the brake. If you are affected, plan for longer timelines and prepare a complete, well-evidenced application.</p>
<p>Source: <a href="https://www.gov.uk/guidance/immigration-rules" target="_blank" rel="noopener noreferrer">Immigration Rules (GOV.UK)</a></p>

<h2>USA: fixed-period F-1 rule is scheduled, not yet in force</h2>
<p>The Department of Homeland Security rule that would replace &ldquo;duration of status&rdquo; with a fixed admission period for F-1 students is currently <strong>scheduled for 15 September 2026</strong>. It remains subject to congressional review and any later official notice, so it should be treated as scheduled and pending rather than as already applying.</p>
<p><strong>What to do:</strong> follow official notices and your designated school official&rsquo;s guidance before changing travel or extension plans.</p>
<p>Source: <a href="https://www.federalregister.gov/agencies/homeland-security-department" target="_blank" rel="noopener noreferrer">Federal Register &mdash; Department of Homeland Security</a></p>

<h2>France: financial resources requirement unchanged</h2>
<p>The financial-resources figure for a long-stay student visa remains <strong>&euro;877.50 per month</strong>. This is an existing requirement, not a new announcement this week.</p>
<p>Source: <a href="https://france-visas.gouv.fr/en/student" target="_blank" rel="noopener noreferrer">France-Visas &mdash; student</a></p>

<h2>Australia: check current official guidance</h2>
<p>Student visa processing arrangements and provider-level guidance change over time. Check the current official application and provider guidance for your course and provider. Processing priority does not guarantee approval, and no one can promise you an outcome.</p>
<p>Source: <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" target="_blank" rel="noopener noreferrer">Department of Home Affairs &mdash; Student visa (subclass 500)</a></p>

<h2>Practical actions this week</h2>
<ul>
  <li>Recalculate your funds against the country figure that applies on your submission date.</li>
  <li>Document where your money came from, not just how much you have.</li>
  <li>Verify your institution on the official register before paying a deposit.</li>
  <li>Keep copies of every official page you rely on, with the date you checked it.</li>
  <li>Build in extra time for document collection and possible additional checks.</li>
</ul>

<h2>Disclaimer</h2>
<p>This article is general information, not legal or immigration advice. Rules change and official sources take precedence. Always confirm requirements on the relevant government website before you apply. UniDoxia does not guarantee any visa, scholarship or admission outcome.</p>

<h2>Explore your options</h2>
<p>Ready to plan your next step? Explore verified universities and programmes and get step-by-step guidance at <a href="https://unidoxia.com" rel="noopener noreferrer">UniDoxia.com</a>.</p>
$html$,
    '/blog/2026-07-27-uk-student-sponsor-licence-check-cover.png',
    ARRAY['Student Visa','Study Abroad','International Students','Visa Updates','UniDoxia'],
    'published',
    false,
    'International Student Visa Updates | 4 September 2026',
    'Verified weekly updates for international students covering Canada, the UK, USA, Australia and France, with practical application guidance.',
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