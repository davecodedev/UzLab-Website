import type { Lang } from "@/lib/i18n";

/**
 * The professional-development catalogue, from Triple Point Engineering's own
 * price list.
 *
 * Everything here is transcribed from that document and nothing is inferred.
 * The page it replaced carried invented courses, invented enrolment dates and
 * an invented member discount; none of those exist in the source, so none of
 * them are here. Where the source is silent — when a course next runs, whether
 * members pay less — the page says nothing rather than filling the space.
 */

type L10n = Record<Lang, string>;

/** The provider. The courses are theirs, not the association's. */
export const PROVIDER = {
  name: "Triple Point Engineering",
  email: "info@tpeconsult.uz",
  website: "www.tpeconsult.uz",
  phone: "+998 95 513 43 33",
  address: {
    ru: "Республика Узбекистан, г. Ташкент, Алмазарский р-н, ул. Шифонур 3/1, 100095",
    uz: "O'zbekiston Respublikasi, Toshkent sh., Olmazor tumani, Shifonur ko'chasi 3/1, 100095",
    en: "3/1 Shifonur St., Almazar district, Tashkent 100095, Republic of Uzbekistan",
  } satisfies L10n,
};

/**
 * How a course is priced.
 *
 * `standard` follows the duration table. Courses 4 and 5 are priced flat
 * regardless of which of their durations is taken, and course 12 is quoted per
 * test method — the source gives no figure for it, so neither does the page.
 */
export type PricingRule = "standard" | "flat" | "byMethod";

export interface Course {
  /** The price list's own numbering, kept so a reader can check against it. */
  n: number;
  title: L10n;
  /** Durations offered, in days. */
  durations: number[];
  pricing: PricingRule;
}

/** Prices in so'm, by duration in days, for the standard courses. */
export const STANDARD_PRICES: Record<number, number> = {
  5: 1_500_000,
  10: 1_802_000,
  15: 2_702_500,
};

/** Courses 4 and 5, whichever duration is taken. */
export const FLAT_PRICE = 2_500_000;

export const COURSES: Course[] = [
  {
    n: 1,
    durations: [5, 10, 15],
    pricing: "standard",
    title: {
      ru: "Поверка и калибровка средств измерений (по видам измерений)",
      uz: "O'lchash vositalarini tekshirish va kalibrlash (o'lchash turlari bo'yicha)",
      en: "Verification and calibration of measuring instruments (by type of measurement)",
    },
  },
  {
    n: 2,
    durations: [5, 10, 15],
    pricing: "standard",
    title: {
      ru: "Измерение расхода и количества жидкостей и газов с помощью стандартных сужающих устройств (серия стандартов ГОСТ 8.586)",
      uz: "Standart torayuvchi qurilmalar yordamida suyuqlik va gazlar sarfi va miqdorini o'lchash (GOST 8.586 standartlar seriyasi)",
      en: "Measuring the flow and quantity of liquids and gases with standard differential-pressure devices (GOST 8.586 series)",
    },
  },
  {
    n: 3,
    durations: [5, 10],
    pricing: "standard",
    title: {
      ru: "Метрологический контроль счётчиков жидкостей, газов и правила их эксплуатации",
      uz: "Suyuqlik va gaz hisoblagichlarini metrologik nazorat qilish va ularni ekspluatatsiya qilish qoidalari",
      en: "Metrological control of liquid and gas meters, and the rules for operating them",
    },
  },
  {
    n: 4,
    durations: [6],
    pricing: "flat",
    title: {
      ru: "Практические занятия по расчёту неопределённости измерений с учётом правил принятия решений",
      uz: "Qaror qabul qilish qoidalarini hisobga olgan holda o'lchash noaniqligini hisoblash bo'yicha amaliy mashg'ulotlar",
      en: "Practical sessions on calculating measurement uncertainty, allowing for decision rules",
    },
  },
  {
    n: 5,
    durations: [5],
    pricing: "flat",
    title: {
      ru: "Практические занятия по верификации и валидации методов испытаний (измерений) в лаборатории",
      uz: "Laboratoriyada sinov (o'lchash) usullarini verifikatsiya va validatsiya qilish bo'yicha amaliy mashg'ulotlar",
      en: "Practical sessions on verifying and validating test (measurement) methods in the laboratory",
    },
  },
  {
    n: 6,
    durations: [5, 10],
    pricing: "standard",
    title: {
      ru: "Метрологическое обеспечение аналитического контроля и аттестации методик выполнения измерений",
      uz: "Analitik nazoratni metrologik ta'minlash va o'lchashlarni bajarish metodikalarini attestatsiyalash",
      en: "Metrological assurance of analytical control and the certification of measurement procedures",
    },
  },
  {
    n: 7,
    durations: [10, 15],
    pricing: "standard",
    title: {
      ru: "Метрологическое обеспечение производства",
      uz: "Ishlab chiqarishni metrologik ta'minlash",
      en: "Metrological assurance of production",
    },
  },
  {
    n: 8,
    durations: [5, 10],
    pricing: "standard",
    title: {
      ru: "Курс аудитора систем менеджмента качества согласно ISO 19011",
      uz: "ISO 19011 bo'yicha sifat menejmenti tizimlari auditori kursi",
      en: "Quality management system auditor course to ISO 19011",
    },
  },
  {
    n: 9,
    durations: [5, 10],
    pricing: "standard",
    title: {
      ru: "Требования к компетентности лабораторий на базе ISO/IEC 17025",
      uz: "ISO/IEC 17025 asosida laboratoriyalar kompetentligiga qo'yiladigan talablar",
      en: "Competence requirements for laboratories, based on ISO/IEC 17025",
    },
  },
  {
    n: 10,
    durations: [5],
    pricing: "standard",
    title: {
      ru: "Требования к технической компетентности испытательных лабораторий согласно O'z DSt 3410:2019",
      uz: "O'z DSt 3410:2019 ga muvofiq sinov laboratoriyalarining texnik kompetentligiga qo'yiladigan talablar",
      en: "Technical competence requirements for testing laboratories, to O'z DSt 3410:2019",
    },
  },
  {
    n: 11,
    durations: [15],
    pricing: "standard",
    title: {
      ru: "Испытания продукции (базовый курс по отраслям)",
      uz: "Mahsulot sinovlari (tarmoqlar bo'yicha asosiy kurs)",
      en: "Product testing (basic course, by industry)",
    },
  },
  {
    n: 12,
    durations: [2, 3, 4, 5],
    pricing: "byMethod",
    title: {
      ru: "Практический курс по проведению испытаний (по методам испытаний)",
      uz: "Sinovlarni o'tkazish bo'yicha amaliy kurs (sinov usullari bo'yicha)",
      en: "Practical course on carrying out tests (by test method)",
    },
  },
  {
    n: 13,
    durations: [5],
    pricing: "standard",
    title: {
      ru: "Практические занятия по оценке компетентности персонала",
      uz: "Xodimlar kompetentligini baholash bo'yicha amaliy mashg'ulotlar",
      en: "Practical sessions on assessing the competence of personnel",
    },
  },
  {
    n: 14,
    durations: [15],
    pricing: "standard",
    title: {
      ru: "Сертификация продукции и услуг (по отраслям)",
      uz: "Mahsulot va xizmatlarni sertifikatlashtirish (tarmoqlar bo'yicha)",
      en: "Certification of products and services (by industry)",
    },
  },
  {
    n: 15,
    durations: [5],
    pricing: "standard",
    title: {
      ru: "Практический курс по требованиям к органам по сертификации продукции, процессов и услуг согласно ISO/IEC 17065",
      uz: "ISO/IEC 17065 ga muvofiq mahsulot, jarayon va xizmatlarni sertifikatlashtirish organlariga qo'yiladigan talablar bo'yicha amaliy kurs",
      en: "Practical course on the requirements for product, process and service certification bodies, to ISO/IEC 17065",
    },
  },
  {
    n: 16,
    durations: [5],
    pricing: "standard",
    title: {
      ru: "Практический курс по требованиям к работе различных типов органов инспекции согласно ISO/IEC 17020",
      uz: "ISO/IEC 17020 ga muvofiq turli tipdagi inspeksiya organlari ishiga qo'yiladigan talablar bo'yicha amaliy kurs",
      en: "Practical course on the requirements for the operation of the various types of inspection body, to ISO/IEC 17020",
    },
  },
  {
    n: 17,
    durations: [5],
    pricing: "standard",
    title: {
      ru: "Практика создания системы менеджмента по соответствующим требованиям международных стандартов (ISO 9001, ISO 14001, ISO 22000, ISO/IEC 27001, ISO 37001, ISO 45001, ISO 50001 и др.)",
      uz: "Xalqaro standartlarning tegishli talablari bo'yicha menejment tizimini yaratish amaliyoti (ISO 9001, ISO 14001, ISO 22000, ISO/IEC 27001, ISO 37001, ISO 45001, ISO 50001 va boshqalar)",
      en: "Building a management system to the relevant requirements of the international standards (ISO 9001, ISO 14001, ISO 22000, ISO/IEC 27001, ISO 37001, ISO 45001, ISO 50001 and others)",
    },
  },
];

/**
 * What one seat costs, per person. Returns null where the price list quotes no
 * figure — course 12 is priced per test method — so the caller shows the
 * wording rather than a number that was never published.
 */
export function priceFor(course: Course, days: number): number | null {
  if (course.pricing === "byMethod") return null;
  if (course.pricing === "flat") return FLAT_PRICE;
  return STANDARD_PRICES[days] ?? null;
}
