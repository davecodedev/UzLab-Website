// Imports Uzbekistan's national accreditation register (akkred.uz) into our
// Laboratory table.
//
// This used to drive a headless browser against the HTML table, which only
// exposed four columns (number, name, date, status) and left address/phone/
// email/scope empty. That was a mistake: the site's own public JSON API
// serves the complete record, unauthenticated. The frontend calls it at
// api-e.akkred.uz — the same endpoint the "quick view" popup uses — so we
// call it directly instead of scraping rendered HTML.
//
// The register covers every conformity-assessment body, not just labs:
// testing/calibration/metrology/NDT/medical laboratories plus certification
// bodies, inspection bodies, proficiency-testing providers and reference-
// material producers. All are imported; `isLaboratory` and `bodyType`
// separate them.
//
// Certificate and scope PDFs are referenced by URL (hosted by O'zAkk), not
// mirrored.
//
// Usage: npm run import:akkred --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  LaboratoryField,
  AccreditationStatus,
  ConformityBodyType,
} from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';

const API = 'https://api-e.akkred.uz/apps/registries';

// --- Source shapes ---------------------------------------------------------

interface TypeStd {
  id: number;
  key: string;
  code: string | null;
  full: string | null;
}

interface RegistryRecord {
  id: number;
  uid: string | null;
  number: string;
  status: string;
  status_date: string | null;
  accreditation_date: string | null;
  re_accreditation_date: string | null;
  accreditation_duration: string | null;
  tin: string | null;
  legal_entity_name: string | null;
  legal_entity_address: string | null;
  phone: string | null;
  email: string | null;
  web_site: string | null;
  title_organ: string | null;
  address_organ: string | null;
  full_name_supervisor_ao: string | null;
  designation_of_the_fundamental_standard: string | null;
  certificate_pdf: string | null;
  file_oblast: string | null;
  text: string | null;
  type_std: TypeStd | null;
  region: number | null;
  directions: number[] | null;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  results: T[];
}

// --- Mappings --------------------------------------------------------------

// O'zAkk's `type_std.key` is the authoritative discriminator.
const BODY_TYPE_BY_KEY: Record<string, ConformityBodyType> = {
  SL: ConformityBodyType.TESTING_LAB,
  QL: ConformityBodyType.METROLOGY_SERVICE,
  KL: ConformityBodyType.CALIBRATION_LAB,
  PT: ConformityBodyType.NDT_LAB,
  TL: ConformityBodyType.MEDICAL_LAB,
  MS: ConformityBodyType.PRODUCT_CERTIFICATION,
  MT: ConformityBodyType.MANAGEMENT_CERTIFICATION,
  XO: ConformityBodyType.SERVICE_CERTIFICATION,
  XS: ConformityBodyType.PERSONNEL_CERTIFICATION,
  IO: ConformityBodyType.INSPECTION_BODY,
  MP: ConformityBodyType.PROFICIENCY_PROVIDER,
  SN: ConformityBodyType.REFERENCE_MATERIAL_PRODUCER,
};

const LABORATORY_TYPES = new Set<ConformityBodyType>([
  ConformityBodyType.TESTING_LAB,
  ConformityBodyType.METROLOGY_SERVICE,
  ConformityBodyType.CALIBRATION_LAB,
  ConformityBodyType.NDT_LAB,
  ConformityBodyType.MEDICAL_LAB,
]);

const FIELD_BY_BODY_TYPE: Partial<Record<ConformityBodyType, LaboratoryField>> = {
  [ConformityBodyType.TESTING_LAB]: LaboratoryField.TESTING,
  [ConformityBodyType.METROLOGY_SERVICE]: LaboratoryField.METROLOGY,
  [ConformityBodyType.CALIBRATION_LAB]: LaboratoryField.METROLOGY,
  [ConformityBodyType.NDT_LAB]: LaboratoryField.TESTING,
  [ConformityBodyType.MEDICAL_LAB]: LaboratoryField.MEDICINE,
};

// O'zAkk statuses: active / paused / expired / inactive. `inactive`
// ("Tugagan") means the accreditation was ended outright, which is distinct
// from lapsing on its own expiry date — hence WITHDRAWN rather than EXPIRED.
const STATUS_BY_KEY: Record<string, AccreditationStatus> = {
  active: AccreditationStatus.ACCREDITED,
  extended: AccreditationStatus.ACCREDITED,
  paused: AccreditationStatus.SUSPENDED,
  expired: AccreditationStatus.EXPIRED,
  inactive: AccreditationStatus.WITHDRAWN,
};

// --- Helpers ---------------------------------------------------------------

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'UzLab-Registry-Import/1.0' },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function clean(value: string | null | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function normalizeUrl(value: string | null | undefined): string | undefined {
  const t = clean(value);
  if (!t) return undefined;
  return /^https?:\/\//i.test(t) ? t : `http://${t}`;
}

// The two lookup endpoints paginate differently — /region/ honours page_size,
// /directions/ only honours limit/offset — so send both and follow `next`
// rather than assuming either style caps out the list.
async function fetchLookup(path: string): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  let url: string | null = `${API}/${path}/?page_size=200&limit=200`;

  while (url) {
    const data: Paginated<Record<string, unknown>> =
      await getJson<Paginated<Record<string, unknown>>>(url);
    for (const row of data.results) {
      const id = (row.id ?? row.direct_id) as number | undefined;
      const title = (row.title ?? row.direct_name) as string | undefined;
      if (typeof id === 'number' && title) map.set(id, title);
    }
    url = data.next;
  }
  return map;
}

// --- Main ------------------------------------------------------------------

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    console.log('Fetching reference data...');
    const [regions, directions] = await Promise.all([
      fetchLookup('region'),
      fetchLookup('directions'),
    ]);
    console.log(`  ${regions.size} regions, ${directions.size} directions`);

    console.log('Fetching register...');
    const page = await getJson<Paginated<RegistryRecord>>(
      `${API}/main/?page=1&page_size=2000`,
    );
    console.log(`  ${page.results.length} of ${page.count} records`);
    if (page.next) {
      throw new Error('Register did not fit in one page — pagination needed.');
    }

    for (const row of page.results) {
      const number = clean(row.number);
      const name = clean(row.title_organ) ?? clean(row.legal_entity_name);
      if (!number || !name) {
        skipped++;
        continue;
      }

      const typeKey = row.type_std?.key ?? '';
      const bodyType = BODY_TYPE_BY_KEY[typeKey] ?? ConformityBodyType.OTHER_BODY;
      const isLaboratory = LABORATORY_TYPES.has(bodyType);
      const field = FIELD_BY_BODY_TYPE[bodyType] ?? LaboratoryField.OTHER;

      const data = {
        name,
        fields: [field],
        accreditationBody: "O'zbekiston akkreditatsiya markazi (O'ZAKK)",
        accreditationStatus:
          STATUS_BY_KEY[row.status] ?? AccreditationStatus.UNKNOWN,
        accreditedUntil: parseDate(row.accreditation_duration),
        taxId: clean(row.tin),
        region: row.region != null ? regions.get(row.region) : undefined,
        address: clean(row.address_organ),
        phone: clean(row.phone),
        email: clean(row.email),
        website: normalizeUrl(row.web_site),
        source: 'GOVERNMENT_IMPORT' as const,
        isPublished: true,

        bodyType,
        bodyTypeLabel: clean(row.type_std?.full),
        isLaboratory,
        externalId: row.id,
        externalUid: clean(row.uid),
        legalEntityName: clean(row.legal_entity_name),
        legalEntityAddress: clean(row.legal_entity_address),
        supervisorName: clean(row.full_name_supervisor_ao),
        standard: clean(row.designation_of_the_fundamental_standard),
        accreditationDate: parseDate(row.accreditation_date),
        reAccreditationDate: parseDate(row.re_accreditation_date),
        statusDate: parseDate(row.status_date),
        certificateUrl: clean(row.certificate_pdf),
        scopeUrl: clean(row.file_oblast),
        scopeText: clean(row.text),
        directions: (row.directions ?? [])
          .map((d) => directions.get(d))
          .filter((d): d is string => Boolean(d)),
      };

      const existing = await prisma.laboratory.findUnique({
        where: { accreditationNumber: number },
      });

      if (existing) {
        // Keep the established slug — it's already in published URLs.
        await prisma.laboratory.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.laboratory.create({
          data: { ...data, accreditationNumber: number, slug: slugify(`${number}-${name}`) },
        });
        created++;
      }
    }

    const labs = await prisma.laboratory.count({ where: { isLaboratory: true } });
    const total = await prisma.laboratory.count();
    console.log(
      `\nDone. Created: ${created}, updated: ${updated}, skipped: ${skipped}.` +
        `\nIn database: ${total} bodies (${labs} laboratories).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
