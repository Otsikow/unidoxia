import en from "./en";

const fr = {
  common: {
    languageNames: {
      en: "Anglais",
      de: "Allemand",
      fr: "Français",
      pt: "Portugais",
      it: "Italien",
      sw: "Swahili",
      es: "Espagnol",
      zh: "Chinois",
      hi: "Hindi",
      ar: "Arabe",
    },
    labels: {
      language: "Langue",
      selectLanguage: "Choisir la langue",
      toggleNavigation: "Basculer la navigation",
      openUserMenu: "Ouvrir le menu utilisateur",
      currentPage: "Page actuelle",
      showRecentPages: "Afficher les pages récentes",
    },
    actions: {
      login: "Se connecter",
      signup: "S'inscrire",
      logout: "Se déconnecter",
      goToLogin: "Aller à la connexion",
      goBack: "Retour",
      reloadPage: "Recharger la page",
      retry: "Réessayer",
      save: "Enregistrer",
      clear: "Effacer",
      cancel: "Annuler",
      submit: "Soumettre",
      markAllRead: "Marquer tout comme lu",
    },
    navigation: {
      home: "Accueil",
      search: "Recherche",
      courses: "Formations",
      blog: "Blog",
      contact: "Contact",
      dashboard: "Tableau de bord",
      settings: "Paramètres",
      helpCenter: "Centre d'aide",
      faq: "FAQ",
      feedback: "Retour",
      visaCalculator: "Calculateur de visa",
      privacy: "Politique de confidentialité",
      terms: "Conditions d'utilisation",
    },
    status: {
      loading: "Chargement...",
      loadingInterface: "Chargement de l'interface...",
    },
    notifications: {
      success: "Succès",
      error: "Erreur",
      saved: "Enregistré",
      deleted: "Supprimé",
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
        home: "Accueil",
        search: "Recherche",
        scholarships: "Bourses",
        courses: "Formations",
        blog: "Blog",
        contact: "Contact",
      },
      auth: {
        login: "Se connecter",
        signup: "S'inscrire",
        logout: "Se déconnecter",
      },
      userMenu: {
        open: "Ouvrir le menu utilisateur",
        dashboard: "Tableau de bord",
        settings: "Paramètres",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Nous connectons les étudiants internationaux aux universités de renommée mondiale grâce à des agents vérifiés et une gestion transparente des candidatures.",
      contactEmailLabel: "Nous écrire",
      headings: {
        platform: "Plateforme",
        support: "Support",
        accountLegal: "Compte & Légal",
      },
      platformLinks: {
        search: "Rechercher des universités",
        blog: "Blog",
        visaCalculator: "Calculateur de visa",
        feedback: "Retour",
      },
      supportLinks: {
        help: "Centre d'aide",
        contact: "Contactez-nous",
        faq: "FAQ",
        dashboard: "Tableau de bord",
      },
      accountLinks: {
        login: "Se connecter",
        signup: "Commencer",
        privacy: "Politique de confidentialité",
        terms: "Conditions d'utilisation",
      },
      copyright: "© {{year}} UniDoxia. Tous droits réservés.",
      questions: "Des questions ?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "Chargement...",
      retry: "Réessayer",
    },
      emptyState: {
        noRecentPages: "Aucune page récente",
        goToFallback: "Aller vers la page alternative",
        clearHistory: "Effacer l'historique",
        currentPage: "Page actuelle",
      },
      contactForm: {
        placeholders: {
          name: "Votre nom",
          email: "Votre e-mail",
          whatsapp: "Votre numéro WhatsApp (optionnel)",
          message: "Votre message",
        },
        submit: {
          default: "Envoyer le message",
          loading: "Envoi...",
        },
        notifications: {
          signInRequiredTitle: "Connexion requise",
          signInRequiredDescription: "Veuillez vous connecter pour nous envoyer un message.",
          successTitle: "Message envoyé !",
          successDescription: "Merci de nous avoir contactés. Nous vous répondrons très bientôt.",
          validationTitle: "Erreur de validation",
          errorTitle: "Erreur",
          errorDescription: "Impossible d'envoyer le message. Veuillez réessayer.",
        },
        errors: {
          nameRequired: "Le nom est requis",
          nameMax: "Le nom doit contenir moins de 100 caractères",
          emailInvalid: "Adresse e-mail invalide",
          emailMax: "L'e-mail doit contenir moins de 255 caractères",
          messageRequired: "Le message est requis",
          messageMax: "Le message doit contenir moins de 1000 caractères",
          whatsappInvalid: "Le numéro WhatsApp ne peut contenir que des chiffres et des symboles téléphoniques",
          whatsappMax: "Le numéro WhatsApp doit contenir moins de 30 caractères",
        },
      },
    },
  app: {
    errors: {
      failedToLoadPageTitle: "Impossible de charger la page",
      failedToLoadPageDescription:
        "La page n'a pas pu être chargée. Cela peut être dû à un problème de réseau ou à une indisponibilité temporaire.",
      chunkReloadMessage:
        "Nous avons actualisé l'application pour récupérer les derniers fichiers. Si cela persiste, veuillez vider le cache de votre navigateur et réessayer.",
    },
    loading: "Chargement de l'application...",
    errorBoundary: {
      networkTitle: "Erreur de connexion",
      networkMessage: "La connexion réseau a échoué. Veuillez vérifier votre connexion Internet et réessayer.",
      chunkTitle: "Erreur de chargement",
      chunkMessage: "Impossible de charger les ressources de l'application. Cela se produit généralement après une mise à jour.",
      permissionTitle: "Accès refusé",
      permissionMessage: "Vous n'avez pas l'autorisation d'accéder à cette ressource.",
      notFoundTitle: "Introuvable",
      notFoundMessage: "La ressource demandée est introuvable.",
      unauthorizedTitle: "Session expirée",
      unauthorizedMessage: "Votre session a expiré. Veuillez vous reconnecter.",
      databaseTitle: "Erreur de base de données",
      databaseMessage: "La connexion à la base de données a échoué. Veuillez réessayer dans un instant.",
      genericTitle: "Une erreur est survenue",
      genericMessage: "Une erreur inattendue s'est produite. Veuillez réessayer.",
      fallbackTitle: "Erreur",
      fallbackMessage: "Une erreur inattendue s'est produite",
      technicalDetails: "Détails techniques",
      tryAgain: "Réessayer",
      tryAgainCount: "Réessayer (il reste {count})",
      goHome: "Retour à l'accueil",
      maxRetriesReached: "Nombre maximal de tentatives atteint. Veuillez rafraîchir la page ou contacter le support.",
    },
  },
  admin: {
    layout: {
      sidebar: {
        logoAlt: "UniDoxia",
        organization: "UniDoxia",
        subtitle: "Centre de contrôle administrateur",
      },
      navigation: {
        overview: { label: "Vue d'ensemble", description: "Synthèse exécutive" },
        users: { label: "Utilisateurs", description: "Administrateurs et rôles" },
        admissions: { label: "Supervision des admissions", description: "Propriété du pipeline" },
        payments: { label: "Paiements", description: "Stripe et paiements" },
        partners: { label: "Partenaires", description: "Agences et universités" },
        resources: { label: "Ressources", description: "Contenus et actifs" },
        insights: { label: "Analyses", description: "IA et analytique" },
        intelligence: { label: "Zoe Intelligence", description: "Console d'insights IA" },
        settings: { label: "Paramètres", description: "Configuration du locataire" },
        notifications: { label: "Notifications", description: "Alertes système" },
        logs: { label: "Journaux", description: "Pistes d'audit" },
      },
      profile: {
        defaultName: "Administrateur",
      },
      header: {
        openNavigation: "Ouvrir la navigation",
        organization: "UniDoxia",
        workspace: "Espace administrateur",
        privilegedAccess: "Accès privilégié",
        askZoe: "Demander à Zoe",
        askZoePrompt: "Fournir un résumé de gouvernance pour aujourd'hui",
      },
    },
    settings: {
      heading: "Paramètres du système",
      subheading: "Configurer les politiques, intégrations et automatisations du locataire.",
      securityReview: "Revue de sécurité",
      securityPrompt: "Examiner la posture de sécurité pour les changements de paramètres",
      accessControl: {
        title: "Contrôle d'accès",
        description: "Gérer les exigences d'authentification et les rôles privilégiés.",
        mfa: {
          label: "Imposer l'authentification multifacteur",
          description: "Obliger la MFA pour chaque administrateur et utilisateur finance.",
        },
        auditAlerts: {
          label: "Alertes d'audit en temps réel",
          description: "Envoyer des alertes lorsque des paramètres privilégiés changent.",
        },
        summarize: "Résumer les changements",
        summarizePrompt: "Résumer les dernières modifications de configuration",
      },
      branding: {
        title: "Image de marque de l'organisation",
        description: "Contrôler l'identité visuelle utilisée dans l'expérience admin.",
        logo: {
          label: "Téléverser le logo",
          selected: "Fichier sélectionné : {{name}}",
        },
        color: {
          label: "Couleur principale",
          aria: "Valeur hexadécimale de la couleur principale",
          helpText: "S'applique aux boutons, surlignages et éléments clés de l'interface.",
        },
        favicon: {
          label: "Téléverser le favicon",
          selected: "Fichier sélectionné : {{name}}",
        },
        save: "Enregistrer l'identité",
      },
    },
    overview: {
      loading: {
        trends: "Chargement des tendances d'admission",
        geography: "Chargement de la répartition géographique",
        activity: "Chargement de l'activité",
      },
      emptyStates: {
        noAdmissions: "Aucune activité d'admission enregistrée pour la période sélectionnée.",
        noApplications: "Aucune candidature en cours disponible.",
      },
      trends: {
        title: "Tendances des admissions",
        subtitle: "Cadence de soumission et d'inscription sur six mois",
        submitted: "Soumises",
        enrolled: "Inscrits",
      },
      geography: {
        title: "Candidatures par pays",
        subtitle: "Répartition actuelle du pipeline par destination",
      },
      kpis: {
        totalStudents: "Étudiants totaux",
        totalAgents: "Agents totaux",
        totalUniversities: "Universités totales",
        activeApplications: "Candidatures actives",
        totalCommissionPaid: "Commission totale versée",
        pendingVerifications: "Vérifications en attente",
        lastUpdated: "Mis à jour {{time}}",
        justNow: "à l'instant",
      },
      badges: {
        actionRequired: "Action requise",
      },
      recentActivity: {
        title: "Activité récente",
        subtitle: "Derniers événements d'audit du locataire",
        prompt: "Résumer les événements d'audit critiques du jour",
        cta: "Escalader avec Zoe",
        empty: "Aucune activité récente enregistrée.",
        byUser: "par {{name}}",
      },
      quickActions: {
        title: "Actions rapides",
        subtitle: "Résoudre les blocages opérationnels majeurs",
        agents: "Approuver de nouveaux agents",
        agentsPrompt: "Lister les agents en attente d'approbation et les risques potentiels",
        universities: "Approuver les universités",
        universitiesPrompt: "Quelles universités ont des tâches d'intégration en attente ?",
        compliance: "Examiner les profils signalés",
        compliancePrompt: "Afficher les profils signalés pour examen de conformité",
      },
      health: {
        title: "Santé du système",
        subtitle: "Signaux de sécurité agrégés des 30 derniers jours",
        scoreLabel: "score de risque",
        operational: "Opérationnel",
        monitoring: "Surveillance",
        degraded: "Dégradé",
        critical: "Critique",
        unknown: "Inconnu",
        noRecommendations: "Aucune recommandation active — continuer la surveillance.",
        prompt: "Fournir un résumé de triage de sécurité pour l'admin",
        cta: "Trier avec Zoe",
      },
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
          badge: "Recherche universitaire et bourses propulsée par l'IA",
          heading: "Trouvez le bon cours avec une intelligence en temps réel",
          description:
            "Posez toutes vos questions sur les universités, les formations ou les financements dans le monde entier. Notre IA analyse les informations d'admission, les bourses et les parcours de visa adaptés à vos objectifs.",
          subheading:
            "Inscrivez-vous pour débloquer des recommandations personnalisées alimentées par l'IA sur les admissions, les bourses et les visas.",
          ctaLabel: "Commencer",
          stats: [
            { value: "12k+", label: "Analyses IA générées pour des candidats internationaux" },
            { value: "84%", label: "Étudiants assortis à au moins trois cours idéaux" },
            { value: "50+", label: "Pays couverts avec des données d'admission vérifiées" },
          ],
          panel: {
            title: "Aperçu de Zoe Intelligence",
            subtitle: "Choisissez un axe pour découvrir les informations auxquelles vous aurez accès.",
            previewLabel: "Exemple",
            highlightsHeading: "Ce que l'IA prépare pour vous",
          },
          zoeAlt: "Portrait de Zoe, le guide d'intelligence de Bridge",
          zoeCaption: "Découvrez Zoe – le visage amical qui vous accompagne à chaque insight et recommandation.",
          focusAreas: [
            {
              key: "stem",
              label: "STEM",
              headline: "Parcours sur mesure pour innovateurs techniques",
              description:
                "Mettez en lumière des cours avec laboratoires de recherche, stages et financements dédiés aux sciences et à l'ingénierie.",
              highlights: [
                "Bourses privilégiant les filières STEM et la production de recherche",
                "Cours alignés sur l'industrie avec stages et alternances",
                "Conseils visa pour les métiers technologiques et d'ingénierie les plus demandés",
              ],
            },
            {
              key: "scholarships",
              label: "Bourses",
              headline: "Opportunités de financement adaptées à votre profil",
              description:
                "Identifiez les subventions, bourses et assistanats que vous pouvez réellement obtenir.",
              highlights: [
                "Liste sélectionnée de bourses au mérite et sur critères sociaux avec échéances",
                "Critères d'éligibilité associés à votre parcours académique",
                "Conseils pour renforcer lettres de motivation et recommandations",
              ],
            },
            {
              key: "visa",
              label: "Visa facilité",
              headline: "Parcours d'études avec démarches migratoires fluides",
              description: "Comparez les pays et institutions offrant des parcours de visa favorables.",
              highlights: [
                "Options de travail post-études et durées de séjour résumées",
                "Listes de contrôle des documents adaptées à votre nationalité",
                "Recommandations sur justificatifs financiers, assurances et préparation aux entretiens",
              ],
            },
            {
              key: "undergraduate",
              label: "Premier cycle",
              headline: "Parcours licence pour premières candidatures",
              description:
                "Comprenez les conditions d'admission, prérequis et services d'accompagnement.",
              highlights: [
                "Calendrier pas à pas de l'évaluation des relevés à l'acceptation",
                "Orientation pour choisir majeure, mineure et années préparatoires",
                "Ressources de transition sur le logement, l'accueil et la gestion budgétaire",
              ],
            },
            {
              key: "postgraduate",
              label: "Deuxième cycle",
              headline: "Cours de master et doctorat alignés sur vos objectifs",
              description: "Comparez encadrants de recherche, tailles de cohorte et modèles de financement.",
              highlights: [
                "Mises en avant de professeurs et thématiques de recherche actuelles",
                "Disponibilité d'assistanats et de bourses avec indemnités",
                "Préparation aux entretiens et exigences de portfolio selon le cours",
              ],
            },
            {
              key: "coop",
              label: "Stages & alternances",
              headline: "Apprentissage intégré au travail avec des employeurs internationaux",
              description:
                "Repérez des cours qui associent études et expérience professionnelle concrète.",
              highlights: [
                "Taux de placement et partenariats entreprises par région",
                "Points de vigilance visa pour stages rémunérés et périodes en entreprise",
                "Accompagnement carrière pour CV, entretiens et réseau",
              ],
            },
          ],
        },
        journeyRibbon: {
          items: {
            discover: {
              stage: "Découvrir",
              metricValue: "200+",
              metricLabel: "Universités partenaires",
              description:
                "Les recommandations pilotées par l'IA révèlent immédiatement les universités les plus adaptées dès votre inscription.",
              ctaLabel: "Commencer la candidature",
            },
            plan: {
              stage: "Planifier",
              metricValue: "5000+",
              metricLabel: "Plans personnalisés créés",
              description:
                "Des listes de tâches et des rappels intelligents aident des milliers d'étudiants à rester organisés des relevés jusqu'aux lettres de motivation.",
              ctaLabel: "",
            },
            collaborate: {
              stage: "Collaborer",
              metricValue: "24h",
              metricLabel: "Délai de réponse moyen des agents",
              description:
                "Des conseillers vérifiés co-éditent les documents, répondent aux questions et synchronisent les calendriers en temps réel sur tous les canaux.",
              ctaLabel: "Rencontrer votre agent",
            },
            submit: {
              stage: "Soumettre",
              metricValue: "95%",
              metricLabel: "Taux de réussite",
              description:
                "Des soumissions centralisées et des rappels proactifs font avancer les candidatures sans manquer une seule échéance.",
              ctaLabel: "",
            },
            celebrate: {
              stage: "Célébrer",
              metricValue: "50+",
              metricLabel: "Pays représentés",
              description:
                "Des check-lists prêtes pour le visa et une préparation au départ permettent aux étudiants de rejoindre les campus du monde entier en toute confiance.",
              ctaLabel: "",
            },
          },
        },
        storyboard: {
          heading: "Comment UniDoxia simplifie chaque étape",
          subheading:
            "Suivez notre storyboard pour découvrir comment notre plateforme et nos équipes accompagnent votre candidature de l'idée à l'arrivée.",
          stepLabel: "Étape {{number}}",
          steps: {
            discover: {
              title: "Découvrez vos cours idéaux",
              description:
                "Partagez vos objectifs et vos résultats : UniDoxia sélectionne instantanément des universités, cours et bourses adaptés.",
              support:
                "Des filtres intelligents et des recommandations IA éliminent les tâtonnements pour constituer une short-list en quelques minutes.",
              imageAlt: "Étudiante examinant des cours universitaires lors d'une visite de campus",
            },
            plan: {
              title: "Construisez un plan de candidature personnalisé",
              description:
                "Téléchargez relevés, tests et essais grâce à des check-lists guidées qui découpent tout en tâches gérables.",
              support: "Des rappels automatiques et des conseils sur les documents vous gardent en avance sur chaque échéance.",
              imageAlt: "Étudiante planifiant ses tâches de candidature sur un ordinateur portable en plein air",
            },
            collaborate: {
              title: "Collaborez avec votre agent expert",
              description:
                "Travaillez avec un conseiller UniDoxia vérifié pour affiner les documents, aligner les délais et rester prêt pour les entretiens.",
              support:
                "Espaces partagés, commentaires annotés et messagerie instantanée offrent une collaboration transparente et sereine.",
              imageAlt: "Étudiante échangeant avec un agent d'éducation via un smartphone",
            },
            track: {
              title: "Soumettez et suivez sans stress",
              description:
                "Postulez auprès de plusieurs universités simultanément et suivez chaque retour, demande et offre sur une chronologie simple.",
              support: "Des statuts en direct et des rappels proactifs indiquent la prochaine étape pour qu'aucune action ne soit oubliée.",
              imageAlt: "Étudiante vérifiant l'avancement de sa candidature sur le campus",
            },
            celebrate: {
              title: "Célébrez et préparez votre départ",
              description:
                "Acceptez votre offre, finalisez les démarches de visa et accédez aux ressources de pré-départ adaptées à votre destination.",
              support:
                "Check-lists visa, conseils logement et confirmations d'inscription vous accompagnent jusqu'à l'embarquement.",
              imageAlt: "Étudiante célébrant l'approbation de son visa avec ses documents",
            },
          },
        },
        featuredUniversities: {
          heading: "Universités mises en avant",
          description:
            "Des établissements qui offrent systématiquement aux étudiants internationaux de UniDoxia une expérience d'intégration exceptionnelle.",
          network: {
            label: "Réseau en vedette",
            summary: "{{count}} établissements sélectionnés par notre équipe partenariats",
          },
          badges: {
            topPick: "Sélection premium",
            priority: "Priorité n°{{position}}",
          },
          actions: {
            visitSite: "Visiter le site",
            scrollLeft: "Faire défiler les universités mises en avant vers la gauche",
            scrollRight: "Faire défiler les universités mises en avant vers la droite",
          },
          fallback: {
            summary:
              "Des partenaires engagés qui accueillent les étudiants de UniDoxia avec un accompagnement personnalisé.",
            highlight: "Partenaire dédié à la réussite étudiante",
            notice: {
              error: "Nous affichons des partenaires mis en avant pendant la reconnexion de la liste.",
              updating: "Nous affichons des partenaires mis en avant pendant la mise à jour de la liste.",
            },
          },
        partnerCta: {
          heading: "Devenir partenaire",
          description: "Présentez votre établissement à des milliers d'étudiants motivés dans le monde.",
          action: "Rejoindre le réseau",
        },
      },
      zoeMultiRole: {
        badge: "Rencontrez Zoe",
        heading: "Assistant IA — en version plus intelligente",
        description:
          "Zoe passe des étudiants aux agents et aux équipes universitaires pour fournir des réponses contextuelles au moment où vous en avez besoin.",
        note: "Zoe est multi-rôle. Très peu de concurrents offrent cela.",
        highlightsHeading: "Ce que Zoe gère pour vous",
        highlights: [
          "Répond à toutes les questions sur les études à l'étranger avec le contexte régional des visas et des politiques.",
          "Vous guide à travers l'application UniDoxia pour que les délais, tableaux de bord et automatisations restent sur la bonne voie.",
          "Lit les documents téléchargés pour recommander instantanément des écoles, des bourses et les prochaines étapes.",
        ],
        roles: [
          {
            key: "students",
            title: "Étudiants et familles",
            description:
              "Zoe est une conseillère en études à l'étranger qui accompagne chaque candidat tout au long de l'expérience UniDoxia.",
            capabilities: [
              "Répond instantanément à toute question sur les études à l'étranger en langage simple.",
              "Vous guide à travers chaque tâche dans l'application UniDoxia pour ne rien manquer.",
              "Examine les relevés de notes, les essais et les preuves de fonds téléchargés pour suggérer les écoles les plus adaptées.",
              "Partage des recommandations de conseil personnalisées basées sur vos objectifs.",
            ],
          },
          {
            key: "agents",
            title: "Agents et conseillers",
            description:
              "La formation, le coaching et les réponses à la demande sont intégrés dans le même espace de travail qui alimente votre agence.",
            capabilities: [
              "Fournit des rappels de formation courts pour les nouveaux conseillers et le personnel de support.",
              "Transforme les documents étudiants partagés en listes d'écoles rapides à examiner avec les clients.",
              "Rédige automatiquement des scripts de prospection, des plans de suivi et des recommandations de conseil.",
              "Signale les opportunités d'améliorer la conversion grâce aux analyses d'agents tirées de Zoe Intelligence.",
            ],
          },
          {
            key: "universities",
            title: "Universités et partenaires",
            description:
              "Zoe vit dans le tableau de bord universitaire pour maintenir l'alignement des équipes de recrutement, de conformité et de service.",
            capabilities: [
              "Affiche les alertes de santé des partenaires et les actions suggérées directement dans le tableau de bord.",
              "Résume les pipelines de candidats par région avec des notes sur les différences de politiques.",
              "Fournit des extraits de formation pour l'intégration du personnel afin que les équipes puissent trouver des réponses par elles-mêmes.",
              "Escalade les problèmes nécessitant une attention humaine pour que vous puissiez vous concentrer sur les relations stratégiques.",
            ],
          },
        ],
      },
    },
    universitySearch: {
      hero: {
        title: "Trouvez votre université idéale",
        subtitle: "Recherchez parmi les universités, cours et bourses du monde entier.",
      },
      tabs: {
        search: "Recherche",
        recommendations: "Recommandations IA",
        sop: "Générateur de SOP",
        interview: "Simulation d'entretien",
      },
      filters: {
        title: "Filtres de recherche",
        subtitle: "Affinez votre recherche ci-dessous",
        fields: {
          universityName: {
            label: "Nom de l'université",
            placeholder: "Rechercher des universités...",
          },
          country: {
            label: "Pays",
            placeholder: "Sélectionner un pays",
            all: "Tous les pays",
          },
          programLevel: {
            label: "Niveau du cours",
            placeholder: "Sélectionner un niveau",
            all: "Tous les niveaux",
          },
          discipline: {
            label: "Discipline",
            placeholder: "Sélectionner une discipline",
            all: "Toutes les disciplines",
          },
          maxFee: {
            label: "Frais maximum (USD)",
            placeholder: "Entrer le montant max",
          },
          scholarshipsOnly: {
            label: "Afficher uniquement les universités avec des bourses",
          },
        },
      },
      actions: {
        search: "Rechercher",
      },
      results: {
        loading: "Recherche en cours...",
        found_one: "{{count}} résultat trouvé",
        found_other: "{{count}} résultats trouvés",
        empty: "Aucune université trouvée. Essayez d'ajuster vos filtres.",
        scholarshipBadge_one: "{{count}} bourse",
        scholarshipBadge_other: "{{count}} bourses",
        programs: {
          heading_one: "Cours ({{count}})",
          heading_other: "Cours ({{count}})",
          apply: "Postuler maintenant",
          more_one: "+{{count}} cours supplémentaire",
          more_other: "+{{count}} cours supplémentaires",
        },
        scholarships: {
          heading: "Bourses",
          amountVaries: "Montant variable",
          more_one: "+{{count}} bourse supplémentaire",
          more_other: "+{{count}} bourses supplémentaires",
        },
        viewDetails: "Voir les détails",
        visitWebsite: "Visiter le site",
      },
    },
    contact: {
      heroTitle: "Contactez-nous",
      heroSubtitle: "Nous répondons généralement sous un jour ouvrable.",
      emailPrompt: "Vous préférez l'e-mail ?",
      email: "info@unidoxia.com",
      whatsappCta: "Écrivez-nous sur WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Conseiller en éducation prêt à aider",
      formTitle: "Envoyez-nous un message",
    },
    faq: {
      heroTitle: "Questions fréquentes",
      heroSubtitle: "Des réponses rapides aux questions les plus courantes sur votre parcours éducatif",
      imageAlt: "Étudiant en train d'étudier et de faire des recherches",
      sections: [
        {
          audience: "Étudiants",
          items: [
            {
              question: "Comment UniDoxia m'aide-t-il à postuler dans les universités ?",
              answer:
                "UniDoxia vous met en relation avec des agents vérifiés qui vous accompagnent à chaque étape – de la sélection des universités à la soumission des documents.",
            },
            {
              question: "L'utilisation de la plateforme est-elle payante ?",
              answer:
                "Créer un compte et explorer les universités est gratuit. Les agents peuvent facturer des honoraires de conseil, clairement indiqués avant tout engagement.",
            },
            {
              question: "Quels documents dois-je fournir pour postuler ?",
              answer:
                "Vous aurez généralement besoin de relevés de notes, de résultats de tests d'anglais (IELTS/TOEFL), de lettres de recommandation, d'une lettre de motivation et d'une copie de votre passeport.",
            },
            {
              question: "Puis-je postuler à plusieurs universités ?",
              answer:
                "Oui ! Vous pouvez postuler à plusieurs universités en même temps et suivre toutes vos candidatures depuis un seul tableau de bord.",
            },
            {
              question: "Comment rester informé de l'avancement de ma candidature ?",
              answer:
                "Votre tableau de bord personnalisé affiche des mises à jour en temps réel, des échéances et les prochaines étapes afin que vous sachiez toujours quoi faire ensuite.",
            },
          ],
        },
        {
          audience: "Universités",
          items: [
            {
              question: "Comment notre université peut-elle devenir partenaire de UniDoxia ?",
              answer:
                "Soumettez une demande de partenariat via le portail universitaire ou contactez notre équipe. Nous vérifions votre établissement et organisons l'onboarding en quelques jours ouvrés.",
            },
            {
              question: "Quelles informations les universités reçoivent-elles ?",
              answer:
                "Les universités accèdent à des tableaux de bord présentant les pipelines de candidats, les taux de conversion et l'intérêt par région pour planifier leurs campagnes de recrutement.",
            },
            {
              question: "Pouvons-nous gérer les offres directement sur la plateforme ?",
              answer:
                "Oui. Les équipes d'admission peuvent émettre des offres conditionnelles ou définitives, demander des documents manquants et communiquer avec les étudiants et agents depuis un espace partagé.",
            },
          ],
        },
        {
          audience: "Agents",
          items: [
            {
              question: "Quel soutien les agents reçoivent-ils sur UniDoxia ?",
              answer:
                "Les agents disposent d'un CRM dédié, de supports marketing et de formations à la demande pour aider les étudiants à trouver rapidement les bons cours.",
            },
            {
              question: "Comment sont gérées les commissions des agents ?",
              answer:
                "Les structures de commissions sont transparentes. Les universités définissent les conditions et les paiements sont suivis dans le tableau de bord agent pour un rapprochement facile.",
            },
            {
              question: "Les agents peuvent-ils collaborer avec les équipes d'admission des universités ?",
              answer:
                "Absolument. Des espaces de travail partagés et des conversations dédiées maintiennent toutes les parties informées des progrès, des documents manquants et de la planification des entretiens.",
            },
          ],
        },
      ],
    },
  },
};

export default fr;
