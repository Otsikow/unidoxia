import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import ZoeTypingIndicator from "@/components/ai/ZoeTypingIndicator";

type AssistantRole = "user" | "assistant";

interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
}

const STORAGE_KEY = "university-zoe-assistant-session";
const { url: SUPABASE_URL, functionsUrl: SUPABASE_FUNCTIONS_URL } = getSupabaseBrowserConfig();
const FUNCTIONS_BASE = (SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`).replace(/\/+$/, "");

const INTRO_MESSAGE =
  "Hello! I'm Zoe, your AI assistant for university partnerships. Ask me about agent engagement, application health, or how to accelerate admissions workflows.";

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Agent pipeline brief",
    prompt: "Summarize which agents have students at risk this week and where to focus follow-up.",
  },
  {
    label: "Admissions update draft",
    prompt: "Draft a partner update announcing new program intake dates and key deadlines.",
  },
  {
    label: "Document checklist",
    prompt: "List the critical documents agents should provide to move CAS cases forward.",
  },
  {
    label: "FAQ response",
    prompt: "How should I answer an agent asking about scholarship availability for postgraduate applicants?",
  },
];

const createMessageId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const generateSessionId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const LINK_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;

const formatTextWithLinks = (text: string): ReactNode => {
  const matches = [...text.matchAll(LINK_PATTERN)];

  if (!matches.length) {
    return text;
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const url = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const href = url.startsWith("http") ? url : `https://${url}`;

    parts.push(
      <a
        key={`link-${start}-${index}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary hover:underline"
      >
        {url}
      </a>,
    );

    lastIndex = start + url.length;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const renderMessageContent = (content: string): ReactNode =>
  content.split(/\n/).map((line, lineIndex) => (
    <Fragment key={`line-${lineIndex}`}>
      {lineIndex > 0 && <br />}
      {formatTextWithLinks(line)}
    </Fragment>
  ));

export function UniversityZoeAssistant() {
  const { session, profile } = useAuth();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = generateSessionId();
    if (!generated) {
      return null;
    }

    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  });
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: "assistant-intro", role: "assistant", content: INTRO_MESSAGE },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sessionId || typeof window === "undefined") {
      return;
    }

    const generated = generateSessionId();
    if (!generated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, generated);
    setSessionId(generated);
  }, [sessionId]);

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

  const sendMessage = useCallback(
    async (promptOverride?: string) => {
      const source = promptOverride ?? inputValue;
      const trimmed = source.trim();
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

      const respondWithMock = (notice: string) => {
        const fallback = generateZoeMockChunks({
          prompt: trimmed,
          context: { focus: "messages", surface: "university-messages-sidebar" },
          audience,
          surface: "university-messages-sidebar",
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
        respondWithMock("Edge Functions aren't available in this environment, so I'm sharing cached insights.");
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
              surface: "university-messages-sidebar",
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
              console.error("Failed to parse Zoe response chunk", error);
            }
          }
        }
      } catch (error) {
        console.error("Zoe assistant error", error);
        respondWithMock("Using cached insights while we reconnect to Zoe's Edge Function.");
      } finally {
        setIsLoading(false);
      }
    },
    [audience, inputValue, isLoading, messages, session?.access_token, sessionId, toast, updateAssistantMessage],
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      setInputValue(prompt);
      setActiveSuggestion(prompt);
      void sendMessage(prompt);
    },
    [sendMessage],
  );

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden overflow-y-auto rounded-none border-border bg-muted/50 text-card-foreground shadow-lg shadow-primary/10">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Zoe
            </Badge>
            <CardTitle className="mt-2 text-lg font-semibold text-foreground">
              Partner Intelligence Assistant
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tap into Zoe for quick answers on agent engagement, admissions blockers, and program updates.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Suggested prompts</p>
            <div className="mt-3 grid gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => handleSuggestion(suggestion.prompt)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-3 text-left transition hover:border-primary/30 hover:bg-muted"
                >
                  <MessageSquareQuote className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{suggestion.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{suggestion.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
            <Bot className="h-5 w-5 text-primary" />
            <div className="text-xs text-muted-foreground">
              Zoe uses your university context to surface insights securely. No sensitive data is shared externally.
            </div>
          </div>
        </div>
        <Separator className="bg-border" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
                    {message.role === "assistant" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="break-words text-sm leading-relaxed text-foreground">
                    {renderMessageContent(message.content)}
                  </p>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Zoe is composing a reply</span>
                    <ZoeTypingIndicator className="text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="border-t border-border bg-muted/50 p-4 sm:p-6">
            <label htmlFor="zoe-input" className="sr-only">
              Message Zoe
            </label>
            <Textarea
              id="zoe-input"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={
                activeSuggestion
                  ? "Press Enter to send your prompt to Zoe…"
                  : "Type a question about your partnerships or admissions..."
              }
              className="min-h-[120px] resize-none border-border bg-muted/60 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Zoe references secure course and agent data in your tenant.
              </p>
              <Button
                size="sm"
                className="gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg hover:bg-primary/90"
                onClick={() => void sendMessage()}
                disabled={isLoading || inputValue.trim().length === 0}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Ask Zoe
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UniversityZoeAssistant;
