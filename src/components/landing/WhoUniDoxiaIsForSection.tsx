import { Users, Globe2, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function WhoUniDoxiaIsForSection() {
  const audience = [
    {
      title: "African Students",
      description: "Tailored specifically for students from Africa seeking global education opportunities.",
      icon: Globe2,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "First-time International Applicants",
      description: "Step-by-step support for those navigating the complex study abroad process for the first time.",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Students Who Want Guidance",
      description: "For those seeking clear direction and expert advice, moving away from confusion and uncertainty.",
      icon: Compass,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  return (
    <section className="container mx-auto px-4 py-20">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Who UniDoxia Is For</h2>
      
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {audience.map((item, index) => (
          <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${item.bg} ${item.color} mb-2`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-xl md:text-2xl font-medium text-primary">
          Built for African students ready to study abroad with confidence.
        </p>
      </div>
    </section>
  );
}

export default WhoUniDoxiaIsForSection;
