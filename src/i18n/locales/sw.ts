const sw = {
  common: {
    languageNames: {
      en: "Kiingereza",
      de: "Kijerumani",
      fr: "Kifaransa",
      pt: "Kireno",
      sw: "Kiswahili",
      es: "Kihispania",
      zh: "Kichina",
      hi: "Kihindi",
      ar: "Kiarabu",
    },
    labels: {
      language: "Lugha",
      selectLanguage: "Chagua lugha",
      toggleNavigation: "Badilisha urambazaji",
      openUserMenu: "Fungua menyu ya mtumiaji",
      currentPage: "Ukurasa wa sasa",
      showRecentPages: "Onyesha kurasa za hivi karibuni",
    },
    actions: {
      login: "Ingia",
      signup: "Jisajili",
      logout: "Toka",
      goToLogin: "Nenda kwenye kuingia",
      goBack: "Rudi",
      reloadPage: "Pakua ukurasa upya",
      retry: "Jaribu tena",
      save: "Hifadhi",
      clear: "Futa",
      cancel: "Ghairi",
      submit: "Tuma",
      markAllRead: "Weka zote kama zimesomwa",
    },
    navigation: {
      home: "Nyumbani",
      search: "Tafuta",
      courses: "Kozi",
      blog: "Blogu",
      contact: "Wasiliana",
      dashboard: "Dashibodi",
      settings: "Mipangilio",
      helpCenter: "Kituo cha msaada",
      faq: "Maswali",
      feedback: "Maoni",
      visaCalculator: "Kikokotoo cha viza",
      privacy: "Sera ya faragha",
      terms: "Sheria na masharti",
    },
    status: {
      loading: "Inapakia...",
      loadingInterface: "Inapakia kiolesura...",
    },
    notifications: {
      success: "Mafanikio",
      error: "Hitilafu",
      saved: "Imehifadhiwa",
      deleted: "Imefutwa",
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
        home: "Nyumbani",
        search: "Tafuta",
        scholarships: "Ufadhili wa Masomo",
        courses: "Kozi",
        blog: "Blogu",
        contact: "Wasiliana",
      },
      auth: {
        login: "Ingia",
        signup: "Jisajili",
        logout: "Toka",
      },
      userMenu: {
        open: "Fungua menyu ya mtumiaji",
        dashboard: "Dashibodi",
        settings: "Mipangilio",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Tunawaunganisha wanafunzi wa kimataifa na vyuo vikuu bora kupitia mawakala waliothibitishwa na usimamizi wa uwazi wa maombi.",
      contactEmailLabel: "Tutumie barua pepe",
      headings: {
        platform: "Jukwaa",
        support: "Msaada",
        accountLegal: "Akaunti & Sheria",
      },
      platformLinks: {
        search: "Tafuta vyuo",
        blog: "Blogu",
        visaCalculator: "Kikokotoo cha viza",
        feedback: "Maoni",
      },
      supportLinks: {
        help: "Kituo cha msaada",
        contact: "Wasiliana nasi",
        faq: "Maswali",
        dashboard: "Dashibodi",
      },
      accountLinks: {
        login: "Ingia",
        signup: "Anza",
        privacy: "Sera ya faragha",
        terms: "Sheria na masharti",
      },
      copyright: "© {{year}} UniDoxia. Haki zote zimehifadhiwa.",
      questions: "Maswali?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "Inapakia...",
      retry: "Jaribu tena",
    },
    emptyState: {
      noRecentPages: "Hakuna kurasa za karibuni",
      goToFallback: "Nenda kwenye ukurasa mbadala",
      clearHistory: "Futa historia",
      currentPage: "Ukurasa wa sasa",
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "Ukurasa haukupakizwa",
      failedToLoadPageDescription:
        "Ukurasa haukweza kupakizwa. Hii inaweza kutokana na tatizo la mtandao au ukurasa kutopatikana kwa muda.",
      chunkReloadMessage:
        "Tumefanya upya programu ili kupata faili za hivi karibuni. Ikiendelea, tafadhali futa akiba ya kivinjari kisha ujaribu tena.",
    },
    loading: "Inapakia programu...",
    errorBoundary: {
      networkTitle: "Hitilafu ya muunganisho",
      networkMessage: "Muunganisho wa mtandao umeharibika. Hakikisha intaneti yako kisha ujaribu tena.",
      chunkTitle: "Hitilafu ya upakiaji",
      chunkMessage: "Rasilimali za programu hazikuweza kupakizwa. Hii hutokea mara nyingi baada ya masasisho ya programu.",
      permissionTitle: "Ruhusa imekataliwa",
      permissionMessage: "Huna ruhusa ya kufikia rasilimali hii.",
      notFoundTitle: "Haijapatikana",
      notFoundMessage: "Rasilimali uliyotaka haikupatikana.",
      unauthorizedTitle: "Muda wa kikao umeisha",
      unauthorizedMessage: "Kikao chako kimeisha. Tafadhali ingia tena.",
      databaseTitle: "Hitilafu ya hifadhidata",
      databaseMessage: "Muunganisho wa hifadhidata umeharibika. Jaribu tena baada ya muda mfupi.",
      genericTitle: "Kuna tatizo",
      genericMessage: "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena.",
      fallbackTitle: "Hitilafu",
      fallbackMessage: "Hitilafu isiyotarajiwa imetokea",
      technicalDetails: "Maelezo ya kiufundi",
      tryAgain: "Jaribu tena",
      tryAgainCount: "Jaribu tena (zimesalia {count})",
      goHome: "Rudi mwanzo",
      maxRetriesReached: "Idadi ya juu ya majaribio imefikiwa. Pakia upya ukurasa au wasiliana na msaada.",
    },
  },
  pages: {
    index: {
        features: {
          heading: "Why Choose UniDoxia?",
          cards: {
            applyEasily: {
              title: "We Help You Apply With Confidence",
              description:
                "We guide you step by step through your application, checking your documents and helping you apply to the right universities—so you’re never guessing or applying alone.",
              action: "Start your application",
            },
            trackRealtime: {
              title: "We Keep You Informed at Every Step",
              description:
                "We track your application with you and keep you updated in real time—so you always know what’s happening and what comes next, without stress or confusion.",
              action: "Get real-time updates",
            },
            connectAgents: {
              title: "We Support You From Start to Finish",
              description:
                "You receive personalized support from verified education experts who guide you throughout your journey—from application to admission and beyond.",
              action: "Speak with an advisor",
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
      aiSearch: {
        badge: "Utafutaji wa vyuo na ufadhili unaoendeshwa na AI",
        heading: "Pata kozi sahihi kwa akili ya papo hapo",
        description:
          "Uliza chochote kuhusu vyuo, kozi au ufadhili popote ulimwenguni. AI yetu huchambua taarifa za udahili, ufadhili na njia za viza zinazolingana na malengo yako.",
        subheading:
          "Jisajili ili kufungua mapendekezo ya kibinafsi kuhusu udahili, ufadhili na viza yanayotolewa na AI.",
        ctaLabel: "Anza",
        stats: [
          { value: "12k+", label: "Maarifa ya AI yaliyotolewa kwa waombaji wa kimataifa" },
          { value: "84%", label: "Wanafunzi waliolinganishwa na angalau kozi tatu zinazofaa" },
          { value: "50+", label: "Nchi zilizo na data ya udahili iliyothibitishwa" },
        ],
        panel: {
          title: "Onyesho la awali la Zoe Intelligence",
          subtitle: "Chagua eneo la kuzingatia uone maarifa utakayopata.",
          previewLabel: "Mfano",
          highlightsHeading: "AI inakuandalia nini",
        },
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "Njia maalumu kwa wavumbuzi wa kiufundi",
            description:
              "Angazia kozi zenye maabara ya utafiti, mafunzo kazini na ufadhili kwa sayansi na uhandisi.",
            highlights: [
              "Ufadhili unaopea kipaumbele masomo ya STEM na matokeo ya utafiti",
              "Mitaala inayolingana na soko yenye mafunzo ya viwandani na kozi za co-op",
              "Mwongozo wa viza kwa kazi za teknolojia na uhandisi zenye uhitaji mkubwa",
            ],
          },
          {
            key: "scholarships",
            label: "Ufadhili",
            headline: "Fursa za ufadhili zinazoendana na wasifu wako",
            description:
              "Tambua ruzuku, ufadhili na nafasi za assistantship ambazo unaweza kupata kwa uhalisia.",
            highlights: [
              "Orodha teule ya ufadhili wa umahiri na mahitaji yenye tarehe za mwisho",
              "Maelezo ya kustahiki yanayolingana na historia yako ya masomo",
              "Vidokezo vya kuimarisha barua za motisha na za marejeo",
            ],
          },
          {
            key: "visa",
            label: "Rafiki kwa viza",
            headline: "Njia za kusoma zenye mchakato rahisi wa uhamiaji",
            description: "Linganisha nchi na taasisi zenye sera rafiki za viza.",
            highlights: [
              "Muhtasari wa fursa za kazi baada ya masomo na muda wa ukaaji",
              "Orodha za ukaguzi wa stakabadhi kulingana na uraia wako",
              "Mwongozo wa uthibitisho wa kifedha, bima na maandalizi ya usaili",
            ],
          },
          {
            key: "undergraduate",
            label: "Shahada ya kwanza",
            headline: "Safari ya shahada ya kwanza kwa waombaji wa mara ya kwanza",
            description:
              "Elewa mahitaji ya udahili, masharti ya awali na huduma za msaada.",
            highlights: [
              "Ratiba ya hatua kwa hatua kuanzia tathmini ya vyeti hadi kupokelewa",
              "Mwongozo wa kuchagua kozi kuu, ndogo na miaka ya msingi",
              "Rasilimali za mpito kuhusu makazi, utambulisho na upangaji bajeti",
            ],
          },
          {
            key: "postgraduate",
            label: "Shahada ya uzamili",
            headline: "Kozi za uzamili na uzamivu zinazolingana na malengo yako",
            description: "Linganisha wasimamizi wa utafiti, ukubwa wa vikundi na mifumo ya ufadhili.",
            highlights: [
              "Taarifa za wahadhiri na mada za utafiti za sasa",
              "Upatikanaji wa assistantship na fellowship zenye posho",
              "Maandalizi ya usaili na mahitaji ya jalada kwa kila kozi",
            ],
          },
          {
            key: "coop",
            label: "Co-op na mafunzo",
            headline: "Kujifunza kunakounganishwa na kazi kwa waajiri wa kimataifa",
            description:
              "Gundua kozi zinazochanganya masomo na uzoefu halisi wa kazi.",
            highlights: [
              "Viwango vya ajira na ushirikiano na makampuni katika maeneo mbalimbali",
              "Mambo ya kuzingatia kuhusu viza kwa mafunzo yanayolipwa na vipindi vya kazi",
              "Msaada wa huduma za taaluma kwa CV, usaili na ujenzi wa mtandao",
            ],
          },
        ],
      },
    },
    contact: {
      heroTitle: "Wasiliana nasi",
      heroSubtitle: "Kwa kawaida tunajibu ndani ya siku moja ya kazi.",
      emailPrompt: "Unapendelea barua pepe?",
      email: "info@unidoxia.com",
      whatsappCta: "Tutumie ujumbe kwenye WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Mshauri wa elimu aliye tayari kusaidia",
      formTitle: "Tutumie ujumbe",
    },
    faq: {
      heroTitle: "Maswali yanayoulizwa mara kwa mara",
      heroSubtitle: "Majibu ya haraka kwa maswali ya kawaida kuhusu safari yako ya elimu",
      imageAlt: "Mwanafunzi anayejifunza na kufanya utafiti",
      sections: [
        {
          audience: "Wanafunzi",
          items: [
            {
              question: "UniDoxia inanisaidiaje kuomba vyuo vikuu?",
              answer:
                "UniDoxia hukunganisha na mawakala waliothibitishwa wanaokuongoza katika kila hatua – kutoka kuchagua vyuo vikuu hadi kuwasilisha nyaraka.",
            },
            {
              question: "Je, kuna ada ya kutumia jukwaa?",
              answer:
                "Kutengeneza akaunti na kuchunguza vyuo ni bure. Mawakala wanaweza kutoza ada za ushauri, ambazo huonyeshwa wazi kabla ya kuendelea.",
            },
            {
              question: "Nahitaji nyaraka gani kuomba?",
              answer:
                "Kwa kawaida unahitaji vyeti vya masomo, matokeo ya lugha ya Kiingereza (IELTS/TOEFL), barua za mapendekezo, barua ya motisha na nakala ya pasipoti.",
            },
            {
              question: "Je, ninaweza kuomba vyuo zaidi ya kimoja?",
              answer:
                "Ndiyo! Unaweza kuomba vyuo vingi kwa wakati mmoja na kufuatilia maombi yote ndani ya dashibodi moja.",
            },
            {
              question: "Nitajua vipi maendeleo ya maombi yangu?",
              answer:
                "Dashibodi yako binafsi inaonyesha masasisho ya muda halisi, tarehe muhimu na hatua zinazofuata ili ujue hatua inayofuata kila wakati.",
            },
          ],
        },
        {
          audience: "Vyuo vikuu",
          items: [
            {
              question: "Chuo chetu kinawezaje kushirikiana na UniDoxia?",
              answer:
                "Tuma ombi la ushirikiano kupitia Portal ya Chuo Kikuu au wasiliana na timu yetu. Tutathibitisha taasisi yako na kuanza mchakato ndani ya siku chache za kazi.",
            },
            {
              question: "Vyuo hupata taarifa gani?",
              answer:
                "Vyuo hupata dashibodi zinazoonyesha mirija ya waombaji, viwango vya ubadilishaji na maslahi ya kieneo ili kupanga kampeni za uandikishaji kwa ujasiri.",
            },
            {
              question: "Je, tunaweza kusimamia ofa moja kwa moja kwenye jukwaa?",
              answer:
                "Ndiyo. Timu za udahili zinaweza kutoa ofa za masharti au za mwisho, kuomba nyaraka zinazokosekana na kuwasiliana na wanafunzi na mawakala katika eneo moja la kazi.",
            },
          ],
        },
        {
          audience: "Mawakala",
          items: [
            {
              question: "Mawakala wanapata msaada gani kupitia UniDoxia?",
              answer:
                "Mawakala hupata CRM maalum, vifaa vya masoko na mafunzo ya mara kwa mara ili kuwasaidia wanafunzi kupata kozi zinazofaa haraka.",
            },
            {
              question: "Kamisheni za mawakala hushughulikiwaje?",
              answer:
                "Miundo ya kamisheni ni wazi. Vyuo huweka masharti na malipo hufuatiliwa kwenye dashibodi ya wakala kwa ufuatiliaji rahisi.",
            },
            {
              question: "Je, mawakala wanaweza kushirikiana na timu za udahili za vyuo?",
              answer:
                "Kabisa. Maeneo ya kazi ya pamoja na mazungumzo huhakikisha kila upande unajua maendeleo ya mwanafunzi, nyaraka zinazokosekana na kupanga mahojiano.",
            },
          ],
        },
      ],
    },
  },
};

export default sw;
