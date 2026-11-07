import { whatsappIconPath } from "@/lib/homepage.mjs";
import { logFreeConsultationWhatsAppClick } from "@/lib/analytics";

export function HomeWhatsApp() {
  return (
    <a
      className="udx-whatsapp"
      href="https://wa.me/447360961803"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with UniDoxia on WhatsApp (opens in a new tab)"
      onClick={() => logFreeConsultationWhatsAppClick("homepage_launcher")}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d={whatsappIconPath} />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}
