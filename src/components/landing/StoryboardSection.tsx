import { useTranslation } from "react-i18next";
import { UserPlus, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import storyboardProfile from "@/assets/university-buildings.png";
import storyboardMatched from "@/assets/agent-student-consulting.png";
import storyboardOffers from "@/assets/student-airport-travel.png";

type StoryboardStepKey = "profile" | "matched" | "offers";

interface StoryboardStepConfig {
  key: StoryboardStepKey;
  icon: typeof UserPlus;
  image: string;
}

const STEP_CONFIG: StoryboardStepConfig[] = [
  { key: "profile", icon: UserPlus, image: storyboardProfile },
  { key: "matched", icon: Users, image: storyboardMatched },
  { key: "offers", icon: Award, image: storyboardOffers },
];

const STEP_COPY: Record<StoryboardStepKey, { title: string; description: string; support: string; imageAlt: string }> = {
  profile: {
    title: "Create your profile",
    description: "Add your academic background, study preferences and contact details.",
    support: "Use clear checklists to see which information and documents are still needed.",
    imageAlt: "Student creating an international study profile",
  },
  matched: {
    title: "Explore suitable options",
    description: "Search courses and review possible matches using the information available to UniDoxia.",
    support: "Check published requirements and discuss uncertain details with an adviser or institution.",
    imageAlt: "Student reviewing course options with an education adviser",
  },
  offers: {
    title: "Apply and track progress",
    description: "Prepare applications, respond to document requests and follow status updates.",
    support: "Admission and visa decisions remain solely with the relevant institution and authority.",
    imageAlt: "Student reviewing an international study application checklist",
  },
};

const StoryboardSection = () => {
  const { t } = useTranslation();

  const heading = "Your Journey in 3 Clear Steps";
  const subheading = "Build your profile, explore suitable study options and manage your applications in one place.";

  const steps = STEP_CONFIG.map((step) => {
    return {
      ...step,
      ...STEP_COPY[step.key],
    };
  });

  return (
    <section className="bg-primary/5 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-4xl font-bold">{heading}</h2>
          <p className="text-muted-foreground">{subheading}</p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((scene, index) => (
            <div key={scene.key} className="group relative">
              {index < steps.length - 1 && (
                <div
                  className="absolute right-[-18px] top-1/2 hidden h-px w-10 bg-primary/20 md:block"
                  aria-hidden="true"
                />
              )}
              <Card className="h-full border-primary/20 transition-all duration-300 group-hover:-translate-y-2 group-hover:border-primary group-hover:shadow-xl">
                <CardContent className="flex h-full flex-col gap-5 p-6 text-center">
                  <div className="relative w-full overflow-hidden rounded-xl shadow-lg ring-1 ring-primary/10">
                    <img
                      src={scene.image}
                      alt={scene.imageAlt}
                      className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {t("pages.index.storyboard.stepLabel", { number: index + 1 })}
                  </div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <scene.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{scene.title}</h3>
                    <p className="text-sm text-muted-foreground">{scene.description}</p>
                  </div>
                  <div className="mt-auto w-full rounded-lg bg-background/70 p-3 text-sm font-medium text-primary shadow-inner">
                    {scene.support}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { StoryboardSection };
export default StoryboardSection;
