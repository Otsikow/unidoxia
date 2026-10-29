import { FormEvent, ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, ShieldCheck, UserPlus, Wallet } from "lucide-react";

import referStudentsPhoto from "@/assets/refer-students-campus.webp";
import { SEO, SITE_ORIGIN } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { business } from "@/config/business";
import {
  REFERRAL_HEADLINE_MODE,
  REFERRAL_PAGE_PUBLIC,
  REFERRAL_REWARD_BANDS,
  REFERRAL_SEO_DESCRIPTION,
  REFERRAL_SEO_TITLE,
  REFERRAL_SHOW_REVIEW_NOTES,
  ReferralHeadlineMode,
  buildReferralWhatsAppUrl,
  getReferralHeadline,
  showsMoneyFigures,
} from "@/config/referral";

/**
 * UniDoxia Refer & Earn (unidoxia.com/refer).
 * Terms text: Kojo, "UniDoxia Refer & Earn: terms" (29 October 2026): section D, the v2.1 clauses
 * 4A to 4C, and the v2.3 no-figure wording in section I (subtitle, clause 1, clause 4, 4A and the
 * "How your reward is worked out" section). The v2.2 £ table renders only in '£500' mode.
 * Square-bracket items are Eric's decisions and stay visibly flagged until he fills them in.
 * No referral data is stored by the website: the form only opens WhatsApp with a prefilled message.
 *
 * Photo: Pexels 8199611, "Smiling Students in Library" by Yan Krukau, Pexels Licence
 * (https://www.pexels.com/photo/smiling-students-in-library-8199611/). Recorded in
 * unidoxia/referral-2026-10-29/v1/SOURCES.md. No overlay or shade.
 */

/** Visible marker for a placeholder or a decision Kojo's terms leave to Eric. */
const ForEric = ({ children }: { children: ReactNode }) => (
  <mark
    data-testid="for-eric"
    className="rounded-sm bg-amber-100 py-0.5 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
  >
    {children}
  </mark>
);

const STEPS = [
  {
    icon: UserPlus,
    title: "Introduce a friend",
    text: "Tell us your friend's first name, with their permission, or ask them to give your name when they first contact UniDoxia.",
  },
  {
    icon: ShieldCheck,
    title: "We confirm the reward",
    text: "Before your friend applies, we tell you in writing whether their course qualifies and how much you will get.",
  },
  {
    icon: Wallet,
    title: "Get paid after enrolment",
    text: "We pay within 30 days of receiving our commission, in pounds sterling, by bank transfer or mobile money.",
  },
];

type ReferProps = {
  /** Override for tests and previews. Defaults to REFERRAL_HEADLINE_MODE in src/config/referral.ts. */
  headlineMode?: ReferralHeadlineMode;
};

const Refer = ({ headlineMode = REFERRAL_HEADLINE_MODE }: ReferProps) => {
  const headline = getReferralHeadline(headlineMode);
  const showMoney = showsMoneyFigures(headlineMode);
  const [referrerName, setReferrerName] = useState("");
  const [referrerContact, setReferrerContact] = useState("");
  const [friendFirstName, setFriendFirstName] = useState("");
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [hasFriendsPermission, setHasFriendsPermission] = useState(false);
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);

  const detailsComplete =
    referrerName.trim().length > 0 && referrerContact.trim().length > 0 && friendFirstName.trim().length > 0;
  const canSubmit = detailsComplete && agreesToTerms && hasFriendsPermission;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const url = buildReferralWhatsAppUrl({ referrerName, referrerContact, friendFirstName });
    setOpenedUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-background">
      <SEO
        title={REFERRAL_SEO_TITLE}
        description={REFERRAL_SEO_DESCRIPTION}
        canonicalPath="/refer"
        robots={REFERRAL_PAGE_PUBLIC ? undefined : "noindex,nofollow"}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "UniDoxia Refer & Earn",
          url: `${SITE_ORIGIN}/refer`,
          publisher: { "@type": "Organization", name: "UniDoxia", url: SITE_ORIGIN },
        }}
      />

      <section className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              UniDoxia Refer &amp; Earn
            </p>
            <h1 data-testid="refer-headline" className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
              {headline.title}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{headline.subtitle}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Open to anyone aged 18 or over. Payment is subject to the identity, fraud and sanctions checks in clause 6.
              Terms below and at{" "}
              <span className="font-medium text-foreground">unidoxia.com/refer</span>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#refer-form">Refer a friend</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#terms">Read the terms</a>
              </Button>
            </div>
          </div>
          <figure className="overflow-hidden rounded-2xl border bg-muted shadow-lg">
            <img
              src={referStudentsPhoto}
              alt="Three smiling students from different backgrounds resting on stacks of books at a library table."
              width="1600"
              height="1067"
              className="aspect-[16/10] w-full object-cover object-center"
            />
          </figure>
        </div>

        {REFERRAL_SHOW_REVIEW_NOTES && (
          <aside
            aria-label="Draft review notes"
            className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <p className="font-semibold">Draft for review: not approved for launch.</p>
            <p className="mt-1">
              Items highlighted like <ForEric>this</ForEric> are placeholders or decisions for Eric in Kojo's terms
              v2.3. Still open: whether the page may ever show money figures (Kojo: no money amounts until rates
              are signed for named courses), the proposed exclusions and the 5 per 12 months limit (clauses 2 and 3), the privacy notice link and contact email (clauses 12 and 13), the
              "last updated" date, and what happens to the old $50 sign-up offer. Before launch: written disclosure
              to partners (and StudyIn's written consent), a check of the CourseFinder and ApplyBoard terms, and the
              clause 4B wording added to the privacy notice. Reward rates are unsigned or benchmark figures and no
              commission has been received yet.
            </p>
          </aside>
        )}
      </section>

      <section className="border-y bg-muted/40">
        <div className="container mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="h-full">
              <CardHeader className="pb-2">
                <Icon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {showMoney ? (
            <div id="reward-table" data-testid="reward-table">
              <h2 className="mb-3 text-2xl font-semibold">Reward table</h2>
              {REFERRAL_SHOW_REVIEW_NOTES && (
                <p className="mb-3 text-sm">
                  <ForEric>
                    For Eric: Kojo's CAP 3.7 ruling is not to publish any £ figure until rates are signed for named
                    courses.
                  </ForEric>
                </p>
              )}
              <p className="mb-4 text-muted-foreground">
                Your reward is 25% of the net commission UniDoxia actually receives for your friend's enrolment,
                rounded to these bands and capped at £500.
              </p>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commission UniDoxia receives for the student</TableHead>
                      <TableHead className="text-right">Your reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REFERRAL_REWARD_BANDS.map((band) => (
                      <TableRow key={band.commission}>
                        <TableCell>{band.commission}</TableCell>
                        <TableCell className="text-right font-semibold">{band.reward}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Based on what we receive; confirmed in writing before your friend applies. Some courses earn no reward.
              </p>
            </div>
          ) : (
            <div id="how-reward-works" data-testid="how-reward-works">
              <h2 className="mb-3 text-2xl font-semibold">How your reward is worked out</h2>
              <p className="text-muted-foreground">
                Your reward is a share of the commission UniDoxia receives from the university for your friend's
                course. Commission differs between universities and courses, so we confirm your reward in writing
                before your friend applies. Some courses don't qualify.
              </p>
            </div>
          )}

          <Card id="refer-form" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Refer a friend</CardTitle>
              <CardDescription>
                When you press the button, WhatsApp opens with your details in a message to UniDoxia (+44 7360
                961803). You send it yourself. Nothing is saved on this website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="referrer-name">Your name</Label>
                  <Input
                    id="referrer-name"
                    autoComplete="name"
                    value={referrerName}
                    onChange={(e) => setReferrerName(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referrer-contact">Your email or WhatsApp number</Label>
                  <Input
                    id="referrer-contact"
                    autoComplete="off"
                    inputMode="text"
                    value={referrerContact}
                    onChange={(e) => setReferrerContact(e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="friend-first-name">Your friend's first name</Label>
                  <Input
                    id="friend-first-name"
                    value={friendFirstName}
                    onChange={(e) => setFriendFirstName(e.target.value)}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent-terms"
                    aria-required="true"
                    checked={agreesToTerms}
                    onCheckedChange={(checked) => setAgreesToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent-terms" className="text-sm font-normal leading-snug">
                    I am 18 or over and I agree to the{" "}
                    <a href="#terms" className="underline underline-offset-2">
                      Refer &amp; Earn terms
                    </a>
                    .
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent-friend"
                    aria-required="true"
                    checked={hasFriendsPermission}
                    onCheckedChange={(checked) => setHasFriendsPermission(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent-friend" className="text-sm font-normal leading-snug">
                    My friend has agreed that I can share their first name with UniDoxia and introduce them.
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit}
                  aria-describedby="refer-submit-hint refer-privacy-note"
                >
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  Send referral on WhatsApp
                </Button>
                <p id="refer-submit-hint" className="text-sm text-muted-foreground" aria-live="polite">
                  {canSubmit
                    ? "Ready to send. WhatsApp will open with your message."
                    : "To send, fill in all 3 fields and tick both boxes."}
                </p>
                <p id="refer-privacy-note" className="text-sm text-muted-foreground">
                  Your message goes to UniDoxia through WhatsApp. See our{" "}
                  <Link to="/legal/privacy" className="underline underline-offset-2">
                    privacy notice
                  </Link>
                  .
                </p>
                {openedUrl && (
                  <p role="status" className="text-sm text-muted-foreground">
                    WhatsApp should now be open. If it did not open,{" "}
                    <a href={openedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      tap here to send your referral
                    </a>
                    .
                  </p>
                )}
              </form>
              <div className="mt-6 border-t pt-4">
                <p className="mb-3 text-sm text-muted-foreground">Prefer to just message us?</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={buildReferralWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Chat with UniDoxia on WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="terms" className="container mx-auto max-w-3xl scroll-mt-20 px-4 pb-16">
        <h2 className="mb-2 text-2xl font-semibold">UniDoxia Refer &amp; Earn: terms</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Run by {business.legalName}, trading as {business.name}, {business.address.streetAddress},{" "}
          {business.address.addressLocality} {business.address.postalCode}, United Kingdom (company{" "}
          {business.companyNumber}).
        </p>
        <ol className="space-y-4 text-muted-foreground [&_strong]:text-foreground">
          <li data-testid="terms-clause-1">
            <strong>1. What you can earn.</strong> Your reward is 25% of the net commission UniDoxia actually receives
            for your friend's enrolment, up to a maximum per student that we set. If our commission for a course is
            below the minimum we set, no reward is due, so some courses don't qualify. Before your friend applies, we
            confirm in writing whether their course qualifies and the exact amount, and that confirmed amount is what
            we pay. There is no reward for signing up or applying, only for successful enrolment.
          </li>
          <li>
            <strong>2. Who can take part.</strong> Anyone aged 18 or over.{" "}
            <ForEric>
              [Proposed exclusions for Eric: UniDoxia employees, contractors and agents and their households; employees
              of universities or colleges we work with; and anyone referring as part of a job in a school, government or
              other public body.]
            </ForEric>
          </li>
          <li>
            <strong>
              3. <ForEric>[Proposed limit for Eric:]</ForEric>
            </strong>{" "}
            You can earn rewards for up to 5 referred students in any 12 months. If you want to refer more, contact us
            about becoming a UniDoxia partner.
          </li>
          <li data-testid="terms-clause-4">
            <strong>4. How to refer.</strong> Use the form on this page (it opens a WhatsApp message to UniDoxia),
            message us on WhatsApp, or ask your friend to give your name when they first contact UniDoxia. Only share a friend's details with us if they have agreed. Your friend must be
            new to UniDoxia (not already registered with us or one of our partners) and must apply through UniDoxia.
          </li>
          <li>
            <strong>4A. You are not our agent.</strong> You can introduce friends and share this page, but you must not
            advise on courses, universities or visas, help fill in or submit applications, take any money or documents
            from students, or say you work for or represent UniDoxia. Visa and immigration advice in the UK is
            regulated, so leave all of that to us.
          </li>
          <li>
            <strong>4B. We tell students about rewards.</strong> We tell every referred student that we may pay a reward
            to the person who referred them, and that UniDoxia is paid commission by universities.
          </li>
          <li>
            <strong>4C. What we tell you about your friend.</strong> We only tell you whether a reward is due and how
            much. We don't share your friend's application details with you.
          </li>
          <li>
            <strong>5. What "successfully enrolled" means.</strong> Your friend has (a) accepted an offer and enrolled
            through UniDoxia, (b) stayed enrolled past the university's refund or census date, and (c) UniDoxia has
            received its full commission for that student. If the commission is later reclaimed by the university or
            our partner, no reward is due, and any reward already paid for that student may be recovered.
          </li>
          <li>
            <strong>6. When and how we pay.</strong> We pay within 30 days of receiving the commission. This is usually
            about 3 to 9 months after the course starts. We pay in pounds sterling (GBP) by bank transfer or mobile
            money, and UniDoxia pays the transfer fees. If your bank or mobile money provider converts the payment into
            another currency, its exchange rate applies. We'll ask for your full name, ID and payment details before
            paying. The account must be in your name, and we may run standard identity, fraud and sanctions checks.
          </li>
          <li>
            <strong>7. One reward per student.</strong> One reward is paid for each student, to the first person who
            referred them in our records, whatever the number of applications or courses.
          </li>
          <li>
            <strong>8. No self-referral.</strong> You can't refer yourself, directly or through another name, email or
            account. Fake, duplicate or misleading referrals earn nothing.
          </li>
          <li>
            <strong>9. Tax.</strong> You are responsible for any tax on rewards where you live.
          </li>
          <li>
            <strong>10. Changes and ending the scheme.</strong> We can change or end the scheme at any time by updating
            this page. A change won't reduce the reward we have already confirmed for a friend you referred before the
            change.
          </li>
          <li>
            <strong>11. Refusing a reward.</strong> We can refuse or recover a reward if these terms are broken or there
            is fraud, and we'll tell you why.
          </li>
          <li>
            <strong>12. Your data.</strong> We use your details and your friend's details to run the scheme and pay
            rewards, as set out in our{" "}
            <Link to="/legal/privacy" className="underline underline-offset-2">
              privacy notice
            </Link>{" "}
            <ForEric>[link: confirm once the clause 4B wording is in the privacy notice]</ForEric>. We won't send your
            friend marketing because of your referral unless they ask us to contact them.
          </li>
          <li data-testid="terms-clause-13">
            <strong>13. Law.</strong> These terms are governed by the law of England and Wales. Questions:{" "}
            <ForEric>
              <a href={`mailto:${business.email}`} className="underline underline-offset-2">
                {business.email}
              </a>{" "}
              [for Eric to confirm]
            </ForEric>
            .
          </li>
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          Last updated: <ForEric>[the go-live date]</ForEric>
        </p>
      </section>
    </div>
  );
};

export default Refer;
