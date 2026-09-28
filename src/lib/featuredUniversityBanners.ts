import featuredPortsmouth from "@/assets/featured-portsmouth.jpg";
import featuredStJohns from "@/assets/featured-st-johns-newfoundland.jpg";
import featuredToowoomba from "@/assets/featured-toowoomba.jpg";
import featuredBremen from "@/assets/featured-bremen.jpg";
import featuredYorkStJohn from "@/assets/featured-york-st-john.jpg";
import featuredWrexham from "@/assets/featured-wrexham.jpg";
import featuredChester from "@/assets/featured-chester.jpg";

const PLACEHOLDER_BANNERS = [
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1568792923760-d70635a89fdc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&w=1200&q=80",
];

const COUNTRY_BANNERS: Record<string, string> = {
  "united kingdom": "https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=1200&q=80",
  uk: "https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=1200&q=80",
  canada: "https://images.unsplash.com/photo-1569596082827-c5e8990496a6?auto=format&fit=crop&w=1200&q=80",
  australia: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=1200&q=80",
  germany: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
  "united states": "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
  usa: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
  bahamas: "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80",
  france: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80",
  netherlands: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  ireland: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=1200&q=80",
  "new zealand": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1200&q=80",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
  japan: "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1200&q=80",
  "south korea": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80",
  china: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=1200&q=80",
  india: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
};

const CITY_BANNERS: Record<string, string> = {
  portsmouth: featuredPortsmouth,
  "st johns": featuredStJohns,
  toowoomba: featuredToowoomba,
  bremen: featuredBremen,
  york: featuredYorkStJohn,
  wrexham: featuredWrexham,
  chester: featuredChester,
};

export const getPlaceholderBanner = (name: string, country: string | null, city: string | null = null) => {
  const cityKey = city?.toLowerCase().replaceAll(".", "").replaceAll("’", "").replaceAll("'", "").trim();
  if (cityKey && CITY_BANNERS[cityKey]) return CITY_BANNERS[cityKey];
  if (country && COUNTRY_BANNERS[country.toLowerCase()]) return COUNTRY_BANNERS[country.toLowerCase()];

  let hash = 0;
  for (let index = 0; index < name.length; index++) hash = name.charCodeAt(index) + ((hash << 5) - hash);
  return PLACEHOLDER_BANNERS[Math.abs(hash) % PLACEHOLDER_BANNERS.length];
};
