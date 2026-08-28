-- Publish the UniDoxia weekly international student visa and policy update (week ending 28 August 2026).
-- Sources were verified against official government/regulator pages on 28 August 2026.

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
    'international-student-visa-updates-28-august-2026',
    'International Student Visa Updates: Week Ending 28 August 2026',
    'Canada raises its student proof-of-funds threshold from 1 September, while key UK, US, Australian and French visa rules remain important for international applicants.',
    $article$
<p><strong>Updated 28 August 2026.</strong> International student visa and immigration rules continue to change across major study destinations. This week, the most important new development is in Canada, where Immigration, Refugees and Citizenship Canada has published higher living-expense amounts that apply to study permit applications submitted from 1 September 2026. UniDoxia has also reviewed current official guidance for the United Kingdom, United States, Australia and France so students can distinguish genuine changes from standing rules and online rumours.</p>

<h2>Canada: proof-of-funds requirement rises from 1 September 2026</h2>
<p>IRCC updated its official proof-of-financial-support guidance on <strong>28 August 2026</strong>. For study permit applications submitted on or after <strong>1 September 2026</strong>, a single applicant studying outside Quebec must show <strong>CAN$23,448</strong> for first-year living expenses, excluding tuition and transportation. The current amount through 31 August 2026 is CAN$22,895.</p>
<p>The new annual living-expense amounts outside Quebec are CAN$23,448 for one family member including the applicant; CAN$29,192 for two; CAN$35,888 for three; CAN$43,572 for four; CAN$49,419 for five; CAN$55,736 for six; and CAN$62,054 for seven. Each additional family member above seven adds CAN$6,318.</p>
<p>IRCC's current guidance also says officers assess both the amount and <strong>source</strong> of funds and whether the money will remain available throughout the studies. As an example of banking evidence, the page now lists <strong>six months of bank statements</strong>, including the month the application is submitted or the month before, together with documentation showing the source of income appearing in those statements.</p>
<p><strong>What students should do:</strong> Anyone planning to submit a Canadian study permit application from 1 September should recalculate the required funds before applying. Do not rely on the old CAN$22,895 figure, and do not treat a large closing balance by itself as sufficient evidence if the source of the money cannot be properly documented.</p>
<p><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html" target="_blank" rel="noopener noreferrer">Check IRCC's official proof-of-financial-support guidance</a>.</p>

<h2>Canada: fresh Francophone student pilot window opened on 26 August</h2>
<p>A fresh annual application window under Canada's <strong>Francophone Minority Communities Student Pilot (FMCSP)</strong> opened on <strong>26 August 2026</strong>. IRCC will accept a maximum of <strong>2,970 Part A study permit applications</strong> for processing between 26 August 2026 and 25 August 2027. Applications received above that annual maximum are returned.</p>
<p>The pilot can be relevant to eligible French-speaking applicants from many African countries, including Benin, Burkina Faso, Burundi, Cameroon, Cabo Verde, Central African Republic, Chad, Comoros, C&ocirc;te d'Ivoire, Democratic Republic of the Congo, Republic of the Congo, Djibouti, Equatorial Guinea, Gabon, Guinea, Guinea-Bissau, Madagascar, Mali, Mauritania, Mauritius, Morocco, Niger, Rwanda, S&atilde;o Tom&eacute; and Pr&iacute;ncipe, Senegal, Seychelles, Togo and Tunisia.</p>
<p>Among the requirements, the applicant must have an acceptance letter from a participating designated learning institution outside Quebec for an eligible postsecondary programme taught primarily in French, lasting at least two years full time and leading to a diploma or degree. Applicants need at least NCLC 5 in all four French language abilities, must cover first-year tuition and travel costs, and must demonstrate at least 75% of the applicable low-income cut-off for the location of the participating institution.</p>
<p>This is a genuine pathway initiative, but it is <strong>not a visa guarantee</strong>. Applicants remain subject to other applicable eligibility and admissibility requirements.</p>
<p><a href="https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/public-policies/study-permit-franco-minority-communities-student-pilot-2026.html" target="_blank" rel="noopener noreferrer">Read IRCC's official FMCSP public policy</a>.</p>

<h2>United Kingdom: check the live Student sponsor register before paying</h2>
<p>UK Visas and Immigration updated the official <strong>Register of licensed Student sponsors on 28 August 2026</strong>, following further updates during the week. The register identifies institutions currently licensed to sponsor students under the Student and Child Student routes and includes sponsorship ratings.</p>
<p>This does not mean every update represents a major licence revocation or new university. The practical lesson is that an old saved list should not be treated as definitive. Before relying on an institution for sponsorship, progressing toward CAS or paying a substantial deposit, students should verify the institution against the current UKVI register.</p>
<p><a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-students" target="_blank" rel="noopener noreferrer">Check the current UKVI Register of licensed Student sponsors</a>.</p>

<h2>United Kingdom: stricter sponsor-compliance standards remain in force</h2>
<p>There was no new Basic Compliance Assessment threshold introduced this week, but the stricter framework that began on 1 June 2026 remains important. For Basic Compliance Assessments applied for on or after that date, sponsors must have a visa refusal rate below <strong>5%</strong>, an enrolment rate of at least <strong>95%</strong>, and, during the transitional period to 31 May 2027, a course completion rate of at least <strong>85%</strong>. UKVI also introduced a Red-Amber-Green rating framework.</p>
<p>For students, this makes strong screening more important. Academic progression, document authenticity, financial evidence, English-language ability where applicable, credibility and consistency can affect not only an individual application but also the compliance risk carried by the sponsoring institution.</p>
<p><a href="https://www.gov.uk/government/publications/student-sponsor-guidance/student-sponsor-compliance-accessible" target="_blank" rel="noopener noreferrer">Read the official UK Student sponsor compliance guidance</a>.</p>

<h2>United Kingdom: the visa brake has not reopened</h2>
<p>This is a standing rule rather than a new announcement this week. Current Home Office guidance continues to state that qualifying overseas Student visa applications submitted after 12:01am on 26 March 2026 by main applicants who are nationals of <strong>Afghanistan, Cameroon, Myanmar or Sudan</strong> are refused under the visa brake. The restriction is based on nationality, not on the country from which the applicant submits the application.</p>
<p>Students should therefore not rely on social-media claims that the route has reopened unless the Home Office formally changes its guidance.</p>
<p><a href="https://www.gov.uk/guidance/visa-brake-changes-to-the-uk-visa-system" target="_blank" rel="noopener noreferrer">Read the official UK visa-brake guidance</a>.</p>

<h2>Australia: provider visa-priority data refreshed on 28 August</h2>
<p>Australia's Department of Education refreshed its <strong>Visa Prioritisation Status</strong> data on <strong>28 August 2026</strong>. Offshore Student visa applications lodged on or after 14 November 2025 are processed under Ministerial Direction 115.</p>
<p>For relevant Higher Education and VET applicants, provider status can influence whether an application is assigned Priority 1, 2 or 3 at the time of lodgement. A provider reaching 80% of its New Overseas Student Commencement allocation can move relevant applications to Priority 2, while exceeding the allocation by 15% can move them to Priority 3.</p>
<p>Processing priority is <strong>not an approval score or visa cap</strong>. The Department of Home Affairs states that it affects processing order, not whether a visa is granted or refused. Provider status should therefore be checked on the day the visa application is lodged.</p>
<p><a href="https://www.education.gov.au/managed-system-international-education/resources/visa-prioritisation-status" target="_blank" rel="noopener noreferrer">Check Australia's current provider visa-priority status</a>.</p>
<p><a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/visa-processing-priorities/student-visa" target="_blank" rel="noopener noreferrer">Read Home Affairs' Student visa processing-priority guidance</a>.</p>

<h2>United States: 15 September F-1 change remains scheduled</h2>
<p>No official superseding notice identified this week has changed the effective date currently listed for the DHS final rule on fixed admission periods. The Federal Register still lists <strong>15 September 2026</strong> as the effective date, while noting that the major rule is subject to congressional review and that DHS will publish another notice if the effective date changes or the rule is terminated.</p>
<p>The rule replaces duration of status for F students with fixed admission periods generally tied to programme length and capped at four years. It also introduces an extension-of-stay framework, additional restrictions affecting some programme changes and transfers, and reduces the standard F-1 post-completion departure period from 60 days to 30 days.</p>
<p>Because congressional review is expressly noted in the final rule, students should check the Federal Register again immediately before relying on the 15 September implementation date.</p>
<p><a href="https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant" target="_blank" rel="noopener noreferrer">Read the DHS final rule in the Federal Register</a>.</p>

<h2>France: no new increase this week</h2>
<p>No new student financial threshold change was identified this week. France-Visas continues to state that long-stay student visa applications submitted from <strong>1 August 2026</strong> need proof of resources of at least <strong>&euro;877.50 per month</strong>.</p>
<p>This is an existing requirement, not a new 28 August announcement. Students should still make sure they are using the current figure rather than older guidance that showed a lower amount.</p>
<p><a href="https://www.france-visas.gouv.fr/en/" target="_blank" rel="noopener noreferrer">Check the official France-Visas guidance</a>.</p>

<h2>What should international students do now?</h2>
<ul>
<li>If applying for Canada from 1 September, recalculate funds using the new CAN$23,448 single-applicant living-expense figure outside Quebec and prepare evidence showing where the funds came from.</li>
<li>French-speaking applicants eligible for the Canadian FMCSP should check participating institutions and programme eligibility while the new annual cap window is open.</li>
<li>For UK study, verify the institution on the live sponsor register before deposit and CAS decisions.</li>
<li>For Australia, record the provider's priority status on the day the Student visa is lodged.</li>
<li>For the United States, check for any Federal Register update before 15 September.</li>
<li>Do not make immigration decisions from old TikTok videos, WhatsApp forwards or agent rumours.</li>
</ul>

<h2>Planning to study abroad?</h2>
<p>UniDoxia helps international students explore universities and programmes and make more informed decisions throughout the study-abroad application journey.</p>
<p><strong>Explore your study options at UniDoxia.com.</strong></p>

<p><em>Disclaimer: This article provides general educational information and is not legal or immigration advice. Immigration rules, financial thresholds, institutional requirements and processing practices can change. Always verify the latest official government and institution guidance before making financial or immigration decisions.</em></p>
$article$,
    '/blog/2026-08-28-international-student-visa-updates-cover.png',
    ARRAY['Student Visa', 'Study Abroad', 'Canada', 'UK', 'USA', 'Australia', 'France'],
    'published',
    true,
    'Student Visa Updates: Canada Funds Rise 1 September',
    'Canada raises student proof-of-funds requirements from 1 September 2026, plus current UK, US, Australia and France visa updates for international students.',
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