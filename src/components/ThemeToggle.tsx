import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className={cn("rounded-full", className)}
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className={cn(
            "group relative rounded-full transition-all duration-300 hover:bg-accent hover:scale-110 hover:shadow-md",
            className,
          )}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent"
        >
          <Sun className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
          <span className="flex-1">Light</span>
          {theme === "light" && <Check className="ml-2 h-4 w-4 text-primary animate-in fade-in-0 zoom-in-95 duration-200" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent"
        >
          <Moon className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-rotate-12" />
          <span className="flex-1">Dark</span>
          {theme === "dark" && <Check className="ml-2 h-4 w-4 text-primary animate-in fade-in-0 zoom-in-95 duration-200" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent"
        >
          <Laptop className="mr-2 h-4 w-4" />
          <span className="flex-1">System</span>
          {theme === "system" && <Check className="ml-2 h-4 w-4 text-primary animate-in fade-in-0 zoom-in-95 duration-200" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
