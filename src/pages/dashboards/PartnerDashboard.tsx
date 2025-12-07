"use client";

import { Navigate, useLocation } from "react-router-dom";

const getUniversityRouteForPartnerView = (viewParam: string | null) => {
  switch (viewParam) {
    case "applications":
      return "/university/applications";
    case "documents":
      return "/university/documents";
    case "offers":
      return "/university/offers";
    case "messages":
      return "/university/messages";
    case "analytics":
      return "/university/analytics";
    case "programs":
      return "/university/programs";
    case "overview":
    case null:
    default:
      return "/university";
  }
};

export default function PartnerDashboard() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const target = getUniversityRouteForPartnerView(params.get("view"));
  return <Navigate to={target} replace />;
}
