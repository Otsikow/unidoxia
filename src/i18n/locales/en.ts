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
            "We guide African students step-by-step — from course selection to visa approval. No guesswork. No hidden fees.",
          ctas: {
            students: {
              badge: "Students",
              title: "Apply to universities abroad with ease",
              description:
                "Create your profile once, upload your documents, and apply to multiple universities in the UK, Europe, Canada, the USA, and Australia from one platform.",
              action: "Start Application",
            },
            agents: {
              badge: "Agents",
              title: "Recruit students and earn commissions",
              description:
                "Manage your students, submit applications, track progress, and work directly with universities — all from one dashboard.",
              action: "Join as Agent",
            },
            universities: {
              badge: "Universities",
              title: "Connect with qualified international students",
              description:
                "Receive ready-to-review applications, communicate with students and agents, and grow enrolments from Africa through a trusted recruitment network.",
              action: "Partner with Us",
            },
          },
        },
        features: {
          heading: "Why Choose UniDoxia?",
          cards: {
            applyEasily: {
              title: "Apply Easily",
              description:
                "Streamlined application process with step-by-step guidance. Submit applications to multiple universities effortlessly.",
            },
            trackRealtime: {
              title: "Track in Real-Time",
              description: "Monitor your application status 24/7 with live updates and instant notifications.",
            },
            connectAgents: {
              title: "Connect with Verified Agents",
              description: "Access certified education agents who provide personalized support throughout your journey.",
            },
          },
        },
        aiDocumentChecker: {
          badge: "AI Document Checker",
          heading: "Let AI review every document in seconds",
          description:
            "Automatically review and approve passports, WAEC/NECO results, transcripts, recommendation letters, and bank statements without manual back-and-forth.",
          tagline: "This saves you HOURS.",
          approvals: {
            heading: "Automatically review & approve",
            description: "Every required file is scored, classified, and approved before it reaches your desk.",
            items: [
              "Passport",
              "WAEC/NECO",
              "Transcripts",
              "Recommendation letters",
              "Bank statements",
            ],
          },
          detections: {
            heading: "AI instantly flags",
            description: "The checker stops risky submissions before they delay a student's visa or offer.",
            items: [
              "Missing pages",
              "Unclear images",
              "Wrong document type",
              "Fraud signs",
            ],
          },
          riskMonitoring: {
            heading: "AI detects fake tutors & fake agents",
            description: "AI flags suspicious behaviour:",
            items: [
              "Same passport used for multiple accounts",
              "Students buying fabricated bank statements",
              "Uploading fake WAEC results",
              "Agents sending unrealistic profiles",
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
          heading: "Find the right course with real-time intelligence",
          description:
            "Ask anything about universities, courses, or funding worldwide. Our AI engine analyses admissions insights, scholarships, and visa pathways tailored to your goals.",
          subheading:
            "Sign up to unlock tailored AI recommendations across admissions, scholarships, and visas.",
          ctaLabel: "Get Started",
          stats: [
            { value: "12k+", label: "AI insights generated for global applicants" },
            { value: "84%", label: "Students matched to at least three best-fit courses" },
            { value: "50+", label: "Countries covered with verified admissions data" },
          ],
          panel: {
            title: "Preview Zoe Intelligence",
            subtitle: "Choose a focus area to explore the insights you'll unlock.",
            previewLabel: "Sample",
            highlightsHeading: "What the AI prepares for you",
          },
          zoeAlt: "Portrait of Zoe, the Bridge intelligence guide",
          zoeCaption: "Meet Zoe – the friendly face guiding every insight and recommendation.",
          focusAreas: [
            {
              key: "stem",
              label: "STEM",
              headline: "Tailored pathways for technical innovators",
              description:
                "Spotlight courses with research labs, co-ops, and funding built for scientists and engineers.",
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
                "Identify grants, bursaries, and assistantships you can realistically secure.",
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
              description: "Compare countries and institutions with favourable visa pathways.",
              highlights: [
                "Post-study work options and stay-back durations summarised",
                "Documentation checklists tailored to your nationality",
                "Advisories on financial proof, health cover, and interview prep",
              ],
            },
            {
              key: "undergraduate",
              label: "Undergraduate",
              headline: "Undergraduate journeys built for first-time applicants",
              description:
                "Understand entry requirements, prerequisites, and support services.",
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
              description: "Compare research supervisors, cohort sizes, and funding models.",
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
                "Surface courses that blend study with hands-on professional experience.",
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
          heading: "AI chat assistant — but smarter",
          description:
            "Zoe switches between students, agents, and university teams to provide context-aware answers the moment you need them.",
          note: "Zoe is multi-role. Very few competitors do this.",
          highlightsHeading: "What Zoe handles for you",
          highlights: [
            "Answers every study-abroad question with region-aware visa and policy context.",
            "Guides you through the entire UniDoxia app so timelines, dashboards, and automations stay on track.",
            "Reads uploaded documents to recommend schools, scholarships, and next steps instantly.",
          ],
          roles: [
            {
              key: "students",
              title: "Students & families",
              description:
                "Zoe is a study-abroad counsellor that walks every applicant through the full UniDoxia experience.",
              capabilities: [
                "Answers any study-abroad question instantly in plain language.",
                "Guides you through every task inside the UniDoxia app so nothing is missed.",
                "Reviews uploaded transcripts, essays, and proof of funds to suggest best-fit schools.",
                "Shares personalised counselling recommendations informed by your goals.",
              ],
            },
            {
              key: "agents",
              title: "Agents & counsellors",
              description:
                "Training, coaching, and on-demand answers are built into the same workspace that powers your agency.",
              capabilities: [
                "Delivers bite-sized training refreshers for new advisors and support staff.",
                "Turns shared student documents into quick school shortlists you can review with clients.",
                "Drafts outreach scripts, follow-up plans, and counselling recommendations automatically.",
                "Flags opportunities to improve conversion using agent analytics pulled from Zoe Intelligence.",
              ],
            },
            {
              key: "universities",
              title: "Universities & partners",
              description:
                "Zoe lives inside the university dashboard to keep recruitment, compliance, and service teams aligned.",
              capabilities: [
                "Surfaces partner health alerts and suggested actions directly in the dashboard.",
                "Summarises applicant pipelines by region with notes about policy differences.",
                "Provides training snippets for staff onboarding so teams can self-serve answers.",
                "Escalates issues that need human attention so you can focus on strategic relationships.",
              ],
            },
          ],
        },
      journeyRibbon: {
        items: {
          profile: {
            stage: "Step 1",
            metricValue: "5 min",
            metricLabel: "to get started",
            description:
              "Create your profile with academic background, documents, and study preferences — everything in one place.",
            ctaLabel: "Start your profile",
          },
          matched: {
            stage: "Step 2",
            metricValue: "24h",
            metricLabel: "average match time",
            description:
              "Get matched with verified advisors and universities that fit your goals. Receive personalized guidance every step of the way.",
            ctaLabel: "Get matched",
          },
          offers: {
            stage: "Step 3",
            metricValue: "95%",
            metricLabel: "visa success rate",
            description:
              "Receive university offers and comprehensive visa guidance. We support you from acceptance to arrival.",
            ctaLabel: "",
          },
        },
      },
      storyboard: {
        heading: "Your Journey in 3 Simple Steps",
        subheading:
          "UniDoxia makes studying abroad straightforward. Here's how we guide you from start to success.",
        stepLabel: "Step {{number}}",
        steps: {
          profile: {
            title: "Start your profile",
            description:
              "Create your profile with your academic background, test scores, and study preferences. Upload your documents once and use them for all applications.",
            support:
              "Smart checklists and document tips help you build a complete profile that universities love.",
            imageAlt: "Student creating their profile on UniDoxia platform",
          },
          matched: {
            title: "Get matched and supported",
            description:
              "Our AI matches you with the right universities and verified advisors who understand your goals. Get personalized guidance throughout your application journey.",
            support:
              "Dedicated support from expert advisors who help you polish documents, prepare for interviews, and meet every deadline.",
            imageAlt: "Student receiving personalized guidance from an education advisor",
          },
          offers: {
            title: "Receive offers and visa guidance",
            description:
              "Receive university offers and comprehensive visa support. We guide you through every step from acceptance to arrival at your dream university.",
            support:
              "Visa checklists, interview prep, and pre-departure resources ensure you're ready to start your new chapter.",
            imageAlt: "Student celebrating acceptance with visa documents",
          },
        },
      },
      featuredUniversities: {
        heading: "Featured Universities",
        description:
          "Institutions that consistently deliver an exceptional onboarding experience for UniDoxia students.",
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
            "Dedicated partners that consistently welcome UniDoxia students with tailored support.",
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
            "Zoe AI breaks down tuition, housing, everyday living, and hidden expenses so you always know how much to budget before applying.",
          formTitle: "Projected annual costs",
          confidenceLabel: "AI confidence: {{value}}%",
          calculatingLabel: "Calculating...",
          cta: "Recalculate with AI",
          highlights: [
            "Tuition, accommodation, living, insurance, transportation, visa, and miscellaneous costs in one view.",
            "Instant totals update as you tweak assumptions for countries, scholarships, or currency shifts.",
            "Share-ready breakdown designed for students, parents, or sponsors.",
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
            "Zoe Intelligence watches every funnel and flags the moves that change revenue so you never have to chase agents for updates.",
          ceoPromise: "This keeps you in your CEO position—not chasing agents.",
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
                "UniDoxia made my dream of studying at MIT a reality. The platform was intuitive, and my agent was incredibly supportive.",
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
        contact: {
          heading: "Get in Touch",
          subtitle: "Have questions? We’d love to help.",
        },
      },
      universitySearch: {
        hero: {
          title: "Find Your Perfect Course",
          subtitle: "Search through courses, programs, and scholarships worldwide.",
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
            courseName: {
              label: "Course Name",
              placeholder: "Search courses...",
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
              label: "Only show courses with scholarships",
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
          empty: "No courses found. Try adjusting your filters.",
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
        browseCourses: {
          title: "Browse All Courses",
          subtitle: "Explore courses from top universities around the world",
          loading: "Loading courses...",
          loadMore: "Load More Courses",
          noCourses: "No courses available at the moment.",
          viewAll: "View All",
          duration: "{{months}} months",
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
