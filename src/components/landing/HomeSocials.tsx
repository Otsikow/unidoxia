import { homeSocials, homeSocialIcons } from "@/lib/homeEditorial.mjs";
import { whatsappIconPath } from "@/lib/homepage.mjs";

export function HomeSocials() {
  return (
    <nav className="udx-socials" aria-label="UniDoxia social media">
      {homeSocials.map(({ name, href, icon }) => {
        const art = icon === "whatsapp" ? { path: whatsappIconPath, stroke: false } : homeSocialIcons[icon];
        return (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`UniDoxia on ${name} (opens in a new tab)`} title={name}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill={art.stroke ? "none" : "currentColor"}
              stroke={art.stroke ? "currentColor" : undefined} strokeWidth={art.stroke ? 1.8 : undefined} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={art.path} />
            </svg>
          </a>
        );
      })}
    </nav>
  );
}
