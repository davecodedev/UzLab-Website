// The association's real membership packages, transcribed from
// "Цены членства УзЛаб август 2026.docx".
//
// Nothing here is inferred. The document gives two categories, three packages
// each, and both a monthly and an annual fee for every package — so that is
// twelve rows. It gives no joining fee and no headcount bands, so neither
// appears; the tiers that used to claim both were invented, and this replaces
// them.
//
// The six annual slugs are the ones that already existed, and are updated in
// place rather than recreated: members and applications point at them.
//
// Run with: npm run seed:membership-pricing --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/** So'm → tiyin, which is what `priceCents` holds. */
const som = (n: number) => n * 100;

interface Package {
  /** Slug of the annual row; the monthly one is this plus `-monthly`. */
  slug: string;
  label: string;
  monthly: number;
  annual: number;
  benefits: string[];
}

const FULL_MEMBER_LEAD =
  'Полноправное членство для органов оценки соответствия: испытательных, ' +
  'калибровочных, медицинских и производственных лабораторий, органов по ' +
  'сертификации и инспекции.';

const ASSOCIATE_LEAD =
  'Ассоциированное членство для производителей и дистрибьюторов ' +
  'лабораторного оборудования.';

const FULL_MEMBERS: Package[] = [
  {
    slug: 'laboratory-small',
    label: 'Пакет 1 «Малые»',
    monthly: 500_000,
    annual: 5_000_000,
    benefits: [
      'Доступ к базе LabMAP на год — 1 ключ',
      'Консультации по внедрению и поддержанию ISO/IEC 17025 — до 5 вопросов в месяц',
      'Методическая помощь по актуализации НД — до 10 НД в месяц',
      'Информационные рассылки об изменениях стандартов — до 20',
      'Сопровождение при подготовке к аккредитации — скидка 20 % от общей суммы',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 10 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Информационная поддержка о проводимых МЛС и PT-программах',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 10 в год',
    ],
  },
  {
    slug: 'laboratory-medium',
    label: 'Пакет 2 «Средние»',
    monthly: 750_000,
    annual: 7_500_000,
    benefits: [
      'Доступ к базе LabMAP на год — 2 ключа',
      'Консультации по внедрению и поддержанию ISO/IEC 17025 — до 8 вопросов в месяц',
      'Методическая помощь по актуализации НД — до 20 НД в месяц',
      'Информационные рассылки об изменениях стандартов — до 30',
      'Сопровождение при подготовке к аккредитации — скидка 20 % от общей суммы',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 15 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Информационная поддержка о проводимых МЛС и PT-программах',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 15 в год',
    ],
  },
  {
    slug: 'laboratory-large',
    label: 'Пакет 3 «Крупные»',
    monthly: 1_000_000,
    annual: 10_000_000,
    benefits: [
      'Доступ к базе LabMAP на год — 3 ключа',
      'Консультации по внедрению и поддержанию ISO/IEC 17025 — до 10 вопросов в месяц',
      'Методическая помощь по актуализации НД — до 35 НД в месяц',
      'Информационные рассылки об изменениях стандартов — до 40',
      'Сопровождение при подготовке к аккредитации — скидка 20 % от общей суммы',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 20 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Информационная поддержка о проводимых МЛС и PT-программах',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 20 в год',
    ],
  },
];

const ASSOCIATES: Package[] = [
  {
    slug: 'associate-small',
    label: 'Пакет 1 «Малые»',
    monthly: 500_000,
    annual: 5_000_000,
    benefits: [
      'Доступ к базе LabMAP на год — 1 ключ',
      'Реклама продукции на канале ассоциации — 1 раз в неделю',
      'Методическая помощь по определению НД — до 10 НД в месяц',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 10 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 10 в год',
    ],
  },
  {
    slug: 'associate-medium',
    label: 'Пакет 2 «Средние»',
    monthly: 750_000,
    annual: 7_500_000,
    benefits: [
      'Доступ к базе LabMAP на год — 2 ключа',
      'Реклама продукции на канале ассоциации — 2 раза в неделю',
      'Методическая помощь по определению НД — до 20 НД в месяц',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 15 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 15 в год',
    ],
  },
  {
    slug: 'associate-large',
    label: 'Пакет 3 «Крупные»',
    monthly: 1_000_000,
    annual: 10_000_000,
    benefits: [
      'Доступ к базе LabMAP на год — 3 ключа',
      'Реклама продукции на канале ассоциации — 3 раза в неделю',
      'Методическая помощь по определению НД — до 35 НД в месяц',
      'Обучающие курсы Triple Point Engineering — скидка 20 % на местные курсы, до 20 слушателей в год',
      'Информационная поддержка по калибровке СИ в аккредитованных лабораториях',
      'Участие в рабочих группах ассоциации',
      'Бесплатная регистрация стандарта организации в реестре UzLab — до 20 в год',
    ],
  },
];

/**
 * The lead sentence, then one benefit per line. `description` is the only
 * free-text column there is, and the packages are list-shaped — so the page
 * splits on newlines and renders everything after the first line as bullets.
 */
function describe(lead: string, benefits: string[]) {
  return [lead, ...benefits].join('\n');
}

function rows(category: string, lead: string, packages: Package[]) {
  return packages.flatMap((p) => [
    {
      slug: p.slug,
      name: `${category} — ${p.label}`,
      description: describe(lead, p.benefits),
      priceCents: som(p.annual),
      currency: 'UZS',
      durationDays: 365,
      isActive: true,
    },
    {
      slug: `${p.slug}-monthly`,
      name: `${category} — ${p.label}, помесячно`,
      description: describe(lead, p.benefits),
      priceCents: som(p.monthly),
      currency: 'UZS',
      durationDays: 30,
      isActive: true,
    },
  ]);
}

const TYPES = [
  ...rows('Полноправное членство', FULL_MEMBER_LEAD, FULL_MEMBERS),
  ...rows('Ассоциированное членство', ASSOCIATE_LEAD, ASSOCIATES),
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const type of TYPES) {
    await prisma.membershipType.upsert({
      where: { slug: type.slug },
      update: type,
      create: type,
    });
    console.log(
      `${type.slug.padEnd(28)} ${(type.priceCents / 100).toLocaleString('ru-RU').padStart(12)} UZS / ${type.durationDays}d`,
    );
  }
  console.log(`\nUpserted ${TYPES.length} membership types.`);

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
