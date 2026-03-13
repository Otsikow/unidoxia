export type ComplianceStatus = "verified" | "pending" | "expired" | "missing";
export type AgentStatus = "active" | "pending" | "suspended" | "at_risk";
export type PerformanceBand = "high" | "medium" | "low" | "declining";

export interface AgentRecord {
  id: string;
  profileId: string;
  name: string;
  companyName: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  status: AgentStatus;
  performanceBand: PerformanceBand;
  totalStudents: number;
  applicationsSubmitted: number;
  offersReceived: number;
  enrolledStudents: number;
  conversionRate: number;
  revenueGenerated: number;
  commissionRateL1: number;
  commissionRateL2: number;
  commissionOwed: number;
  commissionPaid: number;
  complianceStatus: ComplianceStatus;
  verificationStatus: string | null;
  lastActivityAt: string | null;
  createdAt: string | null;
  avatarUrl: string | null;
}

export interface AgentFilters {
  search: string;
  status: AgentStatus | "all";
  performance: PerformanceBand | "all";
  compliance: ComplianceStatus | "all";
  country: string;
}

export const DEFAULT_FILTERS: AgentFilters = {
  search: "",
  status: "all",
  performance: "all",
  compliance: "all",
  country: "",
};
