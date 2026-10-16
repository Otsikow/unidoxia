import { formatUkDateTime } from '@/lib/dateFormat';
import { useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StaffPagination from "@/components/staff/StaffPagination";
import { useStaffMessages, STAFF_PAGE_SIZE } from "@/hooks/useStaffData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useZoeAI } from "@/hooks/useZoeAI";

export function StaffMessagesTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const { data, isLoading, isFetching } = useStaffMessages(page, { search, type });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("Summarize unread messages");
  const [responseHtml, setResponseHtml] = useState<string | null>(null);
  const { toast } = useToast();
  const zoeMutation = useZoeAI();

  const total = (data as any)?.total ?? 0;
  const rows = (data as any)?.data ?? [];

  const handleAskZoe = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt required", description: "Please enter a question for Zoe." });
      return;
    }

    try {
      const result = await zoeMutation.mutateAsync({ prompt, context: { focus: "messages" } });
      setResponseHtml(result.markdown);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Zoe message prompt failed", error);
      toast({
        title: "Zoe is unavailable",
        description: error instanceof Error ? error.message : "Unable to contact Zoe right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" /> Messages
          </CardTitle>
          <CardDescription>Monitor student, agent, and Zoe communications in one inbox.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search messages"
              className="pl-8"
            />
          </div>
          <Select value={type} onValueChange={(value) => { setType(value); setPage(1); }}>
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ai">Zoe</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Bot className="h-4 w-4" /> Ask Zoe
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/40">
                <TableHead>Message</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isFetching) && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="space-y-3 py-6">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No messages found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((message) => (
                <TableRow key={message.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="line-clamp-2 text-sm">{message.body}</span>
                      {responseHtml && message.messageType === "ai" && (
                        <span className="text-xs text-muted-foreground">Zoe summarized above.</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{message.senderName ?? "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {message.messageType ?? "internal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUkDateTime(message.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <StaffPagination page={page} total={total} pageSize={STAFF_PAGE_SIZE} onChange={setPage} />

        {responseHtml && (
          <Card className="rounded-xl border border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Zoe summary</CardTitle>
              <CardDescription>Latest insight from your prompt appears here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: responseHtml }} />
            </CardContent>
          </Card>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask Zoe</DialogTitle>
            <DialogDescription>Ask Zoe to summarize messages or highlight blockers.</DialogDescription>
          </DialogHeader>
          <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleAskZoe} disabled={zoeMutation.isPending}>
              {zoeMutation.isPending ? <Bot className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default StaffMessagesTable;
