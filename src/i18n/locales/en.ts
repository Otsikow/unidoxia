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
        search: "Search",
        scholarships: "Scholarships",
        courses: "Courses",
        blog: "Blog",
        contact: "Contact",
      },
      auth: {
        login: "Log in",
        signup: "Sign up",
        logout: "Log out",
      },
      userMenu: {
        open: "Open user menu",
        dashboard: "Dashboard",
        settings: "Settings",
      },
    },

    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Connecting international students with world-class universities through verified agents and transparent application management.",
      contactEmailLabel: "Email us",
      followUs: "Follow UniDoxia",
      followUsSubtitle: "Follow us on LinkedIn, Facebook, and our WhatsApp channel.",
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

  components: {
    loadingState: {
      defaultMessage: "Loading...",
      retry: "Retry",
    },
    emptyState: {
      noRecentPages: "No recent pages",
      goToFallback: "Go to fallback",
      clearHistory: "Clear history",
      currentPage: "Current page",
    },
    contactForm: {
      placeholders: {
        name: "Your Name",
        email: "Your Email",
        whatsapp: "Your WhatsApp Number (optional)",
        message: "Your Message",
      },
      submit: {
        default: "Send Message",
        loading: "Sending...",
      },
      notifications: {
        signInRequiredTitle: "Sign in required",
        signInRequiredDescription: "Please sign in to send us a message.",
        successTitle: "Message sent!",
        successDescription: "Thank you for contacting us. We'll get back to you soon.",
        validationTitle: "Validation error",
        errorTitle: "Error",
        errorDescription: "Failed to send message. Please try again.",
      },
      errors: {
        nameRequired: "Name is required",
        nameMax: "Name must be less than 100 characters",
        emailInvalid: "Invalid email address",
        emailMax: "Email must be less than 255 characters",
        messageRequired: "Message is required",
        messageMax: "Message must be less than 1000 characters",
        whatsappInvalid: "WhatsApp number can only contain numbers and phone symbols",
        whatsappMax: "WhatsApp number must be less than 30 characters",
      },
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
        description:
          "We help you find universities that actually accept you, guide you step by step until you receive an offer, and provide real human support.",
      },

      journeyRibbon: {
        items: {
          startProfile: {
            stage: "Start your profile",
            metricValue: "5000+",
            metricLabel: "Active Profiles",
            description:
              "Create your profile once, upload your documents, and let our AI build your perfect application package.",
            ctaLabel: "Start Profile",
          },
          getMatched: {
            stage: "Get matched and supported",
            metricValue: "200+",
            metricLabel: "Partner Universities",
            description:
              "Get matched with best-fit universities and receive personalized support from verified agents and Zoe.",
            ctaLabel: "Get Matched",
          },
          receiveOffers: {
            stage: "Receive offers and visa guidance",
            metricValue: "95%",
            metricLabel: "Success Rate",
            description:
              "Accept your offers, navigate the visa process with confidence, and prepare for your journey abroad.",
            ctaLabel: "",
          },
        },
      },

      storyboard: {
        heading: "How UniDoxia Works",
        subheading: "Your journey to studying abroad in three simple steps.",
        stepLabel: "Step {{number}}",
        steps: {
          startProfile: {
            title: "Start your profile",
            description:
              "Create your profile once, upload your documents, and let our AI build your perfect application package.",
            support:
              "Our AI automatically organizes your documents and suggests the best programs for your background.",
            imageAlt: "Student creating their profile on a laptop",
          },
          getMatched: {
            title: "Get matched and supported",
            description:
              "Get matched with best-fit universities and receive personalized support from verified agents and Zoe.",
            support:
              "Verified agents and Zoe guide you through every question, ensuring your applications are perfect.",
            imageAlt: "Student receiving support from an agent",
          },
          receiveOffers: {
            title: "Receive offers and visa guidance",
            description:
              "Accept your offers, navigate the visa process with confidence, and prepare for your journey abroad.",
            support:
              "From visa checklists to pre-departure briefings, we ensure you land on campus ready to succeed.",
            imageAlt: "Student celebrating their university offer",
          },
        },
      },
    },
  },
};

export default en;
