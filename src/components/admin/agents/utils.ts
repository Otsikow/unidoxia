export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

export const normalizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  return digits.length >= 7 ? digits : null;
};

export const getWhatsAppUrl = (phone: string | null | undefined, message?: string): string | null => {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "suspended":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "at_risk":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const getComplianceColor = (status: string) => {
  switch (status) {
    case "verified":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "expired":
    case "missing":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};
