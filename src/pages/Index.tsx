import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MessageCircle, Plus, Search } from "lucide-react";
import type { FormEvent } from "react";
import { HomeBrand, HomeHeader } from "@/components/landing/HomeHeader";
import { FeaturedUniversitiesSection } from "@/components/landing/FeaturedUniversitiesSection";
import LatestFromBlog from "@/components/landing/LatestFromBlog";
import { HomeWhatsApp } from "@/components/landing/HomeWhatsApp";
import { HomePhotography } from "@/components/landing/HomePhotography";
import { HomePartnerships } from "@/components/landing/HomePartnerships";
import { HomeSocials } from "@/components/landing/HomeSocials";
import { HomeContact } from "@/components/landing/HomeContact";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";
import { business, businessFooter } from "@/config/business";
import { useAuth } from "@/hooks/useAuth";
import { logFreeConsultationWhatsAppClick } from "@/lib/analytics";
import { organisation } from "@/lib/publicSeo.mjs";
import { STUDY_DESTINATIONS } from "@/lib/studyDestinations";
import { destinationHref, homeDescription, homeDestinations, homeEyebrow, homeHeadline, homeIntro, homePhoto, homePhotoAvifSrcSet, homeSteps, homeAssurances, homeTitle, studentSignup } from "@/lib/homepage.mjs";
import "@/components/landing/home.css";

const WHATSAPP_URL = "https://wa.me/447360961803";

const questions = [
  { question: "How do I know if I can apply?", answer: <>Entry requirements vary by course and institution. Start with the <Link to="/courses">course listings</Link>, then check the university’s own requirements for your qualifications.</> },
  { question: "Which documents should I prepare?", answer: <>Start with your academic transcripts and certificates. Depending on your course, you may also need proof of identity, English language evidence, references or a personal statement.</> },
  { question: "What does it cost to get started?", answer: <>Your initial <Link to="/free-consultation">consultation is free</Link>. Optional paid support is separate. Check <Link to="/pricing">current service pricing</Link>, plan inclusions and any university or government charges before paying.</> },
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
    const fields = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["q", "country", "level"]) {
      const value = String(fields.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const query = params.toString();
    navigate(query ? `/courses?${query}` : "/courses");
  }

  return (
    <section className="udx-search" aria-labelledby="course-search">
      <div className="udx-wrap udx-search-inner">
        <div>
          <h2 id="course-search">What would you like to study?</h2>
          <p>Explore the catalogue by subject or university.</p>
        </div>
        <form action="/courses" method="get" onSubmit={search} role="search" aria-labelledby="course-search">
          <div className="udx-home-query">
            <label className="udx-search-label" htmlFor="course-query">Course or university</label>
            <div className="udx-search-field">
              <Search size={18} aria-hidden="true" />
              <input id="course-query" name="q" type="search" placeholder="Try nursing or business" />
            </div>
          </div>
          <div className="udx-home-country">
            <label className="udx-search-label" htmlFor="home-country">Destination</label>
            <select id="home-country" name="country" defaultValue="">
              <option value="">Any destination</option>
              {STUDY_DESTINATIONS.map(country => <option key={country}>{country}</option>)}
            </select>
          </div>
          <div className="udx-home-level">
            <label className="udx-search-label" htmlFor="home-level">Study level</label>
            <select id="home-level" name="level" defaultValue="">
              <option value="">Any study level</option>
              <option>Undergraduate</option><option>Postgraduate</option><option value="PHD">PhD</option>
            </select>
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
            <div className="udx-footer-brand"><HomeBrand /><ThemeToggle className="motion-reduce:transform-none motion-reduce:transition-none" /></div>
            <p>University discovery and application guidance for students from Africa.</p>
            <a href={`mailto:${business.email}`}>{business.email}</a>
            <HomeSocials />
          </div>
          {footerGroups.map(({ title, links }) => (
            <div key={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([label, href]) => <li key={href}><Link to={href}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="udx-legal">{businessFooter}</p>
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
                <Link className="udx-text-link" to="/free-consultation">Free consultation <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
            <figure className="udx-hero-portrait">
              <picture>
                <source type="image/avif" srcSet={homePhotoAvifSrcSet} sizes={homePhoto.sizes} />
                <img className="udx-hero-photo" {...homePhoto} fetchPriority="high" />
              </picture>
            </figure>
          </div>
        </section>

        <HomeSearch />

        <section className="udx-section udx-wrap" id="destinations" tabIndex={-1} aria-labelledby="destinations-title">
          <div className="udx-section-head">
            <div>
              <p className="udx-kicker">Study destinations</p>
              <h2 id="destinations-title">Where could you study?</h2>
            </div>
            <p>Explore opportunities in the UK, North America, Australia and across Europe. These six destinations are a starting point — browse the live catalogue for other countries with available courses.</p>
          </div>
          <div className="udx-destination-grid">
            {homeDestinations.map(({ name, country, image, alt }) => (
              <article className="udx-destination" key={country}>
                <Link to={destinationHref(country)} aria-label={`Explore courses in ${name}`}>
                  <img
                    src={`/home/${image}.webp`}
                    srcSet={`/home/${image}-320.webp 320w, /home/${image}-660.webp 660w, /home/${image}.webp 1000w`}
                    sizes="(max-width: 519px) calc(50vw - 24px), (max-width: 959px) 44vw, 380px"
                    width={1000}
                    height={640}
                    alt={alt}
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                  />
                  <span className="udx-destination-name">{name}<ArrowUpRight size={19} aria-hidden="true" /></span>
                </Link>
                <p>Explore courses</p>
              </article>
            ))}
          </div>
          <div className="udx-destination-resources">
            <Link className="udx-text-link" to="/courses">Explore more destinations <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="udx-text-link" to="/universities">Browse all universities <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="udx-text-link" to="/destinations/united-kingdom">Read the UK study guide <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <FeaturedUniversitiesSection />
        </section>

        <section className="udx-section udx-journey" id="how-it-works" tabIndex={-1} aria-labelledby="journey-title">
          <div className="udx-wrap">
            <div className="udx-section-head">
              <div>
                <p className="udx-kicker">How it works</p>
                <h2 id="journey-title">A clear path from here</h2>
              </div>
              <p>Four steps to help you move from an idea to an informed application.</p>
            </div>
            <div className="udx-journey-grid">
              <HomePhotography image="study-planning" alt="Two students comparing notes and researching together with a laptop in a library" widths={[640, 1000]} ratio={.9} sizes="(max-width: 767px) calc(100vw - 32px), 40vw" />
              <ol className="udx-steps">
                {homeSteps.map(({ title, text, href, label }, index) => (
                  <li key={title}>
                    <span aria-hidden="true">0{index + 1}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <Link className="udx-text-link" to={href}>{label}<ArrowUpRight size={15} aria-hidden="true" /></Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="udx-assurance">
              {homeAssurances.map(({ title, text, href, label }) => (
                <div key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a className="udx-text-link" href={href}>{label}<ArrowUpRight size={16} aria-hidden="true" /></a>
                  {href.includes("training-certificate") && <Link className="udx-text-link" to="/about/eric-arthur">Eric Arthur’s credentials <ArrowUpRight size={16} aria-hidden="true" /></Link>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <LatestFromBlog />

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

        <HomePartnerships />

        <section className="udx-next" aria-labelledby="next-title">
          <div className="udx-wrap udx-next-inner">
            <HomePhotography image="next-chapter" alt="Students talking outside a university building with books and backpacks" widths={[640, 1000]} ratio={1.3} />
            <div className="udx-next-copy">
              <div>
                <p className="udx-kicker">Take the next step</p>
                <h2 id="next-title">Your next step starts here.</h2>
                <p>Have a course in mind? Create your profile and start preparing your application.</p>
              </div>
              <div className="udx-actions">
                <Link className="udx-button" to={user ? "/dashboard" : studentSignup}>
                  {user ? "Open your dashboard" : "Start your application"} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="udx-text-link" to="/free-consultation">Speak to an adviser <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
        </section>

        <div className="udx-wrap udx-support">
          <span>Need a little guidance?</span>
          <a className="udx-text-link" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={() => logFreeConsultationWhatsAppClick("homepage_support")}>Chat on WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>
          <button type="button" id="home-zoe-launcher" className="udx-text-link" onClick={() => window.dispatchEvent(new Event("zoe:home-request"))}>
            <MessageCircle size={16} aria-hidden="true" /> Ask Zoe
          </button>
        </div>
      <HomeContact />
      </main>
      <HomeFooter />
      <HomeWhatsApp />
    </div>
  );
}
