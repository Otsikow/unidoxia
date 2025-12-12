const hi = {
  common: {
    languageNames: {
      en: "अंग्रेज़ी",
      de: "जर्मन",
      fr: "फ़्रेंच",
      pt: "पुर्तगाली",
      sw: "स्वाहिली",
      es: "स्पेनिश",
      zh: "चीनी",
      hi: "हिंदी",
      ar: "अरबी",
    },
    labels: {
      language: "भाषा",
      selectLanguage: "भाषा चुनें",
      toggleNavigation: "नेविगेशन टॉगल करें",
      openUserMenu: "उपयोगकर्ता मेनू खोलें",
      currentPage: "वर्तमान पृष्ठ",
      showRecentPages: "हाल की पृष्ठों को दिखाएं",
    },
    actions: {
      login: "लॉग इन",
      signup: "साइन अप",
      logout: "लॉग आउट",
      goToLogin: "लॉगिन पर जाएं",
      goBack: "वापस जाएं",
      reloadPage: "पृष्ठ पुनः लोड करें",
      retry: "फिर से प्रयास करें",
      save: "सहेजें",
      clear: "साफ़ करें",
      cancel: "रद्द करें",
      submit: "सबमिट करें",
      markAllRead: "सभी को पढ़ा चिह्नित करें",
    },
    navigation: {
      home: "मुखपृष्ठ",
      search: "खोज",
      courses: "पाठ्यक्रम",
      blog: "ब्लॉग",
      contact: "संपर्क",
      dashboard: "डैशबोर्ड",
      settings: "सेटिंग्स",
      helpCenter: "सहायता केंद्र",
      faq: "प्रश्नोत्तर",
      feedback: "प्रतिक्रिया",
      visaCalculator: "वीज़ा कैलकुलेटर",
      privacy: "गोपनीयता नीति",
      terms: "सेवा की शर्तें",
    },
    status: {
      loading: "लोड हो रहा है...",
      loadingInterface: "इंटरफ़ेस लोड हो रहा है...",
    },
    notifications: {
      success: "सफलता",
      error: "त्रुटि",
      saved: "सहेजा गया",
      deleted: "हटाया गया",
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
        home: "मुखपृष्ठ",
        search: "खोज",
        scholarships: "छात्रवृत्तियाँ",
        courses: "पाठ्यक्रम",
        blog: "ब्लॉग",
        contact: "संपर्क",
      },
      auth: {
        login: "लॉग इन",
        signup: "साइन अप",
        logout: "लॉग आउट",
      },
      userMenu: {
        open: "उपयोगकर्ता मेनू खोलें",
        dashboard: "डैशबोर्ड",
        settings: "सेटिंग्स",
      },
    },
    footer: {
      aboutTitle: "UniDoxia",
      aboutDescription:
        "हम प्रमाणित एजेंटों और पारदर्शी आवेदन प्रबंधन के माध्यम से अंतरराष्ट्रीय छात्रों को विश्वस्तरीय विश्वविद्यालयों से जोड़ते हैं।",
      contactEmailLabel: "हमें ईमेल करें",
      headings: {
        platform: "प्लेटफ़ॉर्म",
        support: "समर्थन",
        accountLegal: "खाता और कानूनी",
      },
      platformLinks: {
        search: "विश्वविद्यालय खोजें",
        blog: "ब्लॉग",
        visaCalculator: "वीज़ा कैलकुलेटर",
        feedback: "प्रतिक्रिया",
      },
      supportLinks: {
        help: "सहायता केंद्र",
        contact: "हमसे संपर्क करें",
        faq: "प्रश्नोत्तर",
        dashboard: "डैशबोर्ड",
      },
      accountLinks: {
        login: "लॉग इन",
        signup: "शुरू करें",
        privacy: "गोपनीयता नीति",
        terms: "सेवा की शर्तें",
      },
      copyright: "© {{year}} UniDoxia. सर्वाधिकार सुरक्षित।",
      questions: "प्रश्न हैं?",
    },
  },
  components: {
    loadingState: {
      defaultMessage: "लोड हो रहा है...",
      retry: "फिर से प्रयास करें",
    },
    emptyState: {
      noRecentPages: "हाल ही में कोई पृष्ठ नहीं",
      goToFallback: "वैकल्पिक पृष्ठ पर जाएं",
      clearHistory: "इतिहास साफ़ करें",
      currentPage: "वर्तमान पृष्ठ",
    },
  },
  app: {
    errors: {
      failedToLoadPageTitle: "पृष्ठ लोड नहीं हो सका",
      failedToLoadPageDescription:
        "पृष्ठ लोड नहीं हो पाया। यह नेटवर्क समस्या या पृष्ठ के अस्थायी रूप से अनुपलब्ध होने के कारण हो सकता है।",
      chunkReloadMessage:
        "हमने नवीनतम फ़ाइलें प्राप्त करने के लिए ऐप को रीफ़्रेश किया है। यदि यह जारी रहता है, तो कृपया ब्राउज़र कैश साफ़ करें और पुनः प्रयास करें।",
    },
    loading: "ऐप लोड हो रहा है...",
    errorBoundary: {
      networkTitle: "कनेक्शन त्रुटि",
      networkMessage: "नेटवर्क कनेक्शन विफल रहा। कृपया अपनी इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
      chunkTitle: "लोड त्रुटि",
      chunkMessage: "ऐप संसाधन लोड नहीं हो सके। यह आमतौर पर ऐप अपडेट के बाद होता है।",
      permissionTitle: "पहुंच अस्वीकृत",
      permissionMessage: "आपको इस संसाधन तक पहुंचने की अनुमति नहीं है।",
      notFoundTitle: "नहीं मिला",
      notFoundMessage: "अनुरोधित संसाधन नहीं मिला।",
      unauthorizedTitle: "सत्र समाप्त",
      unauthorizedMessage: "आपका सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।",
      databaseTitle: "डेटाबेस त्रुटि",
      databaseMessage: "डेटाबेस कनेक्शन विफल रहा। कृपया कुछ समय बाद पुनः प्रयास करें।",
      genericTitle: "कुछ गलत हो गया",
      genericMessage: "अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।",
      fallbackTitle: "त्रुटि",
      fallbackMessage: "अप्रत्याशित त्रुटि हुई",
      technicalDetails: "तकनीकी विवरण",
      tryAgain: "फिर से प्रयास करें",
      tryAgainCount: "फिर से प्रयास करें (शेष {count})",
      goHome: "मुखपृष्ठ पर जाएं",
      maxRetriesReached: "अधिकतम प्रयास सीमा पूरी हुई। कृपया पृष्ठ रीफ़्रेश करें या समर्थन से संपर्क करें।",
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
        badge: "एआई संचालित विश्वविद्यालय और छात्रवृत्ति खोज",
        heading: "रीयल-टाइम इंटेलिजेंस के साथ सही कार्यक्रम खोजें",
        description:
          "विश्व भर की विश्वविद्यालयों, पाठ्यक्रमों या वित्त पोषण के बारे में कुछ भी पूछें। हमारी एआई आपके लक्ष्यों के अनुरूप प्रवेश इनसाइट्स, छात्रवृत्तियों और वीज़ा मार्गों का विश्लेषण करती है।",
        subheading:
          "एआई आधारित व्यक्तिगत प्रवेश, छात्रवृत्ति और वीज़ा अनुशंसाएँ अनलॉक करने के लिए साइन अप करें।",
        ctaLabel: "शुरू करें",
        stats: [
          { value: "12k+", label: "वैश्विक आवेदकों के लिए उत्पन्न एआई इनसाइट्स" },
          { value: "84%", label: "कम से कम तीन उपयुक्त कार्यक्रमों से मेल खाने वाले छात्र" },
          { value: "50+", label: "सत्यापित प्रवेश डेटा वाले देश" },
        ],
        panel: {
          title: "Zoe Intelligence पूर्वावलोकन",
          subtitle: "कोई फोकस क्षेत्र चुनें और देखें कि आपको कौन से इनसाइट्स मिलेंगे।",
          previewLabel: "उदाहरण",
          highlightsHeading: "एआई आपके लिए क्या तैयार करता है",
        },
        focusAreas: [
          {
            key: "stem",
            label: "STEM",
            headline: "तकनीकी नवाचारकर्ताओं के लिए अनुकूलित मार्ग",
            description:
              "शोध प्रयोगशालाओं, इंटर्नशिप और वित्तीय समर्थन वाले विज्ञान एवं इंजीनियरिंग कार्यक्रमों पर प्रकाश डालें।",
            highlights: [
              "STEM विषयों और शोध परिणामों को प्राथमिकता देने वाली छात्रवृत्तियाँ",
              "उद्योग-संरेखित पाठ्यक्रम जिनमें इंटर्नशिप और को-ऑप रोटेशन शामिल हैं",
              "उच्च मांग वाले तकनीकी और इंजीनियरिंग भूमिकाओं के लिए वीज़ा मार्गदर्शन",
            ],
          },
          {
            key: "scholarships",
            label: "छात्रवृत्तियाँ",
            headline: "आपकी प्रोफ़ाइल के अनुरूप वित्त पोषण अवसर",
            description:
              "ऐसी अनुदान, छात्रवृत्तियाँ और सहायक पद पहचानें जिन्हें आप यथार्थ रूप से प्राप्त कर सकते हैं।",
            highlights: [
              "योग्यता और आवश्यकता-आधारित पुरस्कारों की चुनी हुई सूची और अंतिम तिथियाँ",
              "आपकी शैक्षणिक पृष्ठभूमि से मेल खाते पात्रता इनसाइट्स",
              "स्टेटमेंट और अनुशंसा पत्रों को मजबूत करने के सुझाव",
            ],
          },
          {
            key: "visa",
            label: "वीज़ा अनुकूल",
            headline: "सरल आव्रजन प्रक्रिया वाले अध्ययन मार्ग",
            description: "वीज़ा प्रक्रियाओं में सहूलियत वाले देशों और संस्थानों की तुलना करें।",
            highlights: [
              "पोस्ट-स्टडी कार्य विकल्प और रहने की अवधि का सारांश",
              "आपकी राष्ट्रीयता के अनुरूप दस्तावेज़ चेकलिस्ट",
              "वित्त प्रमाण, बीमा और साक्षात्कार तैयारी पर मार्गदर्शन",
            ],
          },
          {
            key: "undergraduate",
            label: "स्नातक",
            headline: "पहली बार आवेदन करने वालों के लिए स्नातक यात्रा",
            description:
              "प्रवेश आवश्यकताओं, पूर्वापेक्षाओं और सहायता सेवाओं को समझें।",
            highlights: [
              "अंकपत्र मूल्यांकन से स्वीकृति तक का चरण-दर-चरण टाइमलाइन",
              "मुख्य विषय, गौण विषय और फाउंडेशन वर्ष चुनने में मार्गदर्शन",
              "आवास, ओरिएंटेशन और बजट प्रबंधन पर संसाधन",
            ],
          },
          {
            key: "postgraduate",
            label: "स्नातकोत्तर",
            headline: "आपके लक्ष्यों से मेल खाते मास्टर और डॉक्टरेट कार्यक्रम",
            description: "अनुसंधान सुपरवाइज़र, बैच आकार और वित्तीय मॉडल की तुलना करें।",
            highlights: [
              "वर्तमान शोध विषयों के साथ संकाय हाइलाइट्स",
              "वृत्ति और सहायक पदों की उपलब्धता एवं वजीफ़ा विवरण",
              "प्रोग्राम-वार साक्षात्कार और पोर्टफोलियो अपेक्षाओं की तैयारी",
            ],
          },
          {
            key: "coop",
            label: "को-ऑप और इंटर्नशिप",
            headline: "वैश्विक नियोक्ताओं के साथ कार्य-एकीकृत सीखने के अवसर",
            description:
              "ऐसे कार्यक्रम खोजें जो अध्ययन को वास्तविक पेशेवर अनुभव के साथ जोड़ते हों।",
            highlights: [
              "विभिन्न क्षेत्रों में प्लेसमेंट दरें और नियोक्ता साझेदारियाँ",
              "भुगतान वाली इंटर्नशिप और कार्य अवधियों के लिए वीज़ा विचार",
              "रिज़्यूमे, साक्षात्कार और नेटवर्किंग के लिए करियर सेवाओं का समर्थन",
            ],
          },
        ],
      },
    },
    contact: {
      heroTitle: "हमसे संपर्क करें",
      heroSubtitle: "हम आमतौर पर एक कार्य-दिवस के भीतर जवाब देते हैं।",
      emailPrompt: "ईमेल पसंद है?",
      email: "info@unidoxia.com",
      whatsappCta: "हमें WhatsApp पर संदेश भेजें ({{number}})",
      whatsappNumber: "+447360961803",
      imageAlt: "सहायता के लिए तैयार पेशेवर शिक्षा सलाहकार",
      formTitle: "हमें संदेश भेजें",
    },
    faq: {
      heroTitle: "अक्सर पूछे जाने वाले प्रश्न",
      heroSubtitle: "आपकी शिक्षा यात्रा से संबंधित आम प्रश्नों के त्वरित उत्तर",
      imageAlt: "अध्ययन और अनुसंधान करता छात्र",
      sections: [
        {
          audience: "छात्र",
          items: [
            {
              question: "UniDoxia मुझे विश्वविद्यालयों में आवेदन करने में कैसे मदद करता है?",
              answer:
                "UniDoxia आपको प्रमाणित एजेंटों से जोड़ता है जो हर चरण में मार्गदर्शन करते हैं—विश्वविद्यालय चुनने से लेकर दस्तावेज़ जमा करने तक।",
            },
            {
              question: "क्या प्लेटफ़ॉर्म का उपयोग करने के लिए शुल्क है?",
              answer:
                "खाता बनाना और विश्वविद्यालयों को देखना निःशुल्क है। एजेंट परामर्श शुल्क ले सकते हैं, जो प्रतिबद्ध होने से पहले स्पष्ट रूप से दिखाया जाता है।",
            },
            {
              question: "आवेदन करने के लिए किन दस्तावेज़ों की आवश्यकता है?",
              answer:
                "आमतौर पर शैक्षणिक अंकपत्र, अंग्रेज़ी परीक्षा परिणाम (IELTS/TOEFL), अनुशंसा पत्र, व्यक्तिगत वक्तव्य और पासपोर्ट की प्रति की आवश्यकता होती है।",
            },
            {
              question: "क्या मैं एक साथ कई विश्वविद्यालयों में आवेदन कर सकता हूँ?",
              answer:
                "हाँ! आप एक साथ कई विश्वविद्यालयों में आवेदन कर सकते हैं और सभी आवेदनों को एक ही डैशबोर्ड से ट्रैक कर सकते हैं।",
            },
            {
              question: "मैं अपने आवेदन की स्थिति कैसे जानूँ?",
              answer:
                "आपका व्यक्तिगत डैशबोर्ड वास्तविक समय में अपडेट, समयसीमा और अगले कदम दिखाता है ताकि आप हमेशा जान सकें कि आगे क्या करना है।",
            },
          ],
        },
        {
          audience: "विश्वविद्यालय",
          items: [
            {
              question: "हमारा विश्वविद्यालय UniDoxia के साथ कैसे साझेदारी कर सकता है?",
              answer:
                "विश्वविद्यालय पोर्टल के माध्यम से साझेदारी अनुरोध जमा करें या हमारी टीम से संपर्क करें। हम आपके संस्थान को सत्यापित करेंगे और कुछ कार्य-दिवसों में ऑनबोर्डिंग पूरी करेंगे।",
            },
            {
              question: "विश्वविद्यालयों को कौन सी जानकारी मिलती है?",
              answer:
                "विश्वविद्यालय आवेदक पाइपलाइन, रूपांतरण मेट्रिक्स और क्षेत्रीय रुचि दिखाने वाले डैशबोर्ड तक पहुंच प्राप्त करते हैं, जिससे वे आत्मविश्वास के साथ भर्ती अभियान योजना बना सकें।",
            },
            {
              question: "क्या हम प्लेटफ़ॉर्म पर सीधे ऑफर प्रबंधित कर सकते हैं?",
              answer:
                "हाँ। प्रवेश टीमें शर्तीय या अंतिम ऑफर जारी कर सकती हैं, गायब दस्तावेज़ों का अनुरोध कर सकती हैं और छात्रों व एजेंटों के साथ एक ही वर्कस्पेस में संवाद कर सकती हैं।",
            },
          ],
        },
        {
          audience: "एजेंट",
          items: [
            {
              question: "UniDoxia पर एजेंटों को कौन सा समर्थन मिलता है?",
              answer:
                "एजेंटों को समर्पित CRM, विपणन सामग्री और ऑन-डिमांड प्रशिक्षण मिलता है ताकि वे छात्रों को जल्दी से सही कार्यक्रमों से जोड़ सकें।",
            },
            {
              question: "एजेंट कमीशन कैसे संभाले जाते हैं?",
              answer:
                "कमीशन संरचनाएँ पारदर्शी हैं। विश्वविद्यालय शर्तें निर्धारित करते हैं और भुगतान एजेंट डैशबोर्ड में ट्रैक किए जाते हैं ताकि समन्वयन आसान हो सके।",
            },
            {
              question: "क्या एजेंट विश्वविद्यालय की प्रवेश टीमों के साथ सहयोग कर सकते हैं?",
              answer:
                "बिल्कुल। साझा वर्कस्पेस और संदेश थ्रेड सभी पक्षों को छात्र की प्रगति, लापता दस्तावेज़ और साक्षात्कार शेड्यूलिंग के बारे में सूचित रखते हैं।",
            },
          ],
        },
      ],
    },
  },
};

export default hi;
