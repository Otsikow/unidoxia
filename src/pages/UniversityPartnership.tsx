import { Link } from "react-router-dom";
import { ArrowRight, Building2, FileCheck2, Globe2, Handshake, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { UniversityPartnershipForm } from "@/components/forms/UniversityPartnershipForm";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const recruitmentModel = [
  { icon: Users, title: "Direct and agent-supported recruitment", description: "Engage prospective students who apply directly or receive authorised support from recruitment professionals." },
  { icon: LayoutDashboard, title: "Centralised application workflow", description: "Use structured student profiles, document handling and application tracking where enabled in the platform." },
  { icon: FileCheck2, title: "Clear requirements and review", description: "Share programme criteria and identify missing information before an application moves forward." },
];

const technology = [
  "Student profiles and application records",
  "Authorised document upload and review workflows",
  "Agent and applicant progress tracking",
  "Zoe AI-assisted platform guidance",
  "Status and reporting tools where supported",
];

const qualityControls = [
  "Student consent and role-based access",
  "Controlled access to personal documents",
  "Agent expectations and accountable workflows",
  "Data-protection processes designed around GDPR principles",
];

const UniversityPartnership = () => (
  <div className="min-h-screen bg-gradient-subtle">
    <SEO
      title="International Student Recruitment Partnerships | UniDoxia"
      description="Discuss an international student recruitment partnership with UniDoxia, with a strong focus on African student markets and transparent application workflows."
      canonicalPath="/partnership"
      keywords="international student recruitment, African student recruitment, university partnership, education agent platform"
    />

    <section className="container mx-auto px-4 py-14 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <Badge className="gap-2 rounded-full px-3 py-1"><Globe2 className="h-4 w-4" /> University recruitment enquiries</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Reach more international students through UniDoxia</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            UniDoxia connects universities with prospective international students and recruitment partners, with a strong focus on African student markets while supporting global reach.
          </p>
          <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            A university appearing in UniDoxia search or featured listings is not, by itself, a formal recruitment partner or an endorsement of UniDoxia. Formal relationships require a separate written agreement.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><a href="#partnership-form">Discuss a Recruitment Partnership <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
            <Button asChild size="lg" variant="outline"><Link to="/contact">Contact our team</Link></Button>
          </div>
        </div>

        <Card className="border-primary/25 bg-background/95 shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5 text-primary" /> A transparent first conversation</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>We will ask about your institution, recruitment priorities, admissions criteria, markets and preferred operating model.</p>
            <p>No listing, enquiry or introductory call creates a formal partnership. Commercial terms, responsibilities and approval processes must be agreed separately.</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <section className="border-y bg-background/80 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Recruitment model</p>
            <h2 className="mt-3 text-3xl font-bold">A clearer route from student interest to application review</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {recruitmentModel.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="h-full border-primary/15"><CardContent className="p-6"><Icon className="h-9 w-9 text-primary" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></CardContent></Card>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" /> Recruitment markets</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">Our strongest recruitment focus is Africa, while the platform can support prospective students and recruitment activity across international markets. Reach and outcomes are discussed using available evidence, not invented volumes.</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Technology</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-muted-foreground">{technology.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Quality and compliance</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-muted-foreground">{qualityControls.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
      </div>
    </section>

    <section id="partnership-form" className="border-t bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Card><CardHeader><CardTitle className="text-2xl">Discuss a recruitment partnership</CardTitle><p className="text-sm text-muted-foreground">Tell us about your institution and objectives. Submitting this form starts an enquiry only; it does not create a formal partnership.</p></CardHeader><CardContent><UniversityPartnershipForm /></CardContent></Card>
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">What happens next</h2>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li><strong className="text-foreground">1. Initial review:</strong> We review the institution, markets and proposed recruitment scope.</li>
              <li><strong className="text-foreground">2. Discovery discussion:</strong> Both sides clarify admissions requirements, responsibilities and technology needs.</li>
              <li><strong className="text-foreground">3. Due diligence and agreement:</strong> Any formal relationship proceeds only after appropriate checks and a written agreement.</li>
              <li><strong className="text-foreground">4. Controlled activation:</strong> Approved programmes, workflows and access are configured for the agreed scope.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default UniversityPartnership;
