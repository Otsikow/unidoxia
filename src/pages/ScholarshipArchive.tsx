"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Archive as ArchiveIcon } from "lucide-react";

const db = supabase as any;

export default function ScholarshipArchive() {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["scholarship-archive"],
    queryFn: async () => {
      const { data, error } = await db
        .from("scholarships")
        .select("id, slug, title, name, institution_name, country, academic_year, deadline, status, last_verified_at")
        .in("status", ["Closed", "Archived"])
        .order("deadline", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r: any) =>
      [r.title, r.name, r.institution_name, r.country, r.academic_year]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  return (
    <div className="container max-w-5xl mx-auto py-10 space-y-6">
      <SEO
        title="Scholarship archive — closed & past awards | UniDoxia"
        description="Browse UniDoxia's archive of closed and past scholarship opportunities for reference. These awards are no longer accepting applications."
        canonicalPath="/scholarships/archive"
        robots="noindex,follow"
      />

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link to="/scholarships" className="hover:underline">Scholarships</Link>
          <span>/</span>
          <span>Archive</span>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArchiveIcon className="h-7 w-7" /> Scholarship archive
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Closed and archived opportunities kept for reference. These are not currently accepting applications — check
          our <Link to="/scholarships" className="underline">live scholarships</Link> for open awards.
        </p>
      </header>

      <div className="flex gap-2">
        <Input placeholder="Search archive…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No archived scholarships match your search.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {r.slug ? (
                      <Link to={`/scholarships/${r.slug}`} className="hover:underline">{r.title ?? r.name}</Link>
                    ) : (r.title ?? r.name)}
                  </CardTitle>
                  <CardDescription>
                    {r.institution_name}{r.country ? ` · ${r.country}` : ""}{r.academic_year ? ` · ${r.academic_year}` : ""}
                  </CardDescription>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex flex-wrap gap-4">
                {r.deadline && <span>Deadline was {format(new Date(r.deadline), "d MMM yyyy")}</span>}
                {r.last_verified_at && <span>Last verified {format(new Date(r.last_verified_at), "d MMM yyyy")}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-6">
        <Button asChild variant="outline"><Link to="/scholarships">Back to live scholarships</Link></Button>
      </div>
    </div>
  );
}
