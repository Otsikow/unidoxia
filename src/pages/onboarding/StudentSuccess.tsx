import { Navigate } from "react-router-dom";

/**
 * Legacy onboarding route retained for compatibility.
 * Fictional testimonial content was removed; students now continue to the
 * application-start flow where they can build a real profile.
 */
export default function OnboardingStudentSuccess() {
  return <Navigate to="/auth/signup?role=student" replace />;
}
