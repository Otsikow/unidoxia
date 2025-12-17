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
  admin: {
    layout: {
      sidebar: {
        logoAlt: "UniDoxia",
        organization: "UniDoxia",
        subtitle: "Admin Control Centre",
      },
      navigation: {
        overview: { label: "Overview", description: "Executive summary" },
        users: { label: "Users", description: "Administrators & roles" },
        admissions: { label: "Admissions Oversight", description: "Pipeline ownership" },
        payments: { label: "Payments", description: "Stripe & payouts" },
        partners: { label: "Partners", description: "Agencies & universities" },
        resources: { label: "Resources", description: "Content & assets" },
        insights: { label: "Insights", description: "AI & analytics" },
        intelligence: { label: "Zoe Intelligence", description: "AI insights console" },
        settings: { label: "Settings", description: "Tenant configuration" },
        notifications: { label: "Notifications", description: "System alerts" },
        logs: { label: "Logs", description: "Audit trails" },
      },
      profile: {
        defaultName: "Admin",
      },
      header: {
        openNavigation: "Open navigation",
        organization: "UniDoxia",
        workspace: "Administrator Workspace",
        privilegedAccess: "Privileged access",
        askZoe: "Ask Zoe",
        askZoePrompt: "Provide a governance summary for today",
      },
    },
    settings: {
      heading: "System settings",
      subheading: "Configure tenant-wide policies, integrations, and automation defaults.",
      securityReview: "Security review",
      securityPrompt: "Review security posture for settings changes",
      accessControl: {
        title: "Access control",
        description: "Govern authentication requirements and privileged role assignments.",
        mfa: {
          label: "Enforce multi-factor authentication",
          description: "Mandate MFA for every admin and finance user.",
        },
        auditAlerts: {
          label: "Real-time audit alerts",
          description: "Send alerts when privileged settings change.",
        },
        summarize: "Summarize changes",
        summarizePrompt: "Summarize recent configuration changes",
      },
      branding: {
        title: "Organization branding",
        description: "Control the visual identity used across the admin experience.",
        logo: {
          label: "Upload logo",
          selected: "Selected file: {{name}}",
        },
        color: {
          label: "Primary colour",
          aria: "Primary colour hex value",
          helpText: "Applies to buttons, highlights, and key interface accents.",
        },
        favicon: {
          label: "Upload favicon",
          selected: "Selected file: {{name}}",
        },
        save: "Save branding",
      },
    },
    overview: {
      loading: {
        trends: "Loading admissions trends",
        geography: "Loading geographic mix",
        activity: "Loading activity",
      },
      emptyStates: {
        noAdmissions: "No admissions activity recorded for the selected period.",
        noApplications: "No in-flight applications available.",
      },
      trends: {
        title: "Admissions trends",
        subtitle: "Rolling six-month submission and enrollment cadence",
        submitted: "Submitted",
        enrolled: "Enrolled",
      },
      geography: {
        title: "Applications by country",
        subtitle: "Current pipeline distribution by destination",
      },
      kpis: {
        totalStudents: "Total Students",
        totalAgents: "Total Agents",
        totalUniversities: "Total Universities",
        activeApplications: "Active Applications",
        totalCommissionPaid: "Total Commission Paid",
        pendingVerifications: "Pending Verifications",
        lastUpdated: "Updated {{time}}",
        justNow: "moments ago",
      },
      badges: {
        actionRequired: "Action Required",
      },
      recentActivity: {
        title: "Recent activity",
        subtitle: "Latest tenant-wide audit events",
        prompt: "Summarize today’s critical audit events",
        cta: "Escalate with Zoe",
        empty: "No recent activity recorded.",
        byUser: "by {{name}}",
      },
      quickActions: {
        title: "Quick actions",
        subtitle: "Resolve high-impact workflow blockers",
        agents: "Approve New Agents",
        agentsPrompt: "List agents awaiting approval and potential risks",
        universities: "Approve Universities",
        universitiesPrompt: "Which universities are pending onboarding tasks?",
        compliance: "Review Flagged Profiles",
        compliancePrompt: "Show profiles flagged for compliance review",
      },
      health: {
        title: "System health",
        subtitle: "Security signals aggregated from the last 30 days",
        scoreLabel: "risk score",
        operational: "Operational",
        monitoring: "Monitoring",
        degraded: "Degraded",
        critical: "Critical",
        unknown: "Unknown",
        noRecommendations: "No active recommendations—continue monitoring.",
        prompt: "Provide a security triage summary for admin",
        cta: "Triage with Zoe",
      },
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "Failed to Load Page",
      failedToLoadPageDescription:
        "The page could not be loaded. This might be due to a network issue or the page being temporarily unavailable.",
      chunkReloadMessage:
        "We refreshed the app to fetch the latest files. If this keeps happening, please clear your browser cache and try again.",
    },
    loading: "Loading application...",
    errorBoundary: {
      networkTitle: "Connection Error",
      networkMessage: "Network connection failed. Please check your internet connection and try again.",
      chunkTitle: "Loading Error",
      chunkMessage: "Failed to load application resources. This usually happens when the app has been updated.",
      permissionTitle: "Access Denied",
      permissionMessage: "You do not have permission to access this resource.",
      notFoundTitle: "Not Found",
      notFoundMessage: "The requested resource was not found.",
      unauthorizedTitle: "Session Expired",
      unauthorizedMessage: "Your session has expired. Please log in again.",
      databaseTitle: "Database Error",
      databaseMessage: "Database connection failed. Please try again in a moment.",
      genericTitle: "Something went wrong",
      genericMessage: "An unexpected error occurred. Please try again.",
      fallbackTitle: "Error",
      fallbackMessage: "An unexpected error occurred",
      technicalDetails: "Technical Details",
      tryAgain: "Try Again",
      tryAgainCount: "Try Again ({{count}} left)",
      goHome: "Go Home",
      maxRetriesReached: "Maximum retry attempts reached. Please refresh the page or contact support.",
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
          ctas: {
            students: {
              badge: "For You",
              title: "Start your study abroad journey today",
              description:
                "We guide you through applying to multiple universities in the UK, Europe, Canada, the USA, and Australia with clear guidance and no hidden fees.",
              action: "Start Application",
            },
            agents: {
              badge: "Agents",
              title: "Recruit students and earn commissions",
              description:
                "We support you in managing your students, submitting applications, and working directly with universities.",
              action: "Join as Agent",
            },
            universities: {
              badge: "Universities",
              title: "Connect with qualified international students",
              description:
                "We help you receive ready-to-review applications and grow enrolments from Africa through a trusted recruitment network.",
              action: "Partner with Us",
            },
          },
        },
        features: {
          heading: "Why Start Your Journey With Us?",
          cards: {
            applyEasily: {
              title: "Apply Easily",
              description:
                "We guide you step by step until you receive an offer. Fewer rejections, just clear guidance.",
            },
            trackRealtime: {
              title: "Always Know Where You Stand",
              description: "We support you with live updates and instant notifications, so you never feel lost.",
            },
            connectAgents: {
              title: "Real Human Support",
              description: "Get clear guidance from experts who treat you like a person, not a file.",
            },
          },
        },
        aiDocumentChecker: {
          badge: "AI Document Checker",
          heading: "We check your documents instantly",
          description:
            "We help you get your documents right the first time, so you face fewer rejections.",
          tagline: "This gives you visa confidence.",
          approvals: {
            heading: "Automatically review & approve",
            description: "We guide you to perfection before you submit.",
            items: [
              "Passport",
              "WAEC/NECO",
              "Transcripts",
              "Recommendation letters",
              "Bank statements",
            ],
          },
          detections: {
            heading: "Instant feedback",
            description: "We help you fix issues before they delay your visa or offer.",
            items: [
              "Missing pages",
              "Unclear images",
              "Wrong document type",
              "Fraud signs",
            ],
          },
          riskMonitoring: {
            heading: "We protect you from bad advice",
            description: "We ensure every application is compliant:",
            items: [
              "Unique identity verification",
              "Verified financial documents",
              "Authentic academic results",
              "Realistic student profiles",
            ],
            footnote: "This protects your reputation.",
          },
          stats: [
            { value: "60s", label: "Average review time" },
            { value: "5 docs", label: "Checked simultaneously" },
            { value: "24/7", label: "Automated monitoring" },
          ],
        },
        aiSearch: {
          badge: "AI-Powered University & Scholarship Search",
          heading: "We help you find universities that actually accept students like you",
          description:
            "Ask anything about universities, courses, or funding worldwide. We guide you to the best options tailored to your goals.",
          subheading:
            "Start now to get clear guidance on admissions, scholarships, and visas.",
          ctaLabel: "Get Started",
          stats: [
            { value: "12k+", label: "Insights generated for applicants like you" },
            { value: "84%", label: "Matches to best-fit courses" },
            { value: "50+", label: "Countries with verified admissions data" },
          ],
          panel: {
            title: "Preview Zoe Intelligence",
            subtitle: "Choose a focus area to explore the clear guidance you'll unlock.",
            previewLabel: "Sample",
            highlightsHeading: "How we guide you",
          },
          zoeAlt: "Portrait of Zoe, your guide",
          zoeCaption: "Meet Zoe – she guides every insight and recommendation.",
          focusAreas: [
            {
              key: "stem",
              label: "STEM",
              headline: "Tailored pathways for technical innovators",
              description:
                "We spotlight courses with research labs, co-ops, and funding built for scientists and engineers.",
              highlights: [
                "Scholarships that prioritise STEM majors and research output",
                "Industry-aligned curricula with internships and co-op rotations",
                "Visa guidance for high-demand technology and engineering roles",
              ],
            },
            {
              key: "scholarships",
              label: "Scholarships",
              headline: "Funding opportunities matched to your profile",
              description:
                "We help you identify grants, bursaries, and assistantships you can realistically secure.",
              highlights: [
                "Curated list of merit and need-based awards with deadlines",
                "Eligibility insights that map to your academic background",
                "Application tips to strengthen statements and references",
              ],
            },
            {
              key: "visa",
              label: "Visa friendly",
              headline: "Study routes with smooth immigration journeys",
              description: "We help you compare countries and institutions with favourable visa pathways.",
              highlights: [
                "Post-study work options and stay-back durations summarised",
                "Documentation checklists tailored to your nationality",
                "Advisories on financial proof, health cover, and interview prep",
              ],
            },
            {
              key: "undergraduate",
              label: "Undergraduate",
              headline: "Journeys built for first-time applicants",
              description:
                "We help you understand entry requirements, prerequisites, and support services.",
              highlights: [
                "Step-by-step timeline from transcript evaluation to offer acceptance",
                "Guidance on choosing majors, minors, and foundation years",
                "Transition resources covering housing, orientation, and budgeting",
              ],
            },
            {
              key: "postgraduate",
              label: "Postgraduate",
              headline: "Master's and doctoral courses curated for your goals",
              description: "We help you compare research supervisors, cohort sizes, and funding models.",
              highlights: [
                "Faculty highlights with current research themes",
                "Assistantship and fellowship availability with stipends",
                "Interview preparation and portfolio expectations by course",
              ],
            },
            {
              key: "coop",
              label: "Co-op & Internships",
              headline: "Work-integrated learning with global employers",
              description:
                "We surface courses that blend study with hands-on professional experience.",
              highlights: [
                "Placement rates and employer partnerships across regions",
                "Visa considerations for paid placements and work terms",
                "Career services support for resumes, interviews, and networking",
              ],
            },
          ],
        },
        zoeMultiRole: {
          badge: "Meet Zoe",
          heading: "Your personal guide",
          description:
            "Zoe adapts to provide the exact support you need, the moment you need it.",
          note: "Zoe supports everyone involved.",
          highlightsHeading: "How Zoe supports you",
          highlights: [
            "Answers every study-abroad question with clear guidance on visas and policies.",
            "Guides you step by step so timelines and next steps stay on track.",
            "Reviews your documents to recommend schools, scholarships, and next steps instantly.",
          ],
          roles: [
            {
              key: "students",
              title: "For You & Your Family",
              description:
                "Zoe walks you through the full experience step by step.",
              capabilities: [
                "Answers any study-abroad question instantly in plain language.",
                "Guides you through every task so nothing is missed.",
                "Reviews uploaded transcripts, essays, and proof of funds to suggest best-fit schools.",
                "Shares personalised counselling recommendations informed by your goals.",
              ],
            },
            {
              key: "agents",
              title: "For Agents",
              description:
                "Training, coaching, and on-demand answers are built right in.",
              capabilities: [
                "Delivers bite-sized training refreshers for new advisors and support staff.",
                "Turns shared student documents into quick school shortlists you can review with clients.",
                "Drafts outreach scripts, follow-up plans, and counselling recommendations automatically.",
                "Flags opportunities to improve conversion using agent analytics pulled from Zoe Intelligence.",
              ],
            },
            {
              key: "universities",
              title: "For Universities",
              description:
                "Zoe keeps recruitment, compliance, and service teams aligned.",
              capabilities: [
                "Surfaces partner health alerts and suggested actions directly.",
                "Summarises applicant pipelines by region with notes about policy differences.",
                "Provides training snippets for staff onboarding so teams can self-serve answers.",
                "Escalates issues that need human attention so you can focus on strategic relationships.",
              ],
            },
          ],
        },
        journeyRibbon: {
          items: {
            discover: {
              stage: "Explore Global Partners",
              metricValue: "200+",
              metricLabel: "Partner Universities",
              description:
                "We help you find the right match the moment you start.",
              ctaLabel: "Start Application",
            },
            plan: {
              stage: "Build Your Roadmap",
              metricValue: "5000+",
              metricLabel: "Personalized plans created",
              description:
                "We support you with checklists that keep you organized from transcripts to statements.",
              ctaLabel: "",
            },
            collaborate: {
              stage: "Collaborate with Advisors",
              metricValue: "24h",
              metricLabel: "Average agent response",
              description:
                "Real human support to answer your questions and polish your documents.",
              ctaLabel: "Meet Your Agent",
            },
            submit: {
              stage: "Streamline Applications",
              metricValue: "95%",
              metricLabel: "Success Rate",
              description:
                "We guide you so you never miss a deadline. Fewer rejections, more offers.",
              ctaLabel: "",
            },
            celebrate: {
              stage: "Launch Your Journey",
              metricValue: "50+",
              metricLabel: "Countries represented",
              description:
                "We give you visa confidence and help you prepare for departure.",
              ctaLabel: "",
            },
          },
        },
        storyboard: {
          heading: "How We Guide You Step by Step",
          subheading:
            "Follow the storyboard to see exactly how we guide you from idea to arrival.",
          stepLabel: "Step {{number}}",
          steps: {
            discover: {
              title: "Discover Your Best-Fit Courses",
              description:
                "Tell us your goals and academics, and we help you find universities that actually accept you.",
              support:
                "We remove the guesswork so you can shortlist confident choices in minutes.",
              imageAlt: "Student reviewing university courses on a campus tour",
            },
            plan: {
              title: "Build a Personalized Application Plan",
              description:
                "Upload transcripts, test scores, and statements with guided checklists.",
              support: "We give you clear guidance on every task to keep you ahead of every deadline.",
              imageAlt: "Student planning application tasks on a laptop outdoors",
            },
            collaborate: {
              title: "Get Real Human Support",
              description:
                "Work side-by-side with a verified advisor to polish documents, align on timelines, and stay interview ready.",
              support:
                "We support you with expert advice to polish your documents.",
              imageAlt: "Student connecting with an education agent using a mobile phone",
            },
            track: {
              title: "We Guide You Step by Step",
              description:
                "We help you track every step until you receive an offer.",
              support: "We support you with proactive nudges so nothing slips through the cracks.",
              imageAlt: "Student checking application progress while walking on campus",
            },
            celebrate: {
              title: "Celebrate & Prepare for Departure",
              description:
                "Accept your offer, finalize visa steps, and access pre-departure resources tailored to your destination.",
              support:
                "We give you visa confidence and help you prepare for departure.",
              imageAlt: "Student celebrating visa approval with documents in hand",
            },
          },
        },
        featuredUniversities: {
          heading: "Featured Universities",
          description:
            "Institutions that consistently deliver an exceptional onboarding experience for you.",
          network: {
            label: "Featured Universities",
            summary: "{{count}} institutions selected by our partnerships team",
          },
          badges: {
            topPick: "Top pick",
            priority: "Priority #{{position}}",
          },
          actions: {
            visitSite: "Visit site",
            scrollLeft: "Scroll featured universities left",
            scrollRight: "Scroll featured universities right",
          },
          fallback: {
            summary:
              "Dedicated partners that consistently welcome you with tailored support.",
            highlight: "Dedicated student success partner",
            notice: {
              error: "We're showing highlighted partners while we reconnect to the featured list.",
              updating: "We're showing highlighted partners while our featured list updates.",
            },
          },
          partnerCta: {
            heading: "Become a partner",
            description: "Showcase your institution to thousands of motivated students worldwide.",
            action: "Join the network",
          },
        },
        visa: {
          badge: "Feature Spotlight",
          title: "Understand your visa eligibility before you apply",
          description:
            "Our Visa Eligibility Calculator analyses your profile instantly so you can focus on the countries and courses that welcome you the most.",
          cta: "Explore the Visa Calculator",
        },
        feeCalculator: {
          badge: "AI Fee Calculator",
          title: "Get a complete financial picture instantly",
          description:
            "We help you understand all costs so you have no hidden fees to worry about.",
          formTitle: "Projected annual costs",
          confidenceLabel: "AI confidence: {{value}}%",
          calculatingLabel: "Calculating...",
          cta: "Recalculate with AI",
          highlights: [
            "Tuition, accommodation, living, insurance, transportation, visa, and miscellaneous costs in one view.",
            "Instant totals update as you tweak assumptions for countries, scholarships, or currency shifts.",
            "Share-ready breakdown designed for you, your parents, or sponsors.",
            "See annual and monthly budgets without spreadsheets.",
          ],
          insights: {
            title: "AI planning notes",
            items: [
              "Most international students allocate 45-55% of their budget to tuition fees.",
              "Accommodation plus everyday living often equals one-third of the total spend.",
              "Keep at least 10% reserved for insurance, transport, and visa processing buffers.",
            ],
          },
          fields: {
            tuition: { label: "Tuition", placeholder: "e.g. 26,000" },
            accommodation: { label: "Accommodation", placeholder: "e.g. 12,000" },
            living: { label: "Living expenses", placeholder: "e.g. 6,500" },
            insurance: { label: "Insurance", placeholder: "e.g. 1,200" },
            transportation: { label: "Transportation", placeholder: "e.g. 1,800" },
            visa: { label: "Visa fees", placeholder: "e.g. 600" },
            misc: { label: "Miscellaneous", placeholder: "e.g. 1,500" },
          },
          summary: {
            subtitle: "Estimated total for your first year",
            monthlyLabel: "Approx. monthly budget",
            confidenceHelper: "AI projection informed by similar student budgets with {{value}}% confidence.",
            disclaimer:
              "Illustrative USD estimates. Actual figures depend on university choice, scholarship decisions, and currency movement.",
          },
        },
        aiExecutiveDashboard: {
          badge: "Executive performance view",
          title: {
            prefix: "AI Performance Dashboard",
            highlight: "for You as CEO",
            suffix: "",
          },
          description:
            "We support you by watching every funnel and flagging the moves that change revenue so you never have to chase agents for updates.",
          ceoPromise: "We help you focus on growth, not chasing updates.",
          insightsTitle: "You get automated insights on:",
          insights: [
            "Applications this week",
            "Conversion rate",
            "Best-performing agents",
            "Countries with the most leads",
            "Pipeline forecast",
            "Expected revenue this month",
          ],
          metrics: [
            {
              label: "Applications this week",
              value: "248",
              helper: "+18% vs last week",
              trend: "up",
            },
            {
              label: "Conversion rate",
              value: "42%",
              helper: "+6 pts since automation",
              trend: "up",
            },
            {
              label: "Best-performing agents",
              value: "Rivera · Kalu · Chen",
              helper: "Average CSAT 4.9/5",
              trend: "neutral",
            },
            {
              label: "Countries with the most leads",
              value: "India · Nigeria · Vietnam",
              helper: "68% of total pipeline",
              trend: "neutral",
            },
            {
              label: "Pipeline forecast",
              value: "$12.4M",
              helper: "Weighted 90-day outlook",
              trend: "up",
            },
            {
              label: "Expected revenue this month",
              value: "$940K",
              helper: "+22% vs plan",
              trend: "up",
            },
          ],
        },
        testimonials: {
          heading: "Success Stories",
          items: [
            {
              name: "Sarah Johnson",
              role: "Master's Student at MIT",
              country: "USA",
              quote:
                "UniDoxia made my dream of studying at MIT a reality. The clear guidance was intuitive, and my agent was incredibly supportive.",
              rating: 5,
            },
            {
              name: "Raj Patel",
              role: "MBA Student at Oxford",
              country: "UK",
              quote:
                "The real-time tracking feature gave me peace of mind. I always knew where my application stood. Highly recommend UniDoxia!",
              rating: 5,
            },
            {
              name: "Maria Garcia",
              role: "Engineering Student at Stanford",
              country: "USA",
              quote:
                "From finding the right course to visa approval, UniDoxia supported me every step of the way. Outstanding service!",
              rating: 5,
            },
            {
              name: "Aisha Thompson",
              role: "MSc Data Science at Teesside University",
              country: "UK",
              quote:
                "My agent tailored every step for Teesside's requirements and kept me calm during visa processing. UniDoxia turned a stressful process into a smooth journey.",
              rating: 5,
            },
            {
              name: "Daniel Wong",
              role: "MBA Candidate at University of Toronto",
              country: "Canada",
              quote:
                "UniDoxia aligned my application timeline with Canada's intake dates and coached me for the interview. The support felt personalized from start to finish.",
              rating: 5,
            },
            {
              name: "Chloe Nguyen",
              role: "Master of Engineering at Monash University",
              country: "Australia",
              quote:
                "From course selection to GTE preparation, UniDoxia guided me with clear checklists and reminders. I always knew what was next and felt fully prepared.",
              rating: 5,
            },
            {
              name: "Lukas Müller",
              role: "Robotics Student at TU Munich",
              country: "Germany",
              quote:
                "The team helped me navigate APS requirements and secured a spot at TUM. UniDoxia's detailed feedback made my SOP and documents stand out.",
              rating: 5,
            },
            {
              name: "Priya Sharma",
              role: "Master's Student at National University of Singapore",
              country: "Singapore",
              quote:
                "UniDoxia matched me with an agent who knew NUS inside out. Their scholarship tips and document checks saved me weeks of research and revisions.",
              rating: 5,
            },
          ],
        },
        faq: {
          heading: "Frequently Asked Questions",
          subtitle: "Quick answers to common questions",
          audienceHeading: "For {{audience}}",
          sections: [
            {
              audience: "Students",
              items: [
                {
                  question: "How do you guide me?",
                  answer:
                    "We guide you step by step and connect you with verified agents who support you through every stage — from selecting universities to submitting documents.",
                },
                {
                  question: "Are there any hidden fees?",
                  answer:
                    "No hidden fees. Creating an account and exploring universities is free. Agents may charge consulting fees, clearly shown before commitment.",
                },
                {
                  question: "What documents do I need to apply?",
                  answer:
                    "Academic transcripts, English test scores (IELTS/TOEFL), recommendations, personal statement, and passport copy are typically required.",
                },
              ],
            },
            {
              audience: "Universities",
              items: [
                {
                  question: "How can our university partner with UniDoxia?",
                  answer:
                    "Submit a partnership request through the University Portal or contact our partnerships team. We'll verify your institution and set up onboarding within a few business days.",
                },
                {
                  question: "What insights do universities receive?",
                  answer:
                    "Universities gain access to dashboards showing applicant pipelines, conversion metrics, and regional interest so you can plan recruitment campaigns with confidence.",
                },
                {
                  question: "Can we manage offers directly?",
                  answer:
                    "Yes. Admissions teams can issue conditional or unconditional offers, request missing documents, and communicate with students and agents from a single workspace.",
                },
              ],
            },
            {
              audience: "Agents",
              items: [
                {
                  question: "What support do agents receive?",
                  answer:
                    "Agents receive a dedicated CRM, marketing collateral, and on-demand training to help match students with suitable courses quickly.",
                },
                {
                  question: "How are agent commissions handled?",
                  answer:
                    "Commission structures are transparent. Universities define the terms, and payouts are tracked within the agent dashboard for easy reconciliation.",
                },
                {
                  question: "Can agents collaborate with university admissions teams?",
                  answer:
                    "Absolutely. Shared workspaces and messaging threads keep all parties aligned on student progress, missing documents, and interview scheduling.",
                },
              ],
            },
          ],
        },
        contact: {
          heading: "Get in Touch",
          subtitle: "Have questions? We’d love to help.",
        },
      },
      universitySearch: {
        hero: {
          title: "Find Your Perfect University",
          subtitle: "Search through universities, courses, and scholarships worldwide.",
        },
        tabs: {
          search: "Search",
          recommendations: "AI Recommendations",
          sop: "SOP Generator",
          interview: "Interview Practice",
        },
        filters: {
          title: "Search Filters",
          subtitle: "Refine your search below",
          fields: {
            universityName: {
              label: "University Name",
              placeholder: "Search universities...",
            },
            country: {
              label: "Country",
              placeholder: "Select country",
              all: "All Countries",
            },
            programLevel: {
              label: "Course Level",
              placeholder: "Select level",
              all: "All Levels",
            },
            discipline: {
              label: "Discipline",
              placeholder: "Select discipline",
              all: "All Disciplines",
            },
            maxFee: {
              label: "Maximum Fee (USD)",
              placeholder: "Enter max fee",
            },
            scholarshipsOnly: {
              label: "Only show universities with scholarships",
            },
          },
        },
        actions: {
          search: "Search",
        },
        results: {
          loading: "Searching...",
          found_one: "Found {{count}} result",
          found_other: "Found {{count}} results",
          empty: "No universities found. Try adjusting your filters.",
          scholarshipBadge_one: "{{count}} Scholarship",
          scholarshipBadge_other: "{{count}} Scholarships",
          programs: {
            heading_one: "Courses ({{count}})",
            heading_other: "Courses ({{count}})",
            apply: "Apply Now",
            more_one: "+{{count}} more course",
            more_other: "+{{count}} more courses",
          },
          scholarships: {
            heading: "Scholarships",
            amountVaries: "Amount varies",
            more_one: "+{{count}} more scholarship",
            more_other: "+{{count}} more scholarships",
          },
          viewDetails: "View Details",
          visitWebsite: "Visit Website",
        },
      },
    contact: {
      heroTitle: "Contact Us",
      heroSubtitle: "We typically respond within one business day.",
      emailPrompt: "Prefer email?",
      email: "info@unidoxia.com",
      whatsappCta: "Message us on WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Professional education consultant ready to help",
      formTitle: "Send us a message",
    },
    faq: {
      heroTitle: "Frequently Asked Questions",
      heroSubtitle: "Quick answers to the most common questions about your education journey",
      imageAlt: "Student learning and researching",
      sections: [
        {
          audience: "Students",
          items: [
            {
              question: "How does UniDoxia help me apply to universities?",
              answer:
                "UniDoxia connects you with verified agents who guide you through every stage — from selecting universities to submitting documents.",
            },
            {
              question: "Is there a fee to use the platform?",
              answer:
                "Creating an account and exploring universities is free. Agents may charge consulting fees, clearly shown before commitment.",
            },
            {
              question: "What documents do I need to apply?",
              answer:
                "Academic transcripts, English test scores (IELTS/TOEFL), recommendations, personal statement, and passport copy are typically required.",
            },
            {
              question: "Can I apply to multiple universities?",
              answer:
                "Yes! You can apply to multiple universities at once and track all applications in one dashboard.",
            },
            {
              question: "How do I stay informed about my application status?",
              answer:
                "Your personalized dashboard shows real-time updates, deadlines, and next steps so you always know what to do next.",
            },
          ],
        },
        {
          audience: "Universities",
          items: [
            {
              question: "How can our university partner with UniDoxia?",
              answer:
                "Submit a partnership request through the University Portal or contact our partnerships team. We'll verify your institution and set up onboarding within a few business days.",
            },
            {
              question: "What insights do universities receive?",
              answer:
                "Universities gain access to dashboards showing applicant pipelines, conversion metrics, and regional interest so you can plan recruitment campaigns with confidence.",
            },
            {
              question: "Can we manage offers directly on the platform?",
              answer:
                "Yes. Admissions teams can issue conditional or unconditional offers, request missing documents, and communicate with students and agents from a single workspace.",
            },
          ],
        },
        {
          audience: "Agents",
          items: [
            {
              question: "What support do agents receive on UniDoxia?",
              answer:
                "Agents receive a dedicated CRM, marketing collateral, and on-demand training to help match students with suitable courses quickly.",
            },
            {
              question: "How are agent commissions handled?",
              answer:
                "Commission structures are transparent. Universities define the terms, and payouts are tracked within the agent dashboard for easy reconciliation.",
            },
            {
              question: "Can agents collaborate with university admissions teams?",
              answer:
                "Absolutely. Shared workspaces and messaging threads keep all parties aligned on student progress, missing documents, and interview scheduling.",
            },
          ],
        },
      ],
    },
  },
};

export default en;
