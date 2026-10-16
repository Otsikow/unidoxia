import { formatUkDate } from '@/lib/dateFormat';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Terminal
} from "lucide-react";
import { SEO } from "@/components/SEO";

interface BuildPreview {
  id: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  status: "success" | "failed" | "pending" | "building";
  previewUrl?: string;
  buildTime: string;
  duration?: string;
  errors?: string[];
  author: string;
}

const mockBuilds: BuildPreview[] = [
  {
    id: "1",
    commitSha: "0baddf4e",
    commitMessage: "Fix task status updates and feedback",
    branch: "main",
    status: "success",
    previewUrl: "https://preview-0baddf4e--unidoxia.lovable.app",
    buildTime: "2025-11-21T14:38:52Z",
    duration: "2m 34s",
    author: "Developer"
  },
  {
    id: "2",
    commitSha: "a1b2c3d4",
    commitMessage: "Add new security features",
    branch: "feature/security",
    status: "building",
    buildTime: "2025-11-21T15:20:00Z",
    author: "Security Team"
  },
  {
    id: "3",
    commitSha: "e5f6g7h8",
    commitMessage: "Update authentication flow",
    branch: "feature/auth",
    status: "failed",
    buildTime: "2025-11-21T14:15:00Z",
    duration: "1m 12s",
    errors: [
      "TS2339: Property 'find' does not exist on type 'never'",
      "TS2304: Cannot find name 'setSuggestions'"
    ],
    author: "Auth Team"
  }
];

export default function BuildPreviews() {
  const [builds, setBuilds] = useState<BuildPreview[]>(mockBuilds);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: BuildPreview["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "building":
        return <RefreshCw className="h-5 w-5 text-primary animate-spin" />;
    }
  };

  const getStatusBadge = (status: BuildPreview["status"]) => {
    const variants: Record<BuildPreview["status"], string> = {
      success: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      failed: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      building: "bg-primary/10 text-primary hover:bg-primary/20"
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return formatUkDate(date);
  };

  return (
    <>
      <SEO 
        title="Build Previews - Admin"
        description="View and manage deployment build previews"
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Build Previews</h1>
            <p className="text-muted-foreground mt-2">
              Monitor deployment builds and preview environments
            </p>
          </div>
          
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Builds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{builds.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {builds.filter(b => b.status === "success").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {builds.filter(b => b.status === "failed").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Building</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {builds.filter(b => b.status === "building").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Builds</TabsTrigger>
            <TabsTrigger value="success">Successful</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="building">Building</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {builds.map((build) => (
              <Card key={build.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(build.status)}
                        <CardTitle className="text-lg">{build.commitMessage}</CardTitle>
                        {getStatusBadge(build.status)}
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {build.branch}
                        </span>
                        <span className="flex items-center gap-1">
                          <Terminal className="h-3 w-3" />
                          {build.commitSha}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(build.buildTime)}
                        </span>
                        {build.duration && (
                          <span className="text-xs">Duration: {build.duration}</span>
                        )}
                      </CardDescription>
                    </div>
                    
                    {build.previewUrl && build.status === "success" && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={build.previewUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Preview
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {build.errors && build.errors.length > 0 && (
                  <CardContent>
                    <div className="rounded-lg bg-destructive/10 p-4">
                      <h4 className="text-sm font-semibold mb-2 text-destructive">Build Errors:</h4>
                      <ScrollArea className="h-24">
                        <ul className="space-y-1">
                          {build.errors.map((error, index) => (
                            <li key={index} className="text-xs font-mono text-destructive">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="success" className="space-y-4">
            {builds.filter(b => b.status === "success").map((build) => (
              <Card key={build.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(build.status)}
                        <CardTitle className="text-lg">{build.commitMessage}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span>{build.commitSha}</span>
                        <span>{formatTime(build.buildTime)}</span>
                      </CardDescription>
                    </div>
                    
                    {build.previewUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={build.previewUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Preview
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            {builds.filter(b => b.status === "failed").map((build) => (
              <Card key={build.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(build.status)}
                        <CardTitle className="text-lg">{build.commitMessage}</CardTitle>
                        {getStatusBadge(build.status)}
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span>{build.commitSha}</span>
                        <span>{formatTime(build.buildTime)}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                {build.errors && build.errors.length > 0 && (
                  <CardContent>
                    <div className="rounded-lg bg-destructive/10 p-4">
                      <h4 className="text-sm font-semibold mb-2 text-destructive">Build Errors:</h4>
                      <ScrollArea className="h-24">
                        <ul className="space-y-1">
                          {build.errors.map((error, index) => (
                            <li key={index} className="text-xs font-mono text-destructive">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="building" className="space-y-4">
            {builds.filter(b => b.status === "building").map((build) => (
              <Card key={build.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(build.status)}
                        <CardTitle className="text-lg">{build.commitMessage}</CardTitle>
                        {getStatusBadge(build.status)}
                      </div>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span>{build.commitSha}</span>
                        <span>{formatTime(build.buildTime)}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
