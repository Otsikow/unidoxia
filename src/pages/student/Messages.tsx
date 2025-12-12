import BackButton from '@/components/BackButton';
import MessagesDashboard from '@/components/messages/MessagesDashboard';

export default function Messages() {
  return (
    <div className="space-y-4">
      <BackButton variant="ghost" size="sm" fallback="/student/dashboard" />
      <MessagesDashboard />
    </div>
  );
}
