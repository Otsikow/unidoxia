import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import MessagesDashboard from "@/components/messages/MessagesDashboard";
import { withUniversityCardStyles } from "@/components/university/common/cardStyles";

export default function UniversityMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get contact parameter from URL (used when navigating from application review)
  const contactId = useMemo(() => searchParams.get("contact"), [searchParams]);

  // Clear contact parameter from URL after it's been read
  // This is handled by the MessagesDashboard which will start the conversation
  useEffect(() => {
    if (contactId) {
      // Store the contact ID in session storage so MessagesDashboard can pick it up
      sessionStorage.setItem("messaging_start_contact", contactId);
      // Remove from URL to prevent re-triggering
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("contact");
      setSearchParams(newParams, { replace: true });
    }
  }, [contactId, searchParams, setSearchParams]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 sm:gap-6 pb-4">
      <header
        className={withUniversityCardStyles(
          "flex flex-col gap-2 rounded-2xl sm:rounded-3xl px-4 py-4 sm:px-6 sm:py-6 text-card-foreground md:flex-row md:items-center md:justify-between",
        )}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground md:text-3xl">
            University Messages
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Message students and referring agents about submitted applications.
          </p>
        </div>
      </header>

      <MessagesDashboard />
    </div>
  );
}
