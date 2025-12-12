const ar = {
  common: {
    languageNames: {
      en: "الإنجليزية",
      de: "الألمانية",
      fr: "الفرنسية",
      pt: "البرتغالية",
      sw: "السواحيلية",
      es: "الإسبانية",
      zh: "الصينية",
      hi: "الهندية",
      ar: "العربية",
    },
    labels: {
      language: "اللغة",
      selectLanguage: "اختر اللغة",
      toggleNavigation: "تبديل التنقل",
      openUserMenu: "فتح قائمة المستخدم",
      currentPage: "الصفحة الحالية",
      showRecentPages: "عرض الصفحات الحديثة",
    },
    actions: {
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      logout: "تسجيل الخروج",
      goToLogin: "الذهاب لصفحة الدخول",
      goBack: "رجوع",
      reloadPage: "إعادة تحميل الصفحة",
      retry: "إعادة المحاولة",
      save: "حفظ",
      clear: "مسح",
      cancel: "إلغاء",
      submit: "إرسال",
      markAllRead: "تعيين الكل كمقروء",
    },
    navigation: {
      home: "الرئيسية",
      search: "بحث",
      courses: "الدورات",
      blog: "المدونة",
      contact: "اتصل بنا",
      dashboard: "لوحة التحكم",
      settings: "الإعدادات",
      helpCenter: "مركز المساعدة",
      faq: "الأسئلة الشائعة",
      feedback: "ملاحظات",
      visaCalculator: "حاسبة التأشيرة",
      privacy: "سياسة الخصوصية",
      terms: "شروط الخدمة",
    },
    status: {
      loading: "جاري التحميل...",
      loadingInterface: "جاري تحميل الواجهة...",
    },
    notifications: {
      success: "نجاح",
      error: "خطأ",
      saved: "تم الحفظ",
      deleted: "تم الحذف",
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
        home: "الرئيسية",
        search: "بحث",
        scholarships: "المنح الدراسية",
        courses: "الدورات",
        blog: "المدونة",
        contact: "اتصل بنا",
      },
      auth: {
        login: "تسجيل الدخول",
        signup: "إنشاء حساب",
        logout: "تسجيل الخروج",
      },
      userMenu: {
        open: "فتح قائمة المستخدم",
        dashboard: "لوحة التحكم",
        settings: "الإعدادات",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "نربط الطلاب الدوليين بجامعات عالمية المستوى من خلال وكلاء موثوقين وإدارة شفافة للطلبات.",
      contactEmailLabel: "راسلنا عبر البريد",
      headings: {
        platform: "المنصة",
        support: "الدعم",
        accountLegal: "الحساب والشؤون القانونية",
      },
      platformLinks: {
        search: "ابحث عن الجامعات",
        blog: "المدونة",
        visaCalculator: "حاسبة التأشيرة",
        feedback: "ملاحظات",
      },
      supportLinks: {
        help: "مركز المساعدة",
        contact: "اتصل بنا",
        faq: "الأسئلة الشائعة",
        dashboard: "لوحة التحكم",
      },
      accountLinks: {
        login: "تسجيل الدخول",
        signup: "ابدأ الآن",
        privacy: "سياسة الخصوصية",
        terms: "شروط الخدمة",
      },
      copyright: "© {{year}} UniDoxia. جميع الحقوق محفوظة.",
      questions: "هل لديك أسئلة؟",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "جاري التحميل...",
      retry: "إعادة المحاولة",
    },
    emptyState: {
      noRecentPages: "لا توجد صفحات حديثة",
      goToFallback: "اذهب إلى الصفحة البديلة",
      clearHistory: "مسح السجل",
      currentPage: "الصفحة الحالية",
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "تعذر تحميل الصفحة",
      failedToLoadPageDescription:
        "تعذر تحميل الصفحة. قد يكون ذلك بسبب مشكلة في الشبكة أو أن الصفحة غير متاحة مؤقتًا.",
      chunkReloadMessage:
        "قمنا بتحديث التطبيق للحصول على أحدث الملفات. إذا استمرت المشكلة، يرجى مسح ذاكرة التخزين المؤقت للمتصفح والمحاولة مرة أخرى.",
    },
    loading: "جاري تحميل التطبيق...",
    errorBoundary: {
      networkTitle: "خطأ في الاتصال",
      networkMessage: "فشل اتصال الشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
      chunkTitle: "خطأ في التحميل",
      chunkMessage: "تعذر تحميل موارد التطبيق. يحدث ذلك عادة بعد تحديث التطبيق.",
      permissionTitle: "تم رفض الوصول",
      permissionMessage: "ليس لديك صلاحية للوصول إلى هذا المورد.",
      notFoundTitle: "غير موجود",
      notFoundMessage: "المورد المطلوب غير موجود.",
      unauthorizedTitle: "انتهت الجلسة",
      unauthorizedMessage: "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
      databaseTitle: "خطأ في قاعدة البيانات",
      databaseMessage: "فشل اتصال قاعدة البيانات. يرجى المحاولة مجددًا بعد لحظات.",
      genericTitle: "حدث خطأ",
      genericMessage: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
      fallbackTitle: "خطأ",
      fallbackMessage: "حدث خطأ غير متوقع",
      technicalDetails: "تفاصيل تقنية",
      tryAgain: "إعادة المحاولة",
      tryAgainCount: "إعادة المحاولة (متبقي {count})",
      goHome: "العودة للرئيسية",
      maxRetriesReached: "تم الوصول إلى الحد الأقصى لعدد المحاولات. يرجى تحديث الصفحة أو التواصل مع الدعم.",
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
        badge: "بحث الجامعات والمنح المدعوم بالذكاء الاصطناعي",
        heading: "اعثر على البرنامج المناسب بذكاء فوري",
        description:
          "اطرح أي سؤال حول الجامعات أو التخصصات أو التمويل في أي مكان حول العالم. يقوم محرك الذكاء الاصطناعي لدينا بتحليل بيانات القبول والمنح ومسارات التأشيرة بما يتماشى مع أهدافك.",
        subheading:
          "أنشئ حسابًا للحصول على توصيات مخصصة بالذكاء الاصطناعي حول القبول والمنح الدراسية والتأشيرات.",
        ctaLabel: "ابدأ الآن",
        stats: [
          { value: "12k+", label: "رؤى ذكاء اصطناعي صُممت لمتقدمين من حول العالم" },
          { value: "84%", label: "طلاب حصلوا على ثلاثة خيارات مناسبة على الأقل" },
          { value: "50+", label: "دول ببيانات قبول موثوقة" },
        ],
        panel: {
          title: "معاينة Zoe Intelligence",
          subtitle: "اختر مجال التركيز لاستكشاف الرؤى التي ستحصل عليها.",
          previewLabel: "عرض تجريبي",
          highlightsHeading: "ما الذي يجهزه لك الذكاء الاصطناعي",
        },
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "مسارات مخصصة للمبتكرين التقنيين",
            description:
              "برامج تبرز المختبرات البحثية والتدريب العملي والتمويل الموجه لعلوم الهندسة والتقنية.",
            highlights: [
              "منح تفضل تخصصات STEM ومخرجات البحث العلمي",
              "مناهج متوافقة مع متطلبات السوق مع تدريب تعاوني وفرص تدريبية",
              "إرشادات تأشيرة للوظائف التقنية والهندسية عالية الطلب",
            ],
          },
          {
            key: "scholarships",
            label: "المنح الدراسية",
            headline: "فرص تمويل متوافقة مع ملفك الشخصي",
            description:
              "حدد المنح والمساعدات والأعمال الممولة التي لديك فرصة حقيقية للحصول عليها.",
            highlights: [
              "قائمة منتقاة من المنح القائمة على الجدارة أو الحاجة مع المواعيد النهائية",
              "رؤى حول شروط الأهلية مرتبطة بخلفيتك الأكاديمية",
              "نصائح لتعزيز خطابات الدافع وخطابات التوصية",
            ],
          },
          {
            key: "visa",
            label: "صديقة للتأشيرات",
            headline: "مسارات دراسية بإجراءات هجرة سلسة",
            description: "قارن بين الدول والمؤسسات ذات السياسات الميسرة للتأشيرة.",
            highlights: [
              "ملخص لخيارات العمل بعد التخرج وفترات البقاء",
              "قوائم التحقق من المستندات بحسب جنسيتك",
              "إرشادات لإثبات الملاءة المالية والتأمين والاستعداد للمقابلات",
            ],
          },
          {
            key: "undergraduate",
            label: "مرحلة البكالوريوس",
            headline: "رحلة بكالوريوس مصممة للمتقدمين لأول مرة",
            description:
              "تعرّف على متطلبات القبول والمتطلبات المسبقة وخدمات الدعم المتاحة.",
            highlights: [
              "خط زمني خطوة بخطوة من تقييم السجلات حتى القبول",
              "إرشاد لاختيار التخصصات الرئيسية والفرعية والسنوات التأسيسية",
              "موارد للانتقال تشمل السكن والتوجيه وإدارة الميزانية",
            ],
          },
          {
            key: "postgraduate",
            label: "الدراسات العليا",
            headline: "برامج ماجستير ودكتوراه تتماشى مع أهدافك",
            description: "قارن المشرفين البحثيين وأحجام الدفعات ونماذج التمويل.",
            highlights: [
              "تعريف بأعضاء هيئة التدريس وموضوعات البحث الحالية",
              "توفر وظائف المساعدة والمنح مع تفاصيل المخصصات",
              "الاستعداد للمقابلات ومتطلبات ملفات الأعمال لكل برنامج",
            ],
          },
          {
            key: "coop",
            label: "برامج تعاونية وتدريب",
            headline: "تعلم عملي مدمج مع أصحاب عمل عالميين",
            description:
              "استكشف برامج تجمع بين الدراسة والتجربة المهنية الواقعية.",
            highlights: [
              "نسب التوظيف والشراكات مع الشركات في مختلف المناطق",
              "اعتبارات التأشيرة للتدريب المدفوع وفترات العمل",
              "دعم خدمات التوظيف لإعداد السيرة الذاتية والمقابلات وبناء العلاقات",
            ],
          },
        ],
      },
    },
    contact: {
      heroTitle: "تواصل معنا",
      heroSubtitle: "نحن نرد عادة خلال يوم عمل واحد.",
      emailPrompt: "تفضل البريد الإلكتروني؟",
      email: "info@unidoxia.com",
      whatsappCta: "راسلنا عبر واتساب ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "مستشار تعليمي محترف جاهز للمساعدة",
      formTitle: "أرسل لنا رسالة",
    },
    faq: {
      heroTitle: "الأسئلة الشائعة",
      heroSubtitle: "إجابات سريعة على أكثر الأسئلة شيوعًا حول رحلتك التعليمية",
      imageAlt: "طالب يدرس ويبحث",
      sections: [
        {
          audience: "الطلاب",
          items: [
            {
              question: "كيف يساعدني UniDoxia في التقديم للجامعات؟",
              answer:
                "يربطك UniDoxia بوكلاء موثوقين يوجهونك في كل مرحلة، من اختيار الجامعات إلى تقديم المستندات.",
            },
            {
              question: "هل هناك رسوم لاستخدام المنصة؟",
              answer:
                "إنشاء حساب واستكشاف الجامعات مجاني. قد يفرض الوكلاء رسوم استشارة يتم عرضها بوضوح قبل الالتزام.",
            },
            {
              question: "ما الوثائق المطلوبة للتقديم؟",
              answer:
                "عادة ما تحتاج إلى كشوف الدرجات، ونتائج اختبارات اللغة الإنجليزية (IELTS/TOEFL)، وخطابات توصية، وبيان شخصي، ونسخة من جواز السفر.",
            },
            {
              question: "هل يمكنني التقديم لعدة جامعات في وقت واحد؟",
              answer:
                "نعم! يمكنك التقديم لعدة جامعات وتتبع جميع الطلبات من خلال لوحة تحكم واحدة.",
            },
            {
              question: "كيف أتابع حالة طلبي؟",
              answer:
                "تعرض لك لوحة التحكم الشخصية التحديثات الفورية والمواعيد النهائية والخطوات التالية لتبقى على اطلاع دائم.",
            },
          ],
        },
        {
          audience: "الجامعات",
          items: [
            {
              question: "كيف يمكن لجامعتنا الشراكة مع UniDoxia؟",
              answer:
                "قدّم طلب شراكة عبر بوابة الجامعة أو تواصل مع فريقنا. سنقوم بالتحقق من مؤسستك وإكمال عملية الانضمام خلال أيام عمل قليلة.",
            },
            {
              question: "ما الرؤى التي تحصل عليها الجامعات؟",
              answer:
                "تحصل الجامعات على لوحات معلومات تعرض قنوات المتقدمين ومقاييس التحويل والاهتمام الإقليمي لتمكينها من التخطيط لحملات التوظيف بثقة.",
            },
            {
              question: "هل يمكننا إدارة العروض مباشرة عبر المنصة؟",
              answer:
                "نعم، يمكن لفرق القبول إصدار عروض مشروطة أو نهائية، وطلب المستندات المفقودة، والتواصل مع الطلاب والوكلاء من مساحة عمل واحدة.",
            },
          ],
        },
        {
          audience: "الوكلاء",
          items: [
            {
              question: "ما الدعم الذي يحصل عليه الوكلاء في UniDoxia؟",
              answer:
                "يحصل الوكلاء على نظام CRM مخصص ومواد تسويقية وتدريب حسب الطلب لمساعدة الطلاب في إيجاد البرامج المناسبة بسرعة.",
            },
            {
              question: "كيف تتم إدارة عمولات الوكلاء؟",
              answer:
                "هياكل العمولات شفافة. تحدد الجامعات الشروط ويتم تتبع المدفوعات في لوحة تحكم الوكيل لسهولة المراجعة.",
            },
            {
              question: "هل يمكن للوكلاء التعاون مع فرق القبول في الجامعات؟",
              answer:
                "بالتأكيد. تحافظ مساحات العمل المشتركة وسلاسل الرسائل على اطلاع الجميع بتقدم الطلاب والمستندات الناقصة وجدولة المقابلات.",
            },
          ],
        },
      ],
    },
  },
};

export default ar;
