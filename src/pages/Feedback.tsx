import UserFeedback from "@/components/analytics/UserFeedback";
import { SEO } from "@/components/SEO";

export default function FeedbackPage() {
  return (
    <>
      <SEO
        title="Feedback - UniDoxia"
        description="Share your feedback to help us improve the UniDoxia platform. We value your input on our services for students, agents, and universities."
        keywords="feedback, platform improvement, user suggestions, contact us, student recruitment platform feedback"
      />
      <h1 className="sr-only">Share your feedback</h1>
      <UserFeedback />
    </>
  );
}
