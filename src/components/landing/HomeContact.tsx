import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { business } from "@/config/business";

const ContactForm = lazy(() => import("@/components/ContactForm").then(module => ({ default: module.ContactForm })));

export function HomeContact() {
  const [activated, setActivated] = useState(false);
  return (
    <div className="udx-wrap">
      <details className="udx-home-contact" id="homepage-enquiry" onToggle={event => {
        if (event.currentTarget.open) setActivated(true);
      }}>
        <summary>Send the team a message <Plus size={20} aria-hidden="true" /></summary>
        <div className="udx-contact-content">
          <div>
            <h2>Have a question?</h2>
            <p>Tell us about your study plans or ask the team a question. You can also email <a href={`mailto:${business.email}`}>{business.email}</a>.</p>
            <p>For a free conversation about your options, <Link to="/free-consultation">book a consultation</Link>.</p>
            <p className="udx-contact-privacy">We use these details to respond to your enquiry. Read our <Link to="/legal/privacy">Privacy Notice</Link>.</p>
          </div>
          {activated && <Suspense fallback={<p role="status">Loading the enquiry form…</p>}><ContactForm /></Suspense>}
        </div>
      </details>
    </div>
  );
}
