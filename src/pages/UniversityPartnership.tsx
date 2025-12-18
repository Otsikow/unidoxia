import { UniversityPartnershipForm } from "@/components/forms/UniversityPartnershipForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  GraduationCap,
  Handshake,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const stats = [
  {
    value: "120+",
    label: "Active university partners",
  },
  {
    value: "38",
    label: "Countries with enrolled students",
  },
  {
    value: "92%",
    label: "Offer-to-enrollment conversion rate",
  },
  {
    value: "24h",
    label: "Average response time",
  },
];

const benefits = [
  {
    icon: Globe2,
    title: "Global reach with local insights",
    description:
      "Tap into our vetted agency network and on-the-ground specialists covering key recruitment regions across Asia, Africa, and Latin America.",
  },
  {
    icon: GraduationCap,
    title: "Quality applicants, ready to enroll",
    description:
      "Receive fully screened applications with verified academic records, English proficiency, and financial documentation before review.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance-first processes",
    description:
      "Every partner operates under shared quality guidelines, with document validation, visa-readiness reviews, and transparent reporting dashboards.",
  },
];

const highlights = [
  {
    icon: Users,
    title: "Dedicated partnership manager",
    description: "A single point-of-contact to align enrollment goals, market plans, and ongoing campaign performance.",
  },
  {
    icon: BarChart3,
    title: "Actionable market intelligence",
    description: "Quarterly performance reviews, applicant funnel analytics, and recommendations backed by live student demand data.",
  },
  {
    icon: Layers,
    title: "Integrated student services",
    description: "On-platform counseling, document management, visa support, and arrival preparation to improve conversion at every stage.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Introduce your institution",
    description: "Share your portfolio, target regions, and desired start dates. We assess fit and shortlist relevant recruitment specialists.",
  },
  {
    step: "02",
    title: "Co-design the launch plan",
    description: "We align on program priorities, marketing collateral, qualification criteria, and the engagement model that suits your team.",
  },
  {
    step: "03",
    title: "Activate and optimize",
    description: "Track applications in real time, collaborate with our admissions support team, and iterate recruitment strategies with quarterly reviews.",
  },
];

const faqs = [
  {
    question: "Which institutions are the best fit?",
    answer:
      "We typically collaborate with accredited universities, colleges, and pathway providers that prioritize student experience, have competitive academic offerings, and maintain clear admissions guidelines.",
  },
  {
    question: "Is there a cost to join the network?",
    answer:
      "There is no upfront fee. We agree on transparent revenue-sharing terms tailored to your programs and recruitment targets during onboarding.",
  },
  {
    question: "How quickly can we start receiving applications?",
    answer:
      "Most partners complete onboarding within four weeks, including training, content setup, and activation of the recommended recruitment channels.",
  },
];

const UniversityPartnership = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="University Partnerships - UniDoxia"
        description="Partner with UniDoxia to grow your international student enrollment. Access our network of vetted agents and qualified applicants."
        keywords="university partnership, student recruitment, international enrollment, education agent network, international student recruitment, university recruitment"
      />
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                <Handshake className="h-3.5 w-3.5" />
                Trusted university network
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Grow international enrollment with a strategic partner
              </h1>
              <p className="text-lg text-muted-foreground">
                UniDoxia connects your admissions team with motivated learners, data-backed market insights, and the shared infrastructure you need to scale responsibly across borders.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#partnership-form" className="flex items-center gap-2">
                    Start the conversation
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/contact">Talk to our team</Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat) => (
                  <Card key={stat.label} className="border-dashed">
                    <CardContent className="space-y-1 p-4">
                      <p className="text-3xl font-semibold text-primary">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-primary/30 bg-primary/5 shadow-lg shadow-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Partnership readiness checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Ensure you have the key details ready for a smooth onboarding conversation:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                    Accreditation status and flagship programs
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 text-primary" />
                    Target student markets and annual enrollment goals
                  </li>
                  <li className="flex items-start gap-2">
                    <Globe2 className="mt-0.5 h-4 w-4 text-primary" />
                    Available marketing assets and regional activities
                  </li>
                  <li className="flex items-start gap-2">
                    <Layers className="mt-0.5 h-4 w-4 text-primary" />
                    Support services and scholarship options for incoming students
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-background/80 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl space-y-10">
            <div className="space-y-3 text-center">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Why universities choose UniDoxia
              </Badge>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Purpose-built partnerships that balance quality and scale
              </h2>
              <p className="text-muted-foreground">
                Our team combines admissions expertise, compliance-first workflows, and a shared technology platform so you can grow with confidence.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="h-full border-primary/20">
                  <CardContent className="space-y-3 p-6">
                    <benefit.icon className="h-10 w-10 text-primary" />
                    <h3 className="text-lg font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <Card key={item.title} className="border border-primary/10 bg-card/80">
                <CardContent className="space-y-3 p-6">
                  <item.icon className="h-10 w-10 text-primary" />
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden border border-primary/20">
            <div className="grid gap-0 md:grid-cols-3">
              {workflow.map((stage) => (
                <div key={stage.title} className="space-y-3 border-t border-primary/10 p-6 first:border-t-0 md:border-l md:first:border-l-0 md:border-t-0">
                  <p className="text-sm font-semibold text-primary">Step {stage.step}</p>
                  <h3 className="text-lg font-semibold">{stage.title}</h3>
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="partnership-form" className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Tell us about your university</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete the form and our partnerships team will reach out with a tailored onboarding plan.
                </p>
              </CardHeader>
              <CardContent>
                <UniversityPartnershipForm />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Handshake className="h-5 w-5 text-primary" />
                    What happens next?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Our partnerships team will:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      Review your goals and confirm alignment within two business days.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      Schedule a discovery call to dive into program priorities and admission requirements.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      Share a draft go-to-market plan and next steps for legal onboarding.
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-xl font-semibold">Already gathering documentation?</h3>
                  <p className="text-sm opacity-90">
                    Access our onboarding toolkit with sample agreements, marketing guidelines, and compliance checklist.
                  </p>
                  <Button variant="secondary" asChild>
                    <Link to="/contact">Request the toolkit</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Frequently asked questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  {faqs.map((faq) => (
                    <div key={faq.question} className="space-y-1">
                      <p className="font-semibold text-foreground">{faq.question}</p>
                      <p>{faq.answer}</p>
                      <Separator className="my-3" />
                    </div>
                  ))}
                  <p>
                    Still have questions? <Link to="/contact" className="font-medium text-primary">Connect with our team</Link>.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UniversityPartnership;
