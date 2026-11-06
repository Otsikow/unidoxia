import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function FeaturedUniversitiesSection() {
  const { data } = useQuery({
    queryKey: ["featured-universities"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_featured_universities");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!data?.length) return null;

  return (
    <section className="udx-featured" aria-labelledby="featured-universities-title">
      <h3 id="featured-universities-title">Featured universities</h3>
      <ul>
        {data.map((university) => (
          <li key={university.id}>
            <Link to={`/universities/${university.id}`}>
              {university.name} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <p>{[university.city, university.country].filter(Boolean).join(", ")}</p>
          </li>
        ))}
      </ul>
      <p>Featured listings do not imply a formal recruitment partnership.</p>
    </section>
  );
}
