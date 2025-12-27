import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function DashboardNotifications() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-fade-in">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">Notifications</h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Stay updated on applications, messages, and important events
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <NotificationCenter />
      </div>
    </div>
  );
}
