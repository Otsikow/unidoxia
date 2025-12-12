const es = {
  common: {
    languageNames: {
      en: "Inglés",
      de: "Alemán",
      fr: "Francés",
      pt: "Portugués",
      sw: "Suajili",
      es: "Español",
      zh: "Chino",
      hi: "Hindi",
      ar: "Árabe",
    },
    labels: {
      language: "Idioma",
      selectLanguage: "Seleccionar idioma",
      toggleNavigation: "Alternar navegación",
      openUserMenu: "Abrir menú de usuario",
      currentPage: "Página actual",
      showRecentPages: "Mostrar páginas recientes",
    },
    actions: {
      login: "Iniciar sesión",
      signup: "Registrarse",
      logout: "Cerrar sesión",
      goToLogin: "Ir al inicio de sesión",
      goBack: "Volver",
      reloadPage: "Recargar página",
      retry: "Reintentar",
      save: "Guardar",
      clear: "Limpiar",
      cancel: "Cancelar",
      submit: "Enviar",
      markAllRead: "Marcar todo como leído",
    },
    navigation: {
      home: "Inicio",
      search: "Buscar",
      courses: "Cursos",
      blog: "Blog",
      contact: "Contacto",
      dashboard: "Panel",
      settings: "Configuración",
      helpCenter: "Centro de ayuda",
      faq: "FAQ",
      feedback: "Comentarios",
      visaCalculator: "Calculadora de visa",
      privacy: "Política de privacidad",
      terms: "Términos de servicio",
    },
    status: {
      loading: "Cargando...",
      loadingInterface: "Cargando interfaz...",
    },
    notifications: {
      success: "Éxito",
      error: "Error",
      saved: "Guardado",
      deleted: "Eliminado",
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
        home: "Inicio",
        search: "Buscar",
        scholarships: "Becas",
        courses: "Cursos",
        blog: "Blog",
        contact: "Contacto",
      },
      auth: {
        login: "Iniciar sesión",
        signup: "Registrarse",
        logout: "Cerrar sesión",
      },
      userMenu: {
        open: "Abrir menú de usuario",
        dashboard: "Panel",
        settings: "Configuración",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Conectamos a estudiantes internacionales con universidades de clase mundial mediante agentes verificados y una gestión transparente de solicitudes.",
      contactEmailLabel: "Escríbenos",
      headings: {
        platform: "Plataforma",
        support: "Soporte",
        accountLegal: "Cuenta y legal",
      },
      platformLinks: {
        search: "Buscar universidades",
        blog: "Blog",
        visaCalculator: "Calculadora de visa",
        feedback: "Comentarios",
      },
      supportLinks: {
        help: "Centro de ayuda",
        contact: "Contáctanos",
        faq: "FAQ",
        dashboard: "Panel",
      },
      accountLinks: {
        login: "Iniciar sesión",
        signup: "Comenzar",
        privacy: "Política de privacidad",
        terms: "Términos de servicio",
      },
      copyright: "© {{year}} UniDoxia. Todos los derechos reservados.",
      questions: "¿Preguntas?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "Cargando...",
      retry: "Reintentar",
    },
    emptyState: {
      noRecentPages: "No hay páginas recientes",
        goToFallback: "Ir a la alternativa",
      clearHistory: "Borrar historial",
      currentPage: "Página actual",
    },
      contactForm: {
        placeholders: {
          name: "Tu nombre",
          email: "Tu correo electrónico",
          whatsapp: "Tu número de WhatsApp (opcional)",
          message: "Tu mensaje",
        },
        submit: {
          default: "Enviar mensaje",
          loading: "Enviando...",
        },
        notifications: {
          signInRequiredTitle: "Debes iniciar sesión",
          signInRequiredDescription: "Inicia sesión para enviarnos un mensaje.",
          successTitle: "¡Mensaje enviado!",
          successDescription: "Gracias por contactarnos. Te responderemos pronto.",
          validationTitle: "Error de validación",
          errorTitle: "Error",
          errorDescription: "No se pudo enviar el mensaje. Vuelve a intentarlo.",
        },
        errors: {
          nameRequired: "El nombre es obligatorio",
          nameMax: "El nombre debe tener menos de 100 caracteres",
          emailInvalid: "Correo electrónico inválido",
          emailMax: "El correo debe tener menos de 255 caracteres",
          messageRequired: "El mensaje es obligatorio",
          messageMax: "El mensaje debe tener menos de 1000 caracteres",
          whatsappInvalid: "El número de WhatsApp solo puede contener números y símbolos telefónicos",
          whatsappMax: "El número de WhatsApp debe tener menos de 30 caracteres",
        },
      },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "No se pudo cargar la página",
      failedToLoadPageDescription:
        "La página no se pudo cargar. Puede deberse a un problema de red o a que la página esté temporalmente no disponible.",
      chunkReloadMessage:
        "Actualizamos la aplicación para obtener los archivos más recientes. Si sigue ocurriendo, borra el caché del navegador e inténtalo de nuevo.",
    },
    loading: "Cargando aplicación...",
    errorBoundary: {
      networkTitle: "Error de conexión",
      networkMessage: "La conexión de red falló. Verifica tu internet e inténtalo nuevamente.",
      chunkTitle: "Error de carga",
      chunkMessage: "No se pudieron cargar los recursos de la aplicación. Esto suele ocurrir tras una actualización.",
      permissionTitle: "Acceso denegado",
      permissionMessage: "No tienes permiso para acceder a este recurso.",
      notFoundTitle: "No encontrado",
      notFoundMessage: "El recurso solicitado no se encontró.",
      unauthorizedTitle: "Sesión expirada",
      unauthorizedMessage: "Tu sesión ha expirado. Inicia sesión nuevamente.",
      databaseTitle: "Error de base de datos",
      databaseMessage: "La conexión a la base de datos falló. Inténtalo de nuevo en unos momentos.",
      genericTitle: "Algo salió mal",
      genericMessage: "Ocurrió un error inesperado. Inténtalo nuevamente.",
      fallbackTitle: "Error",
      fallbackMessage: "Ocurrió un error inesperado",
      technicalDetails: "Detalles técnicos",
      tryAgain: "Reintentar",
      tryAgainCount: "Reintentar (quedan {count})",
      goHome: "Volver al inicio",
      maxRetriesReached: "Se alcanzó el número máximo de intentos. Actualiza la página o contacta al soporte.",
    },
  },
  pages: {
    index: {
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
        badge: "Búsqueda de universidades y becas con IA",
        heading: "Encuentra el curso adecuado con inteligencia en tiempo real",
        description:
          "Pregunta lo que necesites sobre universidades, cursos o financiación en cualquier parte del mundo. Nuestra IA analiza información de admisiones, becas y vías de visado adaptadas a tus objetivos.",
        subheading:
          "Regístrate para desbloquear recomendaciones personalizadas con IA sobre admisiones, becas y visados.",
        ctaLabel: "Comenzar",
        stats: [
          { value: "12k+", label: "Ideas generadas con IA para postulantes globales" },
          { value: "84%", label: "Estudiantes con al menos tres cursos idóneos" },
          { value: "50+", label: "Países con datos de admisión verificados" },
        ],
        panel: {
          title: "Vista previa de Zoe Intelligence",
          subtitle: "Elige un enfoque y descubre los análisis que obtendrás.",
          previewLabel: "Ejemplo",
          highlightsHeading: "Lo que la IA prepara para ti",
        },
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "Rutas personalizadas para innovadores técnicos",
            description:
              "Destaca cursos con laboratorios de investigación, prácticas y financiación diseñados para ciencias e ingeniería.",
            highlights: [
              "Becas que priorizan carreras STEM y proyectos de investigación",
              "Planes de estudio alineados con la industria y periodos de prácticas o co-op",
              "Orientación de visado para profesiones tecnológicas e ingenieriles en alta demanda",
            ],
          },
          {
            key: "scholarships",
            label: "Becas",
            headline: "Oportunidades de financiación acordes a tu perfil",
            description:
              "Identifica subvenciones, becas y assistantships que realmente puedes conseguir.",
            highlights: [
              "Listado curado de becas por mérito y necesidad con fechas límite",
              "Requisitos de elegibilidad vinculados con tu trayectoria académica",
              "Consejos para fortalecer cartas de motivación y recomendaciones",
            ],
          },
          {
            key: "visa",
            label: "Facilidad de visado",
            headline: "Rutas de estudio con procesos migratorios ágiles",
            description: "Compara países e instituciones con vías de visado favorables.",
            highlights: [
              "Opciones de trabajo posterior y periodos de permanencia resumidos",
              "Listas de verificación de documentos según tu nacionalidad",
              "Indicaciones sobre pruebas financieras, seguros y preparación para entrevistas",
            ],
          },
          {
            key: "undergraduate",
            label: "Pregrado",
            headline: "Trayectorias de pregrado para quienes postulan por primera vez",
            description:
              "Comprende los requisitos de ingreso, prerrequisitos y servicios de apoyo.",
            highlights: [
              "Cronograma paso a paso desde la evaluación de notas hasta la aceptación",
              "Guía para elegir carreras, minors y años fundacionales",
              "Recursos de transición sobre alojamiento, inducción y presupuesto",
            ],
          },
          {
            key: "postgraduate",
            label: "Posgrado",
            headline: "Cursos de maestría y doctorado adaptados a tus metas",
            description: "Compara tutores de investigación, tamaño de cohortes y modelos de financiación.",
            highlights: [
              "Resumen de docentes y líneas de investigación actuales",
              "Disponibilidad de assistantships y fellowships con estipendios",
              "Preparación para entrevistas y requisitos de portafolio por curso",
            ],
          },
          {
            key: "coop",
            label: "Co-op e internados",
            headline: "Aprendizaje integrado al trabajo con empleadores globales",
            description:
              "Descubre cursos que combinan estudios con experiencia profesional práctica.",
            highlights: [
              "Tasas de colocación y alianzas empresariales en diferentes regiones",
              "Consideraciones de visado para prácticas remuneradas y periodos laborales",
              "Apoyo de servicios de carrera para CV, entrevistas y networking",
            ],
          },
        ],
      },
    },
    contact: {
      heroTitle: "Contáctanos",
      heroSubtitle: "Normalmente respondemos en un día hábil.",
      emailPrompt: "¿Prefieres correo electrónico?",
      email: "info@unidoxia.com",
      whatsappCta: "Escríbenos por WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Asesor educativo profesional listo para ayudar",
      formTitle: "Envíanos un mensaje",
    },
    faq: {
      heroTitle: "Preguntas frecuentes",
      heroSubtitle: "Respuestas rápidas a las preguntas más comunes sobre tu camino educativo",
      imageAlt: "Estudiante aprendiendo e investigando",
      sections: [
        {
          audience: "Estudiantes",
          items: [
            {
              question: "¿Cómo me ayuda UniDoxia a postularme a universidades?",
              answer:
                "UniDoxia te conecta con agentes verificados que te guían en cada etapa: desde seleccionar universidades hasta enviar los documentos.",
            },
            {
              question: "¿Tiene costo usar la plataforma?",
              answer:
                "Crear una cuenta y explorar universidades es gratuito. Los agentes pueden cobrar honorarios de consultoría, claramente indicados antes de comprometerte.",
            },
            {
              question: "¿Qué documentos necesito para postularme?",
              answer:
                "Generalmente se requieren certificados académicos, resultados de exámenes de inglés (IELTS/TOEFL), cartas de recomendación, una carta de motivación y copia del pasaporte.",
            },
            {
              question: "¿Puedo postularme a varias universidades?",
              answer:
                "¡Sí! Puedes postularte a varias universidades a la vez y seguir todas las solicitudes desde un solo panel.",
            },
            {
              question: "¿Cómo me mantengo informado sobre el estado de mi solicitud?",
              answer:
                "Tu panel personalizado muestra actualizaciones en tiempo real, plazos y próximos pasos para que siempre sepas qué hacer luego.",
            },
          ],
        },
        {
          audience: "Universidades",
          items: [
            {
              question: "¿Cómo puede nuestra universidad asociarse con UniDoxia?",
              answer:
                "Envía una solicitud de asociación a través del Portal Universitario o contacta a nuestro equipo. Verificaremos tu institución y completaremos la incorporación en pocos días hábiles.",
            },
            {
              question: "¿Qué información reciben las universidades?",
              answer:
                "Las universidades acceden a paneles con embudos de solicitantes, métricas de conversión e interés por región para planificar campañas de reclutamiento con confianza.",
            },
            {
              question: "¿Podemos gestionar ofertas directamente en la plataforma?",
              answer:
                "Sí. Los equipos de admisión pueden emitir ofertas condicionales o finales, solicitar documentos faltantes y comunicarse con estudiantes y agentes desde un solo espacio de trabajo.",
            },
          ],
        },
        {
          audience: "Agentes",
          items: [
            {
              question: "¿Qué apoyo reciben los agentes en UniDoxia?",
              answer:
                "Los agentes obtienen un CRM dedicado, material de marketing y capacitación bajo demanda para ayudar a los estudiantes a encontrar cursos adecuados rápidamente.",
            },
            {
              question: "¿Cómo se gestionan las comisiones de los agentes?",
              answer:
                "Las estructuras de comisión son transparentes. Las universidades definen los términos y los pagos se registran en el panel del agente para facilitar la conciliación.",
            },
            {
              question: "¿Los agentes pueden colaborar con los equipos de admisión universitarios?",
              answer:
                "Por supuesto. Los espacios de trabajo compartidos y los hilos de mensajes mantienen a todas las partes alineadas sobre el progreso del estudiante, los documentos faltantes y la programación de entrevistas.",
            },
          ],
        },
      ],
    },
  },
};

export default es;
