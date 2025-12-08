const pt = {
  common: {
    languageNames: {
      en: "Inglês",
      de: "Alemão",
      fr: "Francês",
      pt: "Português",
      it: "Italiano",
      sw: "Suaíli",
      es: "Espanhol",
      zh: "Chinês",
      hi: "Hindi",
      ar: "Árabe",
    },
    labels: {
      language: "Idioma",
      selectLanguage: "Selecionar idioma",
      toggleNavigation: "Alternar navegação",
      openUserMenu: "Abrir menu do usuário",
      currentPage: "Página atual",
      showRecentPages: "Mostrar páginas recentes",
    },
    actions: {
      login: "Entrar",
      signup: "Cadastrar",
      logout: "Sair",
      goToLogin: "Ir para login",
      goBack: "Voltar",
      reloadPage: "Recarregar página",
      retry: "Tentar novamente",
      save: "Salvar",
      clear: "Limpar",
      cancel: "Cancelar",
      submit: "Enviar",
      markAllRead: "Marcar tudo como lido",
    },
    navigation: {
      home: "Início",
      search: "Buscar",
      courses: "Cursos",
      blog: "Blog",
      contact: "Contato",
      dashboard: "Painel",
      settings: "Configurações",
      helpCenter: "Central de ajuda",
      faq: "FAQ",
      feedback: "Feedback",
      visaCalculator: "Calculadora de visto",
      privacy: "Política de privacidade",
      terms: "Termos de uso",
    },
    status: {
      loading: "Carregando...",
      loadingInterface: "Carregando interface...",
    },
    notifications: {
      success: "Sucesso",
      error: "Erro",
      saved: "Salvo",
      deleted: "Excluído",
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
        home: "Início",
        search: "Buscar",
        scholarships: "Bolsas",
        courses: "Cursos",
        blog: "Blog",
        contact: "Contato",
      },
      auth: {
        login: "Entrar",
        signup: "Cadastrar",
        logout: "Sair",
      },
      userMenu: {
        open: "Abrir menu do usuário",
        dashboard: "Painel",
        settings: "Configurações",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "Conectamos estudantes internacionais a universidades de classe mundial por meio de agentes verificados e uma gestão transparente de candidaturas.",
      contactEmailLabel: "Envie-nos um e-mail",
      headings: {
        platform: "Plataforma",
        support: "Suporte",
        accountLegal: "Conta & Jurídico",
      },
      platformLinks: {
        search: "Buscar universidades",
        blog: "Blog",
        visaCalculator: "Calculadora de visto",
        feedback: "Feedback",
      },
      supportLinks: {
        help: "Central de ajuda",
        contact: "Fale conosco",
        faq: "FAQ",
        dashboard: "Painel",
      },
      accountLinks: {
        login: "Entrar",
        signup: "Começar",
        privacy: "Política de privacidade",
        terms: "Termos de uso",
      },
      copyright: "© {{year}} UniDoxia. Todos os direitos reservados.",
      questions: "Dúvidas?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "Carregando...",
      retry: "Tentar novamente",
    },
      emptyState: {
        noRecentPages: "Nenhuma página recente",
        goToFallback: "Ir para alternativa",
        clearHistory: "Limpar histórico",
        currentPage: "Página atual",
      },
      contactForm: {
        placeholders: {
          name: "Seu nome",
          email: "Seu e-mail",
          whatsapp: "Seu número de WhatsApp (opcional)",
          message: "Sua mensagem",
        },
        submit: {
          default: "Enviar mensagem",
          loading: "Enviando...",
        },
        notifications: {
          signInRequiredTitle: "É necessário entrar",
          signInRequiredDescription: "Entre na plataforma para nos enviar uma mensagem.",
          successTitle: "Mensagem enviada!",
          successDescription: "Obrigado pelo contato. Responderemos em breve.",
          validationTitle: "Erro de validação",
          errorTitle: "Erro",
          errorDescription: "Não foi possível enviar a mensagem. Tente novamente.",
        },
        errors: {
          nameRequired: "O nome é obrigatório",
          nameMax: "O nome deve ter menos de 100 caracteres",
          emailInvalid: "E-mail inválido",
          emailMax: "O e-mail deve ter menos de 255 caracteres",
          messageRequired: "A mensagem é obrigatória",
          messageMax: "A mensagem deve ter menos de 1000 caracteres",
          whatsappInvalid: "O WhatsApp deve conter apenas números e símbolos de telefone",
          whatsappMax: "O WhatsApp deve ter menos de 30 caracteres",
        },
      },
    },
  app: {
    errors: {
      failedToLoadPageTitle: "Não foi possível carregar a página",
      failedToLoadPageDescription:
        "A página não pôde ser carregada. Isso pode ocorrer devido a um problema de rede ou porque a página está temporariamente indisponível.",
      chunkReloadMessage:
        "Atualizamos o aplicativo para buscar os arquivos mais recentes. Se isso continuar acontecendo, limpe o cache do navegador e tente novamente.",
    },
    loading: "Carregando aplicação...",
    errorBoundary: {
      networkTitle: "Erro de conexão",
      networkMessage: "A conexão de rede falhou. Verifique sua internet e tente novamente.",
      chunkTitle: "Erro de carregamento",
      chunkMessage: "Não foi possível carregar os recursos do aplicativo. Isso geralmente ocorre após uma atualização.",
      permissionTitle: "Acesso negado",
      permissionMessage: "Você não tem permissão para acessar este recurso.",
      notFoundTitle: "Não encontrado",
      notFoundMessage: "O recurso solicitado não foi encontrado.",
      unauthorizedTitle: "Sessão expirada",
      unauthorizedMessage: "Sua sessão expirou. Faça login novamente.",
      databaseTitle: "Erro de banco de dados",
      databaseMessage: "A conexão com o banco de dados falhou. Tente novamente em instantes.",
      genericTitle: "Algo deu errado",
      genericMessage: "Ocorreu um erro inesperado. Tente novamente.",
      fallbackTitle: "Erro",
      fallbackMessage: "Ocorreu um erro inesperado",
      technicalDetails: "Detalhes técnicos",
      tryAgain: "Tentar novamente",
      tryAgainCount: "Tentar novamente ({count} restantes)",
      goHome: "Voltar ao início",
      maxRetriesReached: "Número máximo de tentativas atingido. Atualize a página ou contate o suporte.",
    },
  },
  admin: {
    layout: {
      sidebar: {
        logoAlt: "UniDoxia",
        organization: "UniDoxia",
        subtitle: "Centro de controle administrativo",
      },
      navigation: {
        overview: { label: "Visão geral", description: "Resumo executivo" },
        users: { label: "Usuários", description: "Administradores e funções" },
        admissions: { label: "Supervisão de admissões", description: "Responsabilidade do pipeline" },
        payments: { label: "Pagamentos", description: "Stripe e repasses" },
        partners: { label: "Parceiros", description: "Agências e universidades" },
        resources: { label: "Recursos", description: "Conteúdos e ativos" },
        insights: { label: "Insights", description: "IA e análises" },
        intelligence: { label: "Zoe Intelligence", description: "Console de insights de IA" },
        settings: { label: "Configurações", description: "Configuração do locatário" },
        notifications: { label: "Notificações", description: "Alertas do sistema" },
        logs: { label: "Registros", description: "Trilhas de auditoria" },
      },
      profile: {
        defaultName: "Administrador",
      },
      header: {
        openNavigation: "Abrir navegação",
        organization: "UniDoxia",
        workspace: "Espaço do administrador",
        privilegedAccess: "Acesso privilegiado",
        askZoe: "Perguntar à Zoe",
        askZoePrompt: "Fornecer um resumo de governança para hoje",
      },
    },
    settings: {
      heading: "Configurações do sistema",
      subheading: "Configure políticas, integrações e automações do locatário.",
      securityReview: "Revisão de segurança",
      securityPrompt: "Revisar a postura de segurança para mudanças de configurações",
      accessControl: {
        title: "Controle de acesso",
        description: "Gerencie requisitos de autenticação e cargos privilegiados.",
        mfa: {
          label: "Aplicar autenticação multifator",
          description: "Exigir MFA para todos os administradores e usuários financeiros.",
        },
        auditAlerts: {
          label: "Alertas de auditoria em tempo real",
          description: "Enviar alertas quando configurações privilegiadas mudarem.",
        },
        summarize: "Resumir alterações",
        summarizePrompt: "Resumir as alterações de configuração recentes",
      },
      branding: {
        title: "Identidade da organização",
        description: "Controle a identidade visual usada na experiência administrativa.",
        logo: {
          label: "Enviar logotipo",
          selected: "Arquivo selecionado: {{name}}",
        },
        color: {
          label: "Cor primária",
          aria: "Valor hexadecimal da cor primária",
          helpText: "Aplica-se a botões, destaques e elementos-chave da interface.",
        },
        favicon: {
          label: "Enviar favicon",
          selected: "Arquivo selecionado: {{name}}",
        },
        save: "Salvar identidade",
      },
    },
    overview: {
      loading: {
        trends: "Carregando tendências de admissões",
        geography: "Carregando distribuição geográfica",
        activity: "Carregando atividade",
      },
      emptyStates: {
        noAdmissions: "Nenhuma atividade de admissão registrada para o período selecionado.",
        noApplications: "Nenhuma candidatura em andamento disponível.",
      },
      trends: {
        title: "Tendências de admissões",
        subtitle: "Cadência de envio e matrícula dos últimos seis meses",
        submitted: "Enviadas",
        enrolled: "Matriculados",
      },
      geography: {
        title: "Candidaturas por país",
        subtitle: "Distribuição atual do pipeline por destino",
      },
      kpis: {
        totalStudents: "Total de estudantes",
        totalAgents: "Total de agentes",
        totalUniversities: "Total de universidades",
        activeApplications: "Candidaturas ativas",
        totalCommissionPaid: "Comissão total paga",
        pendingVerifications: "Verificações pendentes",
        lastUpdated: "Atualizado {{time}}",
        justNow: "agora mesmo",
      },
      badges: {
        actionRequired: "Ação necessária",
      },
      recentActivity: {
        title: "Atividade recente",
        subtitle: "Últimos eventos de auditoria do locatário",
        prompt: "Resumir os eventos críticos de auditoria de hoje",
        cta: "Escalar com Zoe",
        empty: "Nenhuma atividade recente registrada.",
        byUser: "por {{name}}",
      },
      quickActions: {
        title: "Ações rápidas",
        subtitle: "Resolver bloqueios importantes do fluxo de trabalho",
        agents: "Aprovar novos agentes",
        agentsPrompt: "Listar agentes aguardando aprovação e riscos potenciais",
        universities: "Aprovar universidades",
        universitiesPrompt: "Quais universidades têm tarefas de onboarding pendentes?",
        compliance: "Revisar perfis sinalizados",
        compliancePrompt: "Mostrar perfis sinalizados para revisão de conformidade",
      },
      health: {
        title: "Saúde do sistema",
        subtitle: "Sinais de segurança agregados dos últimos 30 dias",
        scoreLabel: "índice de risco",
        operational: "Operacional",
        monitoring: "Monitorando",
        degraded: "Degradado",
        critical: "Crítico",
        unknown: "Desconhecido",
        noRecommendations: "Nenhuma recomendação ativa — continue monitorando.",
        prompt: "Fornecer um resumo de triagem de segurança para o admin",
        cta: "Triar com Zoe",
      },
    },
  },
    pages: {
      index: {
        hero: {
          trustBadge: "Confiado por mais de {{count}} estudantes no mundo todo",
          title: {
            prefix: "Seu Portal para",
            highlight: "Educação Global",
            suffix: "",
          },
          description:
            "Conecte-se a universidades de ponta, acompanhe candidaturas em tempo real e receba orientação especializada de agentes verificados.",
          ctas: {
            students: {
              badge: "Estudantes",
              title: "Inicie sua candidatura internacional",
              description:
                "Crie um perfil, envie documentos uma única vez e encaminhe candidaturas completas às melhores universidades em minutos.",
              action: "Começar inscrição",
            },
            agents: {
              badge: "Agentes",
              title: "Atenda estudantes com ferramentas inteligentes",
              description:
                "Acesse painéis, colabore em tempo real e acompanhe cada etapa enquanto expande a sua agência.",
              action: "Participar como agente",
            },
            universities: {
              badge: "Universidades",
              title: "Amplie parcerias que geram resultados",
              description:
                "Conecte-se a candidatos qualificados, obtenha insights de mercado e colabore com consultores certificados no mundo inteiro.",
              action: "Seja nosso parceiro",
            },
          },
        },
        features: {
          heading: "Por que escolher a UniDoxia?",
          cards: {
            applyEasily: {
              title: "Candidate-se com facilidade",
              description:
                "Processo simplificado com orientação passo a passo. Envie candidaturas para várias universidades sem complicações.",
            },
            trackRealtime: {
              title: "Acompanhe em tempo real",
              description: "Monitore o status da candidatura 24/7 com atualizações e notificações instantâneas.",
            },
            connectAgents: {
              title: "Conecte-se a agentes verificados",
              description: "Conte com agentes certificados que oferecem suporte personalizado em toda a jornada.",
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
          badge: "Busca de universidades e bolsas com IA",
          heading: "Encontre o programa ideal com inteligência em tempo real",
          description:
            "Pergunte tudo sobre universidades, cursos ou financiamento no mundo inteiro. Nossa IA analisa dados de admissão, bolsas e rotas de visto alinhadas aos seus objetivos.",
          subheading:
            "Crie uma conta para liberar recomendações personalizadas de admissão, bolsas e vistos alimentadas por IA.",
          ctaLabel: "Começar",
          stats: [
            { value: "12k+", label: "Insights com IA para candidatos globais" },
            { value: "84%", label: "Estudantes com pelo menos três programas ideais" },
            { value: "50+", label: "Países com dados de admissão verificados" },
          ],
          panel: {
            title: "Prévia do Zoe Intelligence",
            subtitle: "Escolha um foco para ver os insights que você vai desbloquear.",
            previewLabel: "Exemplo",
            highlightsHeading: "O que a IA prepara para você",
          },
          focusAreas: [
            {
              key: "stem",
              label: "STEM",
              headline: "Caminhos personalizados para inovadores técnicos",
              description:
                "Destaque programas com laboratórios de pesquisa, estágios e financiamento para ciências e engenharia.",
              highlights: [
                "Bolsas que priorizam cursos STEM e produção científica",
                "Currículos alinhados ao mercado com estágios e programas co-op",
                "Orientação de visto para carreiras tecnológicas e de engenharia em alta demanda",
              ],
            },
            {
              key: "scholarships",
              label: "Bolsas",
              headline: "Oportunidades de financiamento compatíveis com seu perfil",
              description:
                "Identifique bolsas, auxílios e assistantships que você tem chances reais de conquistar.",
              highlights: [
                "Lista curada de bolsas por mérito e necessidade com prazos",
                "Critérios de elegibilidade conectados ao seu histórico acadêmico",
                "Dicas para fortalecer cartas de motivação e recomendações",
              ],
            },
            {
              key: "visa",
              label: "Facilidade de visto",
              headline: "Rotas de estudo com processos migratórios tranquilos",
              description: "Compare países e instituições com caminhos de visto favoráveis.",
              highlights: [
                "Opções de trabalho pós-estudo e tempos de permanência resumidos",
                "Checklists de documentos adaptadas à sua nacionalidade",
                "Orientações sobre comprovação financeira, seguros e preparação para entrevistas",
              ],
            },
            {
              key: "undergraduate",
              label: "Graduação",
              headline: "Jornadas de graduação para primeiras candidaturas",
              description:
                "Entenda requisitos de ingresso, pré-requisitos e serviços de apoio.",
              highlights: [
                "Cronograma passo a passo da análise de histórico até a aceitação",
                "Orientação para escolher cursos, minors e anos preparatórios",
                "Recursos de transição sobre moradia, acolhimento e orçamento",
              ],
            },
            {
              key: "postgraduate",
              label: "Pós-graduação",
              headline: "Programas de mestrado e doutorado alinhados às suas metas",
              description: "Compare orientadores, tamanho de turmas e modelos de financiamento.",
              highlights: [
                "Destaques de docentes e temas de pesquisa atuais",
                "Disponibilidade de assistantships e bolsas com bolsas auxílio",
                "Preparação para entrevistas e portfólios conforme o programa",
              ],
            },
            {
              key: "coop",
              label: "Co-op e estágios",
              headline: "Aprendizado integrado ao trabalho com empregadores globais",
              description:
                "Encontre programas que combinam estudo com experiência profissional prática.",
              highlights: [
                "Taxas de colocação e parcerias com empresas em diversas regiões",
                "Considerações de visto para estágios remunerados e períodos de trabalho",
                "Suporte de carreiras para currículo, entrevistas e networking",
              ],
            },
          ],
        },
        journeyRibbon: {
          items: {
            discover: {
              stage: "Descobrir",
              metricValue: "200+",
              metricLabel: "Universidades parceiras",
              description:
                "Recomendações impulsionadas por IA mostram imediatamente as universidades ideais assim que você se cadastra.",
              ctaLabel: "Iniciar inscrição",
            },
            plan: {
              stage: "Planejar",
              metricValue: "5000+",
              metricLabel: "Planos personalizados criados",
              description:
                "Listas de tarefas e lembretes inteligentes mantêm milhares de estudantes organizados do histórico às cartas.",
              ctaLabel: "",
            },
            collaborate: {
              stage: "Colaborar",
              metricValue: "24h",
              metricLabel: "Tempo médio de resposta dos agentes",
              description:
                "Consultores verificados coeditam documentos, respondem dúvidas e alinham cronogramas em tempo real em todos os canais.",
              ctaLabel: "Conheça seu agente",
            },
            submit: {
              stage: "Enviar",
              metricValue: "95%",
              metricLabel: "Taxa de sucesso",
              description:
                "Envios centralizados e lembretes proativos mantêm as candidaturas avançando sem perder prazos.",
              ctaLabel: "",
            },
            celebrate: {
              stage: "Celebrar",
              metricValue: "50+",
              metricLabel: "Países representados",
              description:
                "Checklists prontas para visto e preparação pré-embarque levam estudantes com confiança a campi no mundo todo.",
              ctaLabel: "",
            },
          },
        },
        storyboard: {
          heading: "Como a UniDoxia simplifica cada etapa",
          subheading:
            "Acompanhe o storyboard para enxergar como nossa plataforma e equipe orientam sua candidatura da ideia à chegada.",
          stepLabel: "Etapa {{number}}",
          steps: {
            discover: {
              title: "Descubra os programas ideais",
              description:
                "Compartilhe objetivos e histórico: a UniDoxia seleciona instantaneamente universidades, cursos e bolsas que combinam com você.",
              support:
                "Filtros inteligentes e recomendações com IA eliminam a incerteza para montar uma short-list em minutos.",
              imageAlt: "Estudante analisando programas universitários durante visita ao campus",
            },
            plan: {
              title: "Monte um plano de candidatura personalizado",
              description:
                "Envie históricos, testes e redações com checklists guiadas que dividem tudo em tarefas manejáveis.",
              support: "Alertas automáticos e dicas de documentos mantêm você adiantado em cada etapa.",
              imageAlt: "Estudante planejando tarefas de candidatura em um notebook ao ar livre",
            },
            collaborate: {
              title: "Colabore com seu agente especialista",
              description:
                "Trabalhe ao lado de um consultor UniDoxia verificado para aprimorar documentos, alinhar prazos e estar pronto para entrevistas.",
              support:
                "Espaços compartilhados, feedback anotado e mensagens instantâneas garantem decisões transparentes e sem estresse.",
              imageAlt: "Estudante conversando com agente educacional via smartphone",
            },
            track: {
              title: "Envie e acompanhe sem estresse",
              description:
                "Candidate-se a várias universidades simultaneamente e acompanhe cada retorno, pedido e oferta em uma linha do tempo simples.",
              support: "Indicadores ao vivo e lembretes proativos mostram a próxima ação para que nada seja esquecido.",
              imageAlt: "Estudante verificando o andamento da candidatura enquanto caminha pelo campus",
            },
            celebrate: {
              title: "Comemore e prepare a partida",
              description:
                "Aceite a oferta, finalize o visto e acesse recursos pré-embarque adaptados ao seu destino.",
              support:
                "Checklists de visto, orientações de moradia e confirmações de matrícula acompanham você até o embarque.",
              imageAlt: "Estudante comemorando a aprovação do visto com documentos em mãos",
            },
          },
        },
        featuredUniversities: {
          heading: "Universidades em destaque",
          description:
            "Instituições que oferecem constantemente aos estudantes internacionais da UniDoxia uma experiência de acolhimento excepcional.",
          network: {
            label: "Rede selecionada",
            summary: "{{count}} instituições escolhidas pela nossa equipe de parcerias",
          },
          badges: {
            topPick: "Seleção premium",
            priority: "Prioridade nº {{position}}",
          },
          actions: {
            visitSite: "Visitar site",
            scrollLeft: "Rolar universidades em destaque para a esquerda",
            scrollRight: "Rolar universidades em destaque para a direita",
          },
          fallback: {
            summary:
              "Parceiros dedicados que acolhem estudantes da UniDoxia com suporte personalizado.",
            highlight: "Parceiro dedicado ao sucesso estudantil",
            notice: {
              error: "Mostrando parceiros em destaque enquanto reconectamos a lista principal.",
              updating: "Mostrando parceiros em destaque enquanto atualizamos a lista principal.",
            },
          },
          partnerCta: {
            heading: "Torne-se parceiro",
            description: "Apresente sua instituição a milhares de estudantes motivados em todo o mundo.",
            action: "Entrar na rede",
          },
        },
        visa: {
          badge: "Destaque",
          title: "Entenda sua elegibilidade de visto antes de se candidatar",
          description:
            "Nossa Calculadora de Elegibilidade de Visto analisa seu perfil em instantes para que você foque nos países e programas com maior afinidade.",
          cta: "Explorar a calculadora de visto",
        },
        feeCalculator: {
          badge: "Calculadora de custos com IA",
          title: "Obtenha um panorama financeiro completo em instantes",
          description:
            "A Zoe AI detalha mensalidades, moradia, custo de vida e despesas ocultas para você saber exatamente quanto precisa reservar antes de aplicar.",
          formTitle: "Custos anuais projetados",
          confidenceLabel: "Confiança da IA: {{value}}%",
          calculatingLabel: "Calculando...",
          cta: "Recalcular com IA",
          highlights: [
            "Mensalidades, acomodação, custo de vida, seguro, transporte, visto e extras no mesmo painel.",
            "Totais atualizados em tempo real conforme você ajusta países, bolsas ou câmbio.",
            "Resumo pronto para compartilhar com estudantes, pais ou patrocinadores.",
            "Veja orçamento anual e mensal sem planilhas.",
          ],
          insights: {
            title: "Notas estratégicas da IA",
            items: [
              "Estudantes internacionais destinam entre 45% e 55% do orçamento para mensalidades.",
              "Moradia + custo de vida costumam representar cerca de um terço dos gastos.",
              "Reserve ao menos 10% para seguro, transporte e taxas de visto.",
            ],
          },
          fields: {
            tuition: { label: "Mensalidades", placeholder: "ex.: 26.000" },
            accommodation: { label: "Acomodação", placeholder: "ex.: 12.000" },
            living: { label: "Custo de vida", placeholder: "ex.: 6.500" },
            insurance: { label: "Seguro", placeholder: "ex.: 1.200" },
            transportation: { label: "Transporte", placeholder: "ex.: 1.800" },
            visa: { label: "Taxas de visto", placeholder: "ex.: 600" },
            misc: { label: "Outros", placeholder: "ex.: 1.500" },
          },
          summary: {
            subtitle: "Total estimado para o primeiro ano",
            monthlyLabel: "Orçamento mensal aproximado",
            confidenceHelper: "Projeção baseada em orçamentos semelhantes com {{value}}% de confiança.",
            disclaimer:
              "Valores ilustrativos em USD. Os custos reais variam conforme universidade, bolsas e câmbio.",
          },
        },
        testimonials: {
          heading: "Histórias de sucesso",
          items: [
            {
              name: "Sarah Johnson",
              role: "Mestranda no MIT",
              country: "EUA",
              quote:
                "A UniDoxia tornou meu sonho de estudar no MIT realidade. A plataforma é intuitiva e meu agente foi extremamente dedicado.",
              rating: 5,
            },
            {
              name: "Raj Patel",
              role: "Aluno de MBA em Oxford",
              country: "Reino Unido",
              quote:
                "O acompanhamento em tempo real me deu tranquilidade. Eu sempre soube em que etapa minha candidatura estava. Recomendo muito!",
              rating: 5,
            },
            {
              name: "Maria Garcia",
              role: "Estudante de Engenharia em Stanford",
              country: "EUA",
              quote:
                "Da escolha do curso ao visto aprovado, a UniDoxia me apoiou em cada etapa. Serviço excepcional!",
              rating: 5,
            },
          ],
        },
        faq: {
          heading: "Perguntas frequentes",
          subtitle: "Respostas rápidas para as dúvidas mais comuns",
          audienceHeading: "Para {{audience}}",
          sections: [
            {
              audience: "Estudantes",
              items: [
                {
                  question: "Como o UniDoxia me ajuda a me candidatar às universidades?",
                  answer:
                    "O UniDoxia conecta você a agentes verificados que orientam cada etapa — da escolha das universidades ao envio dos documentos.",
                },
                {
                  question: "Usar a plataforma tem custo?",
                  answer:
                    "Criar uma conta e explorar universidades é gratuito. Agentes podem cobrar taxas de consultoria, exibidas claramente antes de qualquer compromisso.",
                },
                {
                  question: "Quais documentos preciso para me candidatar?",
                  answer:
                    "Normalmente são exigidos históricos acadêmicos, exames de inglês (IELTS/TOEFL), cartas de recomendação, carta de motivação e cópia do passaporte.",
                },
              ],
            },
          ],
        },
        zoeMultiRole: {
          badge: "Conheça a Zoe",
          heading: "Assistente de IA — só que mais inteligente",
          description:
            "A Zoe alterna entre estudantes, agentes e equipes universitárias para fornecer respostas contextuais no momento em que você precisar.",
          note: "Zoe é multifuncional. Poucos concorrentes oferecem isso.",
          highlightsHeading: "O que a Zoe faz por você",
          highlights: [
            "Responde a todas as perguntas sobre estudar no exterior com contexto regional de vistos e políticas.",
            "Guia você por todo o app UniDoxia para que cronogramas, painéis e automações sigam no caminho certo.",
            "Lê documentos enviados para recomendar escolas, bolsas e próximos passos instantaneamente.",
          ],
          roles: [
            {
              key: "students",
              title: "Estudantes e famílias",
              description:
                "Zoe é uma consultora de estudos no exterior que acompanha cada candidato por toda a experiência UniDoxia.",
              capabilities: [
                "Responde instantaneamente a qualquer pergunta sobre estudar no exterior em linguagem simples.",
                "Guia você por cada tarefa no app UniDoxia para que nada seja esquecido.",
                "Analisa históricos, redações e comprovantes financeiros enviados para sugerir as escolas mais adequadas.",
                "Compartilha recomendações personalizadas de aconselhamento baseadas em seus objetivos.",
              ],
            },
            {
              key: "agents",
              title: "Agentes e consultores",
              description:
                "Treinamento, coaching e respostas sob demanda estão integrados no mesmo espaço de trabalho que impulsiona sua agência.",
              capabilities: [
                "Oferece atualizações de treinamento em formato curto para novos consultores e equipe de suporte.",
                "Transforma documentos de estudantes compartilhados em listas rápidas de escolas para revisar com clientes.",
                "Elabora automaticamente scripts de prospecção, planos de acompanhamento e recomendações de aconselhamento.",
                "Sinaliza oportunidades de melhorar a conversão usando análises de agentes do Zoe Intelligence.",
              ],
            },
            {
              key: "universities",
              title: "Universidades e parceiros",
              description:
                "A Zoe vive no painel universitário para manter equipes de recrutamento, conformidade e atendimento alinhadas.",
              capabilities: [
                "Exibe alertas de saúde de parceiros e ações sugeridas diretamente no painel.",
                "Resume pipelines de candidatos por região com notas sobre diferenças de políticas.",
                "Fornece trechos de treinamento para integração de funcionários para que equipes possam se autoajudar.",
                "Escalona problemas que precisam de atenção humana para que você possa focar em relacionamentos estratégicos.",
              ],
            },
          ],
        },
        contact: {
          heading: "Fale conosco",
          subtitle: "Tem dúvidas? Teremos prazer em ajudar.",
        },
      },
      universitySearch: {
        hero: {
          title: "Encontre a universidade ideal",
          subtitle: "Pesquise universidades, cursos e bolsas no mundo todo.",
        },
        tabs: {
          search: "Busca",
          recommendations: "Recomendações de IA",
          sop: "Gerador de SOP",
          interview: "Simulação de entrevista",
        },
        filters: {
          title: "Filtros de busca",
          subtitle: "Refine sua busca abaixo",
          fields: {
            universityName: {
              label: "Nome da universidade",
              placeholder: "Pesquisar universidades...",
            },
            country: {
              label: "País",
              placeholder: "Selecionar país",
              all: "Todos os países",
            },
            programLevel: {
              label: "Nível do programa",
              placeholder: "Selecionar nível",
              all: "Todos os níveis",
            },
            discipline: {
              label: "Área",
              placeholder: "Selecionar área",
              all: "Todas as áreas",
            },
            maxFee: {
              label: "Mensalidade máxima (USD)",
              placeholder: "Informe o valor máximo",
            },
            scholarshipsOnly: {
              label: "Mostrar apenas universidades com bolsas",
            },
          },
        },
        actions: {
          search: "Buscar",
        },
        results: {
          loading: "Buscando...",
          found_one: "Encontramos {{count}} resultado",
          found_other: "Encontramos {{count}} resultados",
          empty: "Nenhuma universidade encontrada. Ajuste os filtros e tente novamente.",
          scholarshipBadge_one: "{{count}} bolsa",
          scholarshipBadge_other: "{{count}} bolsas",
          programs: {
            heading_one: "Programas ({{count}})",
            heading_other: "Programas ({{count}})",
            apply: "Inscreva-se",
            more_one: "+{{count}} programa adicional",
            more_other: "+{{count}} programas adicionais",
          },
          scholarships: {
            heading: "Bolsas",
            amountVaries: "Valor variável",
            more_one: "+{{count}} bolsa adicional",
            more_other: "+{{count}} bolsas adicionais",
          },
          viewDetails: "Ver detalhes",
          visitWebsite: "Visitar site",
        },
      },
    contact: {
      heroTitle: "Fale conosco",
      heroSubtitle: "Normalmente respondemos em até um dia útil.",
      emailPrompt: "Prefere e-mail?",
      email: "info@unidoxia.com",
      whatsappCta: "Fale conosco no WhatsApp ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "Consultor educacional profissional pronto para ajudar",
      formTitle: "Envie-nos uma mensagem",
    },
    faq: {
      heroTitle: "Perguntas frequentes",
      heroSubtitle: "Respostas rápidas para as dúvidas mais comuns sobre sua jornada educacional",
      imageAlt: "Estudante aprendendo e pesquisando",
      sections: [
        {
          audience: "Estudantes",
          items: [
            {
              question: "Como o UniDoxia me ajuda a me candidatar às universidades?",
              answer:
                "O UniDoxia conecta você a agentes verificados que orientam cada etapa – da escolha das universidades ao envio dos documentos.",
            },
            {
              question: "Usar a plataforma tem custo?",
              answer:
                "Criar uma conta e explorar universidades é gratuito. Agentes podem cobrar taxas de consultoria, exibidas claramente antes de qualquer compromisso.",
            },
            {
              question: "Quais documentos preciso para me candidatar?",
              answer:
                "Normalmente são exigidos históricos acadêmicos, testes de inglês (IELTS/TOEFL), cartas de recomendação, carta de motivação e cópia do passaporte.",
            },
            {
              question: "Posso me candidatar a várias universidades?",
              answer:
                "Sim! Você pode se candidatar a várias universidades ao mesmo tempo e acompanhar todas as candidaturas em um único painel.",
            },
            {
              question: "Como me mantenho informado sobre o status da minha candidatura?",
              answer:
                "Seu painel personalizado mostra atualizações em tempo real, prazos e próximos passos para que você sempre saiba o que fazer.",
            },
          ],
        },
        {
          audience: "Universidades",
          items: [
            {
              question: "Como nossa universidade pode se tornar parceira do UniDoxia?",
              answer:
                "Envie um pedido de parceria pelo Portal Universitário ou entre em contato com nossa equipe. Verificamos sua instituição e concluímos a integração em poucos dias úteis.",
            },
            {
              question: "Quais insights as universidades recebem?",
              answer:
                "As universidades acessam painéis com funis de candidatos, métricas de conversão e interesse regional para planejar campanhas de recrutamento com segurança.",
            },
            {
              question: "Podemos gerenciar ofertas diretamente na plataforma?",
              answer:
                "Sim. As equipes de admissão podem emitir ofertas condicionais ou finais, solicitar documentos faltantes e se comunicar com estudantes e agentes em um único espaço.",
            },
          ],
        },
        {
          audience: "Agentes",
          items: [
            {
              question: "Que suporte os agentes recebem no UniDoxia?",
              answer:
                "Os agentes recebem um CRM dedicado, materiais de marketing e treinamentos sob demanda para aproximar estudantes dos programas ideais rapidamente.",
            },
            {
              question: "Como as comissões dos agentes são tratadas?",
              answer:
                "As estruturas de comissão são transparentes. As universidades definem os termos e os pagamentos são acompanhados no painel do agente para fácil conciliação.",
            },
            {
              question: "Os agentes podem colaborar com as equipes de admissão das universidades?",
              answer:
                "Com certeza. Espaços de trabalho compartilhados e conversas mantêm todas as partes alinhadas sobre o progresso dos estudantes, documentos pendentes e agendamento de entrevistas.",
            },
          ],
        },
      ],
    },
  },
};

export default pt;
