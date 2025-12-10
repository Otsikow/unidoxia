import BackButton from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BellRing,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  HelpCircle,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

const categories = [
  { value: "all", label: "All categories" },
  { value: "briefings", label: "Department briefings" },
  { value: "sop", label: "SOPs" },
  { value: "reports", label: "Reports" },
  { value: "policy", label: "Policy updates" },
  { value: "templates", label: "Templates" },
];

const fileTypes = [
  { value: "all", label: "All file types" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "Document" },
  { value: "sheet", label: "Spreadsheet" },
  { value: "guide", label: "Guide" },
];

const quickFilters = [
  { value: "briefings", label: "Department briefings" },
  { value: "policy", label: "Policy updates" },
  { value: "sop", label: "SOP & playbooks" },
  { value: "reports", label: "Reports" },
  { value: "guides", label: "Agent guides" },
];

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  fileType: "pdf" | "doc" | "sheet" | "guide";
  tags: string[];
  updated: string;
  status?: string;
  highlight?: string;
}

const ICONS: Record<ResourceItem["fileType"], LucideIcon> = {
  pdf: FileText,
  doc: BookOpen,
  sheet: FileSpreadsheet,
  guide: FolderKanban,
};

const resources: ResourceItem[] = [
  {
    id: "ops-briefing",
    title: "Ops & Compliance briefings",
    description: "Weekly update on critical process changes agents must share with new intakes.",
    category: "briefings",
    fileType: "pdf",
    tags: ["Ops", "Compliance"],
    updated: "4 hours ago",
    status: "Overdue 4d",
  },
  {
    id: "tuition-policy",
    title: "Tuition statement policy",
    description: "Step-by-step policy updates for issuing statements and maintaining audit trails.",
    category: "policy",
    fileType: "doc",
    tags: ["Finance", "Policy"],
    updated: "Yesterday",
  },
  {
    id: "audit-pack",
    title: "Audit readiness pack",
    description: "Templates and checklists to prepare for quarterly audits with finance leads.",
    category: "reports",
    fileType: "sheet",
    tags: ["Audit", "Templates"],
    updated: "2 days ago",
    highlight: "New",
  },
  {
    id: "agent-handbook",
    title: "Agent workflow handbook",
    description: "Playbooks, outreach scripts, and eligibility checkpoints tailored for new regions.",
    category: "guides",
    fileType: "guide",
    tags: ["Playbook", "Enablement"],
    updated: "3 hours ago",
  },
  {
    id: "weekly-report",
    title: "Student success weekly report",
    description: "Outcome dashboard links, blockers to escalate, and regional action items for cohorts.",
    category: "reports",
    fileType: "sheet",
    tags: ["Student", "Insights"],
    updated: "Today",
  },
];

const supportingArticles = [
  "Reporting SOP for compliance", // TODO: when backend resources available replace with live data
  "Ops prep for high-risk cases",
  "Dispute handling policy",
  "Safety protocols for agents",
  "Billing & payment timelines",
];

export function AgentResourceCenter() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesQuick = activeQuickFilter ? resource.category === activeQuickFilter : true;
      const matchesCategory = category === "all" || resource.category === category;
      const matchesType = fileType === "all" || resource.fileType === fileType;
      const matchesSearch =
        !search ||
        resource.title.toLowerCase().includes(search.toLowerCase()) ||
        resource.description.toLowerCase().includes(search.toLowerCase()) ||
        resource.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

      return matchesQuick && matchesCategory && matchesType && matchesSearch;
    });
  }, [activeQuickFilter, category, fileType, search]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    const timeout = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(timeout);
  };

  return (
    <div className="space-y-6">
      <BackButton variant="ghost" size="sm" fallback="/dashboard" />

      <Card className="overflow-hidden border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs">WELCOME BACK</span>
                <span className="text-slate-400">Agent</span>
              </div>
              <div className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
                <span>Hi, Eric</span>
                <span className="text-slate-400">👋</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span>Keep your Unidoxia agent greeting status visible across the dashboard.</span>
                <Button variant="secondary" size="sm" className="h-8 gap-2 bg-white/10 text-slate-50 hover:bg-white/20">
                  <Sparkles className="h-4 w-4" />
                  Make me available
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[{ label: "Overdue items", value: "2", trend: "-2%" }, { label: "Priority", value: "9", trend: "+26%" }, { label: "This week", value: "17", trend: "+18%" }].map(
                ({ label, value, trend }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
                    <p className="text-xs text-slate-300">{label}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">{value}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-6 rounded-full px-2 text-xs",
                          trend.startsWith("-") ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300",
                        )}
                      >
                        {trend}
                      </Badge>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950 text-slate-50">
        <CardHeader className="space-y-1 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-700 bg-slate-900 text-slate-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div>
              <CardDescription className="text-xs text-slate-400">Go back</CardDescription>
              <CardTitle className="text-xl font-semibold text-white">Resource Centre</CardTitle>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Access categorized staff documents, apply filters, and get AI summaries tailored to your tasks.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="What document do you need?"
                  className="border-0 bg-transparent text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                />
              </div>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full min-w-[180px] border-slate-800 bg-slate-900 text-left text-slate-50 focus:ring-slate-700">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-50">
                  {categories.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="w-full min-w-[180px] border-slate-800 bg-slate-900 text-left text-slate-50 focus:ring-slate-700">
                  <SelectValue placeholder="All file types" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-50">
                  {fileTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10 gap-2 border-slate-800 bg-slate-900 text-slate-50 hover:bg-slate-800"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={activeQuickFilter === filter.value ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full border-slate-800 bg-slate-900 text-xs text-slate-50 hover:bg-slate-800",
                  activeQuickFilter === filter.value && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={() => setActiveQuickFilter((prev) => (prev === filter.value ? null : filter.value))}
              >
                {filter.label}
              </Button>
            ))}
            <Badge className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300" variant="outline">
              Document library
            </Badge>
            <Button variant="link" className="h-8 px-0 text-xs text-indigo-300">
              AI summary
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <TriangleAlert className="h-4 w-4 text-amber-300" />
              <span>Supporting articles:</span>
              {supportingArticles.map((article) => (
                <span key={article} className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  {article}
                </span>
              ))}
              <Button variant="link" className="h-8 px-0 text-indigo-300">
                Refresh list
              </Button>
            </div>
            <p className="text-sm text-slate-400">
              These articles help agents respond accurately about responsibilities and bill payments. 📑
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredResources.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-slate-300">
                <HelpCircle className="h-10 w-10 text-slate-500" />
                <p className="text-sm font-medium text-white">No resources match your filters yet.</p>
                <p className="text-xs text-slate-400">Try adjusting the filters or check back later for new uploads.</p>
                <Button variant="outline" size="sm" className="mt-2 border-slate-700 bg-slate-900 text-slate-50">
                  Refresh list
                </Button>
              </div>
            ) : (
              filteredResources.map((resource) => {
                const Icon = ICONS[resource.fileType];

                return (
                  <Card
                    key={resource.id}
                    className="flex h-full flex-col justify-between border border-slate-800 bg-slate-900 text-slate-50"
                  >
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-slate-800/80 p-2">
                            <Icon className="h-5 w-5 text-indigo-300" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-white">{resource.title}</CardTitle>
                            <CardDescription className="text-xs text-slate-400">{resource.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className="border-slate-800 bg-slate-800/60 text-indigo-200" variant="outline">
                          {resource.fileType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-amber-200">
                          <TriangleAlert className="h-3 w-3" /> High priority
                        </span>
                        {resource.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">
                            {tag}
                          </span>
                        ))}
                        {resource.status ? (
                          <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-200">{resource.status}</span>
                        ) : null}
                        {resource.highlight ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">{resource.highlight}</span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        <span>AI summary ready</span>
                        <span className="text-slate-500">•</span>
                        <span>Updated {resource.updated}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" className="gap-2">
                          <Sparkles className="h-4 w-4" /> Open summary
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 border-slate-800 bg-slate-900 text-slate-50">
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 text-indigo-300 hover:text-indigo-200">
                          <ArrowUpRight className="h-4 w-4" /> Open doc
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900 text-slate-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-200" />
                  <CardTitle className="text-base">Tips to quickly guide agents</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p>Prioritize briefings tagged as High priority to unblock onboarding tasks.</p>
                <p>Leverage AI summaries to answer policy and compliance questions faster.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900 text-slate-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-indigo-200" />
                  <CardTitle className="text-base">Notifications & escalations</CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Keep your reminders short and action-oriented. Visibility across the resource center is on by default.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs text-slate-200">
                <Badge className="bg-slate-800 text-slate-100">Escalations · 8</Badge>
                <Badge className="bg-slate-800 text-slate-100">Reminder alerts · 12</Badge>
                <Badge className="bg-slate-800 text-slate-100">New uploads · 5</Badge>
                <Button variant="link" className="p-0 text-indigo-300">
                  See alerts
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <div className="inline-flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              Try searching for quick help on AutoGen clients →
            </div>
            <div className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />
              Toggle light or dark mode →
            </div>
            <div className="inline-flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Need more help? Write to ops@ox.ac.uk →
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              See what’s new (2 min read) →
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentResourceCenter;
