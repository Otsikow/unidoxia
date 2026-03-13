import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWhatsAppUrl } from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  phone: string | null | undefined;
  message?: string;
  size?: "sm" | "default";
  label?: string;
}

export default function WhatsAppButton({ phone, message, size = "default", label }: Props) {
  const { toast } = useToast();
  const url = getWhatsAppUrl(phone, message);

  const handleClick = () => {
    if (!url) {
      toast({
        title: "Invalid WhatsApp number",
        description: "This agent has no valid phone number. Please update their profile with an international format number.",
        variant: "destructive",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (size === "sm") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${url ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" : "text-muted-foreground/40 cursor-not-allowed"}`}
              onClick={handleClick}
              disabled={!url}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {url ? "Message on WhatsApp" : "No valid phone number"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={!url}
      className={url ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" : ""}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {label || "WhatsApp"}
    </Button>
  );
}
