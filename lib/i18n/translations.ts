export type Language = "fr" | "ar";

export interface Translations {
  announcement: string;
  nav: {
    home: string;
    catalogue: string;
    about: string;
    contact: string;
    dashboard: string;
    requestDraft: string;
    logIn: string;
    signUp: string;
    roleSimulator: string;
    switchRole: string;
  };
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    ctaExplore: string;
    ctaWhatsapp: string;
    quickBooking: {
      title: string;
      startDate: string;
      endDate: string;
      pieces: string;
      checkAvailability: string;
      availableNow: string;
    };
    stats: {
      items: { value: string; label: string }[];
    };
  };
  brands: {
    heading: string;
    subheading: string;
  };
  showcase: {
    badge: string;
    title: string;
    subtitle: string;
    viewAll: string;
    comparePriceLabel: string;
    selectDates: string;
    quickPreview: string;
    addToDraft: string;
    availableBadge: string;
    reservedBadge: string;
    currency: string;
  };
  categories: {
    badge: string;
    title: string;
    viewAll: string;
    piecesCount: string;
  };
  scheduling: {
    badge: string;
    title: string;
    subtitle: string;
    legendAvailable: string;
    legendSelected: string;
    legendLimited: string;
    totalOwned: string;
    confirmDates: string;
    unitsAvailable: string;
  };
  craftsmanship: {
    badge: string;
    title: string;
    subtitle: string;
    pillars: {
      title: string;
      desc: string;
    }[];
  };
  testimonials: {
    badge: string;
    title: string;
    quotes: {
      quote: string;
      author: string;
      role: string;
      event: string;
    }[];
  };
  erp: {
    badge: string;
    title: string;
    subtitle: string;
    tabs: {
      overview: string;
      rentedItems: string;
      inventory: string;
      users: string;
      requests: string;
      analytics: string;
      cms: string;
      calculator: string;
      quotations: string;
    };
    pnl: {
      title: string;
      grossRevenue: string;
      totalCosts: string;
      netProfit: string;
      operatingMargin: string;
      vsLastMonth: string;
      costBreakdown: string;
      logistics: string;
      maintenance: string;
      warehousing: string;
      staging: string;
      insurance: string;
    };
    roi: {
      title: string;
      subtitle: string;
      model: string;
      category: string;
      purchaseCost: string;
      totalEarned: string;
      trips: string;
      condition: string;
      payback: string;
      roiPercent: string;
      action: string;
    };
    pipeline: {
      title: string;
      pendingQuotes: string;
      underReview: string;
      validatedBookings: string;
      dispatchedOnSite: string;
      conversionRate: string;
      avgOrderValue: string;
    };
    inspection: {
      title: string;
      perfect: string;
      good: string;
      minorWear: string;
      broken: string;
      logAction: string;
    };
    exportReport: string;
  };
  footer: {
    tagline: string;
    aboutText: string;
    quickLinks: string;
    legal: string;
    rights: string;
    address: string;
    phone: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    announcement: "✨ Découvrez notre collection exclusive — Décoration & Mobilier d'Événementiel ✨",
    nav: {
      home: "Accueil",
      catalogue: "Catalogue Digital",
      about: "La Maison",
      contact: "Conciergerie",
      dashboard: "Tableau de Bord",
      requestDraft: "Mon Devis",
      logIn: "Connexion",
      signUp: "Créer un Compte",
      roleSimulator: "Simulateur de Rôle Admin",
      switchRole: "Changer de Persona",
    },
    hero: {
      badge: "Haute Scénographie & Mobilier d'Art",
      title: "L'Art de la Curation",
      titleAccent: "Événementielle d'Exception",
      subtitle:
        "Catalogue digital exclusif de mobilier sculptural, assises en bouclé, tables en scagliola et luminaires architecturaux pour galas et réceptions privées.",
      ctaExplore: "Explorer la Collection",
      ctaWhatsapp: "Devis Instantané WhatsApp",
      quickBooking: {
        title: "Disponibilité & Réservation Immédiate",
        startDate: "Date de Début",
        endDate: "Date de Fin",
        pieces: "Volume Estimé",
        checkAvailability: "Vérifier la Disponibilité",
        availableNow: "Disponible en Stock",
      },
      stats: {
        items: [
          { value: "480+", label: "Pièces de Maître" },
          { value: "98.8%", label: "Taux de Satisfaction" },
          { value: "24/7", label: "Conciergerie VIP" },
          { value: "100%", label: "État Certifié Parfait" },
        ],
      },
    },
    brands: {
      heading: "Ils Nous Font Confiance",
      subheading: "Partenaire privilégié des plus grandes maisons de mode, palaces et agences événementielles.",
    },
    showcase: {
      badge: "Sélection Célébrée",
      title: "Pièces Maîtresses en Vedette",
      subtitle: "Chaque création allie matériaux nobles, pureté des lignes et ergonomie pour sublimer vos espaces.",
      viewAll: "Voir toute la collection",
      comparePriceLabel: "Prix initial",
      selectDates: "Sélectionner les Dates",
      quickPreview: "Aperçu Rapide",
      addToDraft: "Ajouter au Devis",
      availableBadge: "En Stock Immédiat",
      reservedBadge: "Réservations Fortes",
      currency: "€",
    },
    categories: {
      badge: "Parcourir par Univers",
      title: "Collections Exclusives",
      viewAll: "Toutes les Catégories",
      piecesCount: "pièces disponibles",
    },
    scheduling: {
      badge: "Calendrier Synchronisé",
      title: "Disponibilité en Temps Réel",
      subtitle: "Consultez l'inventaire au jour le jour avec notre calendrier interactif style Airbnb.",
      legendAvailable: "Disponible",
      legendSelected: "Dates Choisies",
      legendLimited: "Stock Limité",
      totalOwned: "Unités Totales Détenues",
      confirmDates: "Valider ces Dates",
      unitsAvailable: "Unités Disponibles",
    },
    craftsmanship: {
      badge: "L'Excellence Concorde",
      title: "Une Curation Pensée dans les Moindres Détails",
      subtitle: "De la conception sur mesure à la logistique gant blanc, découvrez un service taillé pour l'exception.",
      pillars: [
        {
          title: "Artisanat & Matières Nobles",
          desc: "Bois de teck massif, marbres scagliola rares, bouclé texturé et laiton patiné à la main.",
        },
        {
          title: "Logistique Gants Blancs",
          desc: "Livraison ponctuelle, installation millimétrée et reprise discrète par nos régisseurs dédiés.",
        },
        {
          title: "Tarifs B2B & Avantages Pros",
          desc: "Accès immédiat aux grilles wholesale, remises de volume et calculateurs de marge pour pros.",
        },
        {
          title: "Devis WhatsApp en 1 Clic",
          desc: "Génération instantanée du récapitulatif technique et transmission directe sur WhatsApp avec PDF.",
        },
      ],
    },
    testimonials: {
      badge: "Témoignages Clients",
      title: "Ce que disent les Directeurs Artistiques",
      quotes: [
        {
          quote: "Le mobilier Concorde a transformé notre gala annuel en une galerie d'art vivante. La finition bouclé était d'une pureté absolue.",
          author: "Camille de Montalembert",
          role: "Directrice de Production",
          event: "Gala de la Haute Couture Paris",
        },
        {
          quote: "La précision logistique et le respect des horaires sont irréprochables. Pouvoir vérifier le stock en direct change tout notre workflow.",
          author: "Julien Rivoire",
          role: "Scénographe d'Événements",
          event: "Festival International de Cannes",
        },
        {
          quote: "Le service conciergerie a répondu en moins de 10 minutes avec le devis complet et les fiches techniques prêtes à l'envoi.",
          author: "Éléonore Van Der Beek",
          role: "Wedding Planner de Prestige",
          event: "Réception Privée Cap d'Antibes",
        },
      ],
    },
    erp: {
      badge: "ERP Financier & Rentabilité",
      title: "Tableau de Bord de Performance & Profits",
      subtitle: "Analyse en direct de la rentabilité des actifs, marge nette opérationnelle, cash-flow et cycle de vie.",
      tabs: {
        overview: "Vue Globale",
        rentedItems: "Articles en Location",
        inventory: "Gestion du Stock",
        users: "Clients & Comptes Pro",
        requests: "Demandes de Devis",
        analytics: "Intelligence Financière & Marge",
        cms: "Gestion CMS",
        calculator: "Calculateur Marge Pro",
        quotations: "Historique Devis",
      },
      pnl: {
        title: "Compte de Résultat Simplifié (P&L Temps Réel)",
        grossRevenue: "Chiffre d'Affaires Brut",
        totalCosts: "Coûts Opérationnels Directs",
        netProfit: "Bénéfice Net d'Exploitation",
        operatingMargin: "Taux de Marge Opérationnelle",
        vsLastMonth: "+24.8% vs mois précédent",
        costBreakdown: "Ventilation des Dépenses Directes",
        logistics: "Transport & Chauffeurs VIP",
        maintenance: "Restauration & Nettoyage Bouclé",
        warehousing: "Stockage Climatisation Entrepôt",
        staging: "Régisseurs Montage & Démontage",
        insurance: "Provision Casse & Assurance Flotte",
      },
      roi: {
        title: "Rentabilité par Pièce & Amortissement (ROI)",
        subtitle: "Suivi unitaire du coût d'achat vs revenus cumulés générés par chaque modèle.",
        model: "Modèle Mobilier",
        category: "Catégorie",
        purchaseCost: "Coût d'Acquisition",
        totalEarned: "Revenus Cumulés",
        trips: "Sorties",
        condition: "État Flotte",
        payback: "Délai d'Amortissement",
        roiPercent: "ROI Net",
        action: "Détails",
      },
      pipeline: {
        title: "Entonnoir des Devis & Cash-Flow Prévisionnel",
        pendingQuotes: "Devis en Attente",
        underReview: "En Revue Scénographique",
        validatedBookings: "Réservations Confirmées",
        dispatchedOnSite: "Mobilier Actuellement sur Site",
        conversionRate: "Taux de Conversion Devis",
        avgOrderValue: "Panier Moyen par Événement",
      },
      inspection: {
        title: "Audit de l'État du Parc Mobilier",
        perfect: "État Parfait / Neuf",
        good: "Bon État / Patine Légère",
        minorWear: "À Nettoyer / Retouche",
        broken: "En Réparation / Quarantaine",
        logAction: "Enregistrer Révision",
      },
      exportReport: "Exporter le Rapport Comptable (CSV / PDF)",
    },
    footer: {
      tagline: "Architecture événementielle & curation de mobilier haut de gamme.",
      aboutText: "Concorde Events propose aux scénographes, agences et particuliers exigeants un catalogue d'exception pour galas, mariages et lancements de prestige.",
      quickLinks: "Accès Rapide",
      legal: "Mentions Légales & Confidentialité",
      rights: "Tous droits réservés. Scénographie haut de gamme.",
      address: "12 Avenue des Gobelins, 75005 Paris • France",
      phone: "+33 1 42 68 50 00",
    },
  },
  ar: {
    announcement: "✨ استكشف مجموعتنا الحصرية — أرقى وأفخم أثاث الديكور والفعاليات العالمية ✨",
    nav: {
      home: "الرئيسية",
      catalogue: "الكتالوج الرقمي",
      about: "عن الدار",
      contact: "خدمة الكونسيرج",
      dashboard: "لوحة التحكم",
      requestDraft: "سلة عروض الأسعار",
      logIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      roleSimulator: "محاكي صلاحيات الإدارة",
      switchRole: "تبديل الصلاحية",
    },
    hero: {
      badge: "أرقى تصاميم الأثاث والديكور المعماري",
      title: "فن التنسيق والفخامة",
      titleAccent: "لأرقى الفعاليات والمناسبات",
      subtitle:
        "كتالوج رقمي استثنائي يضم أرقى المقاعد المنسوجة بالقماش البوكليه الفاخر، وطاولات الرخام المنحوتة، وإضاءات معمارية آسرة للقصور وحفلات النخبة.",
      ctaExplore: "استكشف المجموعة الكاملة",
      ctaWhatsapp: "عرض سعر فوري عبر واتساب",
      quickBooking: {
        title: "فحص التوفر والحجز الفوري",
        startDate: "تاريخ البدء",
        endDate: "تاريخ الانتهاء",
        pieces: "الكمية المطلوبة",
        checkAvailability: "تحقق من التوفر الفوري",
        availableNow: "متوفر حالياً بالمخزن",
      },
      stats: {
        items: [
          { value: "+480", label: "قطعة أثاث نادرة" },
          { value: "98.8%", label: "نسبة رضا العملاء" },
          { value: "24/7", label: "كونسيرج على مدار الساعة" },
          { value: "100%", label: "حالة معتمدة ممتازة" },
        ],
      },
    },
    brands: {
      heading: "شركاء النجاح ودور الضيافة الفاخرة",
      subheading: "المورد المعتمد لأرقى دور الأزياء العالمية، القصور، وأفخم منظمي الفعاليات والمؤتمرات.",
    },
    showcase: {
      badge: "مختارات حصرية",
      title: "أبرز القطع الرئيسية المعروضة",
      subtitle: "كل تصميم يجمع بين أندر المواد الطبيعية، وانسيابية الخطوط، والراحة المطلقة لإضفاء لمسة سحرية على مناسباتكم.",
      viewAll: "عرض الكتالوج بالكامل",
      comparePriceLabel: "السعر الأصلي",
      selectDates: "تحديد تواريخ الفعالية",
      quickPreview: "معاينة سريعة",
      addToDraft: "إضافة لعرض السعر",
      availableBadge: "متوفر للحجز الفوري",
      reservedBadge: "طلب متزايد",
      currency: "€",
    },
    categories: {
      badge: "تصفح حسب الطابع",
      title: "المجموعات الحصرية",
      viewAll: "جميع الفئات",
      piecesCount: "قطعة متوفرة",
    },
    scheduling: {
      badge: "تقويم الجرد المباشر",
      title: "التوفر الفعلي باليوم والساعة",
      subtitle: "اطلع على توفر القطع يوماً بيوم بتجربة تفاعلية سلسة ومبتكرة مستوحاة من أفضل المنصات العالمية.",
      legendAvailable: "متاح للحجز",
      legendSelected: "التواريخ المحددة",
      legendLimited: "المتبقي محدود",
      totalOwned: "إجمالي القطع في الأسطول",
      confirmDates: "تأكيد هذه التواريخ",
      unitsAvailable: "قطع متاحة",
    },
    craftsmanship: {
      badge: "معايير التميز والإتقان",
      title: "عناية فائقة بأدق التفاصيل والتشطيبات",
      subtitle: "من الاختيار اليدوي للقطع النادرة إلى التوصيل الملكي بالقفازات البيضاء، نقدم تجربة لا تُضاهى.",
      pillars: [
        {
          title: "حرفية استثنائية وخامات أصيلة",
          desc: "خشب الساج الإندونيسي، رخام سكاغليولا الإيطالي، وقماش البوكليه الطبيعي المنسوج بعناية فائقة.",
        },
        {
          title: "خدمة لوجستية ملكية (قفازات بيضاء)",
          desc: "نقل احترافي في سيارات مجهزة، تركيب مليمتر، وفريق فني متكامل قبل بدء الفعالية.",
        },
        {
          title: "أسعار خاصة للمحترفين ومنظمي الحفلات",
          desc: "خصومات حصرية لشركات تنظيم المعارض والأعراس ومصممي الديكور مع حاسبة هوامش ربح.",
        },
        {
          title: "عروض أسعار فورية على واتساب بضغطة واحدة",
          desc: "توليد فوري لملف عرض السعر بصيغة PDF ومشاركته مباشرة عبر واتساب مع التفاصيل المالية كاملة.",
        },
      ],
    },
    testimonials: {
      badge: "آراء النخبة والمصممين",
      title: "ماذا يقول كبار المخرجين الفنيين",
      quotes: [
        {
          quote: "أثاث كونكورد حوّل حفلنا السنوي إلى تحفة فنية نابضة بالحياة. كانت خامة البوكليه والتشطيبات في غاية النقاء والأناقة.",
          author: "كاميل دي مونتالمبير",
          role: "مديرة الإنتاج الفني",
          event: "حفل أسبوع الموضة الراقية بباريس",
        },
        {
          quote: "الدقة العالية في مواعيد التسليم والتركيب فاق كل التوقعات. إمكانية التحقق من المخزون التفاعلي سهلت عملنا بشكل لا يصدق.",
          author: "جوليان ريفوار",
          role: "مصمم سينوغرافيا الفعاليات",
          event: "مهرجان كان السينمائي الدولي",
        },
        {
          quote: "فريق الكونسيرج قدم عرض السعر الرسمي والمواصفات المعمارية في أقل من 10 دقائق بكل سلاسة واحترافية.",
          author: "إليونور فان دير بيك",
          role: "منظمة حفلات زفاف ملكية",
          event: "حفل خاص بكاب دانتيب",
        },
      ],
    },
    erp: {
      badge: "نظام تخطيط الموارد والربحية (ERP)",
      title: "لوحة التحكم المالية والتحليلية للأرباح",
      subtitle: "تحليل حي لعوائد الاستثمار على القطع، هامش الربح التشغيلي، التدفقات النقدية، وإدارة دورة حياة الأصول.",
      tabs: {
        overview: "نظرة عامة",
        rentedItems: "القطع المؤجرة حالياً",
        inventory: "إدارة المخزون",
        users: "العملاء والشركاء",
        requests: "طلبات عروض الأسعار",
        analytics: "التحليلات المالية وهامش الربح",
        cms: "إدارة المحتوى",
        calculator: "حاسبة هوامش المحترفين",
        quotations: "سجل عروض الأسعار",
      },
      pnl: {
        title: "قائمة الدخل والأرباح المباشرة (P&L بالوقت الفعلي)",
        grossRevenue: "إجمالي الإيرادات المؤجرة",
        totalCosts: "التكاليف التشغيلية المباشرة",
        netProfit: "صافي الأرباح التشغيلية",
        operatingMargin: "هامش الربح التشغيلي",
        vsLastMonth: "+24.8% مقارنة بالشهر السابق",
        costBreakdown: "تفصيل المصروفات التشغيلية المباشرة",
        logistics: "النقل وسائقو التوصيل الملكي",
        maintenance: "الترميم والتنظيف الاحترافي للبوكليه",
        warehousing: "تخزين المخازن المكيفة والتأمين",
        staging: "أجور الفنيين والتركيب الموقعي",
        insurance: "احتياطي حوادث النقل والتلفيات",
      },
      roi: {
        title: "عائد الاستثمار لكل قطعة أثاث (Asset ROI)",
        subtitle: "تتبع تكلفة الشراء الأصلية مقارنة بالأرباح الإجمالية المولدة من كل موديل أثاث في الأسطول.",
        model: "موديل الأثاث",
        category: "الفئة",
        purchaseCost: "تكلفة الشراء الأصلية",
        totalEarned: "إجمالي الإيرادات المولدة",
        trips: "مرات التأجير",
        condition: "حالة الأسطول",
        payback: "فترة استرداد التكلفة",
        roiPercent: "العائد الصافي %",
        action: "تفاصيل",
      },
      pipeline: {
        title: "مسار صفقات التأجير والتدفق النقدي المتوقع",
        pendingQuotes: "عروض قيد الانتظار",
        underReview: "قيد المراجعة الفنية",
        validatedBookings: "حجوزات مؤكدة ومدفوعة",
        dispatchedOnSite: "قطع قيد الاستخدام في الفعاليات",
        conversionRate: "نسبة تحويل عروض الأسعار",
        avgOrderValue: "متوسط قيمة الحجز للفعالية",
      },
      inspection: {
        title: "تقرير فحص ومعاينة جودة الأسطول",
        perfect: "حالة ممتازة / جديدة",
        good: "حالة جيدة جداً / استخدام خفيف",
        minorWear: "يحتاج تنظيف خفيف وتلميع",
        broken: "في الصيانة والترميم / حجر مؤقت",
        logAction: "تسجيل فحص دوري",
      },
      exportReport: "تصدير التقرير المالي المعتمد (CSV / PDF)",
    },
    footer: {
      tagline: "تصميم وتنفيذ أروع المشاهد المعمارية وتأجير الأثاث الفاخر للفعاليات.",
      aboutText: "تقدم كونكورد إيفنتس لمهندسي الديكور ومنظمي الحفلات الراقية أندر قطع الأثاث الكلاسيكي والحديث لأعراس وقصور النخبة.",
      quickLinks: "روابط سريعة",
      legal: "الشروط والأحكام والخصوصية",
      rights: "جميع الحقوق محفوظة. سينوغرافيا الفخامة والتميز.",
      address: "12 شارع ليز غوبلان، 75005 باريس • فرنسا",
      phone: "00 50 68 42 1 33+",
    },
  },
};
