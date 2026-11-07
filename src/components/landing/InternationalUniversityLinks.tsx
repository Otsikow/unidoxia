import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { internationalDirectoryIntro, internationalUniversityCandidates, selectInternationalUniversityListings } from '@/lib/homeInternationalUniversities';

export function InternationalUniversityLinks() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['landing', 'international-universities'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('universities')
        .select('id,slug,name,country,city,active,listing_status,verification_status,website,source_url,last_source_checked_at')
        .eq('active', true).neq('listing_status', 'archived')
        .in('verification_status', ['admin_verified', 'verified'])
        .in('slug', internationalUniversityCandidates.map(item => item.slug))
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return selectInternationalUniversityListings(data ?? []);
    },
  });

  if (!isLoading && !isError && !data?.length) return null;

  return <section className="udx-featured udx-international" aria-labelledby="international-universities-title">
    <h2 id="international-universities-title">Universities beyond the UK</h2>
    <p>{internationalDirectoryIntro}</p>
    {isLoading ? <p role="status">Loading international university listings…</p> : isError ? <div role="status">
      <p>International university listings are temporarily unavailable.</p>
      <button className="udx-text-link" type="button" onClick={() => void refetch()}>Try again</button>
      <Link className="udx-text-link" to="/universities">Browse the university directory</Link>
    </div> : <ul>{data?.map(university => <li key={university.id}>
      <p className="udx-university-location">{[university.city, university.country].filter(Boolean).join(', ')}</p>
      <h3><Link to={`/universities/${university.slug}`}>{university.name}<ArrowUpRight size={16} aria-hidden="true" /></Link></h3>
    </li>)}</ul>}
  </section>;
}
