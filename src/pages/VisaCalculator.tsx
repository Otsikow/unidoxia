import VisaCalculator from "@/components/visa/VisaCalculator";
import { SEO } from "@/components/SEO";

export default function VisaCalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Student Visa Calculator - UniDoxia"
        description="Estimate the requirements and timeline for your student visa application. Our tool helps you prepare for a successful visa process for your study abroad journey."
        keywords="student visa calculator, visa requirements, study abroad visa, visa application timeline, international student visa, university visa support"
      />
      <div className="container mx-auto px-4 py-8">
        <VisaCalculator />
      </div>
    </div>
  );
}