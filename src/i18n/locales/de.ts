const de = {
  common: {
    languageNames: {
      en: "Englisch",
      de: "Deutsch",
      fr: "Französisch",
      pt: "Portugiesisch",
      it: "Italienisch",
      sw: "Suaheli",
      es: "Spanisch",
      zh: "Chinesisch",
      hi: "Hindi",
      ar: "Arabisch",
    },
    labels: {
      language: "Sprache",
      selectLanguage: "Sprache auswählen",
      toggleNavigation: "Navigation umschalten",
      openUserMenu: "Benutzermenü öffnen",
      currentPage: "Aktuelle Seite",
      showRecentPages: "Neueste Seiten anzeigen",
    },
    actions: {
      login: "Anmelden",
      signup: "Registrieren",
      logout: "Abmelden",
      goToLogin: "Zum Login",
      goBack: "Zurück",
      reloadPage: "Seite neu laden",
      retry: "Erneut versuchen",
      save: "Speichern",
      clear: "Zurücksetzen",
      cancel: "Abbrechen",
      submit: "Absenden",
      markAllRead: "Alle als gelesen markieren",
    },
    navigation: {
      home: "Startseite",
      search: "Suche",
      courses: "Studiengänge",
      blog: "Blog",
      contact: "Kontakt",
      dashboard: "Dashboard",
      settings: "Einstellungen",
      helpCenter: "Hilfezentrum",
      faq: "FAQ",
      feedback: "Feedback",
      visaCalculator: "Visa-Rechner",
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
    },
    status: {
      loading: "Lädt...",
      loadingInterface: "Benutzeroberfläche wird geladen...",
    },
    notifications: {
      success: "Erfolg",
      error: "Fehler",
      saved: "Gespeichert",
      deleted: "Gelöscht",
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
        home: "Startseite",
        search: "Suche",
        scholarships: "Stipendien",
        courses: "Studiengänge",
        blog: "Blog",
        contact: "Kontakt",
      },
      auth: {
        login: "Anmelden",
        signup: "Registrieren",
        logout: "Abmelden",
      },
      userMenu: {
        open: "Benutzermenü öffnen",
        dashboard: "Dashboard",
        settings: "Einstellungen",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Wir verbinden internationale Studierende mit erstklassigen Universitäten über verifizierte Agenten und eine transparente Antragsverwaltung.",
      contactEmailLabel: "E-Mail an uns",
      followUs: "Folgen Sie UniDoxia",
      followUsSubtitle: "Folgen Sie uns auf LinkedIn, Facebook und unserem WhatsApp-Kanal.",
      social: {
        linkedin: "Folgen Sie uns auf LinkedIn",
        linkedinShort: "LinkedIn",
        facebook: "Folgen Sie uns auf Facebook",
        facebookShort: "Facebook",
        whatsapp: "Folgen Sie dem UniDoxia.com-Kanal auf WhatsApp",
        whatsappShort: "WhatsApp",
      },
      headings: {
        platform: "Plattform",
        support: "Support",
        accountLegal: "Konto & Rechtliches",
      },
      platformLinks: {
        search: "Universitäten suchen",
        blog: "Blog",
        visaCalculator: "Visa-Rechner",
        feedback: "Feedback",
      },
      supportLinks: {
        help: "Hilfezentrum",
        contact: "Kontakt",
        faq: "FAQ",
        dashboard: "Dashboard",
      },
      accountLinks: {
        login: "Anmelden",
        signup: "Jetzt starten",
        privacy: "Datenschutz",
        terms: "Nutzungsbedingungen",
      },
      copyright: "© {{year}} UniDoxia. Alle Rechte vorbehalten.",
      questions: "Fragen?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "Lädt...",
      retry: "Erneut versuchen",
    },
    emptyState: {
      noRecentPages: "Keine zuletzt besuchten Seiten",
      goToFallback: "Zur Ausweichseite",
      clearHistory: "Verlauf löschen",
      currentPage: "Aktuelle Seite",
    },
    contactForm: {
      placeholders: {
        name: "Ihr Name",
        email: "Ihre E-Mail",
        whatsapp: "Ihre WhatsApp-Nummer (optional)",
        message: "Ihre Nachricht",
      },
      submit: {
        default: "Nachricht senden",
        loading: "Wird gesendet...",
      },
      notifications: {
        signInRequiredTitle: "Anmeldung erforderlich",
        signInRequiredDescription:
          "Bitte melden Sie sich an, um uns eine Nachricht zu senden.",
        successTitle: "Nachricht gesendet!",
        successDescription:
          "Vielen Dank für Ihre Kontaktaufnahme. Wir melden uns bald bei Ihnen.",
        validationTitle: "Validierungsfehler",
        errorTitle: "Fehler",
        errorDescription:
          "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      },
      errors: {
        nameRequired: "Name ist erforderlich",
        nameMax: "Der Name darf maximal 100 Zeichen enthalten",
        emailInvalid: "Ungültige E-Mail-Adresse",
        emailMax: "Die E-Mail darf maximal 255 Zeichen enthalten",
        messageRequired: "Nachricht ist erforderlich",
        messageMax: "Die Nachricht darf maximal 1000 Zeichen enthalten",
        whatsappInvalid:
          "Die WhatsApp-Nummer darf nur Zahlen und Telefonsymbole enthalten",
        whatsappMax: "Die WhatsApp-Nummer darf maximal 30 Zeichen enthalten",
      },
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "Seite konnte nicht geladen werden",
      failedToLoadPageDescription:
        "Die Seite konnte nicht geladen werden. Möglicherweise besteht ein Netzwerkproblem oder die Seite ist vorübergehend nicht verfügbar.",
      chunkReloadMessage:
        "Wir haben die App aktualisiert, um die neuesten Dateien abzurufen. Wenn das weiterhin passiert, löschen Sie bitte den Browser-Cache und versuchen Sie es erneut.",
    },
    loading: "Anwendung wird geladen...",
    errorBoundary: {
      networkTitle: "Verbindungsfehler",
      networkMessage:
        "Die Netzwerkverbindung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
      chunkTitle: "Ladefehler",
      chunkMessage:
        "Anwendungsressourcen konnten nicht geladen werden. Dies passiert normalerweise nach einem Update der App.",
      permissionTitle: "Zugriff verweigert",
      permissionMessage: "Sie haben keine Berechtigung für diesen Zugriff.",
      notFoundTitle: "Nicht gefunden",
      notFoundMessage: "Die angeforderte Ressource wurde nicht gefunden.",
      unauthorizedTitle: "Sitzung abgelaufen",
      unauthorizedMessage:
        "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
      databaseTitle: "Datenbankfehler",
      databaseMessage:
        "Die Datenbankverbindung ist fehlgeschlagen. Bitte versuchen Sie es in Kürze erneut.",
      genericTitle: "Etwas ist schiefgelaufen",
      genericMessage:
        "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.",
      fallbackTitle: "Fehler",
      fallbackMessage: "Es ist ein unerwarteter Fehler aufgetreten",
      technicalDetails: "Technische Details",
      tryAgain: "Erneut versuchen",
      tryAgainCount: "Erneut versuchen ({count} verbleibend)",
      goHome: "Zur Startseite",
      maxRetriesReached:
        "Maximale Anzahl an Wiederholungen erreicht. Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.",
    },
  },
  pages: {
    index: {
      hero: {
        trustBadge: "Von {{count}}+ Studierenden weltweit vertraut",
        title: {
          prefix: "Willkommen bei",
          highlight: "UniDoxia (UniDoxia)",
          suffix: "",
        },
        description:
          "Verbinden Sie sich mit führenden Universitäten, verfolgen Sie Bewerbungen in Echtzeit und erhalten Sie fachkundige Unterstützung durch verifizierte Agenten.",
        ctas: {
          students: {
            badge: "Studierende",
            title: "Starten Sie Ihre globale Bewerbung",
            description:
              "Erstellen Sie ein Profil, laden Sie Ihre Dokumente einmal hoch und senden Sie in Minuten professionelle Bewerbungen an Top-Universitäten.",
            action: "Bewerbung starten",
          },
          agents: {
            badge: "Agenten",
            title: "Betreuen Sie Studierende mit smarten Tools",
            description:
              "Greifen Sie auf Dashboards zu, arbeiten Sie in Echtzeit zusammen und verfolgen Sie jeden Meilenstein, während Sie Ihre Agenturmarke ausbauen.",
            action: "Als Agent beitreten",
          },
          universities: {
            badge: "Universitäten",
            title: "Skalieren Sie Partnerschaften, die überzeugen",
            description:
              "Knüpfen Sie Kontakte zu qualifizierten Bewerber:innen, erhalten Sie Marktanalysen und arbeiten Sie weltweit mit verifizierten Berater:innen zusammen.",
            action: "Partner werden",
          },
        },
      },
      features: {
        heading: "Warum UniDoxia wählen?",
        cards: {
          applyEasily: {
            title: "Einfach bewerben",
            description:
              "Ein schlanker Bewerbungsprozess mit Schritt-für-Schritt-Anleitung. Reichen Sie Bewerbungen mühelos bei mehreren Universitäten ein.",
          },
          trackRealtime: {
            title: "In Echtzeit verfolgen",
            description:
              "Verfolgen Sie den Status Ihrer Bewerbung rund um die Uhr mit Live-Updates und sofortigen Benachrichtigungen.",
          },
          connectAgents: {
            title: "Mit verifizierten Agenten verbinden",
            description:
              "Greifen Sie auf zertifizierte Bildungsberater:innen zu, die Sie während Ihres gesamten Weges persönlich unterstützen.",
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
        badge: "KI-gestützte Universitäts- & Stipendiensuche",
        heading: "Finden Sie den passenden Kurs mit Echtzeit-Intelligenz",
        description:
          "Stellen Sie Fragen zu Universitäten, Studiengängen oder Finanzierungen weltweit. Unsere KI analysiert Zulassungsinformationen, Stipendien und Visawege, die auf Ihre Ziele zugeschnitten sind.",
        subheading:
          "Registrieren Sie sich, um maßgeschneiderte KI-Empfehlungen zu Zulassungen, Stipendien und Visa zu erhalten.",
        ctaLabel: "Jetzt starten",
        stats: [
          { value: "12k+", label: "KI-Einblicke für Studieninteressierte weltweit" },
          { value: "84%", label: "Studierende mit mindestens drei passenden Kursen" },
          { value: "50+", label: "Länder mit verifizierten Zulassungsdaten" },
        ],
        panel: {
          title: "Zoe Intelligence entdecken",
          subtitle: "Wählen Sie einen Fokusbereich und sehen Sie, welche Einblicke Sie erhalten.",
          previewLabel: "Vorschau",
          highlightsHeading: "Was die KI für Sie vorbereitet",
        },
        zoeAlt: "Porträt von Zoe, der Begleiterin für Intelligenz-Einblicke",
        zoeCaption: "Lernen Sie Zoe kennen – das freundliche Gesicht, das Sie durch jeden Einblick und jede Empfehlung führt.",
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "Individuelle Wege für technische Innovator:innen",
            description:
              "Entdecken Sie Kurse mit Forschungslaboren, Praxisphasen und Finanzierung für Naturwissenschaften und Technik.",
            highlights: [
              "Stipendien mit Fokus auf MINT-Fächer und Forschung",
              "Branchengerechte Curricula mit Praktika und Co-op-Phasen",
              "Visa-Leitfäden für gefragte Technik- und Ingenieurberufe",
            ],
          },
          {
            key: "scholarships",
            label: "Stipendien",
            headline: "Finanzierungsmöglichkeiten passend zu Ihrem Profil",
            description:
              "Identifizieren Sie Zuschüsse, Stipendien und Assistenzstellen, die Sie realistisch erhalten können.",
            highlights: [
              "Kuratiertes Verzeichnis von Leistungs- und Bedürftigkeitsstipendien",
              "Eignungsempfehlungen abgestimmt auf Ihren akademischen Hintergrund",
              "Tipps für überzeugende Motivationsschreiben und Referenzen",
            ],
          },
          {
            key: "visa",
            label: "Visafreundlich",
            headline: "Studienwege mit reibungslosem Visaprozess",
            description: "Vergleichen Sie Länder und Institutionen mit günstigen Visabestimmungen.",
            highlights: [
              "Zusammengefasste Optionen für Aufenthalts- und Arbeitsvisa nach dem Studium",
              "Dokumenten-Checklisten zugeschnitten auf Ihre Staatsangehörigkeit",
              "Hinweise zu Finanzierungsnachweisen, Versicherung und Interviewvorbereitung",
            ],
          },
          {
            key: "undergraduate",
            label: "Bachelor",
            headline: "Bachelorwege für Erstbewerber:innen",
            description:
              "Verstehen Sie Zulassungsvoraussetzungen, Vorkurse und Unterstützungsangebote.",
            highlights: [
              "Zeitplan von der Zeugnisbewertung bis zur Zusage",
              "Orientierung bei der Wahl von Hauptfach, Nebenfach und Foundation-Jahr",
              "Ressourcen für Wohnen, Orientierung und Budgetplanung",
            ],
          },
          {
            key: "postgraduate",
            label: "Master & PhD",
            headline: "Postgraduale Kurse abgestimmt auf Ihre Ziele",
            description: "Vergleichen Sie Betreuende, Kohortengröße und Finanzierungsmodelle.",
            highlights: [
              "Porträts von Fakultäten mit aktuellen Forschungsthemen",
              "Informationen zu Assistenz- und Fellowship-Stellen mit Stipendien",
              "Vorbereitung auf Interviews und Portfolio-Anforderungen je Kurs",
            ],
          },
          {
            key: "coop",
            label: "Co-op & Praktika",
            headline: "Praxisintegriertes Lernen mit globalen Arbeitgebern",
            description:
              "Finden Sie Kurse, die Studium mit praktischer Berufserfahrung verbinden.",
            highlights: [
              "Vermittlungsquoten und Unternehmenspartner nach Regionen",
              "Visa-Aspekte für vergütete Praxisphasen",
              "Karriereservices für Lebenslauf, Interviews und Networking",
            ],
          },
        ],
      },
      journeyRibbon: {
        items: {
          profile: {
            stage: "Schritt 1",
            metricValue: "5 Min",
            metricLabel: "zum Loslegen",
            description:
              "Erstellen Sie Ihr Profil mit akademischem Hintergrund, Dokumenten und Studienwünschen – alles an einem Ort.",
            ctaLabel: "Profil starten",
          },
          matched: {
            stage: "Schritt 2",
            metricValue: "24h",
            metricLabel: "durchschnittliche Matching-Zeit",
            description:
              "Werden Sie mit verifizierten Beratern und Universitäten gematcht, die zu Ihren Zielen passen. Erhalten Sie persönliche Begleitung bei jedem Schritt.",
            ctaLabel: "Gematcht werden",
          },
          offers: {
            stage: "Schritt 3",
            metricValue: "95%",
            metricLabel: "Visa-Erfolgsquote",
            description:
              "Erhalten Sie Universitätsangebote und umfassende Visa-Unterstützung. Wir begleiten Sie von der Zusage bis zur Ankunft.",
            ctaLabel: "",
          },
        },
      },
      storyboard: {
        heading: "Ihr Weg in 3 einfachen Schritten",
        subheading:
          "UniDoxia macht das Auslandsstudium unkompliziert. So begleiten wir Sie von Anfang bis zum Erfolg.",
        stepLabel: "Schritt {{number}}",
        steps: {
          profile: {
            title: "Profil starten",
            description:
              "Erstellen Sie Ihr Profil mit akademischem Hintergrund, Testergebnissen und Studienwünschen. Laden Sie Ihre Dokumente einmal hoch und nutzen Sie sie für alle Bewerbungen.",
            support:
              "Intelligente Checklisten und Dokumenttipps helfen Ihnen, ein vollständiges Profil zu erstellen, das Universitäten überzeugt.",
            imageAlt: "Studierende erstellt ihr Profil auf der UniDoxia-Plattform",
          },
          matched: {
            title: "Gematcht und unterstützt werden",
            description:
              "Unsere KI verbindet Sie mit den passenden Universitäten und verifizierten Beratern, die Ihre Ziele verstehen. Erhalten Sie persönliche Begleitung während Ihrer gesamten Bewerbung.",
            support:
              "Engagierte Unterstützung von erfahrenen Beratern, die Ihnen bei Dokumenten, Interviews und Fristen helfen.",
            imageAlt: "Studierende erhält persönliche Beratung von einem Bildungsberater",
          },
          offers: {
            title: "Angebote und Visa-Beratung erhalten",
            description:
              "Erhalten Sie Universitätsangebote und umfassende Visa-Unterstützung. Wir begleiten Sie bei jedem Schritt von der Zusage bis zur Ankunft an Ihrer Traumuniversität.",
            support:
              "Visa-Checklisten, Interviewvorbereitung und Abreiseressourcen stellen sicher, dass Sie bereit für Ihr neues Kapitel sind.",
            imageAlt: "Studierende feiert die Zusage mit Visa-Dokumenten",
          },
        },
      },
      featuredUniversities: {
        heading: "Ausgewählte Universitäten",
        description:
          "Institutionen, die internationalen UniDoxia-Studierenden konsequent ein herausragendes Onboarding-Erlebnis bieten.",
        network: {
          label: "Ausgewähltes Netzwerk",
          summary:
            "{{count}} Institutionen, kuratiert von unserem Partnerschaftsteam",
        },
        badges: {
          topPick: "Top-Empfehlung",
          priority: "Priorität #{{position}}",
        },
        actions: {
          visitSite: "Website besuchen",
          scrollLeft: "Ausgewählte Universitäten nach links scrollen",
          scrollRight: "Ausgewählte Universitäten nach rechts scrollen",
        },
        fallback: {
          summary:
            "Engagierte Partner, die Studierende von UniDoxia mit maßgeschneiderter Unterstützung begrüßen.",
          highlight: "Engagierter Erfolgspartner für Studierende",
          notice: {
            error:
              "Wir zeigen hervorgehobene Partner, während wir die Auswahlliste wieder verbinden.",
            updating:
              "Wir zeigen hervorgehobene Partner, während unsere Auswahlliste aktualisiert wird.",
          },
        },
        partnerCta: {
          heading: "Partner werden",
          description:
            "Präsentieren Sie Ihre Institution tausenden motivierten Studierenden weltweit.",
          action: "Dem Netzwerk beitreten",
        },
      },
      visa: {
        badge: "Feature-Highlight",
        title: "Verstehen Sie Ihre Visa-Chancen, bevor Sie sich bewerben",
        description:
          "Unser Visa-Eignungsrechner analysiert Ihr Profil sofort, damit Sie sich auf die Länder und Kurse konzentrieren können, die Sie am meisten willkommen heißen.",
        cta: "Visa-Rechner entdecken",
      },
      feeCalculator: {
        badge: "KI-Kostenrechner",
        title: "Erhalten Sie sofort einen vollständigen Finanzüberblick",
        description:
          "Zoe KI zerlegt Studiengebühren, Wohnen, Lebenshaltung und versteckte Ausgaben, damit Sie vor der Bewerbung wissen, wie viel Budget Sie benötigen.",
        formTitle: "Prognostizierte Jahreskosten",
        confidenceLabel: "KI-Vertrauen: {{value}}%",
        calculatingLabel: "Berechnung läuft...",
        cta: "Mit KI neu berechnen",
        highlights: [
          "Studiengebühren, Unterkunft, Lebenshaltung, Versicherung, Transport, Visum und Sonstiges in einer Ansicht.",
          "Gesamtsummen aktualisieren sich sofort, wenn Sie Länder, Stipendien oder Wechselkurse anpassen.",
          "Teilbare Aufschlüsselung für Studierende, Eltern oder Sponsoren.",
          "Jahres- und Monatsbudget ohne Tabellenkalkulation sehen.",
        ],
        insights: {
          title: "KI-Planungshinweise",
          items: [
            "Die meisten internationalen Studierenden investieren 45–55 % ihres Budgets in Studiengebühren.",
            "Unterkunft plus Lebenshaltung machen oft ein Drittel der Gesamtausgaben aus.",
            "Mindestens 10 % sollten für Versicherung, Transport und Visa-Puffer reserviert werden.",
          ],
        },
        fields: {
          tuition: { label: "Studiengebühren", placeholder: "z. B. 26.000" },
          accommodation: { label: "Unterkunft", placeholder: "z. B. 12.000" },
          living: { label: "Lebenshaltung", placeholder: "z. B. 6.500" },
          insurance: { label: "Versicherung", placeholder: "z. B. 1.200" },
          transportation: { label: "Transport", placeholder: "z. B. 1.800" },
          visa: { label: "Visagebühren", placeholder: "z. B. 600" },
          misc: { label: "Sonstiges", placeholder: "z. B. 1.500" },
        },
        summary: {
          subtitle: "Geschätzte Gesamtkosten für Ihr erstes Jahr",
          monthlyLabel: "Monatliches Budget (ca.)",
          confidenceHelper: "KI-Prognose basierend auf ähnlichen Budgets mit {{value}} % Vertrauen.",
          disclaimer:
            "Beispielhafte USD-Beträge. Tatsächliche Kosten variieren nach Universität, Stipendium und Wechselkurs.",
        },
      },
      testimonials: {
        heading: "Erfolgsgeschichten",
        items: [
          {
            name: "Sarah Johnson",
            role: "Master-Studentin am MIT",
            country: "USA",
            quote:
              "UniDoxia hat meinen Traum, am MIT zu studieren, wahr gemacht. Die Plattform war intuitiv und mein Agent unglaublich unterstützend.",
            rating: 5,
          },
          {
            name: "Raj Patel",
            role: "MBA-Student an der Universität Oxford",
            country: "UK",
            quote:
              "Die Echtzeitverfolgung gab mir Sicherheit. Ich wusste immer, wo meine Bewerbung stand. UniDoxia ist sehr zu empfehlen!",
            rating: 5,
          },
          {
            name: "Maria Garcia",
            role: "Ingenieurstudentin an der Stanford University",
            country: "USA",
            quote:
              "Von der Kurssuche bis zur Visa-Genehmigung hat mich UniDoxia in jedem Schritt unterstützt. Hervorragender Service!",
            rating: 5,
          },
        ],
      },
      faq: {
        heading: "Häufig gestellte Fragen",
        subtitle: "Schnelle Antworten auf häufige Fragen",
        audienceHeading: "Für {{audience}}",
        sections: [
          {
            audience: "Studierende",
            items: [
              {
                question:
                  "Wie unterstützt mich UniDoxia bei der Bewerbung an Universitäten?",
                answer:
                  "UniDoxia verbindet Sie mit verifizierten Agenten, die Sie in jeder Phase begleiten – von der Hochschulwahl bis zur Dokumenteneinreichung.",
              },
              {
                question: "Kostet die Nutzung der Plattform etwas?",
                answer:
                  "Das Erstellen eines Kontos und das Erkunden von Universitäten ist kostenlos. Agenten können Beratungsgebühren erheben, die vor einer Zusage klar angezeigt werden.",
              },
              {
                question: "Welche Unterlagen brauche ich für die Bewerbung?",
                answer:
                  "Typischerweise werden akademische Zeugnisse, Englischtests (IELTS/TOEFL), Empfehlungsschreiben, Motivationsschreiben und eine Passkopie benötigt.",
              },
            ],
          },
        ],
      },
      zoeMultiRole: {
        badge: "Lernen Sie Zoe kennen",
        heading: "KI-Chat-Assistent – nur intelligenter",
        description:
          "Zoe wechselt zwischen Studierenden, Agenten und Universitätsteams, um kontextbezogene Antworten genau dann zu liefern, wenn Sie sie brauchen.",
        note: "Zoe ist multifunktional. Das bieten nur wenige Wettbewerber.",
        highlightsHeading: "Was Zoe für Sie übernimmt",
        highlights: [
          "Beantwortet jede Frage zum Auslandsstudium mit regionalem Visa- und Richtlinienkontext.",
          "Führt Sie durch die gesamte UniDoxia-App, damit Zeitpläne, Dashboards und Automatisierungen auf Kurs bleiben.",
          "Liest hochgeladene Dokumente, um sofort Schulen, Stipendien und nächste Schritte zu empfehlen.",
        ],
        roles: [
          {
            key: "students",
            title: "Studierende & Familien",
            description:
              "Zoe ist eine Studienberaterin, die jeden Bewerber durch das gesamte UniDoxia-Erlebnis führt.",
            capabilities: [
              "Beantwortet jede Frage zum Auslandsstudium sofort in einfacher Sprache.",
              "Führt Sie durch jede Aufgabe in der UniDoxia-App, damit nichts übersehen wird.",
              "Prüft hochgeladene Zeugnisse, Essays und Finanzierungsnachweise, um passende Schulen vorzuschlagen.",
              "Teilt personalisierte Beratungsempfehlungen basierend auf Ihren Zielen.",
            ],
          },
          {
            key: "agents",
            title: "Agenten & Berater",
            description:
              "Training, Coaching und Antworten auf Abruf sind in denselben Arbeitsbereich integriert, der Ihre Agentur antreibt.",
            capabilities: [
              "Liefert kurze Schulungsauffrischungen für neue Berater und Support-Mitarbeiter.",
              "Wandelt geteilte Studierendendokumente in schnelle Schul-Shortlists um, die Sie mit Kunden besprechen können.",
              "Entwirft automatisch Outreach-Skripte, Follow-up-Pläne und Beratungsempfehlungen.",
              "Markiert Verbesserungsmöglichkeiten für die Conversion mithilfe von Agentenanalysen aus Zoe Intelligence.",
            ],
          },
          {
            key: "universities",
            title: "Universitäten & Partner",
            description:
              "Zoe lebt im Universitäts-Dashboard, um Recruiting-, Compliance- und Service-Teams aufeinander abzustimmen.",
            capabilities: [
              "Zeigt Partnerwarnungen und empfohlene Aktionen direkt im Dashboard an.",
              "Fasst Bewerberpipelines nach Region mit Hinweisen zu Richtlinienunterschieden zusammen.",
              "Bietet Schulungsausschnitte für das Mitarbeiter-Onboarding, damit Teams sich selbst helfen können.",
              "Eskaliert Probleme, die menschliche Aufmerksamkeit erfordern, damit Sie sich auf strategische Beziehungen konzentrieren können.",
            ],
          },
        ],
      },
      contact: {
        heading: "Kontakt aufnehmen",
        subtitle: "Sie haben Fragen? Wir helfen gerne weiter.",
      },
    },
    universitySearch: {
      hero: {
        title: "Finden Sie Ihre ideale Universität",
        subtitle:
          "Durchsuchen Sie Universitäten, Kurse und Stipendien weltweit.",
      },
      tabs: {
        search: "Suche",
        recommendations: "KI-Empfehlungen",
        sop: "SOP-Generator",
        interview: "Interviewtraining",
      },
      filters: {
        title: "Suchfilter",
        subtitle: "Verfeinern Sie Ihre Suche unten",
        fields: {
          courseName: {
            label: "Kursname",
            placeholder: "Kurse suchen...",
          },
          country: {
            label: "Land",
            placeholder: "Land auswählen",
            all: "Alle Länder",
          },
          programLevel: {
            label: "Kursniveau",
            placeholder: "Niveau auswählen",
            all: "Alle Niveaus",
          },
          discipline: {
            label: "Fachbereich",
            placeholder: "Fachbereich auswählen",
            all: "Alle Fachbereiche",
          },
          maxFee: {
            label: "Maximale Gebühr (USD)",
            placeholder: "Maximalbetrag eingeben",
          },
          scholarshipsOnly: {
            label: "Nur Universitäten mit Stipendien anzeigen",
          },
        },
      },
      actions: {
        search: "Suchen",
      },
      results: {
        loading: "Suche läuft...",
        found_one: "{{count}} Ergebnis gefunden",
        found_other: "{{count}} Ergebnisse gefunden",
        empty: "Keine Universitäten gefunden. Passen Sie Ihre Filter an.",
        scholarshipBadge_one: "{{count}} Stipendium",
        scholarshipBadge_other: "{{count}} Stipendien",
        programs: {
          heading_one: "Kurse ({{count}})",
          heading_other: "Kurse ({{count}})",
          apply: "Jetzt bewerben",
          more_one: "+{{count}} weiterer Kurs",
          more_other: "+{{count}} weitere Kurse",
        },
        scholarships: {
          heading: "Stipendien",
          amountVaries: "Betrag variiert",
          more_one: "+{{count}} weiteres Stipendium",
          more_other: "+{{count}} weitere Stipendien",
        },
        viewDetails: "Details ansehen",
        visitWebsite: "Website besuchen",
      },
      browseCourses: {
        title: "Alle Kurse durchsuchen",
        subtitle: "Entdecken Sie Kurse von Top-Universitäten weltweit",
        loading: "Kurse werden geladen...",
        loadMore: "Mehr Kurse laden",
        noCourses: "Derzeit keine Kurse verfügbar.",
        viewAll: "Alle anzeigen",
        duration: "{{months}} Monate",
      },
    },
    contact: {
      heroTitle: "Kontaktieren Sie uns",
      heroSubtitle: "In der Regel antworten wir innerhalb eines Werktags.",
      emailPrompt: "Lieber per E-Mail?",
      email: "info@unidoxia.com",
      whatsappCta: "Schreiben Sie uns auf WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Professionelle Bildungsberaterin, bereit zu helfen",
      formTitle: "Senden Sie uns eine Nachricht",
    },
    faq: {
      heroTitle: "Häufig gestellte Fragen",
      heroSubtitle:
        "Schnelle Antworten auf die häufigsten Fragen rund um Ihre Bildungskarriere",
      imageAlt: "Studierende, die lernen und recherchieren",
      sections: [
        {
          audience: "Studierende",
          items: [
            {
              question:
                "Wie unterstützt mich UniDoxia bei der Bewerbung an Universitäten?",
              answer:
                "UniDoxia verbindet Sie mit verifizierten Agenten, die Sie in jeder Phase begleiten – von der Hochschulwahl bis zur Dokumenteneinreichung.",
            },
            {
              question: "Kostet die Nutzung der Plattform etwas?",
              answer:
                "Das Erstellen eines Kontos und das Erkunden von Universitäten ist kostenlos. Agenten können Beratungsgebühren erheben, die vor einer Zusage klar angezeigt werden.",
            },
            {
              question: "Welche Unterlagen brauche ich für die Bewerbung?",
              answer:
                "Typischerweise werden akademische Zeugnisse, Englischtests (IELTS/TOEFL), Empfehlungsschreiben, Motivationsschreiben und eine Passkopie benötigt.",
            },
            {
              question:
                "Kann ich mich bei mehreren Universitäten gleichzeitig bewerben?",
              answer:
                "Ja! Sie können sich gleichzeitig bei mehreren Universitäten bewerben und alle Bewerbungen in einem Dashboard nachverfolgen.",
            },
            {
              question:
                "Wie bleibe ich über den Status meiner Bewerbung informiert?",
              answer:
                "Ihr persönliches Dashboard zeigt Echtzeit-Updates, Fristen und nächste Schritte, sodass Sie immer wissen, was als Nächstes zu tun ist.",
            },
          ],
        },
        {
          audience: "Universitäten",
          items: [
            {
              question: "Wie kann unsere Universität mit UniDoxia zusammenarbeiten?",
              answer:
                "Reichen Sie eine Partnerschaftsanfrage über das Universitätsportal ein oder kontaktieren Sie unser Partnermanagement. Wir verifizieren Ihre Institution und starten das Onboarding innerhalb weniger Werktage.",
            },
            {
              question: "Welche Einblicke erhalten Universitäten?",
              answer:
                "Universitäten erhalten Dashboards mit Bewerberpipelines, Konversionskennzahlen und regionalen Interessen, um Rekrutierungskampagnen gezielt zu planen.",
            },
            {
              question:
                "Können wir Angebote direkt auf der Plattform verwalten?",
              answer:
                "Ja. Zulassungsteams können bedingte oder endgültige Angebote erstellen, fehlende Dokumente anfordern und mit Studierenden und Agenten in einem gemeinsamen Arbeitsbereich kommunizieren.",
            },
          ],
        },
        {
          audience: "Agenten",
          items: [
            {
              question: "Welche Unterstützung erhalten Agenten bei UniDoxia?",
              answer:
                "Agenten erhalten ein dediziertes CRM, Marketingmaterialien und bedarfsgerechte Schulungen, um Studierende schnell mit passenden Kursen zu verknüpfen.",
            },
            {
              question: "Wie werden Agentenkommissionen gehandhabt?",
              answer:
                "Provisionsstrukturen sind transparent. Universitäten definieren die Konditionen, und Auszahlungen werden im Agenten-Dashboard zur einfachen Nachverfolgung dokumentiert.",
            },
            {
              question:
                "Können Agenten mit Universitätszulassungsteams zusammenarbeiten?",
              answer:
                "Auf jeden Fall. Gemeinsame Arbeitsbereiche und Nachrichtenthreads halten alle Parteien über Fortschritte, fehlende Dokumente und Interviewtermine auf dem Laufenden.",
            },
          ],
        },
      ],
    },
  },
  admin: {
    layout: {
      sidebar: {
        logoAlt: "UniDoxia",
        organization: "UniDoxia",
        subtitle: "Administratives Kontrollzentrum",
      },
      navigation: {
        overview: { label: "Übersicht", description: "Executive Summary" },
        users: { label: "Benutzer", description: "Administratoren & Rollen" },
        admissions: { label: "Admissions-Überblick", description: "Pipeline-Verantwortung" },
        payments: { label: "Zahlungen", description: "Stripe & Auszahlungen" },
        partners: { label: "Partner", description: "Agenturen & Universitäten" },
        resources: { label: "Ressourcen", description: "Inhalte & Assets" },
        insights: { label: "Insights", description: "KI & Analysen" },
        intelligence: { label: "Zoe Intelligence", description: "KI-Insights-Konsole" },
        settings: { label: "Einstellungen", description: "Mandantenkonfiguration" },
        notifications: { label: "Benachrichtigungen", description: "Systemmeldungen" },
        logs: { label: "Protokolle", description: "Audit-Trails" },
      },
      profile: {
        defaultName: "Administrator",
      },
      header: {
        openNavigation: "Navigation öffnen",
        organization: "UniDoxia",
        workspace: "Administrator-Arbeitsbereich",
        privilegedAccess: "Privilegierter Zugriff",
        askZoe: "Zoe fragen",
        askZoePrompt: "Erstelle eine Governance-Zusammenfassung für heute",
      },
    },
    settings: {
      heading: "Systemeinstellungen",
      subheading: "Mandantenweite Richtlinien, Integrationen und Automatisierungen konfigurieren.",
      securityReview: "Sicherheitsprüfung",
      securityPrompt: "Sicherheitslage für Einstellungsänderungen überprüfen",
      accessControl: {
        title: "Zugriffskontrolle",
        description: "Authentifizierungsanforderungen und privilegierte Rollen verwalten.",
        mfa: {
          label: "Multi-Faktor-Authentifizierung erzwingen",
          description: "MFA für alle Admin- und Finanznutzer vorschreiben.",
        },
        auditAlerts: {
          label: "Echtzeit-Audit-Alarme",
          description: "Alarme senden, wenn privilegierte Einstellungen geändert werden.",
        },
        summarize: "Änderungen zusammenfassen",
        summarizePrompt: "Jüngste Konfigurationsänderungen zusammenfassen",
      },
      branding: {
        title: "Organisationsbranding",
        description: "Die visuelle Identität für die Admin-Erfahrung steuern.",
        logo: {
          label: "Logo hochladen",
          selected: "Ausgewählte Datei: {{name}}",
        },
        color: {
          label: "Primärfarbe",
          aria: "Hex-Wert der Primärfarbe",
          helpText: "Gilt für Buttons, Highlights und zentrale Interface-Elemente.",
        },
        favicon: {
          label: "Favicon hochladen",
          selected: "Ausgewählte Datei: {{name}}",
        },
        save: "Branding speichern",
      },
    },
    overview: {
      loading: {
        trends: "Admissions-Trends werden geladen",
        geography: "Geografische Verteilung wird geladen",
        activity: "Aktivität wird geladen",
      },
      emptyStates: {
        noAdmissions: "Keine Admissions-Aktivitäten für den ausgewählten Zeitraum.",
        noApplications: "Keine laufenden Bewerbungen verfügbar.",
      },
      trends: {
        title: "Admissions-Trends",
        subtitle: "Sechsmonatige Einreichungs- und Immatrikulationskadenz",
        submitted: "Eingereicht",
        enrolled: "Immatrikuliert",
      },
      geography: {
        title: "Bewerbungen nach Land",
        subtitle: "Aktuelle Pipeline-Verteilung nach Zielregion",
      },
      kpis: {
        totalStudents: "Studierende gesamt",
        totalAgents: "Agenten gesamt",
        totalUniversities: "Universitäten gesamt",
        activeApplications: "Aktive Bewerbungen",
        totalCommissionPaid: "Ausgezahlte Provision gesamt",
        pendingVerifications: "Ausstehende Prüfungen",
        lastUpdated: "Aktualisiert {{time}}",
        justNow: "gerade eben",
      },
      badges: {
        actionRequired: "Aktion erforderlich",
      },
      recentActivity: {
        title: "Aktuelle Aktivität",
        subtitle: "Neueste mandantenweite Audit-Ereignisse",
        prompt: "Heutige kritische Audit-Ereignisse zusammenfassen",
        cta: "Mit Zoe eskalieren",
        empty: "Keine aktuelle Aktivität erfasst.",
        byUser: "von {{name}}",
      },
      quickActions: {
        title: "Schnellaktionen",
        subtitle: "Wichtige Workflow-Blocker beheben",
        agents: "Neue Agenten freigeben",
        agentsPrompt: "Agenten auflisten, die auf Freigabe warten, einschließlich möglicher Risiken",
        universities: "Universitäten freigeben",
        universitiesPrompt: "Welche Universitäten haben offene Onboarding-Aufgaben?",
        compliance: "Markierte Profile prüfen",
        compliancePrompt: "Profile anzeigen, die für Compliance-Prüfungen markiert sind",
      },
      health: {
        title: "Systemgesundheit",
        subtitle: "Sicherheitsindikatoren der letzten 30 Tage",
        scoreLabel: "Risiko-Score",
        operational: "Betriebsbereit",
        monitoring: "Überwachung",
        degraded: "Beeinträchtigt",
        critical: "Kritisch",
        unknown: "Unbekannt",
        noRecommendations: "Keine aktiven Empfehlungen – weiter beobachten.",
        prompt: "Eine Sicherheits-Triage-Zusammenfassung für Admin bereitstellen",
        cta: "Mit Zoe triagieren",
      },
    },
  },
};

export default de;
