"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import {
  BODY_TYPE_OPTIONS,
  REGION_OPTIONS,
  STATUS_OPTIONS,
} from "@/components/registry/registry-data";
import {
  DIRECTIONS_MAX,
  DIRECTION_VALUES,
  LABORATORY_FIELD_OPTIONS,
  NAME_MIN_LENGTH,
  type SubmitLaboratoryPayload,
} from "@/lib/submissions";

const UI = {
  kicker: { ru: "КАБИНЕТ", uz: "KABINET", en: "ACCOUNT" },
  back: { ru: "← Мои лаборатории", uz: "← Mening laboratoriyalarim", en: "← My laboratories" },
  title: {
    ru: "Добавить лабораторию",
    uz: "Laboratoriya qo'shish",
    en: "Add a laboratory",
  },
  intro: {
    ru: "Эта форма — для лаборатории, которой нет ни в реестре аккредитации O'zAkk, ни в реестре одобрения испытательных лабораторий Depstan. Если ваша лаборатория уже есть в реестре, не создавайте новую запись: найдите её и подайте заявку на управление.",
    uz: "Ushbu shakl na O'zAkk akkreditatsiya reyestrida, na Depstan sinov laboratoriyalarini ma'qullash reyestrida bo'lmagan laboratoriya uchun. Agar laboratoriyangiz reyestrda bo'lsa, yangi yozuv yaratmang: uni toping va boshqarish uchun ariza yuboring.",
    en: "This form is for a laboratory that appears in neither the O'zAkk accreditation register nor the Depstan testing-laboratory approval register. If yours is already in the register, do not create a new entry — find it and request to manage it instead.",
  },
  openRegister: {
    ru: "Проверить в реестре",
    uz: "Reyestrdan tekshirish",
    en: "Check the register first",
  },

  noticeTitle: {
    ru: "Как эта запись будет опубликована",
    uz: "Ushbu yozuv qanday chop etiladi",
    en: "How this entry gets published",
  },
  noticeBody: {
    ru: "Запись проходит проверку и появляется в публичном реестре только после одобрения. Все данные публикуются как сведения, заявленные самой лабораторией: их никто не сверял с национальным реестром, и на странице они помечены иначе, чем официальные записи O'zAkk и Depstan.",
    uz: "Yozuv tekshiruvdan o'tadi va faqat tasdiqlangandan keyin ommaviy reyestrda paydo bo'ladi. Barcha ma'lumotlar laboratoriyaning o'zi e'lon qilgan ma'lumot sifatida chop etiladi: ular milliy reyestr bilan solishtirilmagan va sahifada O'zAkk va Depstan rasmiy yozuvlaridan boshqacha belgilanadi.",
    en: "Your entry is reviewed and only appears in the public register once approved. Everything you enter is published as self-declared by the laboratory: it is not verified against a national register, and the page marks it differently from official O'zAkk and Depstan records.",
  },
  optionalTitle: {
    ru: "Заполните как можно больше полей",
    uz: "Iloji boricha ko'proq maydonni to'ldiring",
    en: "Fill in as many fields as you can",
  },
  optionalBody: {
    ru: "Обязательны только название, тип органа и статус аккредитации. Но посетители реестра ищут по региону, ИНН, нормативному документу, области аккредитации и контактам — каждое незаполненное поле означает фильтр, в котором вашу лабораторию не найдут.",
    uz: "Faqat nomi, organ turi va akkreditatsiya holati majburiy. Ammo reyestr foydalanuvchilari hudud, STIR, normativ hujjat, akkreditatsiya sohasi va kontaktlar bo'yicha qidiradi — to'ldirilmagan har bir maydon laboratoriyangiz topilmaydigan filtrni anglatadi.",
    en: "Only the name, body type and accreditation status are required. But people search the register by region, tax ID, standard, field of accreditation and contacts — every field you leave blank is one filter your laboratory will not turn up in.",
  },

  sectionBasics: { ru: "Основное", uz: "Asosiy", en: "Basics" },
  sectionAccreditation: { ru: "Аккредитация", uz: "Akkreditatsiya", en: "Accreditation" },
  sectionOrganisation: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  sectionContacts: { ru: "Контакты", uz: "Kontaktlar", en: "Contacts" },
  sectionScope: { ru: "Область деятельности", uz: "Faoliyat sohasi", en: "Scope" },

  name: { ru: "Название лаборатории", uz: "Laboratoriya nomi", en: "Laboratory name" },
  nameHint: {
    ru: "Так, как оно указано в документах об аккредитации.",
    uz: "Akkreditatsiya hujjatlarida ko'rsatilganidek.",
    en: "As it is written on the accreditation paperwork.",
  },
  bodyType: { ru: "Тип органа", uz: "Organ turi", en: "Body type" },
  bodyTypeHint: {
    ru: "Определяет, попадёт ли запись в фильтр «Только лаборатории».",
    uz: "Yozuv «Faqat laboratoriyalar» filtriga tushishini belgilaydi.",
    en: "Decides whether the entry appears under the “laboratories only” filter.",
  },
  fields: { ru: "Направления работы", uz: "Ish yo'nalishlari", en: "Laboratory fields" },
  fieldsHint: {
    ru: "Отметьте все подходящие.",
    uz: "Mos keladiganlarning barchasini belgilang.",
    en: "Tick everything that applies.",
  },

  accreditationStatus: { ru: "Статус аккредитации", uz: "Akkreditatsiya holati", en: "Accreditation status" },
  accreditationNumber: { ru: "Номер аккредитации", uz: "Akkreditatsiya raqami", en: "Accreditation number" },
  accreditationNumberHint: {
    ru: "Если номер уже занят записью в реестре, форма это покажет — тогда нужна заявка на управление, а не новая запись.",
    uz: "Agar raqam reyestrdagi yozuv tomonidan band bo'lsa, shakl buni ko'rsatadi — u holda yangi yozuv emas, boshqarish arizasi kerak.",
    en: "If the number already belongs to a register entry, the form will say so — then you need a claim on that entry, not a new one.",
  },
  accreditationBody: { ru: "Орган по аккредитации", uz: "Akkreditatsiya organi", en: "Accreditation body" },
  standard: { ru: "Нормативный документ", uz: "Normativ hujjat", en: "Standard" },
  standardPlaceholder: { ru: "O'z DSt ISO/IEC 17025:2019", uz: "O'z DSt ISO/IEC 17025:2019", en: "O'z DSt ISO/IEC 17025:2019" },
  accreditationDate: { ru: "Дата аккредитации", uz: "Akkreditatsiya sanasi", en: "Accreditation date" },
  accreditedUntil: { ru: "Действует до", uz: "Amal qilish muddati", en: "Accredited until" },

  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  regionPlaceholder: { ru: "Не выбран", uz: "Tanlanmagan", en: "Not selected" },
  city: { ru: "Город / район", uz: "Shahar / tuman", en: "City / district" },
  address: { ru: "Адрес", uz: "Manzil", en: "Address" },
  taxId: { ru: "ИНН (СТИР)", uz: "STIR", en: "Tax ID (STIR)" },
  legalEntityName: { ru: "Юридическое лицо", uz: "Yuridik shaxs", en: "Legal entity" },
  legalEntityNameHint: {
    ru: "Организация, в составе которой работает лаборатория, если это не она сама.",
    uz: "Laboratoriya tarkibida ishlaydigan tashkilot, agar u laboratoriyaning o'zi bo'lmasa.",
    en: "The organisation the laboratory belongs to, if that is not the laboratory itself.",
  },
  legalEntityAddress: { ru: "Юридический адрес", uz: "Yuridik manzil", en: "Legal address" },
  supervisorName: { ru: "Руководитель", uz: "Rahbar", en: "Head of the laboratory" },

  phone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  website: { ru: "Сайт", uz: "Veb-sayt", en: "Website" },

  directions: { ru: "Область аккредитации", uz: "Akkreditatsiya sohasi", en: "Field of accreditation" },
  directionsHint: {
    ru: "Секторы, по которым посетители фильтруют реестр. Отметьте все подходящие — до 30.",
    uz: "Foydalanuvchilar reyestrni filtrlaydigan sektorlar. Mos keladiganlarni belgilang — 30 tagacha.",
    en: "The sectors people filter the register by. Tick everything that applies — up to 30.",
  },
  directionCustom: { ru: "Добавить свой сектор", uz: "O'z sektoringizni qo'shish", en: "Add your own sector" },
  directionAdd: { ru: "Добавить", uz: "Qo'shish", en: "Add" },
  directionRemove: { ru: "Убрать", uz: "Olib tashlash", en: "Remove" },
  directionsFull: {
    ru: "Достигнут предел в 30 секторов.",
    uz: "30 ta sektor chegarasiga yetildi.",
    en: "The limit of 30 sectors has been reached.",
  },
  description: { ru: "Описание", uz: "Tavsif", en: "Description" },
  descriptionHint: {
    ru: "Чем занимается лаборатория, оборудование, опыт.",
    uz: "Laboratoriya nima bilan shug'ullanadi, uskunalar, tajriba.",
    en: "What the laboratory does — equipment, experience.",
  },
  isUzLabMember: {
    ru: "Лаборатория входит в ассоциацию UzLab",
    uz: "Laboratoriya UzLab uyushmasi a'zosi",
    en: "The laboratory is a member of the UzLab association",
  },

  required: { ru: "(обязательно)", uz: "(majburiy)", en: "(required)" },
  optional: { ru: "(необязательно)", uz: "(ixtiyoriy)", en: "(optional)" },

  submit: { ru: "Отправить на проверку", uz: "Tekshiruvga yuborish", en: "Submit for review" },
  submitting: { ru: "Отправка…", uz: "Yuborilmoqda…", en: "Submitting…" },
  submitError: {
    ru: "Не удалось отправить заявку.",
    uz: "Arizani yuborib bo'lmadi.",
    en: "Could not submit the entry.",
  },
  nameTooShort: {
    ru: "Название должно содержать не менее 3 символов.",
    uz: "Nom kamida 3 ta belgidan iborat bo'lishi kerak.",
    en: "The name must be at least 3 characters long.",
  },

  doneTitle: { ru: "Заявка отправлена", uz: "Ariza yuborildi", en: "Submitted for review" },
  doneBody: {
    ru: "Мы проверим запись и опубликуем её в реестре. Статус виден в разделе «Мои лаборатории»; о решении сообщим по электронной почте.",
    uz: "Yozuvni tekshirib, reyestrda chop etamiz. Holatni «Mening laboratoriyalarim» bo'limida ko'rasiz; qaror haqida elektron pochta orqali xabar beramiz.",
    en: "We will review the entry and publish it in the register. You can follow its status under “My laboratories”; we will e-mail you the decision.",
  },
  doneCta: { ru: "К моим лабораториям", uz: "Mening laboratoriyalarimga", en: "Go to my laboratories" },
  doneAnother: { ru: "Добавить ещё одну", uz: "Yana bittasini qo'shish", en: "Add another one" },
} as const;

const inputClass =
  "mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const textareaClass =
  "mt-1.5 w-full rounded-md px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const inputStyle = { border: "1px solid var(--uz-border-strong)", color: "var(--uz-ink)" };
const labelClass = "block text-sm font-bold";

/** Optional fields are omitted, not sent empty — an empty `email` fails `@IsEmail`. */
function trimmed(value: string): string | undefined {
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

export default function NewLaboratoryPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Basics
  const [name, setName] = useState("");
  const [bodyType, setBodyType] = useState("TESTING_LAB");
  const [fields, setFields] = useState<string[]>([]);

  // Accreditation
  const [accreditationStatus, setAccreditationStatus] = useState("ACCREDITED");
  const [accreditationNumber, setAccreditationNumber] = useState("");
  const [accreditationBody, setAccreditationBody] = useState("");
  const [standard, setStandard] = useState("");
  const [accreditationDate, setAccreditationDate] = useState("");
  const [accreditedUntil, setAccreditedUntil] = useState("");

  // Organisation
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [legalEntityName, setLegalEntityName] = useState("");
  const [legalEntityAddress, setLegalEntityAddress] = useState("");
  const [supervisorName, setSupervisorName] = useState("");

  // Contacts
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Scope
  const [directions, setDirections] = useState<string[]>([]);
  const [directionDraft, setDirectionDraft] = useState("");
  const [description, setDescription] = useState("");
  const [isUzLabMember, setIsUzLabMember] = useState(false);

  // Session lives in localStorage, so the check can only happen on the client —
  // same shape as /account: render, then bounce anonymous visitors to login.
  useEffect(() => {
    if (!getAccessToken()) router.push("/login?next=/account/laboratories/new");
  }, [router]);

  function toggleField(value: string) {
    setFields((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value],
    );
  }

  function toggleDirection(value: string) {
    setDirections((prev) => {
      if (prev.includes(value)) return prev.filter((d) => d !== value);
      if (prev.length >= DIRECTIONS_MAX) return prev;
      return [...prev, value];
    });
  }

  function addCustomDirection() {
    const value = directionDraft.trim();
    if (!value) return;
    setDirections((prev) =>
      prev.includes(value) || prev.length >= DIRECTIONS_MAX ? prev : [...prev, value],
    );
    setDirectionDraft("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/account/laboratories/new");
      return;
    }

    if (name.trim().length < NAME_MIN_LENGTH) {
      setError("nameTooShort");
      return;
    }

    // Exactly the keys SubmitLaboratoryDto whitelists; empty optionals are left
    // out entirely so the API never stores an empty string.
    const payload: SubmitLaboratoryPayload = {
      name: name.trim(),
      bodyType,
      accreditationStatus,
      ...(fields.length > 0 ? { fields } : {}),
      ...(trimmed(accreditationNumber) ? { accreditationNumber: trimmed(accreditationNumber) } : {}),
      ...(trimmed(accreditationBody) ? { accreditationBody: trimmed(accreditationBody) } : {}),
      ...(trimmed(standard) ? { standard: trimmed(standard) } : {}),
      ...(accreditationDate ? { accreditationDate } : {}),
      ...(accreditedUntil ? { accreditedUntil } : {}),
      ...(region ? { region } : {}),
      ...(trimmed(city) ? { city: trimmed(city) } : {}),
      ...(trimmed(address) ? { address: trimmed(address) } : {}),
      ...(trimmed(taxId) ? { taxId: trimmed(taxId) } : {}),
      ...(trimmed(legalEntityName) ? { legalEntityName: trimmed(legalEntityName) } : {}),
      ...(trimmed(legalEntityAddress) ? { legalEntityAddress: trimmed(legalEntityAddress) } : {}),
      ...(trimmed(supervisorName) ? { supervisorName: trimmed(supervisorName) } : {}),
      ...(trimmed(phone) ? { phone: trimmed(phone) } : {}),
      ...(trimmed(email) ? { email: trimmed(email) } : {}),
      ...(trimmed(website) ? { website: trimmed(website) } : {}),
      ...(directions.length > 0 ? { directions } : {}),
      ...(trimmed(description) ? { description: trimmed(description) } : {}),
      ...(isUzLabMember ? { isUzLabMember: true } : {}),
    };

    setSubmitting(true);
    try {
      await api.post("/laboratories/submissions", payload, token);
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      // A 409 carries the "this number is already taken, claim it instead"
      // message from the API — show it verbatim rather than a generic error.
      setError(err instanceof ApiError ? err.message : "submitError");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setDone(false);
    setError(null);
    setName("");
    setBodyType("TESTING_LAB");
    setFields([]);
    setAccreditationStatus("ACCREDITED");
    setAccreditationNumber("");
    setAccreditationBody("");
    setStandard("");
    setAccreditationDate("");
    setAccreditedUntil("");
    setRegion("");
    setCity("");
    setAddress("");
    setTaxId("");
    setLegalEntityName("");
    setLegalEntityAddress("");
    setSupervisorName("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setDirections([]);
    setDirectionDraft("");
    setDescription("");
    setIsUzLabMember(false);
  }

  // Dictionary keys are stored raw so the message re-translates on language
  // change; API error messages pass through verbatim.
  const errorText = error === null ? null : error in UI ? t(error as keyof typeof UI) : error;

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1
          className="text-[30px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("doneTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("doneBody")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/account"
            className="inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {t("doneCta")}
          </Link>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--uz-blue-700)" }}
          >
            {t("doneAnother")}
          </button>
        </div>
      </div>
    );
  }

  const optionalMark = (
    <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
      {t("optional")}
    </span>
  );
  const requiredMark = (
    <span className="font-normal" style={{ color: "var(--uz-blue-700)" }}>
      {t("required")}
    </span>
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/account" className="text-sm font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {t("back")}
      </Link>

      <div className="mt-4 mb-3 flex items-center gap-2.5">
        <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
        <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
          {t("kicker")}
        </span>
      </div>

      <h1
        className="text-[30px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {t("intro")}
      </p>
      <Link
        href="/laboratories"
        className="mt-2 inline-block text-sm font-semibold hover:underline"
        style={{ color: "var(--uz-blue-700)" }}
      >
        {t("openRegister")}
      </Link>

      <div
        className="mt-6 rounded-lg px-5 py-4"
        style={{ background: "var(--uz-blue-50)", border: "1px solid var(--uz-blue-100)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {t("noticeTitle")}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("noticeBody")}
        </p>
      </div>

      <div className="mt-4 rounded-lg px-5 py-4" style={{ background: "var(--uz-bg-sunken)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {t("optionalTitle")}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("optionalBody")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8 rounded-xl bg-white p-6 sm:p-7"
        style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        {/* --- Basics --------------------------------------------------- */}
        <section className="space-y-5">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionBasics")}
          </h2>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("name")} {requiredMark}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={NAME_MIN_LENGTH}
              maxLength={500}
              className={inputClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("nameHint")}
            </p>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("bodyType")} {requiredMark}
            </label>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {BODY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {pick(o.label, lang)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("bodyTypeHint")}
            </p>
          </div>

          <fieldset>
            <legend className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("fields")} {optionalMark}
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
              {LABORATORY_FIELD_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={fields.includes(o.value)}
                    onChange={() => toggleField(o.value)}
                    className="h-4 w-4 shrink-0"
                    style={{ accentColor: "var(--uz-blue-600)" }}
                  />
                  <span style={{ color: "var(--uz-text)" }}>{pick(o.label, lang)}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("fieldsHint")}
            </p>
          </fieldset>
        </section>

        {/* --- Accreditation -------------------------------------------- */}
        <section className="space-y-5 pt-2" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="pt-6 text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionAccreditation")}
          </h2>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("accreditationStatus")} {requiredMark}
            </label>
            <select
              value={accreditationStatus}
              onChange={(e) => setAccreditationStatus(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {pick(o.label, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("accreditationNumber")} {optionalMark}
            </label>
            <input
              value={accreditationNumber}
              onChange={(e) => setAccreditationNumber(e.target.value)}
              maxLength={120}
              className={inputClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("accreditationNumberHint")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("accreditationBody")} {optionalMark}
              </label>
              <input
                value={accreditationBody}
                onChange={(e) => setAccreditationBody(e.target.value)}
                maxLength={300}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("standard")} {optionalMark}
              </label>
              <input
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                maxLength={300}
                placeholder={t("standardPlaceholder")}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("accreditationDate")} {optionalMark}
              </label>
              <input
                type="date"
                value={accreditationDate}
                onChange={(e) => setAccreditationDate(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("accreditedUntil")} {optionalMark}
              </label>
              <input
                type="date"
                value={accreditedUntil}
                onChange={(e) => setAccreditedUntil(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* --- Organisation --------------------------------------------- */}
        <section className="space-y-5 pt-2" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="pt-6 text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionOrganisation")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("region")} {optionalMark}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">{t("regionPlaceholder")}</option>
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {pick(o.label, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("city")} {optionalMark}
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={200}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("address")} {optionalMark}
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={500}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("taxId")} {optionalMark}
              </label>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                maxLength={50}
                inputMode="numeric"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("supervisorName")} {optionalMark}
              </label>
              <input
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                maxLength={200}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("legalEntityName")} {optionalMark}
            </label>
            <input
              value={legalEntityName}
              onChange={(e) => setLegalEntityName(e.target.value)}
              maxLength={500}
              className={inputClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("legalEntityNameHint")}
            </p>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("legalEntityAddress")} {optionalMark}
            </label>
            <input
              value={legalEntityAddress}
              onChange={(e) => setLegalEntityAddress(e.target.value)}
              maxLength={500}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </section>

        {/* --- Contacts -------------------------------------------------- */}
        <section className="space-y-5 pt-2" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="pt-6 text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionContacts")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("phone")} {optionalMark}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={100}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("email")} {optionalMark}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("website")} {optionalMark}
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={300}
              placeholder="lab.uz"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </section>

        {/* --- Scope ----------------------------------------------------- */}
        <section className="space-y-5 pt-2" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="pt-6 text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionScope")}
          </h2>

          <fieldset>
            <legend className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("directions")} {optionalMark}
            </legend>
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("directionsHint")}
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
              {DIRECTION_VALUES.map((value) => {
                const checked = directions.includes(value);
                return (
                  <label key={value} className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDirection(value)}
                      disabled={!checked && directions.length >= DIRECTIONS_MAX}
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ accentColor: "var(--uz-blue-600)" }}
                    />
                    <span style={{ color: "var(--uz-text)" }}>{value}</span>
                  </label>
                );
              })}
            </div>

            {/* Sectors outside the 24 that occur in the register. */}
            <div className="mt-4">
              <label className="block text-sm font-semibold" style={{ color: "var(--uz-ink)" }}>
                {t("directionCustom")}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={directionDraft}
                  onChange={(e) => setDirectionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Enter inside a form would submit it — here it means
                      // "add this sector".
                      e.preventDefault();
                      addCustomDirection();
                    }
                  }}
                  maxLength={200}
                  disabled={directions.length >= DIRECTIONS_MAX}
                  className="h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={addCustomDirection}
                  disabled={directions.length >= DIRECTIONS_MAX}
                  className="h-11 shrink-0 rounded-md px-4 text-sm font-semibold disabled:opacity-50"
                  style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }}
                >
                  {t("directionAdd")}
                </button>
              </div>
              {directions.length >= DIRECTIONS_MAX && (
                <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
                  {t("directionsFull")}
                </p>
              )}
            </div>

            {directions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {directions.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium"
                    style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => setDirections((prev) => prev.filter((d) => d !== value))}
                      aria-label={`${t("directionRemove")}: ${value}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-sm leading-none"
                      style={{ color: "var(--uz-blue-700)" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("description")} {optionalMark}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              className={textareaClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("descriptionHint")}
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={isUzLabMember}
              onChange={(e) => setIsUzLabMember(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ accentColor: "var(--uz-blue-600)" }}
            />
            <span style={{ color: "var(--uz-text)" }}>{t("isUzLabMember")}</span>
          </label>
        </section>

        {errorText && (
          <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--uz-error)" }}>
            {errorText}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="h-[46px] w-full rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
