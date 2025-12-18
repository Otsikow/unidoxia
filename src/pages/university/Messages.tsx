import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MessagesDashboard from "@/components/messages/MessagesDashboard";
import { withUniversityCardStyles } from "@/components/university/common/cardStyles";
import { supabase } from "@/integrations/supabase/client";

export default function UniversityMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isResolvingContact, setIsResolvingContact] = useState(false);
  
  // Get contact, applicationId, or studentId parameter from URL (used when navigating from various pages)
  const contactId = useMemo(() => searchParams.get("contact"), [searchParams]);
  const applicationId = useMemo(() => searchParams.get("applicationId"), [searchParams]);
  const studentId = useMemo(() => searchParams.get("studentId"), [searchParams]);

  // Resolve studentId to a student's profile_id
  useEffect(() => {
    const resolveStudentContact = async () => {
      if (!studentId || isResolvingContact) return;
      
      setIsResolvingContact(true);
      try {
        // Look up the student to get their profile_id
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("profile_id")
          .eq("id", studentId)
          .single();
        
        if (studentError || !studentData?.profile_id) {
          console.error("Failed to find student profile:", studentError);
          return;
        }
        
        // Store the profile ID in session storage so MessagesDashboard can pick it up
        sessionStorage.setItem("messaging_start_contact", studentData.profile_id);
      } catch (error) {
        console.error("Error resolving student contact:", error);
      } finally {
        // Clear the studentId from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("studentId");
        setSearchParams(newParams, { replace: true });
        setIsResolvingContact(false);
      }
    };
    
    void resolveStudentContact();
  }, [studentId, isResolvingContact, searchParams, setSearchParams]);

  // Resolve applicationId to a student's profile_id
  useEffect(() => {
    const resolveApplicationContact = async () => {
      if (!applicationId || isResolvingContact) return;
      
      setIsResolvingContact(true);
      try {
        // Look up the application to get the student_id
        const { data: appData, error: appError } = await supabase
          .from("applications")
          .select("student_id")
          .eq("id", applicationId)
          .single();
        
        if (appError || !appData?.student_id) {
          console.error("Failed to find application:", appError);
          return;
        }
        
        // Look up the student to get their profile_id
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("profile_id")
          .eq("id", appData.student_id)
          .single();
        
        if (studentError || !studentData?.profile_id) {
          console.error("Failed to find student profile:", studentError);
          return;
        }
        
        // Store the profile ID in session storage so MessagesDashboard can pick it up
        sessionStorage.setItem("messaging_start_contact", studentData.profile_id);
      } catch (error) {
        console.error("Error resolving application contact:", error);
      } finally {
        // Clear the applicationId from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("applicationId");
        setSearchParams(newParams, { replace: true });
        setIsResolvingContact(false);
      }
    };
    
    void resolveApplicationContact();
  }, [applicationId, isResolvingContact, searchParams, setSearchParams]);

  // Handle direct contact parameter (legacy/direct contact ID)
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
            Message students, referring agents, or contact UniDoxia support.
          </p>
        </div>
      </header>

      <MessagesDashboard />
    </div>
  );
}
