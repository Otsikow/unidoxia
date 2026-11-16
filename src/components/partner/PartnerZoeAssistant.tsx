import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Send, Bot, User, Loader2, MessageSquareQuote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseBrowserConfig } from "@/lib/supabaseClientConfig";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { generateZoeMockChunks } from "@/lib/zoe/mockResponse";
import { visaScopeReply } from "@/lib/zoeVisaScope";
import ZoeTypingIndicator from "@/components/ai/ZoeTypingIndicator";

type AssistantRole = "user" | "assistant";

interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
}

const STORAGE_KEY = "partner-zoe-assistant-session";
const { url: SUPABASE_URL, functionsUrl: SUPABASE_FUNCTIONS_URL } = getSupabaseBrowserConfig();
const FUNCTIONS_BASE = (SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`).replace(/\/+$/, "");

const INTRO_MESSAGE =
  "Hi! I'm Zoe, your AI partner assistant. Ask me about university partnerships, application status, or how to support your recruiters and students.";

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Student pipeline update",
    prompt: "Summarize how my active students are progressing this week.",
  },
  {
    label: "University insights",
    prompt: "What onboarding steps should I share with a new university partner?",
  },
  {
    label: "Agent enablement",
    prompt: "Draft a message to motivate agents about upcoming intakes.",
  },
  {
    label: "Document checklist",
    prompt: "List the required documents partners should collect for CAS approvals.",
  },
];

const createMessageId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function PartnerZoeAssistant() {
  const { session, profile } = useAuth();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: "assistant-intro", role: "assistant", content: INTRO_MESSAGE },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      existing = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, existing);
    }
    setSessionId(existing);
  }, []);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport || !messagesEndRef.current) return;

    requestAnimationFrame(() => {
      viewport.scrollTo({
        top: messagesEndRef.current?.offsetTop ?? viewport.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isLoading]);

  const audience = useMemo(() => profile?.role ?? "partner", [profile?.role]);

  const updateAssistantMessage = useCallback((messageId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: (message.content ?? "") + chunk,
            }
          : message,
      ),
    );
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) {
      return;
    }
    if (!session?.access_token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to chat with Zoe.",
        variant: "destructive",
      });
      return;
    }
    if (!sessionId) {
      toast({
        title: "Session not ready",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    const userMessageId = createMessageId("user");
    const assistantMessageId = createMessageId("assistant");

    const nextHistory: AssistantMessage[] = [
      ...messages,
      { id: userMessageId, role: "user", content: trimmed },
      { id: assistantMessageId, role: "assistant", content: "" },
    ];

    setMessages(nextHistory);
    setInputValue("");
    setActiveSuggestion(null);
    setIsLoading(true);

      const visaReply = visaScopeReply(trimmed);
    if (visaReply) {
      updateAssistantMessage(assistantMessageId, visaReply);
      setIsLoading(false);
      return;
    }

      const respondWithMock = (notice: string) => {
        const fallback = generateZoeMockChunks({
          prompt: trimmed,
          context: { focus: "messages", surface: "partner-messages-sidebar" },
          audience,
          surface: "partner-messages-sidebar",
        });
        const chunks = fallback.chunks.length ? fallback.chunks : [fallback.markdown];
        chunks.forEach((chunk) => {
          updateAssistantMessage(assistantMessageId, chunk + (chunk.endsWith("\n") ? "" : "\n\n"));
        });
        toast({
          title: "Zoe is in demo mode",
          description: notice,
        });
      };

      if (!isSupabaseConfigured) {
        respondWithMock("Edge Functions are not configured in this preview, so I'm sharing cached insights.");
        return;
      }

      try {
        const payloadHistory = nextHistory
          .filter((message) => message.id !== assistantMessageId)
          .map((message) => ({
            role: message.role,
            content: message.content,
        }));

      const response = await fetch(`${FUNCTIONS_BASE}/ai-chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          audience,
          locale: typeof navigator !== "undefined" ? navigator.language : "en",
          messages: payloadHistory,
          metadata: {
            surface: "partner-messages-sidebar",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Zoe could not respond to that prompt.");
      }

      if (!response.body) {
        const text = await response.text();
        updateAssistantMessage(assistantMessageId, text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        if (!value) continue;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n").filter(Boolean);

        for (const event of events) {
          if (!event.startsWith("data:")) continue;
          const data = event.replace(/^data:\s*/, "").trim();

          if (!data) continue;
          if (data === "[DONE]") {
            done = true;
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed?.type === "error") {
              throw new Error(parsed.message ?? "Zoe encountered an issue.");
            }
            const textChunk = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (textChunk) {
              updateAssistantMessage(assistantMessageId, textChunk);
            }
          } catch (error) {
            // Fallback: treat chunk as plain text if parsing fails
            updateAssistantMessage(assistantMessageId, data);
          }
        }
      }
    } catch (error) {
      console.error("Zoe assistant error", error);
      respondWithMock("Using cached insights while we reconnect to Zoe's Edge Function.");
    } finally {
      setIsLoading(false);
    }
  }, [audience, inputValue, isLoading, messages, session?.access_token, sessionId, toast, updateAssistantMessage]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage();
    },
    [sendMessage],
  );

  const handleSuggestion = useCallback((prompt: string) => {
    setInputValue(prompt);
    setActiveSuggestion(prompt);
  }, []);

  return (
    <Card className="flex h-full flex-col border-slate-200 bg-white/90 text-slate-900 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-100">
      <CardHeader className="space-y-3 border-b border-slate-200 pb-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              Zoe
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ask about partner operations, university updates, or student timelines.
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
            Live AI
          </Badge>
        </div>
        <Separator className="bg-slate-200 dark:bg-slate-800/70" />
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(({ label, prompt }) => (
            <Button
              key={prompt}
              type="button"
              size="sm"
              variant={activeSuggestion === prompt ? "default" : "secondary"}
              className="h-8 rounded-full border border-blue-200 bg-blue-50 px-3 text-[11px] text-blue-700 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/70"
              onClick={() => handleSuggestion(prompt)}
            >
              <MessageSquareQuote className="mr-1.5 h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="space-y-4 pr-2">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-blue-500 text-blue-50"
                        : "bg-slate-100 text-slate-900 ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-slate-100 dark:ring-slate-800/60"
                    }`}
                  >
                    {message.content.trim().length === 0 ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Thinking…</span>
                    ) : (
                      message.content
                    )}
                  </div>
                  {isUser && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex max-w-[85%] items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-slate-100 dark:ring-slate-800/60">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Zoe is composing a reply</span>
                  <ZoeTypingIndicator className="text-blue-600 dark:text-blue-200" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Ask Zoe anything about your partnerships…"
            className="min-h-[100px] resize-none border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus-visible:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Powered by OpenAI · Secure to your account
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || inputValue.trim().length === 0}
              className="gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask Zoe
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PartnerZoeAssistant;
