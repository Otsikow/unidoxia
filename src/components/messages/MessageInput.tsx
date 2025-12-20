import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send,
  Plus,
  Smile,
  Paperclip,
  Mic,
  Square,
  Loader2,
  X,
  Keyboard,
  FileText,
  AudioLines,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { MessageAttachment, SendMessagePayload } from '@/hooks/useMessages';

interface MessageInputProps {
  onSendMessage: (payload: SendMessagePayload) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = {
  'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  'Gestures': ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '💪'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📸', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '⏰', '⏱️', '⏲️', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪀', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋'],
};

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const STORAGE_BUCKET = 'message-attachments';
const SUPPORTED_FILE_TYPES = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.json';

const createLocalAttachmentId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

const deriveAttachmentType = (file: File): MessageAttachment['type'] => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
};

export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false
}: MessageInputProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEventRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const uploadFileAttachment = useCallback(async (file: File): Promise<MessageAttachment | null> => {
    if (!user?.id) {
      toast({
        title: 'Sign-in required',
        description: 'You need to be signed in to share files.',
        variant: 'destructive',
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Files must be 20MB or smaller.',
        variant: 'destructive',
      });
      return null;
    }

    const type = deriveAttachmentType(file);
    const extension = file.name.split('.').pop() || file.type.split('/')[1] || 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      console.error('Attachment upload error:', uploadError);
      toast({
        title: 'Upload failed',
        description: uploadError.message || 'Unable to upload the selected file.',
        variant: 'destructive',
      });
      return null;
    }

    const { data: publicUrlData } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!publicUrlData?.publicUrl) {
      console.error('Failed to get public URL for file');
      toast({
        title: 'Upload failed',
        description: 'Could not retrieve the uploaded file.',
        variant: 'destructive',
      });
      return null;
    }

    return {
      id: createLocalAttachmentId(),
      type,
      url: publicUrlData.publicUrl,
      name: file.name,
      size: file.size,
      mime_type: file.type,
      preview_url: type === 'image' || type === 'video' ? publicUrlData.publicUrl : undefined,
      storage_path: storagePath,
      meta: {
        storagePath,
        originalName: file.name,
      },
    };
  }, [toast, user?.id]);

  useEffect(() => {
    // Cleanup typing timeout and notify stop typing on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onStopTyping();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop?.();
        } catch (error) {
          console.error('Error stopping speech recognition on unmount:', error);
        }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Error stopping audio recorder on unmount:', error);
        }
        mediaRecorderRef.current = null;
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [onStopTyping]);

  const emitStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setIsTyping(prev => {
      if (prev) {
        return false;
      }
      return prev;
    });

    lastTypingEventRef.current = 0;
    onStopTyping();
  }, [onStopTyping]);

  const scheduleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 3000);
  }, [emitStopTyping]);

  const emitTypingEvent = useCallback(() => {
    const now = Date.now();

    if (!isTyping) {
      setIsTyping(true);
      onStartTyping();
      lastTypingEventRef.current = now;
      return;
    }

    if (now - lastTypingEventRef.current >= 2000) {
      onStartTyping();
      lastTypingEventRef.current = now;
    }
  }, [isTyping, onStartTyping]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const maxHeight = viewportHeight ? Math.max(200, Math.floor(viewportHeight * 0.35)) : 260;
    const minHeight = 48;

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const handleAttachmentSelection = useCallback(async (fileList: FileList | null) => {
    if (!fileList || disabled) return;

    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Attachment limit reached',
        description: `You can add up to ${MAX_ATTACHMENTS} attachments per message.`,
        variant: 'destructive',
      });
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: 'Too many files selected',
        description: `Only the first ${remainingSlots} file${remainingSlots > 1 ? 's' : ''} were added.`,
      });
    }

    setIsUploading(true);

    try {
      const uploaded: MessageAttachment[] = [];
      for (const file of selectedFiles) {
        const attachment = await uploadFileAttachment(file);
        if (attachment) {
          uploaded.push(attachment);
        }
      }

      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded]);
        toast({
          title: uploaded.length === 1 ? 'Attachment added' : `${uploaded.length} attachments added`,
          description: 'Attachments are ready to send.',
        });
      }
    } catch (error) {
      console.error('Unexpected attachment upload error:', error);
      toast({
        title: 'Upload error',
        description: 'Something went wrong while uploading.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [attachments.length, disabled, toast, uploadFileAttachment]);

  const handleAttachmentButtonClick = useCallback(() => {
    if (disabled) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Attachment limit reached',
        description: `You can add up to ${MAX_ATTACHMENTS} attachments per message.`,
      });
      return;
    }

    fileInputRef.current?.click();
  }, [attachments.length, disabled, toast]);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => {
      const attachmentToRemove = prev.find((attachment) => attachment.id === attachmentId);
      if (attachmentToRemove?.storage_path) {
        supabase.storage
          .from(STORAGE_BUCKET)
          .remove([attachmentToRemove.storage_path])
          .catch(() => undefined);
      }
      return prev.filter((attachment) => attachment.id !== attachmentId);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    adjustTextareaHeight();

    // Typing indicator logic
    if (value.trim()) {
      emitTypingEvent();
      scheduleStopTyping();
    } else {
      emitStopTyping();
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, message, attachments.length]);

  useEffect(() => {
    const handleResize = () => adjustTextareaHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustTextareaHeight]);

  const handleSend = () => {
    const trimmed = message.trim();
    const hasText = trimmed.length > 0;
    const hasAttachments = attachments.length > 0;

    if ((!hasText && !hasAttachments) || disabled || isUploading) {
      return;
    }

    const inferredMessageType = () => {
      if (!hasAttachments) return 'text';
      const types = new Set(attachments.map((attachment) => attachment.type));
      if (types.size === 1) {
        return types.values().next().value as string;
      }
      if (types.has('video')) return 'video';
      if (types.has('audio')) return 'audio';
      if (types.has('image')) return 'image';
      return 'file';
    };

    onSendMessage({
      content: hasText ? trimmed : '',
      attachments,
      messageType: inferredMessageType(),
    });

    setMessage('');
    setAttachments([]);
    emitStopTyping();

    requestAnimationFrame(() => adjustTextareaHeight());

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isUploading) {
        handleSend();
      }
    }
  };

  const handleBlur = () => {
    if (message.trim()) {
      emitStopTyping();
    } else if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    setMessage(newMessage);
    
    // Focus and set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleToggleTranscription = useCallback(() => {
    if (disabled) return;

    if (isTranscribing) {
      try {
        recognitionRef.current?.stop?.();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      return;
    }

    if (typeof window === 'undefined') {
      toast({
        title: 'Voice input unavailable',
        description: 'Speech recognition is not supported in this environment.',
        variant: 'destructive',
      });
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: 'Voice input unavailable',
        description: 'Your browser does not support voice recognition.',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsTranscribing(true);
      emitTypingEvent();
      scheduleStopTyping();
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
        setIsTranscribing(false);
      recognition.stop();
      recognitionRef.current = null;
      toast({
        title: 'Voice input error',
        description: 'Something went wrong while listening.',
        variant: 'destructive',
      });
    };

    recognition.onend = () => {
        setIsTranscribing(false);
      recognitionRef.current = null;
      emitStopTyping();
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.[0]?.transcript) {
          transcript += result[0].transcript;
        }
      }

      if (transcript) {
        setMessage(prev => {
          const combined = prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim();
          return combined.trimStart();
        });
        emitTypingEvent();
        scheduleStopTyping();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Speech recognition start error:', error);
      toast({
        title: 'Voice input error',
        description: 'Unable to start listening.',
        variant: 'destructive',
      });
      recognitionRef.current = null;
        setIsTranscribing(false);
    }
    }, [disabled, emitStopTyping, emitTypingEvent, isTranscribing, scheduleStopTyping, toast]);

  const stopRecordingTimer = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const startRecordingTimer = useCallback(() => {
    stopRecordingTimer();
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, [stopRecordingTimer]);

  const handleAudioRecordingToggle = useCallback(async () => {
    if (disabled) return;

    if (isRecordingAudio) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Recording unavailable',
        description: 'Your browser does not support audio recording.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopRecordingTimer();
        setIsRecordingAudio(false);
        setRecordingDuration(0);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        if (blob.size === 0) {
          stream.getTracks().forEach((track) => track.stop());
          mediaRecorderRef.current = null;
          return;
        }

        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setIsUploading(true);
        try {
          const attachment = await uploadFileAttachment(file);
          if (attachment) {
            attachment.meta = {
              ...(attachment.meta ?? {}),
              durationMs: recordingDuration * 1000,
            };
            attachment.duration_ms = recordingDuration * 1000;
            setAttachments((prev) => [...prev, attachment]);
            toast({
              title: 'Audio message added',
              description: 'Audio attachment is ready to send.',
            });
          }
        } catch (error) {
          console.error('Audio upload error:', error);
          toast({
            title: 'Upload error',
            description: 'Failed to upload audio message.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
          stream.getTracks().forEach((track) => track.stop());
          mediaRecorderRef.current = null;
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      startRecordingTimer();
    } catch (error) {
      console.error('Audio recording error:', error);
      toast({
        title: 'Recording error',
        description: 'Unable to access your microphone.',
        variant: 'destructive',
      });
      setIsRecordingAudio(false);
      stopRecordingTimer();
      setRecordingDuration(0);
    }
  }, [disabled, isRecordingAudio, recordingDuration, startRecordingTimer, stopRecordingTimer, toast, uploadFileAttachment]);

  const renderAttachmentPreview = (attachment: MessageAttachment) => {
    const removeButton = (
      <button
        type="button"
        onClick={() => handleRemoveAttachment(attachment.id)}
        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 rounded-full border bg-background p-0.5 sm:p-1 shadow-sm"
        aria-label="Remove attachment"
      >
        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </button>
    );

    if (attachment.type === 'image') {
      return (
        <div key={attachment.id} className="relative h-16 w-16 sm:h-24 sm:w-24 rounded-lg border overflow-hidden">
          <img
            src={attachment.preview_url || attachment.url}
            alt={attachment.name || 'Image attachment'}
            className="h-full w-full object-cover"
          />
          {removeButton}
        </div>
      );
    }

    if (attachment.type === 'video') {
      return (
        <div key={attachment.id} className="relative h-16 w-24 sm:h-24 sm:w-32 rounded-lg border overflow-hidden">
          <video className="h-full w-full object-cover" controls>
            <source src={attachment.url} type={attachment.mime_type || 'video/mp4'} />
          </video>
          {removeButton}
        </div>
      );
    }

    if (attachment.type === 'audio') {
      return (
        <div
          key={attachment.id}
          className="relative flex flex-col justify-center gap-1.5 sm:gap-2 rounded-lg border px-2 py-2 sm:px-4 sm:py-3 min-w-[150px] sm:min-w-[200px]"
        >
          {removeButton}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
            <AudioLines className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">{attachment.name || 'Audio message'}</span>
          </div>
          <audio controls className="w-full h-8 sm:h-auto">
            <source src={attachment.url} type={attachment.mime_type || 'audio/webm'} />
          </audio>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {formatFileSize(attachment.size)}
          </div>
        </div>
      );
    }

    return (
      <div
        key={attachment.id}
        className="relative flex items-start gap-1.5 sm:gap-2 rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2 min-w-[140px] sm:min-w-[200px]"
      >
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-medium truncate">{attachment.name || 'File attachment'}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {formatFileSize(attachment.size)}
          </div>
        </div>
        {removeButton}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 flex-shrink-0 space-y-3 sm:space-y-4 shadow-inner">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FILE_TYPES}
        multiple
        className="hidden"
        data-testid="message-file-input"
        onChange={(event) => handleAttachmentSelection(event.target.files)}
      />

      <div className="flex flex-wrap items-end gap-2 sm:gap-3 md:flex-nowrap">
        {/* Actions Popover - single "+" button */}
        <Popover open={isActionsOpen} onOpenChange={setIsActionsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11 border border-border/70 bg-background/80 shadow-sm"
              disabled={disabled}
              aria-label="Open message actions"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 sm:w-80 p-3" align="start" sideOffset={8}>
            <div className="flex flex-col gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    disabled={disabled}
                    aria-label="Add emoji"
                  >
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Add emoji</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 sm:w-80 p-2" align="start">
                  <div className="max-h-60 sm:max-h-72 overflow-y-auto">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category} className="mb-3">
                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2 px-2">
                          {category}
                        </p>
                        <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                insertEmoji(emoji);
                                setIsActionsOpen(false);
                              }}
                              className="p-1.5 sm:p-2 hover:bg-accent rounded transition-colors text-lg sm:text-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                disabled={disabled || isUploading || attachments.length >= MAX_ATTACHMENTS}
                onClick={() => {
                  handleAttachmentButtonClick();
                  setIsActionsOpen(false);
                }}
                title="Attach files"
                aria-label="Attach files"
              >
                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Upload a document</span>
              </Button>

              <Button
                variant={isTranscribing ? 'destructive' : 'ghost'}
                className="w-full justify-start gap-2"
                disabled={disabled || isUploading || isRecordingAudio}
                onClick={() => {
                  handleToggleTranscription();
                  setIsActionsOpen(false);
                }}
                title={isTranscribing ? 'Stop voice to text' : 'Voice to text'}
                aria-label={isTranscribing ? 'Stop voice to text' : 'Voice to text'}
              >
                {isTranscribing ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Keyboard className="h-4 w-4 sm:h-5 sm:w-5" />}
                <span className="text-sm sm:text-base">Voice input</span>
              </Button>

              <Button
                variant={isRecordingAudio ? 'destructive' : 'ghost'}
                className="w-full justify-start gap-2"
                disabled={disabled || isUploading || isTranscribing}
                onClick={() => {
                  handleAudioRecordingToggle();
                  setIsActionsOpen(false);
                }}
                title={isRecordingAudio ? 'Stop audio recording' : 'Record audio message'}
                aria-label={isRecordingAudio ? 'Stop audio recording' : 'Record audio message'}
              >
                {isRecordingAudio ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                <span className="text-sm sm:text-base">Voice message</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Message Input - takes remaining space with better sizing */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Type a message..."
            disabled={disabled}
            className="min-h-[48px] sm:min-h-[56px] max-h-[35vh] resize-none text-[15px] sm:text-base leading-relaxed py-3 sm:py-3.5 px-3 sm:px-4 w-full rounded-2xl border border-border/60 bg-background/90 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-[height] duration-150"
            style={{ minHeight: '48px', maxHeight: '35vh', overflow: 'hidden' }}
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || isUploading || isRecordingAudio || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11 shadow-sm"
          aria-label="Send message"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Recording/Transcribing indicator */}
      {(isRecordingAudio || isTranscribing) && (
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground px-1">
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
          {isRecordingAudio ? `Recording… ${formatDuration(recordingDuration)}` : 'Listening…'}
        </div>
      )}

      {/* Attachment previews */}
      {(attachments.length > 0 || isUploading) && (
        <div className="flex flex-col gap-2 px-1 sm:px-2">
          {isUploading && (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Uploading...
            </div>
          )}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {attachments.map((attachment) => renderAttachmentPreview(attachment))}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] sm:text-xs text-muted-foreground px-1 sm:px-2 hidden sm:block">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
