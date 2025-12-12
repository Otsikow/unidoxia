import en from "./en";

const it = {
  ...en,
  common: {
    ...en.common,
    languageNames: {
      ...en.common.languageNames,
      en: "Inglese",
      fr: "Francese",
      de: "Tedesco",
      pt: "Portoghese",
      it: "Italiano",
    },
  },
  pages: {
    ...en.pages,
    index: {
      ...en.pages.index,
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
        badge: "Ricerca università e borse di studio con IA",
        heading: "Trova il corso giusto con un'intelligenza in tempo reale",
        description:
          "Fai domande su università, corsi o finanziamenti in qualsiasi parte del mondo. La nostra IA analizza dati di ammissione, borse di studio e percorsi di visto in linea con i tuoi obiettivi.",
        subheading:
          "Iscriviti per sbloccare consigli personalizzati basati sull'IA su ammissioni, borse di studio e visti.",
        ctaLabel: "Inizia ora",
        stats: [
          { value: "12k+", label: "Approfondimenti IA generati per candidati internazionali" },
          { value: "84%", label: "Studenti abbinati ad almeno tre corsi ideali" },
          { value: "50+", label: "Paesi coperti con dati di ammissione verificati" },
        ],
        panel: {
          title: "Anteprima di Zoe Intelligence",
          subtitle: "Scegli un'area di interesse per scoprire gli insight che otterrai.",
          previewLabel: "Esempio",
          highlightsHeading: "Cosa prepara l'IA per te",
        },
        zoeAlt: "Ritratto di Zoe, la guida intelligente di Bridge",
        zoeCaption: "Scopri Zoe – il volto amichevole che ti accompagna in ogni insight e raccomandazione.",
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "Percorsi su misura per innovatori tecnici",
            description:
              "Metti in evidenza corsi con laboratori di ricerca, tirocini e finanziamenti dedicati a scienze e ingegneria.",
            highlights: [
              "Borse che privilegiano corsi STEM e risultati di ricerca",
              "Curricula allineati al mercato con stage e corsi co-op",
              "Indicazioni sul visto per ruoli tecnologici e ingegneristici molto richiesti",
            ],
          },
          {
            key: "scholarships",
            label: "Borse di studio",
            headline: "Opportunità di finanziamento in linea con il tuo profilo",
            description:
              "Individua sovvenzioni, borse e assistantship che puoi realisticamente ottenere.",
            highlights: [
              "Elenco selezionato di borse al merito e per necessità con scadenze",
              "Requisiti di idoneità collegati al tuo percorso accademico",
              "Suggerimenti per rafforzare lettere motivazionali e referenze",
            ],
          },
          {
            key: "visa",
            label: "Visti favorevoli",
            headline: "Percorsi di studio con iter migratori scorrevoli",
            description: "Confronta paesi e istituzioni con percorsi di visto vantaggiosi.",
            highlights: [
              "Opzioni di lavoro post-laurea e durata della permanenza riassunte",
              "Checklist documentali adattate alla tua nazionalità",
              "Indicazioni su prove finanziarie, assicurazioni e preparazione ai colloqui",
            ],
          },
          {
            key: "undergraduate",
            label: "Laurea triennale",
            headline: "Percorsi undergraduate per chi si candida per la prima volta",
            description:
              "Comprendi requisiti di ingresso, prerequisiti e servizi di supporto.",
            highlights: [
              "Cronologia passo a passo dalla valutazione dei titoli all'ammissione",
              "Guida nella scelta di corsi di laurea, minor e anni propedeutici",
              "Risorse per alloggio, orientamento e gestione del budget",
            ],
          },
          {
            key: "postgraduate",
            label: "Laurea magistrale",
            headline: "Master e dottorati in linea con i tuoi obiettivi",
            description: "Confronta relatori di ricerca, dimensioni delle classi e modelli di finanziamento.",
            highlights: [
              "Profili dei docenti e temi di ricerca attuali",
              "Disponibilità di assistantship e fellowship con borsa",
              "Preparazione a colloqui e portfolio per ciascun corso",
            ],
          },
          {
            key: "coop",
            label: "Co-op e tirocini",
            headline: "Apprendimento integrato al lavoro con aziende globali",
            description:
              "Trova corsi che combinano studio ed esperienza professionale concreta.",
            highlights: [
              "Tassi di inserimento e partnership con aziende nelle varie regioni",
              "Considerazioni sul visto per tirocini retribuiti e periodi lavorativi",
              "Supporto career service per CV, colloqui e networking",
            ],
          },
        ],
      },
      zoeMultiRole: {
        badge: "Scopri Zoe",
        heading: "Assistente IA — ma più intelligente",
        description:
          "Zoe passa da studenti ad agenti e team universitari per fornire risposte contestuali nel momento in cui ne hai bisogno.",
        note: "Zoe è multi-ruolo. Pochissimi competitor lo offrono.",
        highlightsHeading: "Cosa gestisce Zoe per te",
        highlights: [
          "Risponde a ogni domanda sugli studi all'estero con contesto regionale su visti e normative.",
          "Ti guida attraverso l'intera app UniDoxia affinché scadenze, dashboard e automazioni restino in carreggiata.",
          "Legge i documenti caricati per consigliare istantaneamente scuole, borse di studio e prossimi passi.",
        ],
        roles: [
          {
            key: "students",
            title: "Studenti e famiglie",
            description:
              "Zoe è una consulente per gli studi all'estero che accompagna ogni candidato in tutta l'esperienza UniDoxia.",
            capabilities: [
              "Risponde istantaneamente a qualsiasi domanda sugli studi all'estero in linguaggio semplice.",
              "Ti guida attraverso ogni attività nell'app UniDoxia perché nulla venga trascurato.",
              "Esamina trascrizioni, saggi e prove finanziarie caricate per suggerire le scuole più adatte.",
              "Condivide raccomandazioni di consulenza personalizzate in base ai tuoi obiettivi.",
            ],
          },
          {
            key: "agents",
            title: "Agenti e consulenti",
            description:
              "Formazione, coaching e risposte su richiesta sono integrati nello stesso spazio di lavoro che alimenta la tua agenzia.",
            capabilities: [
              "Fornisce brevi aggiornamenti formativi per nuovi consulenti e personale di supporto.",
              "Trasforma i documenti degli studenti condivisi in liste rapide di scuole da esaminare con i clienti.",
              "Redige automaticamente script di contatto, piani di follow-up e raccomandazioni di consulenza.",
              "Segnala opportunità per migliorare la conversione utilizzando le analisi degli agenti da Zoe Intelligence.",
            ],
          },
          {
            key: "universities",
            title: "Università e partner",
            description:
              "Zoe vive nella dashboard universitaria per mantenere allineati i team di recruiting, compliance e servizio.",
            capabilities: [
              "Mostra avvisi sulla salute dei partner e azioni suggerite direttamente nella dashboard.",
              "Riepiloga le pipeline di candidati per regione con note sulle differenze normative.",
              "Fornisce estratti formativi per l'onboarding del personale affinché i team possano trovare risposte autonomamente.",
              "Escala i problemi che richiedono attenzione umana così puoi concentrarti sulle relazioni strategiche.",
            ],
          },
        ],
      },
    },
    universitySearch: {
      hero: {
        title: "Trova la tua università ideale",
        subtitle: "Cerca tra università, corsi e borse di studio in tutto il mondo.",
      },
      tabs: {
        search: "Ricerca",
        recommendations: "Raccomandazioni IA",
        sop: "Generatore SOP",
        interview: "Simulazione colloquio",
      },
      filters: {
        title: "Filtri di ricerca",
        subtitle: "Affina la tua ricerca qui sotto",
        fields: {
          universityName: {
            label: "Nome università",
            placeholder: "Cerca università...",
          },
          country: {
            label: "Paese",
            placeholder: "Seleziona paese",
            all: "Tutti i paesi",
          },
          programLevel: {
            label: "Livello del corso",
            placeholder: "Seleziona livello",
            all: "Tutti i livelli",
          },
          discipline: {
            label: "Disciplina",
            placeholder: "Seleziona disciplina",
            all: "Tutte le discipline",
          },
          maxFee: {
            label: "Tariffa massima (USD)",
            placeholder: "Inserisci tariffa max",
          },
          scholarshipsOnly: {
            label: "Mostra solo università con borse di studio",
          },
        },
      },
      actions: {
        search: "Cerca",
      },
      results: {
        loading: "Ricerca in corso...",
        found_one: "Trovato {{count}} risultato",
        found_other: "Trovati {{count}} risultati",
        empty: "Nessuna università trovata. Prova a modificare i filtri.",
        scholarshipBadge_one: "{{count}} borsa di studio",
        scholarshipBadge_other: "{{count}} borse di studio",
        programs: {
          heading_one: "Corsi ({{count}})",
          heading_other: "Corsi ({{count}})",
          apply: "Candidati ora",
          more_one: "+{{count}} corso aggiuntivo",
          more_other: "+{{count}} corsi aggiuntivi",
        },
        scholarships: {
          heading: "Borse di studio",
          amountVaries: "Importo variabile",
          more_one: "+{{count}} borsa aggiuntiva",
          more_other: "+{{count}} borse aggiuntive",
        },
        viewDetails: "Vedi dettagli",
        visitWebsite: "Visita sito web",
      },
    },
  },
};

export default it;
