import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonsProps {
  /** Post slug — used to build a crawler-friendly share URL. */
  slug: string;
  title: string;
  description?: string;
}

// Public share endpoint that serves per-post Open Graph metadata so link
// previews on WhatsApp / Facebook / LinkedIn / X / Slack / iMessage show the
// article title, description, and cover image. Humans are auto-redirected to
// the real article on unidoxia.com.
const SHARE_ORIGIN = "https://gbustuntgvmwkcttjojo.supabase.co/functions/v1/blog-share";
const buildShareUrl = (slug: string) => `${SHARE_ORIGIN}/${encodeURIComponent(slug)}`;

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2H21l-6.52 7.45L22 22h-6.828l-4.77-6.24L4.8 22H2l7-8L1.5 2h6.914l4.3 5.69L18.244 2Zm-1.196 18h1.86L7.05 4H5.05l12 16Z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.2C16.5 4.1 15.5 4 14.4 4c-2.4 0-4 1.4-4 4v2.8H7.7V14h2.7v8h3.1Z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.9-2 3.8-2 4.1 0 4.8 2.7 4.8 6.2V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 2.9V21h-4V9Z" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M20.5 3.5A11 11 0 0 0 3.2 17L2 22l5.2-1.2A11 11 0 1 0 20.5 3.5ZM12 20.1a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.3a.5.5 0 0 0 0-.5c0-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.2c0 1.3 1 2.6 1.1 2.8s1.9 2.9 4.7 4.1c1.7.7 2.3.8 3.1.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

export default function ShareButtons({ slug, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = buildShareUrl(slug);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(description ? `${title} — ${description}` : title);

  const links = [
    { name: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, Icon: XIcon },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: FacebookIcon },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, Icon: LinkedInIcon },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, Icon: WhatsAppIcon },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied — previews will show the article title and image.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: description, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article">
      <span className="text-sm font-medium text-muted-foreground mr-1">Share:</span>
      {links.map(({ name, href, Icon }) => (
        <Button
          key={name}
          asChild
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          title={`Share on ${name}`}
        >
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}>
            <Icon />
          </a>
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={handleCopy}
        title="Copy link"
        aria-label="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </Button>
      {typeof navigator !== "undefined" && (navigator as any).share && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 sm:hidden"
          onClick={handleNativeShare}
          title="Share"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
