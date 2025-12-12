const zh = {
  common: {
    languageNames: {
      en: "英语",
      de: "德语",
      fr: "法语",
      pt: "葡萄牙语",
      sw: "斯瓦希里语",
      es: "西班牙语",
      zh: "中文",
      hi: "印地语",
      ar: "阿拉伯语",
    },
    labels: {
      language: "语言",
      selectLanguage: "选择语言",
      toggleNavigation: "切换导航",
      openUserMenu: "打开用户菜单",
      currentPage: "当前页面",
      showRecentPages: "显示最近访问",
    },
    actions: {
      login: "登录",
      signup: "注册",
      logout: "退出登录",
      goToLogin: "前往登录",
      goBack: "返回",
      reloadPage: "重新加载页面",
      retry: "重试",
      save: "保存",
      clear: "清除",
      cancel: "取消",
      submit: "提交",
      markAllRead: "全部标记为已读",
    },
    navigation: {
      home: "首页",
      search: "搜索",
      courses: "课程",
      blog: "博客",
      contact: "联系",
      dashboard: "控制台",
      settings: "设置",
      helpCenter: "帮助中心",
      faq: "常见问题",
      feedback: "反馈",
      visaCalculator: "签证计算器",
      privacy: "隐私政策",
      terms: "服务条款",
    },
    status: {
      loading: "加载中...",
      loadingInterface: "界面加载中...",
    },
    notifications: {
      success: "成功",
      error: "错误",
      saved: "已保存",
      deleted: "已删除",
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
        home: "首页",
        search: "搜索",
        scholarships: "奖学金",
        courses: "课程",
        blog: "博客",
        contact: "联系",
      },
      auth: {
        login: "登录",
        signup: "注册",
        logout: "退出登录",
      },
      userMenu: {
        open: "打开用户菜单",
        dashboard: "控制台",
        settings: "设置",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "我们通过认证代理和透明的申请管理，将国际学生与世界一流大学连接起来。",
      contactEmailLabel: "联系我们",
      headings: {
        platform: "平台",
        support: "支持",
        accountLegal: "账户与法律",
      },
      platformLinks: {
        search: "搜索大学",
        blog: "博客",
        visaCalculator: "签证计算器",
        feedback: "反馈",
      },
      supportLinks: {
        help: "帮助中心",
        contact: "联系我们",
        faq: "常见问题",
        dashboard: "控制台",
      },
      accountLinks: {
        login: "登录",
        signup: "立即开始",
        privacy: "隐私政策",
        terms: "服务条款",
      },
      copyright: "© {{year}} UniDoxia. 版权所有.",
      questions: "有问题吗？",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "加载中...",
      retry: "重试",
    },
    emptyState: {
      noRecentPages: "暂无最近访问",
      goToFallback: "前往备用页面",
      clearHistory: "清除历史",
      currentPage: "当前页面",
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "无法加载页面",
      failedToLoadPageDescription:
        "页面无法加载。这可能是网络问题或页面暂时不可用。",
      chunkReloadMessage:
        "我们已刷新应用以获取最新文件。如果仍然出现，请清除浏览器缓存后重试。",
    },
    loading: "正在加载应用...",
    errorBoundary: {
      networkTitle: "连接错误",
      networkMessage: "网络连接失败。请检查您的网络后重试。",
      chunkTitle: "加载错误",
      chunkMessage: "无法加载应用资源，通常在应用更新后发生。",
      permissionTitle: "访问被拒绝",
      permissionMessage: "您无权访问此资源。",
      notFoundTitle: "未找到",
      notFoundMessage: "未找到请求的资源。",
      unauthorizedTitle: "会话已过期",
      unauthorizedMessage: "您的会话已过期，请重新登录。",
      databaseTitle: "数据库错误",
      databaseMessage: "数据库连接失败，请稍后再试。",
      genericTitle: "出现问题",
      genericMessage: "发生了意外错误，请重试。",
      fallbackTitle: "错误",
      fallbackMessage: "发生了意外错误",
      technicalDetails: "技术细节",
      tryAgain: "重试",
      tryAgainCount: "重试（剩余 {count} 次）",
      goHome: "返回首页",
      maxRetriesReached: "已达到最大重试次数。请刷新页面或联系支持。",
    },
  },
    pages: {
      index: {
        hero: {
          trustBadge: "深受全球 {{count}}+ 名学生信赖",
          title: {
            prefix: "您的通往",
            highlight: "全球教育",
            suffix: "的门户",
          },
          description:
            "连接世界顶尖大学，实时跟踪申请进度，并获得认证顾问的专业指导。",
          ctas: {
            students: {
              badge: "学生",
              title: "开启您的全球申请",
              description:
                "创建个人档案，文件一次上传，多校快速申请，几分钟即可提交完善材料。",
              action: "开始申请",
            },
            agents: {
              badge: "代理",
              title: "智能工具助力服务学生",
              description:
                "访问数据面板、实时协作，掌握每个节点进度，同时提升机构影响力。",
              action: "作为代理加入",
            },
            universities: {
              badge: "大学",
              title: "拓展高转化合作伙伴",
              description:
                "连接高质量申请者，获取市场洞察，并与认证顾问全球协作。",
              action: "成为合作伙伴",
            },
          },
        },
        features: {
          heading: "为何选择 UniDoxia？",
          cards: {
            applyEasily: {
              title: "轻松申请",
              description:
                "流程清晰、逐步引导，一次即可向多所大学提交申请。",
            },
            trackRealtime: {
              title: "实时跟踪",
              description: "24/7 实时掌握申请状态，立即收到关键提醒。",
            },
            connectAgents: {
              title: "对接认证顾问",
              description: "连接经过认证的教育顾问，全程提供个性化支持。",
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
          badge: "AI 驱动的大学与奖学金搜索",
          heading: "利用实时智能找到最合适的项目",
          description:
            "针对全球高校、课程或资助提出任何问题。我们的 AI 会分析招生信息、奖学金和签证路径，并结合您的目标给出建议。",
          subheading:
            "注册账户，即可解锁基于 AI 的个性化招生、奖学金和签证推荐。",
          ctaLabel: "立即开始",
          stats: [
            { value: "12k+", label: "为全球申请者生成的 AI 洞察" },
            { value: "84%", label: "匹配到至少三所理想院校的学生" },
            { value: "50+", label: "覆盖拥有认证招生数据的国家" },
          ],
          panel: {
            title: "Zoe Intelligence 预览",
            subtitle: "选择关注方向，了解即将获得的洞察。",
            previewLabel: "示例",
            highlightsHeading: "AI 为您准备的内容",
          },
          focusAreas: [
            {
              key: "stem",
              label: "STEM",
              headline: "为科技创新者定制的成长路径",
              description:
                "聚焦拥有研究实验室、带薪实习与专项资金支持的理工科项目。",
              highlights: [
                "优先支持 STEM 专业与科研成果的奖学金",
                "紧贴行业需求的课程设计与 Co-op 实习安排",
                "针对热门科技与工程岗位的签证指导",
              ],
            },
            {
              key: "scholarships",
              label: "奖学金",
              headline: "匹配您背景的资助机会",
              description:
                "识别真正有机会获得的助学金、奖学金与助教岗位。",
              highlights: [
                "精心整理的择优与助学奖学金清单及截止日期",
                "与您学术背景相匹配的资格说明",
                "强化申请文书与推荐信的实用建议",
              ],
            },
            {
              key: "visa",
              label: "签证友好",
              headline: "签证流程顺畅的留学路线",
              description: "比较签证政策友好的国家与院校。",
              highlights: [
                "概览毕业后工作机会与停留时长",
                "根据国籍定制的材料清单",
                "财力证明、保险与面试准备要点",
              ],
            },
            {
              key: "undergraduate",
              label: "本科",
              headline: "为首次申请者打造的本科旅程",
              description:
                "了解入学要求、先修条件与支持服务。",
              highlights: [
                "从成绩评估到录取的详细时间表",
                "专业选择、辅修与预科年的规划建议",
                "住宿、迎新与预算管理的过渡资源",
              ],
            },
            {
              key: "postgraduate",
              label: "研究生",
              headline: "契合目标的硕博项目推荐",
              description: "比较导师方向、班级规模与资助模式。",
              highlights: [
                "聚焦导师与当前研究主题的亮点",
                "助研、助教与奖学金的资助信息",
                "各项目面试及作品集准备要点",
              ],
            },
            {
              key: "coop",
              label: "实习 / Co-op",
              headline: "与全球雇主共建的实践型学习",
              description:
                "找到融合课程学习与真实工作体验的项目。",
              highlights: [
                "各地区的就业率与企业合作数据",
                "带薪实习及工作期的签证注意事项",
                "职业发展中心提供的简历、面试与人脉支持",
              ],
            },
          ],
        },
        visa: {
          badge: "特色亮点",
          title: "在申请前先评估您的签证通过率",
          description:
            "签证资格评估工具即时分析您的个人情况，帮您聚焦最适合的国家与项目。",
          cta: "了解签证计算器",
        },
        feeCalculator: {
          badge: "AI 费用计算器",
          title: "即刻掌握完整留学预算",
          description:
            "Zoe AI 将学费、住宿、生活与隐藏费用全部拆解，让你在申请前就清楚需要准备多少预算。",
          formTitle: "年度费用预测",
          confidenceLabel: "AI 可信度：{{value}}%",
          calculatingLabel: "正在计算...",
          cta: "使用 AI 重新估算",
          highlights: [
            "学费、住宿、生活、保险、交通、签证与其他开支集中展示。",
            "调整国家、奖学金或汇率时，总额会即时更新。",
            "可与学生、家长或资助人共享的清晰拆分。",
            "同时查看年度与月度预算，无需表格。",
          ],
          insights: {
            title: "AI 规划提示",
            items: [
              "大多数国际学生会将 45%-55% 的预算用于学费。",
              "住宿与日常生活通常占到总支出的三分之一左右。",
              "至少预留 10% 作为保险、交通与签证办理的缓冲。",
            ],
          },
          fields: {
            tuition: { label: "学费", placeholder: "如：26,000" },
            accommodation: { label: "住宿", placeholder: "如：12,000" },
            living: { label: "生活费", placeholder: "如：6,500" },
            insurance: { label: "保险", placeholder: "如：1,200" },
            transportation: { label: "交通", placeholder: "如：1,800" },
            visa: { label: "签证费用", placeholder: "如：600" },
            misc: { label: "其他", placeholder: "如：1,500" },
          },
          summary: {
            subtitle: "首年预计总费用",
            monthlyLabel: "每月预算（约）",
            confidenceHelper: "基于相似学生预算的 AI 预测，可信度 {{value}}%。",
            disclaimer:
              "以上为美元示例，实际费用会因学校选择、奖学金与汇率变动而不同。",
          },
        },
        testimonials: {
          heading: "成功故事",
          items: [
            {
              name: "Sarah Johnson",
              role: "麻省理工学院硕士生",
              country: "美国",
              quote:
                "UniDoxia 让我在 MIT 学习的梦想成真。平台操作直观，我的顾问也非常专业贴心。",
              rating: 5,
            },
            {
              name: "Raj Patel",
              role: "牛津大学 MBA 学生",
              country: "英国",
              quote:
                "实时跟踪功能让我倍感安心。我随时了解申请进度，强烈推荐 UniDoxia！",
              rating: 5,
            },
            {
              name: "Maria Garcia",
              role: "斯坦福大学工程系学生",
              country: "美国",
              quote:
                "从选校到签证，UniDoxia 在每一步都给予我支持。服务非常出色！",
              rating: 5,
            },
          ],
        },
        faq: {
          heading: "常见问题",
          subtitle: "快速解答学习旅程中的常见疑问",
          audienceHeading: "适用于 {{audience}}",
          sections: [
            {
              audience: "学生",
              items: [
                {
                  question: "UniDoxia 如何帮助我申请大学？",
                  answer:
                    "UniDoxia 将您与认证代理连接，他们会在选校、材料准备到提交的每一步提供指导。",
                },
                {
                  question: "使用平台需要费用吗？",
                  answer:
                    "创建账号和浏览大学完全免费。若代理需要收取咨询费，会在确认前清楚告知。",
                },
                {
                  question: "申请需要准备哪些材料？",
                  answer:
                    "通常需要成绩单、英语考试成绩（IELTS/TOEFL）、推荐信、个人陈述以及护照复印件。",
                },
              ],
            },
          ],
        },
        contact: {
          heading: "联系我们",
          subtitle: "有问题吗？我们乐于提供帮助。",
        },
      },
      universitySearch: {
        hero: {
          title: "寻找理想大学",
          subtitle: "探索全球院校、课程与奖学金。",
        },
        tabs: {
          search: "搜索",
          recommendations: "AI 推荐",
          sop: "SOP 生成器",
          interview: "面试练习",
        },
        filters: {
          title: "搜索筛选",
          subtitle: "在下方优化您的搜索",
          fields: {
            universityName: {
              label: "大学名称",
              placeholder: "搜索大学...",
            },
            country: {
              label: "国家",
              placeholder: "选择国家",
              all: "所有国家",
            },
            programLevel: {
              label: "项目层级",
              placeholder: "选择层级",
              all: "所有层级",
            },
            discipline: {
              label: "学科",
              placeholder: "选择学科",
              all: "所有学科",
            },
            maxFee: {
              label: "最高学费（美元）",
              placeholder: "输入最高学费",
            },
            scholarshipsOnly: {
              label: "仅显示提供奖学金的大学",
            },
          },
        },
        actions: {
          search: "搜索",
        },
        results: {
          loading: "正在搜索...",
          found_one: "找到 {{count}} 条结果",
          found_other: "找到 {{count}} 条结果",
          empty: "未找到符合条件的大学，请调整筛选后再试。",
          scholarshipBadge_one: "{{count}} 项奖学金",
          scholarshipBadge_other: "{{count}} 项奖学金",
          programs: {
            heading_one: "项目（{{count}}）",
            heading_other: "项目（{{count}}）",
            apply: "立即申请",
            more_one: "+{{count}} 个更多项目",
            more_other: "+{{count}} 个更多项目",
          },
          scholarships: {
            heading: "奖学金",
            amountVaries: "金额视情况而定",
            more_one: "+{{count}} 项更多奖学金",
            more_other: "+{{count}} 项更多奖学金",
          },
          viewDetails: "查看详情",
          visitWebsite: "访问官网",
        },
      },
    contact: {
      heroTitle: "联系我们",
      heroSubtitle: "我们通常会在一个工作日内回复。",
      emailPrompt: "更喜欢电子邮件？",
      email: "info@unidoxia.com",
      whatsappCta: "通过 WhatsApp 联系我们（{{number}}）",
      whatsappNumber: "+447360961803",
      imageAlt: "专业教育顾问随时准备提供帮助",
      formTitle: "给我们留言",
    },
    faq: {
      heroTitle: "常见问题",
      heroSubtitle: "快速解答关于您教育旅程的常见问题",
      imageAlt: "正在学习和研究的学生",
      sections: [
        {
          audience: "学生",
          items: [
            {
              question: "UniDoxia 如何帮助我申请大学？",
              answer:
                "UniDoxia 将您与认证代理联系起来，他们会在每个阶段提供指导——从选择大学到提交材料。",
            },
            {
              question: "使用平台需要费用吗？",
              answer:
                "创建账户并浏览大学是免费的。代理可能会收取咨询费用，所有费用都会在承诺前清晰显示。",
            },
            {
              question: "申请需要哪些材料？",
              answer:
                "通常需要提供成绩单、英语考试成绩（IELTS/TOEFL）、推荐信、个人陈述以及护照复印件。",
            },
            {
              question: "可以同时申请多所大学吗？",
              answer:
                "可以！您可以同时申请多所大学，并在同一个控制台中跟踪所有申请。",
            },
            {
              question: "如何了解申请状态？",
              answer:
                "您的个人控制台会实时显示更新、截止日期和下一步，帮助您随时掌握进度。",
            },
          ],
        },
        {
          audience: "大学",
          items: [
            {
              question: "我们的大学如何与 UniDoxia 合作？",
              answer:
                "通过大学门户提交合作申请或联系我们的团队。我们会验证您的院校，并在几个工作日内完成入驻。",
            },
            {
              question: "大学可以获得哪些洞察？",
              answer:
                "大学可以访问展示申请人管道、转化指标和地区兴趣的仪表板，从而自信规划招生活动。",
            },
            {
              question: "我们可以直接在平台上管理录取吗？",
              answer:
                "可以。招生团队可以发出有条件或无条件录取、请求补充材料，并在同一工作区与学生和代理沟通。",
            },
          ],
        },
        {
          audience: "代理",
          items: [
            {
              question: "代理可以获得哪些支持？",
              answer:
                "代理将获得专属 CRM、营销素材和按需培训，帮助学生快速匹配合适的项目。",
            },
            {
              question: "代理佣金如何处理？",
              answer:
                "佣金结构完全透明。大学定义合作条款，付款会在代理控制台中记录，方便对账。",
            },
            {
              question: "代理能否与大学招生团队协作？",
              answer:
                "当然。共享工作区和消息线程确保各方及时了解学生进度、缺失材料以及面试安排。",
            },
          ],
        },
      ],
    },
  },
};

export default zh;
