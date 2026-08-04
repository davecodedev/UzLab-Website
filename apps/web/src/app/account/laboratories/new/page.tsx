"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, uploadFile } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import {
  BODY_TYPE_OPTIONS,
  REGION_OPTIONS,
  STATUS_OPTIONS,
} from "@/components/registry/registry-data";
import {
  DIRECTIONS_MAX,
  DIRECTION_VALUES,
  DOCUMENT_KINDS,
  LABORATORY_FIELD_OPTIONS,
  MAX_DOCUMENT_BYTES,
  NAME_MIN_LENGTH,
  SUGGESTIBLE_FIELDS,
  directionLabel,
  formatFileSize,
  type AnalyzedDocument,
  type LaboratoryDocumentKind,
  type LaboratoryDocumentMeta,
  type SubmitLaboratoryPayload,
  type SubmittedLaboratory,
  type SuggestibleField,
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

  // --- The upload / manual choice -------------------------------------------
  chooseTitle: {
    ru: "Как заполнить форму?",
    uz: "Shaklni qanday to'ldirasiz?",
    en: "How would you like to fill this in?",
  },
  chooseBody: {
    ru: "Оба пути ведут в одну и ту же форму и на одну и ту же проверку. Загрузка PDF — это способ заполнить поля быстрее, а не другой способ подачи.",
    uz: "Ikkala yo'l ham bir xil shaklga va bir xil tekshiruvga olib boradi. PDF yuklash — maydonlarni tezroq to'ldirish usuli, boshqacha ariza berish usuli emas.",
    en: "Both routes end in the same form and the same review. Uploading a PDF is a faster way to fill the fields in — not a different way to submit.",
  },
  optionUploadTitle: {
    ru: "Загрузить документы",
    uz: "Hujjatlarni yuklash",
    en: "Upload documents",
  },
  optionUploadBody: {
    ru: "Выберите аттестат и/или область аккредитации в PDF. Мы прочитаем текст, подставим то, что нашли, и вы это проверите. Файлы прикрепятся к записи.",
    uz: "Attestat va/yoki akkreditatsiya sohasini PDF ko'rinishida tanlang. Matnni o'qib, topganimizni maydonlarga qo'yamiz, siz esa tekshirasiz. Fayllar yozuvga biriktiriladi.",
    en: "Pick your accreditation certificate and/or scope PDF. We read the text, fill in what we find, and you check it. The files are attached to the entry.",
  },
  optionManualTitle: { ru: "Заполнить вручную", uz: "Qo'lda to'ldirish", en: "Enter manually" },
  optionManualBody: {
    ru: "Ввести данные самостоятельно. Документы можно загрузить и потом — переключиться можно в любой момент.",
    uz: "Ma'lumotlarni o'zingiz kiritasiz. Hujjatlarni keyin ham yuklash mumkin — istalgan vaqtda almashtira olasiz.",
    en: "Type the details in yourself. You can still switch to uploading at any point.",
  },
  optionChoose: { ru: "Выбрать", uz: "Tanlash", en: "Choose" },
  switchToUpload: {
    ru: "У меня есть PDF — прочитайте их за меня",
    uz: "Menda PDF bor — ularni o'qib bering",
    en: "I have the PDFs — read them for me",
  },
  switchToManual: {
    ru: "Заполнить вручную, без документов",
    uz: "Hujjatlarsiz, qo'lda to'ldirish",
    en: "Fill it in by hand instead",
  },

  // --- The upload panel ------------------------------------------------------
  uploadTitle: {
    ru: "Документы лаборатории",
    uz: "Laboratoriya hujjatlari",
    en: "Your documents",
  },
  uploadBody: {
    ru: "Сам по себе PDF не ищется: посетители находят лабораторию по региону, ИНН, нормативному документу и сектору — а это поля формы ниже. Поэтому загрузка заполняет поля, а не заменяет их. Файлы будут прикреплены к записи и показаны на её странице.",
    uz: "PDF o'z-o'zidan qidiruvga tushmaydi: foydalanuvchilar laboratoriyani hudud, STIR, normativ hujjat va sektor bo'yicha topadi — bular quyidagi shakl maydonlari. Shuning uchun yuklash maydonlarni to'ldiradi, ularning o'rnini bosmaydi. Fayllar yozuvga biriktiriladi va uning sahifasida ko'rsatiladi.",
    en: "A PDF on its own cannot be searched: people find a laboratory by region, tax ID, standard and sector — the fields in the form below. So uploading fills those fields in, it does not replace them. The files are attached to the entry and shown on its page.",
  },
  uploadGuess: {
    ru: "Распознавание — это догадка. Проверьте каждое подставленное значение: вы его подтверждаете, а не просто принимаете.",
    uz: "Aniqlash — bu taxmin. Qo'yilgan har bir qiymatni tekshiring: siz uni tasdiqlaysiz, shunchaki qabul qilmaysiz.",
    en: "Extraction is a guess. Check every value it fills in — you are confirming it, not just accepting it.",
  },
  slotCertificate: {
    ru: "Аттестат аккредитации (PDF)",
    uz: "Akkreditatsiya attestati (PDF)",
    en: "Accreditation certificate (PDF)",
  },
  slotScope: {
    ru: "Область аккредитации (PDF)",
    uz: "Akkreditatsiya sohasi (PDF)",
    en: "Scope of accreditation (PDF)",
  },
  slotHint: {
    ru: "PDF с текстовым слоем, до 15 МБ. Скан-картинку прочитать нельзя. Можно загрузить только один из двух документов.",
    uz: "Matn qatlamiga ega PDF, 15 MB gacha. Skanerlangan rasmni o'qib bo'lmaydi. Ikkitasidan faqat bittasini yuklash ham mumkin.",
    en: "A PDF with a text layer, up to 15 MB. A scanned image cannot be read. Either document may be uploaded on its own.",
  },
  chooseFile: { ru: "Выбрать файл", uz: "Fayl tanlash", en: "Choose a file" },
  replaceFile: { ru: "Выбрать другой файл", uz: "Boshqa fayl tanlash", en: "Choose another file" },
  removeFile: { ru: "Убрать файл", uz: "Faylni olib tashlash", en: "Remove the file" },
  removeFileNote: {
    ru: "Значения, уже подставленные в форму, останутся — очистите их по одному, если они не нужны.",
    uz: "Shaklga qo'yilgan qiymatlar saqlanib qoladi — kerak bo'lmasa, ularni birma-bir tozalang.",
    en: "Values already filled into the form stay — clear them one by one if you do not want them.",
  },
  analyzing: { ru: "Читаем файл…", uz: "Fayl o'qilmoqda…", en: "Reading the file…" },
  uploadingLabel: { ru: "Загрузка", uz: "Yuklanmoqda", en: "Uploading" },
  detectedKind: { ru: "Распознано как", uz: "Nima deb o'qildi", en: "Read as" },
  kindCertificate: { ru: "Аттестат аккредитации", uz: "Akkreditatsiya attestati", en: "Accreditation certificate" },
  kindScope: { ru: "Область аккредитации", uz: "Akkreditatsiya sohasi", en: "Scope of accreditation" },
  kindMismatch: {
    ru: "Файл распознан как другой тип документа. Он всё равно будет прикреплён к тому типу, который вы выбрали выше.",
    uz: "Fayl boshqa turdagi hujjat sifatida aniqlandi. U baribir siz yuqorida tanlagan turga biriktiriladi.",
    en: "This file was read as the other kind of document. It will still be attached under the kind you chose above.",
  },
  docFilename: { ru: "Файл", uz: "Fayl", en: "File" },
  docSize: { ru: "Размер", uz: "Hajmi", en: "Size" },
  docCharacters: { ru: "Прочитано символов", uz: "O'qilgan belgilar", en: "Characters read" },
  previewLabel: {
    ru: "Начало прочитанного текста — убедитесь, что это тот файл:",
    uz: "O'qilgan matnning boshi — bu o'sha fayl ekanini tekshiring:",
    en: "The start of the text we read — check this is the right file:",
  },
  appliedTitle: {
    ru: "Подставлено в форму из этого файла",
    uz: "Ushbu fayldan shaklga qo'yildi",
    en: "Filled into the form from this file",
  },
  skippedTitle: {
    ru: "Найдено в файле, но не подставлено — поле уже заполнено или вы убрали значение",
    uz: "Faylda topildi, lekin qo'yilmadi — maydon allaqachon to'ldirilgan yoki siz qiymatni olib tashlagansiz",
    en: "Found in the file but not filled in — the field already had a value, or you cleared it",
  },
  noSuggestions: {
    ru: "В этом файле не нашлось значений, подходящих полям формы. Файл всё равно будет прикреплён — заполните поля ниже сами.",
    uz: "Ushbu faylda shakl maydonlariga mos qiymat topilmadi. Fayl baribir biriktiriladi — maydonlarni quyida o'zingiz to'ldiring.",
    en: "Nothing in this file matched a form field. It will still be attached — fill the fields in below yourself.",
  },
  fromCertificate: {
    ru: "из аттестата — проверьте",
    uz: "attestatdan — tekshiring",
    en: "from the certificate — check it",
  },
  fromScope: {
    ru: "из области аккредитации — проверьте",
    uz: "akkreditatsiya sohasidan — tekshiring",
    en: "from the scope — check it",
  },
  clearValue: { ru: "Очистить", uz: "Tozalash", en: "Clear" },
  pdfSays: { ru: "В PDF найдено:", uz: "PDF da topilgani:", en: "The PDF says:" },
  useValue: { ru: "Подставить", uz: "Qo'yish", en: "Use it" },
  fileTooLarge: {
    ru: "Файл больше 15 МБ. Выберите файл меньшего размера.",
    uz: "Fayl 15 MB dan katta. Kichikroq fayl tanlang.",
    en: "The file is larger than 15 MB. Choose a smaller one.",
  },
  uploadFailed: {
    ru: "Не удалось загрузить файл. Проверьте соединение и попробуйте ещё раз.",
    uz: "Faylni yuklab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.",
    en: "Could not upload the file. Check your connection and try again.",
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
  attaching: {
    ru: "Прикрепляем документы…",
    uz: "Hujjatlar biriktirilmoqda…",
    en: "Attaching the documents…",
  },
  willAttach: {
    ru: "Выбранные файлы будут прикреплены к записи после отправки.",
    uz: "Tanlangan fayllar ariza yuborilgandan so'ng yozuvga biriktiriladi.",
    en: "The files you chose will be attached to the entry after it is submitted.",
  },
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
  doneAttached: {
    ru: "Документы прикреплены к записи:",
    uz: "Hujjatlar yozuvga biriktirildi:",
    en: "The documents are attached to the entry:",
  },
  attachFailedTitle: {
    ru: "Заявка отправлена, но документы не прикрепились",
    uz: "Ariza yuborildi, lekin hujjatlar biriktirilmadi",
    en: "The entry was submitted; the documents were not attached",
  },
  attachFailedBody: {
    ru: "Сама запись создана и отправлена на проверку — подавать её заново не нужно. Не удалась только загрузка файлов. Попробуйте прикрепить их ещё раз.",
    uz: "Yozuvning o'zi yaratildi va tekshiruvga yuborildi — qaytadan ariza berish shart emas. Faqat fayllarni yuklash muvaffaqiyatsiz tugadi. Ularni qayta biriktirib ko'ring.",
    en: "The entry itself was created and sent for review — you do not need to submit it again. Only the file upload failed. You can try attaching the files again.",
  },
  retryAttach: { ru: "Прикрепить ещё раз", uz: "Qayta biriktirish", en: "Try attaching again" },
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

/** Upload the PDFs and have them read, or type everything in. */
type Mode = "upload" | "manual";

/** One of the two document slots: the file the member picked and what came back. */
interface DocumentSlot {
  /** Held in memory until the laboratory exists and can be attached to. */
  file: File | null;
  analysis: AnalyzedDocument | null;
  analyzing: boolean;
  /** 0–100 for whichever request is in flight. */
  progress: number;
  error: string | null;
  attaching: boolean;
  attached: boolean;
  attachError: string | null;
}

const EMPTY_SLOT: DocumentSlot = {
  file: null,
  analysis: null,
  analyzing: false,
  progress: 0,
  error: null,
  attaching: false,
  attached: false,
  attachError: null,
};

type SlotMap = Record<LaboratoryDocumentKind, DocumentSlot>;

const EMPTY_SLOTS: SlotMap = { CERTIFICATE: EMPTY_SLOT, SCOPE: EMPTY_SLOT };

/** A value the analyzer offered for one form field, and whether it was used. */
interface Suggestion {
  value: string;
  /** Which of the two documents it came from. */
  kind: LaboratoryDocumentKind;
  /** False when the member had already typed something into that field. */
  applied: boolean;
}

type SuggestionMap = Partial<Record<SuggestibleField, Suggestion>>;

export default function NewLaboratoryPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Neither route is a dead end: both end in the form below, and the member can
  // switch at any time. Null until they pick, so the choice is not skipped past.
  const [mode, setMode] = useState<Mode | null>(null);
  const [slots, setSlots] = useState<SlotMap>(EMPTY_SLOTS);
  const [suggestions, setSuggestions] = useState<SuggestionMap>({});
  /** Set once POST /submissions succeeded, so a failed attach can be retried. */
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);

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

  // --- Documents ------------------------------------------------------------

  // The only form fields the analyzer can suggest a value for.
  const fieldValues: Record<SuggestibleField, string> = {
    accreditationNumber,
    taxId,
    standard,
    email,
    phone,
    region,
  };
  const fieldSetters: Record<SuggestibleField, (value: string) => void> = {
    accreditationNumber: setAccreditationNumber,
    taxId: setTaxId,
    standard: setStandard,
    email: setEmail,
    phone: setPhone,
    region: setRegion,
  };
  const fieldLabels: Record<SuggestibleField, string> = {
    accreditationNumber: t("accreditationNumber"),
    taxId: t("taxId"),
    standard: t("standard"),
    email: t("email"),
    phone: t("phone"),
    region: t("region"),
  };

  // A suggestion is merged after an upload round-trip, so "is this field still
  // blank?" has to be answered against what the member has typed by then, not
  // against what was on screen when the upload started.
  const valuesRef = useRef(fieldValues);
  useEffect(() => {
    valuesRef.current = fieldValues;
  });

  function patchSlot(kind: LaboratoryDocumentKind, patch: Partial<DocumentSlot>) {
    setSlots((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  }

  /** Network failures get our own wording; the API's own 4xx text is verbatim. */
  function uploadErrorText(err: unknown): string {
    return err instanceof ApiError && err.status >= 400 ? err.message : t("uploadFailed");
  }

  /**
   * Fills blank fields from what was read, and never touches a field the member
   * has already filled in — those are offered instead, next to the field.
   */
  function mergeSuggestions(analysis: AnalyzedDocument) {
    const merged: SuggestionMap = {};
    for (const field of SUGGESTIBLE_FIELDS) {
      const value = analysis.suggested[field]?.trim();
      if (!value) continue;
      // A region outside the register's own list would leave the select showing
      // "not selected" and quietly lose the value — offer nothing instead.
      if (field === "region" && !REGION_OPTIONS.some((o) => o.value === value)) continue;

      const isBlank = valuesRef.current[field].trim().length === 0;
      if (isBlank) fieldSetters[field](value);
      merged[field] = { value, kind: analysis.kind, applied: isBlank };
    }
    setSuggestions((prev) => ({ ...prev, ...merged }));
  }

  async function analyzeFile(kind: LaboratoryDocumentKind, file: File | null) {
    if (!file) return;

    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/account/laboratories/new");
      return;
    }
    // Checked here as well as on the API so a 40 MB file is refused before it
    // spends five minutes going up the wire.
    if (file.size > MAX_DOCUMENT_BYTES) {
      patchSlot(kind, { ...EMPTY_SLOT, error: t("fileTooLarge") });
      return;
    }

    patchSlot(kind, { ...EMPTY_SLOT, analyzing: true });
    try {
      const analysis = await uploadFile<AnalyzedDocument>(
        "/laboratories/submissions/analyze",
        file,
        { token, onProgress: (progress) => patchSlot(kind, { progress }) },
      );
      patchSlot(kind, { file, analysis, analyzing: false, progress: 100 });
      mergeSuggestions(analysis);
    } catch (err) {
      // "Not a PDF", "too large", "probably a scan" — the API's message is the
      // useful one, so it is shown as written.
      patchSlot(kind, { ...EMPTY_SLOT, error: uploadErrorText(err) });
    }
  }

  /** Drops the file and its markers; values already in the form are left alone. */
  function clearSlot(kind: LaboratoryDocumentKind) {
    patchSlot(kind, EMPTY_SLOT);
    setSuggestions((prev) => {
      const next: SuggestionMap = {};
      for (const field of SUGGESTIBLE_FIELDS) {
        const suggestion = prev[field];
        if (suggestion && suggestion.kind !== kind) next[field] = suggestion;
      }
      return next;
    });
  }

  function applySuggestion(field: SuggestibleField) {
    const suggestion = suggestions[field];
    if (!suggestion) return;
    fieldSetters[field](suggestion.value);
    setSuggestions((prev) => ({ ...prev, [field]: { ...suggestion, applied: true } }));
  }

  function clearSuggestedValue(field: SuggestibleField) {
    const suggestion = suggestions[field];
    fieldSetters[field]("");
    if (suggestion) {
      setSuggestions((prev) => ({ ...prev, [field]: { ...suggestion, applied: false } }));
    }
  }

  /**
   * Attaches the held files to a laboratory that already exists. Returns false
   * if any upload failed — the laboratory is created either way.
   */
  async function attachDocuments(laboratoryId: string, token: string): Promise<boolean> {
    let allAttached = true;
    for (const kind of DOCUMENT_KINDS) {
      const file = slots[kind].file;
      if (!file) continue;

      patchSlot(kind, { attaching: true, attached: false, attachError: null, progress: 0 });
      try {
        await uploadFile<LaboratoryDocumentMeta>(
          `/laboratories/submissions/${laboratoryId}/documents/${kind}`,
          file,
          { token, onProgress: (progress) => patchSlot(kind, { progress }) },
        );
        patchSlot(kind, { attaching: false, attached: true, progress: 100 });
      } catch (err) {
        allAttached = false;
        patchSlot(kind, { attaching: false, attachError: uploadErrorText(err) });
      }
    }
    return allAttached;
  }

  async function retryAttach() {
    const token = getAccessToken();
    if (!token || !createdId) return;
    setSubmitting(true);
    try {
      await attachDocuments(createdId, token);
    } finally {
      setSubmitting(false);
    }
  }

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
      const created = await api.post<SubmittedLaboratory>(
        "/laboratories/submissions",
        payload,
        token,
      );
      // The laboratory exists from here on. An attachment that fails afterwards
      // is a separate, retryable problem — never a failed submission.
      setCreatedId(created.id);
      if (DOCUMENT_KINDS.some((kind) => slots[kind].file)) {
        setAttaching(true);
        await attachDocuments(created.id, token);
        setAttaching(false);
      }
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
    setMode(null);
    setSlots(EMPTY_SLOTS);
    setSuggestions({});
    setCreatedId(null);
    setAttaching(false);
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

  const kindLabel = (kind: LaboratoryDocumentKind) =>
    kind === "CERTIFICATE" ? t("kindCertificate") : t("kindScope");
  const slotLabel = (kind: LaboratoryDocumentKind) =>
    kind === "CERTIFICATE" ? t("slotCertificate") : t("slotScope");

  const heldKinds = DOCUMENT_KINDS.filter((kind) => slots[kind].file !== null);
  const attachedKinds = DOCUMENT_KINDS.filter((kind) => slots[kind].attached);
  const failedKinds = DOCUMENT_KINDS.filter((kind) => slots[kind].attachError !== null);
  const analysisRunning = DOCUMENT_KINDS.some((kind) => slots[kind].analyzing);

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

        {attachedKinds.length > 0 && (
          <div className="mt-5 rounded-lg px-5 py-4" style={{ background: "var(--uz-bg-sunken)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
              {t("doneAttached")}
            </p>
            <ul className="mt-1.5 space-y-1 text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {attachedKinds.map((kind) => (
                <li key={kind}>
                  {kindLabel(kind)} — {slots[kind].file?.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The laboratory was created; only the upload failed. Saying anything
            that sounds like "the submission failed" would be false. */}
        {failedKinds.length > 0 && (
          <div
            role="alert"
            className="mt-5 rounded-lg px-5 py-4"
            style={{ background: "var(--uz-warning-bg)", border: "1px solid var(--uz-warning)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--uz-warning)" }}>
              {t("attachFailedTitle")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
              {t("attachFailedBody")}
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {failedKinds.map((kind) => (
                <li key={kind}>
                  {kindLabel(kind)}: {slots[kind].attachError}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={retryAttach}
              disabled={submitting}
              className="mt-3 h-10 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {submitting ? t("attaching") : t("retryAttach")}
            </button>
          </div>
        )}

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

  /**
   * Sits under a field the analyzer had something to say about: a badge while
   * the PDF's value is the one in the box, an offer while it is not. Either
   * way the member decides — nothing here changes a value on its own.
   */
  function suggestionNote(field: SuggestibleField) {
    const suggestion = suggestions[field];
    if (!suggestion) return null;

    if (fieldValues[field].trim() === suggestion.value) {
      return (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className="rounded-full px-2 py-0.5 font-semibold"
            style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
          >
            {suggestion.kind === "CERTIFICATE" ? t("fromCertificate") : t("fromScope")}
          </span>
          <button
            type="button"
            onClick={() => clearSuggestedValue(field)}
            className="font-semibold hover:underline"
            style={{ color: "var(--uz-text-muted)" }}
          >
            {t("clearValue")}
          </button>
        </p>
      );
    }

    return (
      <p
        className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"
        style={{ color: "var(--uz-text-faint)" }}
      >
        <span>
          {t("pdfSays")}{" "}
          <span className="font-medium" style={{ color: "var(--uz-text)" }}>
            {suggestion.value}
          </span>
        </span>
        <button
          type="button"
          onClick={() => applySuggestion(field)}
          className="font-semibold hover:underline"
          style={{ color: "var(--uz-blue-700)" }}
        >
          {t("useValue")}
        </button>
      </p>
    );
  }

  function documentSlot(kind: LaboratoryDocumentKind) {
    const slot = slots[kind];
    const analysis = slot.analysis;
    const busy = analysisRunning || submitting;
    const from = (field: SuggestibleField) => suggestions[field]?.kind === kind;
    const applied = SUGGESTIBLE_FIELDS.filter((f) => from(f) && suggestions[f]?.applied);
    const offered = SUGGESTIBLE_FIELDS.filter((f) => from(f) && !suggestions[f]?.applied);

    return (
      <div
        key={kind}
        className="rounded-lg p-4"
        style={{ border: "1px solid var(--uz-border)", background: "var(--uz-bg-sunken)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
          {slotLabel(kind)}
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {t("slotHint")}
        </p>

        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          aria-label={slotLabel(kind)}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            // Cleared so picking the same file again after a removal still
            // fires a change event.
            e.target.value = "";
            void analyzeFile(kind, file);
          }}
          className="mt-3 block w-full text-sm disabled:opacity-50"
          style={{ color: "var(--uz-text)" }}
        />

        {(slot.analyzing || slot.attaching) && (
          <div className="mt-3">
            <p className="text-xs font-medium" style={{ color: "var(--uz-text-muted)" }}>
              {slot.analyzing ? t("analyzing") : t("attaching")} · {t("uploadingLabel")}{" "}
              {slot.progress}%
            </p>
            <div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={slot.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ background: "var(--uz-border)" }}
            >
              <div
                className="h-full transition-all"
                style={{ width: `${slot.progress}%`, background: "var(--uz-blue-600)" }}
              />
            </div>
          </div>
        )}

        {/* "Not a PDF", "too large", "probably a scan" — the API's own wording. */}
        {slot.error && (
          <p
            role="alert"
            className="mt-3 text-sm font-medium leading-relaxed"
            style={{ color: "var(--uz-error)" }}
          >
            {slot.error}
          </p>
        )}

        {analysis && (
          <div
            className="mt-3 rounded-lg bg-white p-4"
            style={{ border: "1px solid var(--uz-border)" }}
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div className="min-w-0">
                <dt style={{ color: "var(--uz-text-faint)" }}>{t("detectedKind")}</dt>
                <dd className="mt-0.5 font-medium" style={{ color: "var(--uz-text)" }}>
                  {kindLabel(analysis.kind)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt style={{ color: "var(--uz-text-faint)" }}>{t("docFilename")}</dt>
                <dd className="mt-0.5 break-words font-medium" style={{ color: "var(--uz-text)" }}>
                  {analysis.filename}
                </dd>
              </div>
              <div className="min-w-0">
                <dt style={{ color: "var(--uz-text-faint)" }}>{t("docSize")}</dt>
                <dd className="mt-0.5 font-medium" style={{ color: "var(--uz-text)" }}>
                  {formatFileSize(analysis.sizeBytes, lang)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt style={{ color: "var(--uz-text-faint)" }}>{t("docCharacters")}</dt>
                <dd className="mt-0.5 font-medium" style={{ color: "var(--uz-text)" }}>
                  {formatNumber(analysis.characters, lang)}
                </dd>
              </div>
            </dl>

            {analysis.kind !== kind && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--uz-warning)" }}>
                {t("kindMismatch")}
              </p>
            )}

            <p className="mt-3 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("previewLabel")}
            </p>
            <pre
              className="mt-1 max-h-44 overflow-auto rounded p-2.5 text-xs leading-relaxed"
              style={{
                fontFamily: "var(--uz-font-mono)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                border: "1px solid var(--uz-border)",
                background: "var(--uz-bg-sunken)",
                color: "var(--uz-text)",
              }}
            >
              {analysis.preview}
            </pre>

            {applied.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold" style={{ color: "var(--uz-navy-900)" }}>
                  {t("appliedTitle")}
                </p>
                <ul className="mt-1 space-y-1 text-xs" style={{ color: "var(--uz-text-muted)" }}>
                  {applied.map((field) => (
                    <li key={field}>
                      {fieldLabels[field]}:{" "}
                      <span className="font-medium" style={{ color: "var(--uz-text)" }}>
                        {suggestions[field]?.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {offered.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold" style={{ color: "var(--uz-navy-900)" }}>
                  {t("skippedTitle")}
                </p>
                <ul className="mt-1 space-y-1 text-xs" style={{ color: "var(--uz-text-muted)" }}>
                  {offered.map((field) => (
                    <li key={field} className="flex flex-wrap items-center gap-2">
                      <span>
                        {fieldLabels[field]}:{" "}
                        <span className="font-medium" style={{ color: "var(--uz-text)" }}>
                          {suggestions[field]?.value}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => applySuggestion(field)}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--uz-blue-700)" }}
                      >
                        {t("useValue")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {applied.length === 0 && offered.length === 0 && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                {t("noSuggestions")}
              </p>
            )}

            <button
              type="button"
              onClick={() => clearSlot(kind)}
              disabled={busy}
              className="mt-3 text-xs font-semibold hover:underline disabled:opacity-50"
              style={{ color: "var(--uz-text-muted)" }}
            >
              {t("removeFile")}
            </button>
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("removeFileNote")}
            </p>
          </div>
        )}
      </div>
    );
  }

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

      {/* --- Upload or type it in ----------------------------------------- */}
      {/* Neither is a separate submission route: both fill in the same form and
          go through the same review. */}
      {mode === null ? (
        <div className="mt-8">
          <h2 className="text-base font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {t("chooseTitle")}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {t("chooseBody")}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ["upload", t("optionUploadTitle"), t("optionUploadBody")],
                ["manual", t("optionManualTitle"), t("optionManualBody")],
              ] as [Mode, string, string][]
            ).map(([value, title, body]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className="rounded-xl p-5 text-left transition-colors hover:border-[var(--uz-blue-500)]"
                style={{
                  border: "1px solid var(--uz-border-strong)",
                  background: "var(--uz-bg-raised)",
                }}
              >
                <span className="block text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
                  {title}
                </span>
                <span
                  className="mt-1.5 block text-sm leading-relaxed"
                  style={{ color: "var(--uz-text-muted)" }}
                >
                  {body}
                </span>
                <span
                  className="mt-2.5 inline-block text-sm font-semibold"
                  style={{ color: "var(--uz-blue-700)" }}
                >
                  {t("optionChoose")} →
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-3"
          style={{ border: "1px solid var(--uz-border)", background: "var(--uz-bg-raised)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {mode === "upload" ? t("optionUploadTitle") : t("optionManualTitle")}
          </p>
          <button
            type="button"
            onClick={() => setMode(mode === "upload" ? "manual" : "upload")}
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--uz-blue-700)" }}
          >
            {mode === "upload" ? t("switchToManual") : t("switchToUpload")}
          </button>
        </div>
      )}

      {/* Stays visible after a switch to manual entry: a file already chosen is
          still going to be attached, so it must not disappear from the page. */}
      {(mode === "upload" || heldKinds.length > 0) && (
        <section
          className="mt-6 rounded-xl bg-white p-6 sm:p-7"
          style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("uploadTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {t("uploadBody")}
          </p>
          <p
            className="mt-3 rounded-lg px-4 py-3 text-sm leading-relaxed"
            style={{ background: "var(--uz-warning-bg)", color: "var(--uz-text)" }}
          >
            {t("uploadGuess")}
          </p>
          <div className="mt-5 space-y-4">{DOCUMENT_KINDS.map((kind) => documentSlot(kind))}</div>
        </section>
      )}

      {mode !== null && (
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
              {suggestionNote("accreditationNumber")}
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
                {suggestionNote("standard")}
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
                {suggestionNote("region")}
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
                {suggestionNote("taxId")}
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
                {suggestionNote("phone")}
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
                {suggestionNote("email")}
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
                      <span style={{ color: "var(--uz-text)" }}>
                        {directionLabel(value, lang)}
                      </span>
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

          {heldKinds.length > 0 && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
              {t("willAttach")}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || analysisRunning}
            className="h-[46px] w-full rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {submitting ? (attaching ? t("attaching") : t("submitting")) : t("submit")}
          </button>
        </form>
      )}
    </div>
  );
}
