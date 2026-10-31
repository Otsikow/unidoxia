import { Link } from "react-router-dom";
import { Mail, MessageCircle, MessagesSquare } from "lucide-react";
import {
  communicationTemplate,
  whatsAppLink,
  type ContactStudent,
  type ContactApplication,
} from "@/lib/studentCommunication";
export function StudentContactActions({
  student,
  application,
}: {
  student: ContactStudent;
  application?: ContactApplication | null;
}) {
  const draft = communicationTemplate("followup", student, application);
  const whatsapp = whatsAppLink(student, draft.body + "\n\nUniDoxia Team");
  const centre = `/admin/messages?student=${encodeURIComponent(student.id)}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to={centre}
        className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessagesSquare className="h-4 w-4" />
        Communication centre
      </Link>
      <Link
        to={`${centre}&channel=email`}
        className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Mail className="h-4 w-4" />
        Compose email
      </Link>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-green-700/30 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-green-950 dark:text-green-300"
        >
          <MessageCircle className="h-4 w-4" />
          Message on WhatsApp
        </a>
      ) : (
        <span className="self-center text-xs text-muted-foreground">
          Registered WhatsApp number needed
        </span>
      )}
    </div>
  );
}
