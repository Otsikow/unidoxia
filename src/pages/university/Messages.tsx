import MessagesDashboard from "@/components/messages/MessagesDashboard";
import { withUniversityCardStyles } from "@/components/university/common/cardStyles";
export default function UniversityMessagesPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6">
      <header
        className={withUniversityCardStyles(
          "flex flex-col gap-2 rounded-3xl px-6 py-6 text-card-foreground md:flex-row md:items-center md:justify-between",
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            University Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Message students and referring agents about submitted applications.
          </p>
        </div>
      </header>

      <MessagesDashboard />
    </div>
  );
}
