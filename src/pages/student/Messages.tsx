import BackButton from '@/components/BackButton';
import MessagesDashboard from '@/components/messages/MessagesDashboard';

export default function Messages() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 min-h-[calc(100vh-6rem)] pb-4">
      <BackButton variant="ghost" size="sm" fallback="/student/dashboard" />
      <MessagesDashboard />
    </div>
  );
}
