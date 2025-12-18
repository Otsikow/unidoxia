import { CORE_MESSAGE, CORE_MESSAGE_CTA } from "@/lib/brand";

const en = {
  common: {
    languageNames: {
      en: "English",
      de: "German",
      fr: "French",
      pt: "Portuguese",
      it: "Italian",
      sw: "Swahili",
      es: "Spanish",
      zh: "Chinese",
      hi: "Hindi",
      ar: "Arabic",
    },
    labels: {
      language: "Language",
      selectLanguage: "Select language",
      toggleNavigation: "Toggle navigation",
      openUserMenu: "Open user menu",
      currentPage: "Current page",
      showRecentPages: "Show recent pages",
    },
    actions: {
      login: "Log in",
      signup: "Sign up",
      logout: "Log out",
      goToLogin: "Go to login",
      goBack: "Go back",
      reloadPage: "Reload page",
      retry: "Retry",
      save: "Save",
      clear: "Clear",
      cancel: "Cancel",
      submit: "Submit",
      markAllRead: "Mark all read",
    },
    navigation: {
      home: "Home",
      search: "Search",
      courses: "Courses",
      blog: "Blog",
      contact: "Contact",
      dashboard: "Dashboard",
      settings: "Settings",
      helpCenter: "Help Centre",
      faq: "FAQ",
      feedback: "Feedback",
      visaCalculator: "Visa Calculator",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    status: {
      loading: "Loading...",
      loadingInterface: "Loading interface...",
    },
    notifications: {
      success: "Success",
      error: "Error",
      saved: "Saved",
      deleted: "Deleted",
    },
  },

  layout: {
    navbar: {
      brand: {
        short: "UniDoxia",
        full: "UniDoxia",
        extended: "UniDoxia — Study Abroad Platform",
      },
      links: {
        home: "Home",
        howItWorks: "How It Works",
        destinations: "Destinations",
        pricing: "Pricing / Transparency",
        stories: "Stories",
        startProfileCta: "Start your profile",
      },
      auth: {
        login: "Log in",
        signup: "Sign up",
        logout: "Log out",
      },
    },

    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription: CORE_MESSAGE,
      contactEmailLabel: "Email us",
      followUs: "Follow UniDoxia",
      followUsSubtitle:
        "Follow us on LinkedIn, Facebook, and our WhatsApp channel.",
      social: {
        linkedin: "Follow us on LinkedIn",
        linkedinShort: "LinkedIn",
        facebook: "Follow us on Facebook",
        facebookShort: "Facebook",
        whatsapp: "Follow the UniDoxia.com channel on WhatsApp",
        whatsappShort: "WhatsApp",
      },
      headings: {
        platform: "Platform",
        support: "Support",
        accountLegal: "Account & Legal",
      },
      platformLinks: {
        search: "Search Universities",
        blog: "Blog",
        visaCalculator: "Visa Calculator",
        feedback: "Feedback",
      },
      supportLinks: {
        help: "Help Centre",
        contact: "Contact Us",
        faq: "FAQ",
        dashboard: "Dashboard",
      },
      accountLinks: {
        login: "Sign In",
        signup: "Get Started",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
      },
      copyright: "© {{year}} UniDoxia. All rights reserved.",
      questions: "Questions?",
    },
  },

  pages: {
    index: {
      hero: {
        trustBadge: "Trusted by {{count}}+ students worldwide",
        title: {
          prefix: "Welcome to",
          highlight: "UniDoxia",
          suffix: "",
        },
        description: CORE_MESSAGE,
      },

      features: {
        heading: "Why Choose UniDoxia?",
        cards: {
          applyEasily: {
            title: "Apply Easily",
            description:
              "You follow a clear, step-by-step path and submit to multiple universities confidently without fearing sudden rejections.",
          },
          trackRealtime: {
            title: "Track in Real-Time",
            description:
              "You see every status change in plain language, so you always know what's next and stay ahead of visa requests.",
          },
          connectAgents: {
            title: "Connect with Verified Advisors",
            description:
              "You work only with verified advisors who keep costs and expectations honest, guarding you from scams.",
          },
        },
      },

      contact: {
        heading: "Get in Touch",
        subtitle: "Have questions? We’d love to help.",
      },
    },

    contact: {
      heroTitle: "Contact Us",
      heroSubtitle: `${CORE_MESSAGE_CTA} We're here to respond within one business day.`,
      emailPrompt: "Prefer email?",
      email: "info@unidoxia.com",
      whatsappCta: "Message us on WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      formTitle: "Send us a message",
    },

    faq: {
      heroTitle: "Frequently Asked Questions",
      heroSubtitle:
        "Quick answers to the most common questions about your education journey",
    },
  },
};

export default en;
