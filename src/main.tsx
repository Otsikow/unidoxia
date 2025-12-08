import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { MinimalLoader } from "@/components/MinimalLoader";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <LanguageProvider>
      <Suspense fallback={<MinimalLoader message="Loading interface..." />}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </Suspense>
    </LanguageProvider>
  </ThemeProvider>,
);
