import { business } from '../config/business.ts';
import { parseUniversityProfileDetails } from './universityProfile.ts';
export const ORIGIN = 'https://unidoxia.com';
export const esc = (value = '') => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const summary = value => text(typeof value === 'string' ? value : value?.summary);
const description = value => text(value).length > 160 ? `${text(value).slice(0, 157).replace(/\s+\S*$/, '')}…` : text(value);
const details = rows => `<dl>${rows.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
export const universityPath = university => `/universities/${encodeURIComponent(university.slug || university.id)}`;
export const organisation = {
  '@context': 'https://schema.org', '@type': 'Organization', name: 'UniDoxia', legalName: 'Global Talent Gateway Ltd',
  url: ORIGIN, logo: `${ORIGIN}/favicon-512.png`, email: business.email,
  address: { '@type': 'PostalAddress', ...business.address },
  sameAs: ['https://x.com/unidoxia', 'https://www.linkedin.com/company/110137778/', 'https://www.instagram.com/unidoxia/', 'https://www.tiktok.com/@unidoxia.com1', 'https://www.facebook.com/profile.php?id=61584297605909', 'https://www.reddit.com/r/UniDoxia'],
};
export function universityPage(university, programmes) {
  const location = [university.city, university.country].filter(Boolean).join(', ');
  const courses = programmes.filter(p => p.university_id === university.id);
  const path = universityPath(university);
  const profile = parseUniversityProfileDetails(university.submission_config_json);
  const profileHtml = Object.entries({ 'International students': profile.internationalStudents, 'Tuition': profile.tuition, 'Scholarships': profile.scholarships, 'Entry requirements': profile.entryRequirements, 'English requirements': profile.englishRequirements, 'Accommodation': profile.accommodation }).filter(([, value]) => value).map(([label, value]) => `<section><h2>${esc(label)}</h2><p>${esc(value)}</p></section>`).join('');
  return {
    path, lastmod: university.updated_at, kind: 'catalogue',
    title: `${university.name}: Courses and Entry Information | UniDoxia`,
    description: description(`Explore ${university.name} in ${location}. Find courses, entry information and study details on UniDoxia.`),
    body: `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/universities">Universities</a> / ${esc(university.name)}</nav><h1>${esc(university.name)}</h1>${details([['Location', location]])}${university.description ? `<p>${esc(text(university.description))}</p>` : ''}${profile.tagline ? `<p>${esc(profile.tagline)}</p>` : ''}${profile.highlights.length ? `<ul>${profile.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}${profileHtml}${profile.studyLevels.length ? `<h2>Study levels</h2><p>${esc(profile.studyLevels.join(', '))}</p>` : ''}${profile.sources.length ? `<h2>Official sources</h2><ul>${profile.sources.map(source => `<li><a href="${esc(source.url)}">${esc(source.label || source.url)}</a>${source.checkedAt ? ` — checked ${esc(source.checkedAt)}` : ''}</li>`).join('')}</ul>` : ''}<p>A directory listing does not by itself indicate a formal university partnership.</p><p><a href="/free-consultation">Ask UniDoxia about studying here</a></p><h2>Courses and entry information</h2><ul>${courses.map(p => `<li><a href="/courses/${esc(p.id)}">${esc(p.name)}</a>${details([['Level', p.level], ['Duration', p.duration_months ? `${p.duration_months} months` : ''], ['Entry requirements', summary(p.entry_requirements)]])}</li>`).join('')}</ul>`,
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: university.name, url: `${ORIGIN}${path}`, ...(location ? { location: { '@type': 'Place', name: location } } : {}) }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` }, { '@type': 'ListItem', position: 2, name: 'Universities', item: `${ORIGIN}/universities` }, { '@type': 'ListItem', position: 3, name: university.name, item: `${ORIGIN}${path}` }] }],
  };
}
export function coursePage(course, university) {
  const location = [...new Set([course.campus, university.city, university.country].filter(Boolean))].join(', ');
  const desc = description(`${course.course_code ? `Course ${course.course_code}: ` : ''}${course.name} at ${university.name}. ${[course.level, course.duration_months ? `${course.duration_months} months` : '', location].filter(Boolean).join(' · ')}. Explore course and entry details.`);
  const months = [...new Set([...(course.intake_months || []), ...(course.program_intakes || []).filter(i => ['available', 'recruitable', 'provisional'].includes(i.status)).map(i => i.intake_month)])].filter(m => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b).map(m => new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, m - 1, 1))));
  const fees = (course.program_fees || []).filter(f => f.applicant_type === 'international' && f.resolution_status === 'verified' && f.amount != null && f.currency).map(f => `${f.currency} ${Number(f.amount).toLocaleString('en-GB')}${f.fee_basis ? ` (${f.fee_basis})` : ''}${f.fee_year ? ` — ${f.fee_year}` : ''}`).join('; ');
  return {
    variantLabels: [course.course_code, course.campus, course.study_mode, course.duration_months ? `${course.duration_months} months` : null, `Course reference ${course.id}`],
    path: `/courses/${course.id}`, lastmod: course.updated_at, kind: 'catalogue',
    title: `${course.name} at ${university.name}${course.course_code ? ` (${course.course_code})` : ''} | UniDoxia`, description: desc,
    body: `<h1>${esc(course.name)}</h1><p><a href="${esc(universityPath(university))}">${esc(university.name)}</a></p>${course.overview || course.description ? `<p>${esc(text(course.overview || course.description))}</p>` : ''}${details([['Level', course.level], ['Qualification', course.qualification], ['Duration', course.duration_months ? `${course.duration_months} months` : ''], ['Location', location], ['Study mode', course.study_mode], ['Intake months', months.join(', ')], ['International tuition', fees], ['Entry requirements', summary(course.entry_requirements)], ['English language requirements', summary(course.english_requirements)]])}${Array.isArray(course.modules) && course.modules.length ? `<h2>Modules</h2><ul>${course.modules.map(m => `<li>${esc(typeof m === 'string' ? m : m.name || m.title || '')}</li>`).join('')}</ul>` : ''}${course.official_url ? `<p><a href="${esc(course.official_url)}">Official course information</a></p>` : ''}<p><a href="/free-consultation">Ask about this course</a></p>`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'Course', name: course.name, description: text(course.overview || course.description) || desc, provider: { '@type': 'CollegeOrUniversity', name: university.name, url: `${ORIGIN}${universityPath(university)}` } },
  };
}
export function blogSchema(post) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
    description: post.seo_description || post.excerpt || post.title,
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at || post.published_at ? { dateModified: post.updated_at || post.published_at } : {}),
    ...(post.cover_image_url ? { image: new URL(post.cover_image_url, ORIGIN).href } : {}),
    // Matches the public article byline and existing BlogPost component.
    author: { '@type': 'Organization', name: 'UniDoxia Editorial Team', url: `${ORIGIN}/editorial-policy` },
    publisher: organisation,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}/blog/${encodeURIComponent(post.slug)}` },
  };
}

// Real catalogue variants sometimes have identical names. Use a record-backed
// discriminator only for collisions, with the stable ID as the final fallback.
export function disambiguateMetadata(pages) {
  for (const key of ['title', 'description']) {
    const groups = new Map();
    for (const page of pages) groups.set(page[key], [...(groups.get(page[key]) || []), page]);
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const index = [0, 1, 2, 3, 4].find(i => group.every(p => p.variantLabels?.[i]) && new Set(group.map(p => p.variantLabels[i])).size === group.length);
      for (const page of group) {
        const label = index === undefined ? page.path : page.variantLabels[index];
        page[key] = key === 'title' ? page.title.replace(' | UniDoxia', ` (${label}) | UniDoxia`) : description(`${label}: ${page.description}`);
      }
    }
  }
  return pages;
}

export function scholarshipPage(s) {
  const name = s.title || s.name;
  const path = `/scholarships/${encodeURIComponent(s.slug)}`;
  const closed = ['Closed', 'Archived'].includes(s.status);
  const deadlinePassed = /^\d{4}-\d{2}-\d{2}$/.test(s.deadline || '') && s.deadline < new Date().toISOString().slice(0, 10);
  const status = deadlinePassed && !closed ? 'Deadline needs review' : s.status;
  const fields = [['Status', status], ['Institution', s.institution_name], ['Sponsor', s.sponsor_name], ['Country', s.country], ['Study level', s.study_level], ['Academic year', s.academic_year], ['Deadline', s.deadline], ['Opening date', s.opening_date], ['Funding', s.scholarship_value || s.funding_type], ['Awards available', s.number_of_awards], ['Last verified', s.last_verified_at], ['Eligible applicants', Array.isArray(s.eligible_nationalities) ? s.eligible_nationalities.join(', ') : ''], ['Academic requirements', s.academic_requirements], ['English requirements', s.english_requirements], ['Work experience', s.work_experience_requirements], ['Age requirements', s.age_requirements], ['Important conditions', s.important_conditions]];
  return {
    path, lastmod: s.updated_at, noindex: closed,
    title: s.seo_title || `${name} | UniDoxia`,
    description: s.seo_description || s.summary || `Explore ${name}: eligibility, funding and official application information.`,
    body: `<h1>${esc(name)}</h1>${s.summary ? `<p>${esc(s.summary)}</p>` : ''}${closed ? '<p>This scholarship is closed or archived. Check the official source for future rounds.</p>' : deadlinePassed ? '<p>The listed deadline has passed. Check the official source for this intake and any later rounds; this listing needs editorial review.</p>' : ''}${details(fields)}${s.full_description || s.description ? `<h2>About this scholarship</h2><p style="white-space:pre-line">${esc(s.full_description || s.description)}</p>` : ''}${Array.isArray(s.application_steps) && s.application_steps.length ? `<h2>How to apply</h2><ol>${s.application_steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>` : ''}${s.official_source_url ? `<p><a href="${esc(s.official_source_url)}">Official scholarship source</a></p>` : ''}${!closed && s.official_application_url ? `<p><a href="${esc(s.official_application_url)}">Official scholarship application</a></p>` : ''}<p><a href="/free-consultation">Ask about scholarship eligibility</a></p>`,
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name, url: `${ORIGIN}${path}`, about: { '@type': 'MonetaryGrant', name, ...(s.institution_name || s.sponsor_name ? { funder: { '@type': 'Organization', name: s.sponsor_name || s.institution_name } } : {}) } }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` }, { '@type': 'ListItem', position: 2, name: 'Scholarships', item: `${ORIGIN}/scholarships` }, { '@type': 'ListItem', position: 3, name, item: `${ORIGIN}${path}` }] }],
  };
}
