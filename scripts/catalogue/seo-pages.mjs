export const ORIGIN = 'https://unidoxia.com';
export const esc = (value = '') => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const summary = value => text(typeof value === 'string' ? value : value?.summary);
const description = value => text(value).length > 160 ? `${text(value).slice(0, 157).replace(/\s+\S*$/, '')}…` : text(value);
const details = rows => `<dl>${rows.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
export const universityPath = university => `/universities/${encodeURIComponent(university.slug || university.id)}`;
export const organisation = {
  '@context': 'https://schema.org', '@type': 'Organization', name: 'UniDoxia', legalName: 'Global Talent Gateway Ltd',
  url: ORIGIN, logo: `${ORIGIN}/assets/unidoxia-logo-BmnWTOef.png`, email: 'info@unidoxia.com',
  sameAs: ['https://x.com/unidoxia', 'https://www.linkedin.com/company/110137778/', 'https://www.instagram.com/unidoxia/', 'https://www.facebook.com/profile.php?id=61584297605909', 'https://www.reddit.com/r/UniDoxia'],
};
export function universityPage(university, programmes) {
  const location = [university.city, university.country].filter(Boolean).join(', ');
  const courses = programmes.filter(p => p.university_id === university.id);
  const path = universityPath(university);
  return {
    path, lastmod: university.updated_at, kind: 'catalogue',
    title: `${university.name}: Courses and Entry Information | UniDoxia`,
    description: description(`Explore ${university.name} in ${location}. Find courses, entry information and study details on UniDoxia.`),
    body: `<h1>${esc(university.name)}</h1>${details([['Location', location]])}${university.description ? `<p>${esc(text(university.description))}</p>` : ''}<h2>Courses and entry information</h2><ul>${courses.map(p => `<li><a href="/courses/${esc(p.id)}">${esc(p.name)}</a>${details([['Level', p.level], ['Duration', p.duration_months ? `${p.duration_months} months` : ''], ['Entry requirements', summary(p.entry_requirements)]])}</li>`).join('')}</ul>`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: university.name, url: `${ORIGIN}${path}`, ...(location ? { location: { '@type': 'Place', name: location } } : {}) },
  };
}
export function coursePage(course, university) {
  const location = [...new Set([course.campus, university.city, university.country].filter(Boolean))].join(', ');
  const desc = description(`${course.name} at ${university.name}. ${[course.level, course.duration_months ? `${course.duration_months} months` : '', location].filter(Boolean).join(' · ')}. Explore course and entry details.`);
  const months = [...new Set([...(course.intake_months || []), ...(course.program_intakes || []).filter(i => ['available', 'recruitable', 'provisional'].includes(i.status)).map(i => i.intake_month)])].filter(m => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b).map(m => new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, m - 1, 1))));
  const fees = (course.program_fees || []).filter(f => f.applicant_type === 'international' && f.resolution_status === 'verified' && f.amount != null && f.currency).map(f => `${f.currency} ${Number(f.amount).toLocaleString('en-GB')}${f.fee_basis ? ` (${f.fee_basis})` : ''}${f.fee_year ? ` — ${f.fee_year}` : ''}`).join('; ');
  return {
    variantLabels: [course.course_code, course.campus, course.study_mode, course.duration_months ? `${course.duration_months} months` : null, `Course reference ${course.id}`],
    path: `/courses/${course.id}`, lastmod: course.updated_at, kind: 'catalogue',
    title: `${course.name} at ${university.name} | UniDoxia`, description: desc,
    body: `<h1>${esc(course.name)}</h1><p><a href="${esc(universityPath(university))}">${esc(university.name)}</a></p>${course.overview || course.description ? `<p>${esc(text(course.overview || course.description))}</p>` : ''}${details([['Level', course.level], ['Qualification', course.qualification], ['Duration', course.duration_months ? `${course.duration_months} months` : ''], ['Location', location], ['Study mode', course.study_mode], ['Intake months', months.join(', ')], ['International tuition', fees], ['Entry requirements', summary(course.entry_requirements)], ['English language requirements', summary(course.english_requirements)]])}`,
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
