// Authored records only. Add reviewed guides here; an empty collection is valid.
// Never manufacture country variants from a template or placeholder text.
export const studyGuideRecords = [];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = value => datePattern.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const httpsUrl = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };

export function publishedStudyGuides(records = studyGuideRecords, today = new Date().toISOString().slice(0, 10)) {
  if (!validDate(today)) throw new Error('Invalid study guide evaluation date');
  const slugs = new Set();
  return records.filter(guide => {
    if (guide.status !== 'published') return false;
    const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug || '') &&
      [guide.title, guide.description, guide.origin, guide.destination, guide.reviewer].every(nonempty) && guide.destination === 'United Kingdom' &&
      validDate(guide.checkedAt) && validDate(guide.reviewBy) && guide.checkedAt <= today && guide.reviewBy >= guide.checkedAt &&
      Array.isArray(guide.sections) && guide.sections.length >= 3 && guide.sections.every(section => nonempty(section.heading) && nonempty(section.body)) && new Set(guide.sections.map(section => section.heading.trim().toLowerCase())).size === guide.sections.length &&
      guide.sections.reduce((length, section) => length + section.body.trim().length, 0) >= 800 &&
      Array.isArray(guide.sources) && guide.sources.length >= 3 && guide.sources.every(source => nonempty(source.label) && httpsUrl(source.url)) && new Set(guide.sources.map(source => source.url)).size === guide.sources.length;
    if (!valid) throw new Error(`Published study guide fails editorial requirements: ${guide.slug || '(missing slug)'}`);
    if (slugs.has(guide.slug)) throw new Error(`Duplicate study guide slug: ${guide.slug}`);
    slugs.add(guide.slug);
    return guide.reviewBy >= today;
  });
}

export function studyGuideBreadcrumb(guide) {
  const base = 'https://unidoxia.com';
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
    { '@type': 'ListItem', position: 2, name: 'Study in the UK', item: `${base}/destinations/united-kingdom` },
    { '@type': 'ListItem', position: 3, name: guide.title, item: `${base}/study-guides/${guide.slug}` },
  ] };
}
