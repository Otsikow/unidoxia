import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { homePartnerships } from "@/lib/homeEditorial.mjs";
import { HomePhotography } from "./HomePhotography";

export function HomePartnerships() {
  return (
    <section className="udx-section udx-partnerships" aria-labelledby="partnerships-title">
      <div className="udx-wrap">
        <div className="udx-section-head">
          <div><p className="udx-kicker">Work with UniDoxia</p><h2 id="partnerships-title">Recruit students with UniDoxia</h2></div>
          <p>We welcome enquiries from education agents, universities and colleges interested in recruiting students from Africa.</p>
        </div>
        <div className="udx-partnership-grid">
          {homePartnerships.map(partner => (
            <article key={partner.href}>
              <HomePhotography image={partner.image} alt={partner.alt} />
              <div className="udx-partnership-copy">
                <p className="udx-partnership-audience">{partner.audience}</p>
                <h3>{partner.title}</h3>
                <p>{partner.text}</p>
                <Link className="udx-text-link" to={partner.href}>{partner.label}<ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
