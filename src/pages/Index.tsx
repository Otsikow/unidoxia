import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, Plus } from "lucide-react";
import { HomeBrand, HomeHeader } from "@/components/landing/HomeHeader";
import { FeaturedUniversitiesSection } from "@/components/landing/FeaturedUniversitiesSection";
import { InternationalUniversityLinks } from "@/components/landing/InternationalUniversityLinks";
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
import { homeFooterGroups } from "@/lib/homeEditorial.mjs";
import { homeFooterIcons } from "@/lib/homeFooterIcons";
import { destinationHref, homeDescription, homeDestinations, homeEyebrow, homeHeadline, homeIntro, homePhoto, homePhotoAvifSrcSet, homeSteps, homeRegistrationSteps, homeAssurances, homeTraining, homeTitle, studentSignup } from "@/lib/homepage.mjs";
import "@/components/landing/home.css";

const WHATSAPP_URL = "https://wa.me/447360961803";

const questions = [
  { question: "Do I need to choose a university before registering?", answer: <>No. Register your interest and share your qualifications, preferred subjects, destinations and budget. Our advisers research suitable options for you to review.</> },
  { question: "Which documents should I upload?", answer: <>Start with your academic transcripts and certificates in your secure student account. Your adviser will explain any additional documents needed for your chosen options.</> },
  { question: "What does it cost to get started?", answer: <>Registration and your initial <Link to="/free-consultation">consultation are free</Link>. Optional paid support is separate. Check <Link to="/pricing">service pricing</Link>, plan inclusions and university or government charges before paying.</> },
  { question: "Who chooses my courses and universities?", answer: <>You make the final choice. We explain our recommendations, costs and requirements. Admission and scholarship decisions remain with the university or awarding body; outcomes are not guaranteed.</> },
];

function HomeRegistration() {
  return <section className="udx-registration" aria-labelledby="registration-title">
    <div className="udx-wrap udx-registration-inner">
      <div><p className="udx-kicker">Personalised university matching</p><h2 id="registration-title">Tell us your study plans. We’ll help you find the right university.</h2><p>You do not need to research every university yourself. Share your background and priorities, and our advisers will help you compare suitable options.</p></div>
      <div><ol className="udx-registration-steps">{homeRegistrationSteps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span>{step}</li>)}</ol><Link className="udx-button" to={studentSignup}>Register Your Interest <ArrowRight size={18} aria-hidden="true" /></Link><p className="udx-registration-fees">Registration and your initial consultation are free. <Link to="/pricing">Optional paid services and other fees</Link> are explained separately.</p></div>
    </div>
  </section>;
}

function HomeFooter() {
  return (
    <footer className="udx-footer">
      <div className="udx-wrap">
        <div className="udx-footer-grid">
          <div className="udx-footer-about">
            <div className="udx-footer-brand"><HomeBrand /><ThemeToggle className="motion-reduce:transform-none motion-reduce:transition-none" /></div>
            <p>Personalised university matching and admissions support for students from Africa.</p>
            <a href={`mailto:${business.email}`}><Mail size={16} strokeWidth={1.6} aria-hidden="true" /><span>{business.email}</span></a>
            <HomeSocials />
          </div>
          {homeFooterGroups.map(({ title, links }) => (
            <div key={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(({ label, href, icon }) => {
                  const Icon = homeFooterIcons[icon];
                  return <li key={href}><Link to={href}><Icon size={16} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link></li>;
                })}
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
                <Link className="udx-button" to={studentSignup}>Register Your Interest <ArrowRight size={18} aria-hidden="true" /></Link>
                <Link className="udx-text-link" to="/free-consultation">Book a Free Consultation <ArrowUpRight size={16} aria-hidden="true" /></Link>
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

        <HomeRegistration />

        <section className="udx-training" aria-labelledby="uk-knowledge-trained-heading">
          <div className="udx-training-inner">
            <div className="udx-training-main">
              <img className="udx-training-logo" src={homeTraining.logo} width={320} height={89} alt="British Council" loading="lazy" />
              <div>
                <h2 id="uk-knowledge-trained-heading">{homeTraining.title}</h2>
                <p className="udx-training-description">{homeTraining.text}</p>
              </div>
            </div>
            <Link className="udx-training-link" to={homeTraining.href}>{homeTraining.label}<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="udx-section udx-journey" id="how-it-works" tabIndex={-1} aria-labelledby="journey-title">
          <div className="udx-wrap">
            <div className="udx-section-head">
              <div>
                <p className="udx-kicker">How it works</p>
                <h2 id="journey-title">How UniDoxia works</h2>
              </div>
              <p>Share your background. We research suitable options, and you decide which applications to pursue.</p>
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
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="udx-section udx-wrap" id="destinations" tabIndex={-1} aria-labelledby="destinations-title">
          <div className="udx-section-head">
            <div>
              <p className="udx-kicker">Study destinations</p>
              <h2 id="destinations-title">Where could you study?</h2>
            </div>
            <p>Tell us where you would like to study. Our advisers can research options in these destinations. For other countries, <Link to="/free-consultation">ask us about current options</Link>.</p>
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
                <p>Optional course listings</p>
              </article>
            ))}
          </div>
          <div className="udx-destination-resources">
            <Link className="udx-text-link" to="/courses">Explore more destinations <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="udx-text-link" to="/universities">Browse all universities <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="udx-text-link" to="/destinations/united-kingdom">Read the UK study guide <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <FeaturedUniversitiesSection />
          <InternationalUniversityLinks />
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
                <p className="udx-kicker">Your application</p>
                <h2 id="next-title">Start with your study plans.</h2>
                <p>Create your account, share your qualifications and let our advisers help you find suitable university options.</p>
              </div>
              <div className="udx-actions">
                <Link className="udx-button" to={user ? "/dashboard" : studentSignup}>
                  {user ? "Open your dashboard" : "Register Your Interest"} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="udx-text-link" to="/free-consultation">Speak to an adviser <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
        </section>

        <div className="udx-wrap udx-support">
          <span>Need help?</span>
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
