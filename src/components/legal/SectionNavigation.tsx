import { useEffect, useState } from 'react';

type Section = { id: string; title: string };

export function SectionNavigation({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const updateActiveSection = () => {
      const articles = sections.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      if (!articles.length) return;

      // Match the section currently at the reading position, including short final sections.
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const current = atBottom
        ? articles[articles.length - 1]
        : [...articles].reverse().find((article) => article.getBoundingClientRect().top <= 120) ?? articles[0];
      setActiveId(current.id);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [sections]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
        <h2 className="text-sm font-semibold text-muted-foreground">On this page</h2>
        <div className="mt-3 space-y-2 text-sm">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={activeId === section.id ? 'location' : undefined}
              className={`block rounded-md border-l-2 px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeId === section.id
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-transparent hover:bg-muted hover:text-foreground'
              }`}
            >
              {section.title}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
