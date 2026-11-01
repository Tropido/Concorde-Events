import type { Language } from "@/lib/i18n/translations";

/** The 24 governorates, Grand Tunis first. `fr` is also the value kept on a request. */
export const GOVERNORATES: Record<Language, string>[] = [
  { fr: "Tunis", en: "Tunis", ar: "تونس" },
  { fr: "Ariana", en: "Ariana", ar: "أريانة" },
  { fr: "Ben Arous", en: "Ben Arous", ar: "بن عروس" },
  { fr: "Manouba", en: "Manouba", ar: "منوبة" },
  { fr: "Nabeul", en: "Nabeul", ar: "نابل" },
  { fr: "Zaghouan", en: "Zaghouan", ar: "زغوان" },
  { fr: "Bizerte", en: "Bizerte", ar: "بنزرت" },
  { fr: "Béja", en: "Beja", ar: "باجة" },
  { fr: "Jendouba", en: "Jendouba", ar: "جندوبة" },
  { fr: "Le Kef", en: "Kef", ar: "الكاف" },
  { fr: "Siliana", en: "Siliana", ar: "سليانة" },
  { fr: "Sousse", en: "Sousse", ar: "سوسة" },
  { fr: "Monastir", en: "Monastir", ar: "المنستير" },
  { fr: "Mahdia", en: "Mahdia", ar: "المهدية" },
  { fr: "Sfax", en: "Sfax", ar: "صفاقس" },
  { fr: "Kairouan", en: "Kairouan", ar: "القيروان" },
  { fr: "Kasserine", en: "Kasserine", ar: "القصرين" },
  { fr: "Sidi Bouzid", en: "Sidi Bouzid", ar: "سيدي بوزيد" },
  { fr: "Gabès", en: "Gabes", ar: "قابس" },
  { fr: "Médenine", en: "Medenine", ar: "مدنين" },
  { fr: "Tataouine", en: "Tataouine", ar: "تطاوين" },
  { fr: "Gafsa", en: "Gafsa", ar: "قفصة" },
  { fr: "Tozeur", en: "Tozeur", ar: "توزر" },
  { fr: "Kébili", en: "Kebili", ar: "قبلي" },
];
