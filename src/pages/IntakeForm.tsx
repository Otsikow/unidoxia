import StudentIntakeForm from '@/components/forms/StudentIntakeForm';
import BackButton from '@/components/BackButton';
import professionalConsultant from '@/assets/professional-consultant.png';

export default function IntakeForm() {
  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="container mx-auto px-4 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 max-w-6xl mx-auto mb-8">
          <div className="flex-1 text-center md:text-left space-y-4 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Student Intake Form</h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Complete this form to start your international education journey with personalized guidance and support
            </p>
          </div>
          <div className="hidden md:block flex-shrink-0">
            <img 
              src={professionalConsultant} 
              alt="Professional education consultant" 
              className="w-64 h-64 object-cover rounded-2xl shadow-lg animate-fade-in"
            />
          </div>
        </div>
        <StudentIntakeForm />
      </div>
    </div>
  );
}