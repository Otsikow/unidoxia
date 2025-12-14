import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Mic,
  MicOff,
  Upload,
  FileText,
  Image,
  X as XIcon,
  Loader2,
  Bookmark,
  ExternalLink,
  Plus,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getSupabaseBrowserConfig } from "@/lib/supabaseClientConfig";
import zoeAvatar from "@/assets/professional-consultant.png";
import { cn } from "@/lib/utils";
import ZoeTypingIndicator from "@/components/ai/ZoeTypingIndicator";
import { generateZoeMockResponse } from "@/lib/zoe/mockResponse";

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface ZoeSource {
  id?: string;
  title?: string;
  category?: string;
  source_url?: string | null;
  source_type?: string;
  similarity?: number | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  sources?: ZoeSource[];
  error?: string;
}

interface ZoeErrorState {
  title: string;
  description: string;
  troubleshooting?: string;
}

const STORAGE_KEY = "zoe-chat-session-id";
const LAUNCHER_DISMISSED_KEY = "zoe-chat-launcher-dismissed";
const CHAT_UPLOAD_BUCKET = "chat-uploads";
const { url: SUPABASE_URL, functionsUrl: SUPABASE_FUNCTIONS_URL } =
  getSupabaseBrowserConfig();
const SUPABASE_FUNCTIONS_BASE = (
  SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`
).replace(/\/+$/, "");

function sanitizeInline(text: string) {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ["strong", "em", "code", "mark"],
    ALLOWED_ATTR: [],
  });
}

function formatInline(text: string) {
  return sanitizeInline(
    text
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>"),
  );
}

function FormattedMessage({ content }: { content: string }) {
  const lines = useMemo(() => content.split("\n"), [content]);
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="list-disc list-inside space-y-1 my-2"
        >
          {listItems.map((item, index) => (
            <li
              key={index}
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formatInline(item) }}
            />
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  lines.forEach((line) => {
    if (/^#{1,6}\s+/.test(line)) {
      flushList();
      const heading = line.replace(/^#{1,6}\s+/, "").trim();
      elements.push(
        <h3
          key={`heading-${elements.length}`}
          className="font-semibold text-sm mt-3 mb-1"
        >
          {heading}
        </h3>,
      );
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    if (line.trim() === "") {
      flushList();
      elements.push(<div key={`space-${elements.length}`} className="h-2" />);
      return;
    }

    flushList();
    elements.push(
      <p
        key={`paragraph-${elements.length}`}
        className="text-sm leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />,
    );
  });

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

function MessageSources({ sources }: { sources: ZoeSource[] }) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-primary">
        <Bookmark className="h-3.5 w-3.5" />
        <span className="font-medium uppercase tracking-wide">Sources</span>
      </div>
      <ul className="space-y-1.5">
        {sources.map((source, index) => (
          <li key={source.id ?? index} className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] font-semibold text-primary/80">
              [{index + 1}]
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="font-medium text-foreground text-xs">
                {source.title ?? "Institutional guidance"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {source.category && (
                  <span className="uppercase">{source.category}</span>
                )}
                {typeof source.similarity === "number" && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Match {(source.similarity * 100).toFixed(0)}%
                  </span>
                )}
                {source.source_type && <span>{source.source_type}</span>}
                {source.source_url && (
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ZoeChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLauncherDismissed, setIsLauncherDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I’m **Zoe**, your AI-powered student and university assistant. Ask me about admissions, partnerships, or agent onboarding—I'm here 24/7 to help.",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasConversationStarted, setHasConversationStarted] = useState(false);
  const [errorState, setErrorState] = useState<ZoeErrorState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationPlayedRef = useRef(false);

  const { toast } = useToast();
  const { session, profile } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLauncherDismissed(
      window.sessionStorage.getItem(LAUNCHER_DISMISSED_KEY) === "1",
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, stored);
    }
    setSessionId(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      window.sessionStorage.removeItem(LAUNCHER_DISMISSED_KEY);
      setIsLauncherDismissed(false);
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
      }
    };

    window.addEventListener("zoe:open-chat", handler as EventListener);
    return () => {
      window.removeEventListener("zoe:open-chat", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;

    if (!viewport) return;

    requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: hasConversationStarted ? "smooth" : "auto",
      });
    });
  }, [messages, isLoading, hasConversationStarted]);

  const interpretError = useCallback((error: unknown): ZoeErrorState => {
    const base: ZoeErrorState = {
      title: "Zoe is unavailable",
      description: "We couldn’t reach Zoe just now. Please try again in a moment.",
      troubleshooting:
        "If this keeps happening, verify that the Supabase Edge Functions are deployed and reachable from your network.",
    };

    if (error instanceof Error) {
      const message = error.message || "";
      const cause = (error as Error & { cause?: { status?: number } }).cause;

      if (cause?.status === 401) {
        return {
          title: "Session expired",
          description:
            "Your session has expired, so Zoe can’t use your account context. Please sign in again and retry your message.",
        };
      }

      if (cause?.status === 429) {
        return {
          title: "Zoe is busy",
          description:
            "We’re handling a lot of requests right now. Give Zoe a few seconds before trying again.",
        };
      }

      if (/edge function/i.test(message)) {
        return {
          ...base,
          description:
            "We couldn’t connect to the Zoe Edge Function. It may be offline or blocked by the current environment.",
        };
      }

      if (/fetch|network|Failed to reach Zoe/i.test(message)) {
        return {
          ...base,
          description: "A network error stopped Zoe from responding. Check your connection and retry.",
        };
      }

      if (message.trim().length > 0 && message !== base.description) {
        return {
          ...base,
          description: message,
        };
      }
    }

    return base;
  }, []);

  const playNotification = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = new AudioCtx();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.6);
    } catch (error) {
      console.warn("Notification sound failed", error);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      toast({ title: "Recording", description: "Tap the mic again to stop." });
    } catch {
      toast({
        title: "Microphone blocked",
        description: "Please enable microphone access to record.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      if (!session?.access_token) return;
      const url = `${SUPABASE_FUNCTIONS_BASE}/audio-transcribe`;
      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const data = await res.json();
        if (data?.text) {
          setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
        }
      } catch (error) {
        console.error("Transcription failed", error);
        toast({ title: "Transcription failed", variant: "destructive" });
      }
    },
    [session?.access_token, toast],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!session?.access_token) {
        toast({
          title: "Sign in required",
          description: "Please sign in to upload supporting documents.",
        });
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported file",
          description: "Upload images, PDFs, Word, or plain text files only.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Keep attachments under 10MB.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          toast({ title: "Sign in", description: "Please sign in to upload." });
          return;
        }

        const extension = file.name.split(".").pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const path = `${user.id}/${name}`;

        const { error } = await supabase.storage
          .from(CHAT_UPLOAD_BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;

        const { data } = supabase.storage
          .from(CHAT_UPLOAD_BUCKET)
          .getPublicUrl(path);
        if (!data?.publicUrl) throw new Error("Unable to retrieve file URL");

        const attachment: Attachment = {
          id: name,
          name: file.name,
          type: file.type,
          url: data.publicUrl,
          size: file.size,
        };

        setAttachments((prev) => [...prev, attachment]);
        toast({
          title: "Uploaded",
          description: `${file.name} is attached to your message.`,
        });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Upload failed";
        toast({ title: "Upload error", description, variant: "destructive" });
      }
    },
    [session?.access_token, toast],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;
      setIsUploading(true);
      try {
        await Promise.all(Array.from(files).map(uploadFile));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [uploadFile],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      const files = Array.from(event.dataTransfer.files);
      if (!files.length) return;
      setIsUploading(true);
      try {
        await Promise.all(files.map(uploadFile));
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile],
  );

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, index);
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
  }, []);

  const sendMessage = useCallback(async () => {
    if (
      (!input.trim() && attachments.length === 0) ||
      isLoading ||
      !session?.access_token
    ) {
      if (!session?.access_token) {
        toast({
          title: "Sign in required",
          description: "Log in to chat with Zoe across your account data.",
          variant: "destructive",
        });
      }
      return;
    }

    const userContent = input.trim();
    const previousAttachments = attachments;
    const sanitizedHistory = (() => {
      const next = [...messages];
      const last = next[next.length - 1];
      if (
        last?.role === "user" &&
        last.error &&
        last.content.trim() === userContent
      ) {
        next.pop();
      }
      return next;
    })();

    const userMessage: Message = {
      role: "user",
      content: userContent,
      attachments: attachments.length ? [...attachments] : undefined,
    };

    const updatedHistory = [...sanitizedHistory, userMessage];

    setMessages(updatedHistory);
    setHasConversationStarted(true);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    notificationPlayedRef.current = false;
    setErrorState(null);

    const respondWithMock = (notice: string) => {
      const fallback = generateZoeMockResponse({
        prompt: userContent || "Summarize my inbox",
        context: { focus: "messages", surface: "global-ai-chat" },
        audience: profile?.role ?? null,
        surface: "global-ai-chat",
      });
      const assistantMessage: Message = {
        role: "assistant",
        content: fallback.markdown,
      };
      const historyWithAssistant = [...updatedHistory, assistantMessage];
      setMessages(historyWithAssistant);
      setHasConversationStarted(true);
      setErrorState(null);
      toast({
        title: "Zoe is in demo mode",
        description: notice,
      });
    };

    if (!isSupabaseConfigured) {
      respondWithMock("Edge Functions aren't configured here, so I'm sharing cached insights.");
      setIsLoading(false);
      return;
    }

    try {
      const chatUrl = `${SUPABASE_FUNCTIONS_BASE}/ai-chatbot`;
      const audience = profile?.role ?? undefined;
      const locale =
        typeof navigator !== "undefined" ? navigator.language : "en";

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          audience,
          locale,
          messages: updatedHistory,
          metadata: {
            attachments: userMessage.attachments?.map((attachment) => ({
              name: attachment.name,
              type: attachment.type,
              url: attachment.url,
            })),
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = `Zoe returned an unexpected ${response.status} response.`;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const data = await response.json();
            errorMessage =
              (data?.message as string | undefined) ||
              (data?.error as string | undefined) ||
              errorMessage;
          } else {
            const text = await response.text();
            if (text.trim()) {
              errorMessage = text.trim();
            }
          }
        } catch (parseError) {
          console.warn("Unable to parse Zoe error response", parseError);
        }

        const error = new Error(errorMessage);
        error.name = "ZoeResponseError";
        (error as Error & { cause?: { status?: number } }).cause = {
          status: response.status,
        };
        throw error;
      }

      if (!response.body) {
        const error = new Error("Zoe didn’t return a response stream.");
        error.name = "ZoeStreamError";
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const pushAssistantChunk = (chunk: string) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last || last.role !== "assistant") {
            next.push({ role: "assistant", content: chunk });
          } else {
            next[next.length - 1] = {
              ...last,
              content: (last.content ?? "") + chunk,
            };
          }
          return next;
        });
      };

      const applySources = (sources: ZoeSource[]) => {
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i].role === "assistant") {
              next[i] = { ...next[i], sources };
              break;
            }
          }
          return next;
        });
      };

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        if (!value) continue;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n").filter(Boolean);

        for (const event of events) {
          if (event.startsWith("data: ")) {
            const data = event.replace(/^data: /, "").trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed?.type === "error") {
                throw new Error(parsed.message ?? "Zoe encountered an issue");
              }

              if (parsed?.type === "sources" && Array.isArray(parsed.sources)) {
                const normalized = (parsed.sources as ZoeSource[]).map(
                  (source) => ({
                    id: source.id,
                    title: source.title,
                    category: source.category,
                    source_type: source.source_type,
                    source_url: source.source_url,
                    similarity:
                      typeof source.similarity === "number"
                        ? source.similarity
                        : null,
                  }),
                );
                applySources(normalized);
                continue;
              }

              const text = parsed?.choices?.[0]?.delta?.content as
                | string
                | undefined;
              if (text) {
                if (!notificationPlayedRef.current) {
                  notificationPlayedRef.current = true;
                  void playNotification();
                }
                pushAssistantChunk(text);
              }
            } catch (error) {
              console.error("Stream parse error", error, data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Zoe chat error", error);
      const friendly = interpretError(error);
      if (friendly.title !== "Session expired") {
        respondWithMock("Using cached insights while we restore Zoe's connection.");
      } else {
        const inlineError = "Please sign in again to continue this conversation.";
        const failedHistory = [
          ...sanitizedHistory,
          {
            ...userMessage,
            error: inlineError,
          },
        ];

        setMessages(failedHistory);
        setHasConversationStarted(true);
        setInput(userContent);
        setAttachments(previousAttachments);
        setErrorState(friendly);

        toast({
          title: friendly.title,
          description: friendly.description,
          variant: "destructive",
        });
      }
    } finally {
      notificationPlayedRef.current = false;
      setIsLoading(false);
    }
  }, [
    attachments,
    input,
    isLoading,
    messages,
    playNotification,
    profile?.role,
    session?.access_token,
    sessionId,
    toast,
    interpretError,
  ]);

  const handleRetry = useCallback(() => {
    if (isLoading) return;
    if (!input.trim()) return;
    void sendMessage();
  }, [input, isLoading, sendMessage]);

  if (!isOpen) {
    if (isLauncherDismissed) return null;

    return (
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
        <div className="group relative">
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem(LAUNCHER_DISMISSED_KEY);
              }
              setIsLauncherDismissed(false);
              setIsExpanded(false);
              setIsOpen(true);
            }}
            className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold shadow-xl transition hover:translate-y-[-2px] hover:shadow-2xl md:h-14 md:px-6 md:text-base"
            aria-label="Chat with Zoe"
          >
            <Sparkles className="h-5 w-5" />
            Chat
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(LAUNCHER_DISMISSED_KEY, "1");
              }
              setIsLauncherDismissed(true);
            }}
            className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow-sm opacity-100 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            aria-label="Dismiss chat button"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-background via-background to-primary/5 shadow-[0_28px_80px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300",
        isFullScreen
          ? "inset-0 rounded-none"
          : isExpanded
          ? "top-4 bottom-4 left-1/2 w-full max-w-5xl -translate-x-1/2 sm:top-8 sm:bottom-8"
          : "bottom-4 left-4 right-4 h-[calc(100vh-2rem)] xs:left-auto xs:h-[88vh] xs:w-[420px] xs:max-h-[680px] md:bottom-6 md:right-6 md:w-[460px]",
      )}
    >
      <CardHeader className="px-5 pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-primary/40">
              <img
                src={zoeAvatar}
                alt="Zoe avatar"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 rounded-full bg-primary/10" />
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold md:text-lg">
                Zoe
                <span className="hidden items-center gap-1 text-xs font-medium uppercase tracking-wide text-primary/80 sm:inline-flex">
                  <Sparkles className="h-3 w-3" /> Always ready to help
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground md:text-sm">
                AI-powered support for students, universities, and recruitment
                partners
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isFullScreen) {
                  setIsFullScreen(false);
                  setIsExpanded(false);
                } else if (isExpanded) {
                  setIsFullScreen(true);
                } else {
                  setIsExpanded(true);
                }
              }}
              className="h-8 w-8"
              aria-label={isFullScreen ? "Exit full screen" : isExpanded ? "Enter full screen" : "Expand Zoe chat"}
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsFullScreen(false);
                setIsExpanded(false);
                setIsOpen(false);
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {errorState ? (
          <div className="px-5 pt-4">
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{errorState.title}</AlertTitle>
              <AlertDescription>
                <p>{errorState.description}</p>
                {errorState.troubleshooting ? (
                  <p className="mt-2 text-xs text-destructive/80">
                    {errorState.troubleshooting}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isLoading || isUploading}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    Try again
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setErrorState(null)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        <ScrollArea ref={scrollRef} className="min-h-0 flex-1 px-5">
          <div className="space-y-4 py-5">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={index}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/30">
                      <img
                        src={zoeAvatar}
                        alt="Zoe"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 shadow-sm transition-all ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/90 border border-primary/10 text-foreground backdrop-blur"
                    }`}
                  >
                    <FormattedMessage content={message.content} />
                    {message.attachments?.length ? (
                      <div className="mt-3 space-y-1 text-xs">
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 opacity-90"
                          >
                            {attachment.type.startsWith("image/") ? (
                              <Image className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate hover:underline"
                            >
                              {attachment.name}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {message.error ? (
                      <div
                        className={cn(
                          "mt-3 flex items-center gap-2 text-xs",
                          isUser
                            ? "text-primary-foreground/90"
                            : "text-destructive",
                        )}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{message.error}</span>
                      </div>
                    ) : null}
                    {message.sources &&
                    message.sources.length > 0 &&
                    !isUser ? (
                      <MessageSources sources={message.sources} />
                    ) : null}
                  </div>
                  {isUser && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-3 rounded-full bg-muted/60 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="font-semibold text-foreground">Zoe is preparing a response</span>
                  <ZoeTypingIndicator className="text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 border-t border-primary/10 bg-background/90 px-5 pb-5 pt-4">
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2"
                >
                  {attachment.type.startsWith("image/") ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <span className="flex-1 truncate text-xs text-primary">
                    {attachment.name} ({formatFileSize(attachment.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <form
            className={`flex items-end gap-3 rounded-2xl border px-4 py-3 transition duration-150 ${
              isDragOver
                ? "border-primary bg-primary/5 shadow-inner"
                : "border-border bg-card/40"
            }`}
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  disabled={isLoading}
                  aria-label="Attach files or audio"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onSelect={() => {
                    fileInputRef.current?.click();
                  }}
                  disabled={isLoading || isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload a file
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      void startRecording();
                    }
                  }}
                  disabled={isLoading}
                >
                  {isRecording ? (
                    <MicOff className="mr-2 h-4 w-4 text-destructive" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  {isRecording ? "Stop recording" : "Audio to text"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask Zoe about admissions, partnerships, or agent docs…"
                disabled={isLoading || isUploading}
                className="min-h-[52px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="icon"
                disabled={
                  isLoading ||
                  isUploading ||
                  (!input.trim() && attachments.length === 0)
                }
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg transition hover:shadow-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            “Meet Zoe — your AI-powered student and university assistant, always
            ready to help.”
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
