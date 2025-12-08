import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Lightbulb,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  GraduationCap,
  DollarSign,
  Globe,
  Bell,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  type: "reminder" | "tip" | "action" | "opportunity";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  action_url?: string;
  action_text?: string;
  created_at: string;
  expires_at?: string;
}

interface ProactiveAssistantProps {
  studentId?: string;
}

export default function ProactiveAssistant({ studentId }: ProactiveAssistantProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user, studentId]);

  const fetchSuggestions = async () => {
    const mockSuggestions: Suggestion[] = [
      {
        id: "1",
        type: "reminder",
        title: "Application Deadline Approaching",
        description:
          "Your application to University of Toronto is due in 5 days. Make sure all documents are uploaded.",
        priority: "high",
        category: "Application",
        action_url: "/student/applications",
        action_text: "Review Application",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "2",
        type: "tip",
        title: "Improve Your Profile Completeness",
        description:
          "Adding your IELTS scores and work experience could increase your chances of acceptance by 25%.",
        priority: "medium",
        category: "Profile",
        action_url: "/student/profile",
        action_text: "Update Profile",
        created_at: new Date().toISOString(),
      },
      {
        id: "3",
        type: "opportunity",
        title: "New Scholarship Available",
        description:
          "The International Excellence Scholarship is now open for applications. You meet 8/10 criteria.",
        priority: "high",
        category: "Scholarship",
        action_url: "/scholarships",
        action_text: "Apply Now",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        type: "action",
        title: "Practice for Upcoming Interview",
        description:
          "You have an interview with McGill University in 3 days. Practice with our AI interview tool.",
        priority: "high",
        category: "Interview",
        action_url: "/interview-practice",
        action_text: "Start Practice",
        created_at: new Date().toISOString(),
      },
      {
        id: "5",
        type: "tip",
        title: "Consider Additional Courses",
        description:
          "Based on your profile, you might also be interested in these similar courses in Canada.",
        priority: "low",
        category: "Recommendation",
        action_url: "/courses?view=programs",
        action_text: "Explore Courses",
        created_at: new Date().toISOString(),
      },
      {
        id: "6",
        type: "reminder",
        title: "Visa Application Timeline",
        description:
          "Start preparing your visa documents 3 months before your course starts. You have 2 months left.",
        priority: "medium",
        category: "Visa",
        action_url: "/visa-guide",
        action_text: "View Guide",
        created_at: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setSuggestions(mockSuggestions);
      setLoading(false);
    }, 1000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return Clock;
      case "tip":
        return Lightbulb;
      case "action":
        return CheckCircle;
      case "opportunity":
        return TrendingUp;
      default:
        return Bot;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reminder":
        return "bg-warning-light text-warning dark:bg-warning/20";
      case "tip":
        return "bg-info-light text-info dark:bg-info/20";
      case "action":
        return "bg-success-light text-success dark:bg-success/20";
      case "opportunity":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Application":
        return FileText;
      case "Profile":
        return GraduationCap;
      case "Scholarship":
        return DollarSign;
      case "Interview":
        return Bot;
      case "Recommendation":
      case "Visa":
        return Globe;
      default:
        return Bell;
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    toast({
      title: "Suggestion dismissed",
      description: "This suggestion has been removed from your feed",
    });
  };

  const handleAction = (suggestion: Suggestion) => {
    if (suggestion.action_url) {
      toast({
        title: "Action taken",
        description: `Redirecting to ${suggestion.action_text}`,
      });
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl border shadow-card h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const highPrioritySuggestions = suggestions.filter((s) => s.priority === "high");
  const otherSuggestions = suggestions.filter((s) => s.priority !== "high");

  return (
    <Card className="rounded-xl border shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Assistant
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 truncate">
              {suggestions.length}{" "}
              {suggestions.length === 1 ? "suggestion" : "suggestions"}
            </CardDescription>
          </div>
        </div>
        {highPrioritySuggestions.length > 0 && (
          <Badge
            variant="destructive"
            className="text-xs flex-shrink-0 whitespace-nowrap"
          >
            <span className="hidden xs:inline">
              {highPrioritySuggestions.length} urgent
            </span>
            <span className="xs:hidden">{highPrioritySuggestions.length}</span>
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4 flex-1">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1 text-sm">All caught up!</h3>
            <p className="text-xs text-muted-foreground">No new suggestions</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2 sm:pr-3">
            <div className="space-y-2.5 sm:space-y-3">
              {highPrioritySuggestions.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                    <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive flex-shrink-0" />
                    <h4 className="font-medium text-[11px] sm:text-xs text-destructive">
                      High Priority
                    </h4>
                  </div>
                  {highPrioritySuggestions.map((suggestion) => {
                    const TypeIcon = getTypeIcon(suggestion.type);
                    const CategoryIcon = getCategoryIcon(suggestion.category);
                    return (
                      <div
                        key={suggestion.id}
                        className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors animate-fade-in"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                              <TypeIcon className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                              <Badge
                                className={`${getTypeColor(
                                  suggestion.type
                                )} text-[10px] h-4 px-1.5`}
                              >
                                {suggestion.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1.5"
                              >
                                <CategoryIcon className="h-2.5 w-2.5 mr-0.5" />
                                {suggestion.category}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                              className="h-6 w-6 p-0 flex-shrink-0 hover:bg-destructive/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <h4 className="font-medium text-sm leading-tight break-words pr-1">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words">
                            {suggestion.description}
                          </p>
                          {suggestion.action_url && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(suggestion)}
                              className="w-full h-7 text-xs hover-scale"
                            >
                              {suggestion.action_text}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {otherSuggestions.length > 0 && <Separator className="my-3" />}
                </>
              )}

              {otherSuggestions.length > 0 && (
                <>
                  {highPrioritySuggestions.length > 0 && (
                    <h4 className="font-medium text-[11px] sm:text-xs text-muted-foreground mb-2">
                      Other Suggestions
                    </h4>
                  )}
                  {otherSuggestions.map((suggestion) => {
                    const TypeIcon = getTypeIcon(suggestion.type);
                    const CategoryIcon = getCategoryIcon(suggestion.category);
                    return (
                      <div
                        key={suggestion.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors animate-fade-in"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                              <TypeIcon
                                className={`h-3.5 w-3.5 ${getPriorityColor(
                                  suggestion.priority
                                )} flex-shrink-0`}
                              />
                              <Badge
                                className={`${getTypeColor(
                                  suggestion.type
                                )} text-[10px] h-4 px-1.5`}
                              >
                                {suggestion.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1.5"
                              >
                                <CategoryIcon className="h-2.5 w-2.5 mr-0.5" />
                                {suggestion.category}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                              className="h-6 w-6 p-0 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <h4 className="font-medium text-sm leading-tight break-words pr-1">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words">
                            {suggestion.description}
                          </p>
                          {suggestion.action_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(suggestion)}
                              className="w-full h-7 text-xs hover-scale"
                            >
                              {suggestion.action_text}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
