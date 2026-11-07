import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function FeaturedUniversitiesSection() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["featured-universities"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_featured_universities")
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!data?.length) {
    return (
      <div className="udx-featured udx-featured-state">
        <p role="status">{isLoading
          ? "Loading university highlights…"
          : error
            ? "University highlights are currently unavailable."
            : "Explore the full directory for available universities."}</p>
        {error && <button type="button" className="udx-text-link" onClick={() => void refetch()}>Try again</button>}
        {!isLoading && <Link className="udx-text-link" to="/universities">Browse the university directory <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      </div>
    );
  }

  return (
    <section className="udx-featured" aria-labelledby="featured-universities-title">
      <h2 id="featured-universities-title">Featured universities</h2>
      <p className="udx-featured-intro">Get to know an institution before exploring its courses, entry requirements and application routes.</p>
      <ul>
        {data.map((university) => (
          <li key={university.id}>
            <h3><Link to={`/universities/${university.id}`}>
              {university.name} <ArrowUpRight size={16} aria-hidden="true" />
            </Link></h3>
            <p className="udx-university-location">{[university.city, university.country].filter(Boolean).join(", ")}</p>
            {university.featured_summary && <p className="udx-university-summary">{university.featured_summary}</p>}
            {university.featured_highlight && <p className="udx-university-source">{university.featured_highlight}</p>}
          </li>
        ))}
      </ul>
      <p className="udx-featured-disclaimer">Featured listings do not imply a formal recruitment partnership. Confirm current details with the institution.</p>
    </section>
  );
}
