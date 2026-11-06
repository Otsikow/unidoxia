import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, MessageCircle, Plus, Search } from "lucide-react";
import type { FormEvent } from "react";
import { HomeBrand, HomeHeader, HomeLink } from "@/components/landing/HomeHeader";
import { FeaturedUniversitiesSection } from "@/components/landing/FeaturedUniversitiesSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";
import { business, businessFooter } from "@/config/business";
import { useAuth } from "@/hooks/useAuth";
import { logFreeConsultationWhatsAppClick } from "@/lib/analytics";
import { organisation } from "@/lib/publicSeo.mjs";
import { homeDescription, homeEyebrow, homeHeadline, homeIntro, homePhoto, homeTitle, studentSignup } from "@/lib/homepage.mjs";
import "@/components/landing/home.css";

const WHATSAPP_URL = "https://wa.me/447360961803";

const destinations = [
  { name: "Canada", country: "Canada" },
  { name: "United States", country: "United States" },
  { name: "Germany", country: "Germany" },
  { name: "Ireland", country: "Ireland" },
  { name: "Australia", country: "Australia" },
];

const steps = [
  { title: "Find your course", text: "Compare universities, subjects, start dates and entry requirements to build a shortlist." },
  { title: "Get your documents ready", text: "Create a profile, organise your documents and ask an adviser what you need for your chosen course." },
  { title: "Apply and follow your progress", text: "Prepare your application and use your account to check updates and outstanding requests." },
  { title: "Plan what comes after an offer", text: "Understand offer conditions and work through the next steps with guidance from our team." },
];

const questions = [
  { question: "How do I know if I can apply?", answer: <>Entry requirements vary by course and institution. Start with the <Link to="/courses">course listings</Link>, then check the university’s own requirements for your qualifications.</> },
  { question: "Which documents should I prepare?", answer: <>Start with your academic transcripts and certificates. Depending on your course, you may also need proof of identity, English language evidence, references or a personal statement.</> },
  { question: "What does it cost to get started?", answer: <>Your initial <Link to="/free-consultation">consultation is free</Link>. Some UniDoxia services may carry a fee. Check <Link to="/pricing">current service pricing</Link> and confirm any separate university or government fees before committing.</> },
  { question: "What happens once I apply?", answer: <>Check your UniDoxia account for updates and requests for further information. The university makes the admissions decision. If you receive an offer, we can help you understand its conditions and plan your next steps.</> },
];

const footerGroups = [
  { title: "Explore", links: [
    ["Find a course", "/courses"], ["University directory", "/universities"],
    ["Study in the UK", "/destinations/united-kingdom"], ["Scholarships", "/scholarships"], ["Student guides", "/blog"],
  ] },
  { title: "Student support", links: [
    ["Contact us", "/contact"], ["Free consultation", "/free-consultation"], ["Help centre", "/help"],
    ["Visa calculator", "/visa-calculator"], ["Give feedback", "/feedback"],
  ] },
  { title: "UniDoxia", links: [
    ["About us", "/about"], ["For universities", "/partnership"],
    ["For education agents", "/agents/onboarding?next=%2Fauth%2Fsignup%3Frole%3Dagent"],
    ["Privacy policy", "/legal/privacy"], ["Terms of service", "/legal/terms"],
  ] },
];

function HomeSearch() {
  const navigate = useNavigate();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    navigate(query ? `/courses?${new URLSearchParams({ q: query })}` : "/courses");
  }

  return (
    <section className="udx-search" aria-labelledby="course-search">
      <div className="udx-wrap udx-search-inner">
        <div>
          <h2 id="course-search">What would you like to study?</h2>
          <p>Explore the catalogue by subject or university.</p>
        </div>
        <form action="/courses" method="get" onSubmit={search} role="search" aria-labelledby="course-search">
          <label className="udx-sr-only" htmlFor="course-query">Course or university</label>
          <div className="udx-search-field">
            <Search size={18} aria-hidden="true" />
            <input id="course-query" name="q" type="search" placeholder="Try nursing or business" />
          </div>
          <button type="submit" className="udx-button">Search courses <ArrowRight size={17} aria-hidden="true" /></button>
        </form>
      </div>
    </section>
  );
}

function HomeFooter() {
  return (
    <footer className="udx-footer">
      <div className="udx-wrap">
        <div className="udx-footer-grid">
          <div className="udx-footer-about">
            <HomeBrand />
            <p>University discovery and application guidance for students from Africa.</p>
            <a href={`mailto:${business.email}`}>{business.email}</a>
          </div>
          {footerGroups.map(({ title, links }) => (
            <div key={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([label, href]) => <li key={href}><HomeLink href={href}>{label}</HomeLink></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="udx-legal"><p>{businessFooter}</p><ThemeToggle className="motion-reduce:transform-none motion-reduce:transition-none" /></div>
      </div>
    </footer>
  );
}

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="udx-home">
      <SEO title={homeTitle} description={homeDescription} canonicalPath="/" jsonLd={organisation} />
      <HomeHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="udx-hero">
          <div className="udx-wrap udx-hero-grid">
            <div className="udx-hero-copy">
              <p className="udx-kicker">{homeEyebrow}</p>
              <h1>{homeHeadline[0]} <span>{homeHeadline[1]}</span></h1>
              <p className="udx-intro">{homeIntro}</p>
              <div className="udx-actions">
                <Link className="udx-button" to="/courses">Find a course <ArrowRight size={18} aria-hidden="true" /></Link>
                <a className="udx-text-link" href="#how-it-works">How it works <ArrowDown size={16} aria-hidden="true" /></a>
              </div>
            </div>
            <img className="udx-hero-photo" {...homePhoto} fetchPriority="high" />
          </div>
        </section>

        <HomeSearch />

        <section className="udx-section udx-wrap" id="destinations" tabIndex={-1} aria-labelledby="destinations-title">
          <div className="udx-section-head">
            <div>
              <p className="udx-kicker">Study destinations</p>
              <h2 id="destinations-title">Where could you study?</h2>
            </div>
            <p>Get to know the UK, or browse courses by country to see what’s available elsewhere.</p>
          </div>
          <div className="udx-destination-grid">
            <article className="udx-uk">
              <img src="/home/london.webp" srcSet="/home/london-660.webp 660w, /home/london.webp 1000w" sizes="(max-width: 767px) calc(100vw - 32px), 650px" width={1000} height={688} alt="Westminster Bridge and the Houses of Parliament in London" loading="lazy" decoding="async" />
              <div>
                <h3>United Kingdom</h3>
                <Link className="udx-text-link" to="/destinations/united-kingdom">Read the UK study guide <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </article>
            <div className="udx-other-destinations">
              <h3>Browse by country</h3>
              <ul>
                {destinations.map(({ name, country }) => (
                  <li key={name}>
                    <Link to={`/courses?${new URLSearchParams({ country })}`}>
                      {name} <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="udx-text-link" to="/universities">View the university directory <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
          <FeaturedUniversitiesSection />
        </section>

        <section className="udx-section udx-journey" id="how-it-works" tabIndex={-1} aria-labelledby="journey-title">
          <div className="udx-wrap">
            <div className="udx-section-head">
              <div>
                <p className="udx-kicker">How it works</p>
                <h2 id="journey-title">From shortlist to next steps</h2>
              </div>
              <p>See what you can do on your own and where an adviser can help.</p>
            </div>
            <ol className="udx-steps">
              {steps.map(({ title, text }, index) => (
                <li key={title}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <div className="udx-training">
              <p>UniDoxia’s leadership has completed the British Council UK knowledge agent and counsellor training.</p>
              <Link className="udx-text-link" to="/about">See training details <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="udx-section udx-wrap udx-faq" aria-labelledby="faq-title">
          <div>
            <p className="udx-kicker">Before you apply</p>
            <h2 id="faq-title">Common questions</h2>
            <Link className="udx-text-link" to="/faq">See all FAQs <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div>
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}<Plus size={20} aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="udx-next" aria-labelledby="next-title">
          <div className="udx-wrap udx-next-inner">
            <div>
              <p className="udx-kicker">Take the next step</p>
              <h2 id="next-title">Ready to apply?</h2>
              <p>Start your student profile or speak to an adviser about your plans.</p>
            </div>
            <div className="udx-actions">
              <Link className="udx-button" to={user ? "/dashboard" : studentSignup}>
                {user ? "Open your dashboard" : "Start your application"} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="udx-text-link" to="/free-consultation">Book a free consultation <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <div className="udx-wrap udx-support">
          <span>Need help?</span>
          <a className="udx-text-link" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={() => logFreeConsultationWhatsAppClick("homepage_support")}>Chat on WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>
          <button type="button" id="home-zoe-launcher" className="udx-text-link" onClick={() => window.dispatchEvent(new Event("zoe:home-request"))}>
            <MessageCircle size={16} aria-hidden="true" /> Ask Zoe, the AI assistant
          </button>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
