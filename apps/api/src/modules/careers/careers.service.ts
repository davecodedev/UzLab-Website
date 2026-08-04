import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CandidateVisibility, Prisma, VacancyStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { slugify } from '../../common/utils/slugify.js';
import {
  ApplyDto,
  CreateVacancyDto,
  ListCandidatesDto,
  ListVacanciesDto,
  ReviewApplicationDto,
  UpdateVacancyDto,
  UpsertCandidateDto,
} from './dto/careers.dto.js';

const PAGE_SIZE = 20;
const DEFAULT_OPEN_DAYS = 60;

/**
 * What a job seeker is shown. The poster's user id and the employer's private
 * notes are not in it — a listing is public, and the two sides of a job board
 * see deliberately different things.
 */
const PUBLIC_VACANCY = {
  id: true,
  slug: true,
  title: true,
  organisationName: true,
  region: true,
  city: true,
  employmentType: true,
  salary: true,
  description: true,
  requirements: true,
  contactEmail: true,
  contactPhone: true,
  urgent: true,
  status: true,
  publishedAt: true,
  expiresAt: true,
  laboratory: { select: { slug: true, name: true } },
} satisfies Prisma.VacancySelect;

@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Job seekers ---------------------------------------------------------

  /**
   * Open postings only: draft and closed ones are invisible here, and an
   * expired one stops appearing without anyone having to close it by hand.
   */
  private openWhere(): Prisma.VacancyWhereInput {
    return {
      status: VacancyStatus.PUBLISHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  async listOpen(query: ListVacanciesDto) {
    const page = Math.max(1, query.page ?? 1);
    const where: Prisma.VacancyWhereInput = { ...this.openWhere() };

    if (query.region) where.region = query.region;
    if (query.employmentType) where.employmentType = query.employmentType;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { organisationName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.vacancy.findMany({
        where,
        select: PUBLIC_VACANCY,
        // Urgent first, then newest — the order a job seeker wants, not the
        // order the rows happen to be in.
        orderBy: [{ urgent: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.vacancy.count({ where }),
    ]);

    return { items, total, page, pageSize: PAGE_SIZE };
  }

  /** Regions and employment types that actually have open postings. */
  async facets() {
    const rows = await this.prisma.vacancy.groupBy({
      by: ['region'],
      where: this.openWhere(),
      _count: { _all: true },
    });
    const types = await this.prisma.vacancy.groupBy({
      by: ['employmentType'],
      where: this.openWhere(),
      _count: { _all: true },
    });
    return {
      regions: rows
        .filter((r) => r.region)
        .map((r) => ({ value: r.region as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      employmentTypes: types.map((t) => ({
        value: t.employmentType,
        count: t._count._all,
      })),
    };
  }

  /**
   * A closed or expired posting is still readable by slug — someone who applied
   * last week should be able to see what they applied to — but the web page
   * shows it as closed rather than offering the form.
   */
  async getBySlug(slug: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { slug, status: { not: VacancyStatus.DRAFT } },
      select: PUBLIC_VACANCY,
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  async apply(slug: string, dto: ApplyDto, userId: string | null) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { slug, ...this.openWhere() },
      select: { id: true },
    });
    if (!vacancy) throw new NotFoundException('This vacancy is no longer open.');

    const data = {
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
      cvUrl: dto.cvUrl,
    };

    // A signed-in applicant may correct and resend; an anonymous one has no
    // identity to update against, so each submission is its own row.
    if (userId) {
      return this.prisma.jobApplication.upsert({
        where: { vacancyId_userId: { vacancyId: vacancy.id, userId } },
        create: { ...data, vacancyId: vacancy.id, userId },
        update: data,
        select: { id: true, status: true, createdAt: true },
      });
    }

    return this.prisma.jobApplication.create({
      data: { ...data, vacancyId: vacancy.id },
      select: { id: true, status: true, createdAt: true },
    });
  }

  /** An applicant's own history, with the posting they applied to. */
  listMyApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        vacancy: { select: { slug: true, title: true, organisationName: true } },
      },
    });
  }

  // --- Employers -----------------------------------------------------------

  async createVacancy(userId: string, dto: CreateVacancyDto) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.openForDays ?? DEFAULT_OPEN_DAYS));

    return this.prisma.vacancy.create({
      data: {
        userId,
        slug: await this.uniqueSlug(dto.title, dto.organisationName),
        title: dto.title,
        organisationName: dto.organisationName,
        region: dto.region,
        city: dto.city,
        employmentType: dto.employmentType,
        salary: dto.salary,
        description: dto.description,
        requirements: dto.requirements,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        urgent: dto.urgent ?? false,
        laboratoryId: dto.laboratoryId,
        status: VacancyStatus.PUBLISHED,
        publishedAt: new Date(),
        expiresAt,
      },
      select: PUBLIC_VACANCY,
    });
  }

  listMyVacancies(userId: string) {
    return this.prisma.vacancy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_VACANCY,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    });
  }

  async updateVacancy(userId: string, id: string, dto: UpdateVacancyDto) {
    await this.assertOwner(userId, id);
    return this.prisma.vacancy.update({
      where: { id },
      data: {
        ...dto,
        // Publishing for the first time stamps the date the listing sorts by.
        publishedAt: dto.status === VacancyStatus.PUBLISHED ? new Date() : undefined,
      },
      select: PUBLIC_VACANCY,
    });
  }

  async listApplications(userId: string, vacancyId: string) {
    await this.assertOwner(userId, vacancyId);
    return this.prisma.jobApplication.findMany({
      where: { vacancyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        message: true,
        cvUrl: true,
        status: true,
        employerNote: true,
        createdAt: true,
      },
    });
  }

  async reviewApplication(userId: string, applicationId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { vacancy: { select: { userId: true } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.vacancy.userId !== userId) {
      throw new ForbiddenException('This application is not yours to review.');
    }

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: dto.status, employerNote: dto.employerNote },
      select: { id: true, status: true, employerNote: true },
    });
  }

  // --- Internals -----------------------------------------------------------

  private async assertOwner(userId: string, vacancyId: string) {
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      select: { userId: true },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    if (vacancy.userId !== userId) {
      throw new ForbiddenException('This vacancy is not yours to change.');
    }
  }

  // --- Candidates ----------------------------------------------------------

  /** A candidate's own profile, whatever its visibility — it is theirs. */
  getMyCandidateProfile(userId: string) {
    return this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { ...IDENTIFIED_CANDIDATE, visibility: true },
    });
  }

  /** One profile per person; saving again edits the one they have. */
  upsertCandidateProfile(userId: string, dto: UpsertCandidateDto) {
    const data = {
      fullName: dto.fullName,
      headline: dto.headline,
      region: dto.region,
      city: dto.city,
      fields: dto.fields ?? [],
      yearsExperience: dto.yearsExperience,
      summary: dto.summary,
      skills: dto.skills ?? [],
      education: dto.education,
      certifications: dto.certifications,
      cvUrl: dto.cvUrl,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      visibility: dto.visibility,
      openToWork: dto.openToWork,
    };
    return this.prisma.candidateProfile.upsert({
      where: { userId },
      create: { ...data, userId, visibility: dto.visibility ?? CandidateVisibility.HIDDEN },
      update: data,
      select: { ...IDENTIFIED_CANDIDATE, visibility: true },
    });
  }

  async deleteCandidateProfile(userId: string) {
    await this.prisma.candidateProfile.deleteMany({ where: { userId } });
    return { deleted: true };
  }

  /**
   * The candidate directory. `identified` decides which projection is used, and
   * it is decided by the controller from the token — never by a query
   * parameter, which the caller controls.
   */
  async listCandidates(query: ListCandidatesDto, identified: boolean) {
    const page = Math.max(1, query.page ?? 1);
    const where: Prisma.CandidateProfileWhereInput = {
      visibility: CandidateVisibility.PUBLISHED,
    };

    if (query.region) where.region = query.region;
    if (query.field) where.fields = { has: query.field };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { headline: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { skills: { has: q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.candidateProfile.findMany({
        where,
        select: identified ? IDENTIFIED_CANDIDATE : ANONYMISED_CANDIDATE,
        // Available first, then most recently updated: a stale profile is the
        // least useful thing to put at the top of a directory.
        orderBy: [{ openToWork: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * CANDIDATE_PAGE_SIZE,
        take: CANDIDATE_PAGE_SIZE,
      }),
      this.prisma.candidateProfile.count({ where }),
    ]);

    return { items, total, page, pageSize: CANDIDATE_PAGE_SIZE, identified };
  }

  /**
   * Stores the uploaded CV against the profile, replacing whatever was there.
   *
   * Requires the profile to exist: the upload is a second step after the
   * details are saved, so there is nothing to attach a file to before then.
   */
  async saveCv(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No file was uploaded.');
    if (file.size > MAX_CV_BYTES) {
      throw new BadRequestException(
        `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_CV_BYTES / 1024 / 1024} MB.`,
      );
    }
    if (!ALLOWED_CV_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Please upload a PDF or Word document.');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new BadRequestException('Save your details before uploading a CV.');
    }

    await this.prisma.candidateProfile.update({
      where: { userId },
      data: {
        cvFilename: file.originalname.slice(0, 255),
        cvMimeType: file.mimetype,
        cvSizeBytes: file.size,
        cvData: new Uint8Array(file.buffer),
      },
    });
    return { filename: file.originalname, sizeBytes: file.size };
  }

  async deleteCv(userId: string) {
    await this.prisma.candidateProfile.updateMany({
      where: { userId },
      data: { cvFilename: null, cvMimeType: null, cvSizeBytes: null, cvData: null },
    });
    return { deleted: true };
  }

  /**
   * The bytes, for download.
   *
   * Only a published profile's CV is readable by someone else, and only the
   * owner can read their own while it is still hidden. Being signed in is
   * checked by the guard on the route; this is the rest of it.
   */
  async getCv(candidateId: string, requesterId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      select: {
        userId: true,
        visibility: true,
        cvData: true,
        cvFilename: true,
        cvMimeType: true,
      },
    });
    if (!profile?.cvData) throw new NotFoundException('No CV on file.');

    const isOwner = profile.userId === requesterId;
    if (!isOwner && profile.visibility !== CandidateVisibility.PUBLISHED) {
      throw new ForbiddenException('This profile is not published.');
    }

    return {
      data: profile.cvData,
      filename: profile.cvFilename ?? 'cv.pdf',
      mimeType: profile.cvMimeType ?? 'application/pdf',
    };
  }

  /** Regions and fields that actually have published candidates. */
  async candidateFacets() {
    const where = { visibility: CandidateVisibility.PUBLISHED };
    const rows = await this.prisma.candidateProfile.groupBy({
      by: ['region'],
      where,
      _count: { _all: true },
    });
    return {
      regions: rows
        .filter((r) => r.region)
        .map((r) => ({ value: r.region as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * `slugify` keeps only ASCII, so a title written in Cyrillic or in Uzbek with
   * apostrophes can reduce to nothing. The organisation name is tried next, and
   * a generic stem last, so every posting still gets a readable-ish URL.
   */
  private async uniqueSlug(title: string, organisation: string): Promise<string> {
    const stem = slugify(title) || slugify(organisation) || 'vacancy';
    let candidate = stem;
    for (let n = 2; ; n++) {
      const taken = await this.prisma.vacancy.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      candidate = `${stem}-${n}`;
    }
  }
}

/**
 * What a signed-in employer sees of a candidate: everything the candidate
 * wrote, including how to reach them.
 */
const IDENTIFIED_CANDIDATE = {
  id: true,
  fullName: true,
  headline: true,
  region: true,
  city: true,
  fields: true,
  yearsExperience: true,
  summary: true,
  skills: true,
  education: true,
  certifications: true,
  cvUrl: true,
  cvFilename: true,
  cvSizeBytes: true,
  contactEmail: true,
  contactPhone: true,
  openToWork: true,
  updatedAt: true,
} satisfies Prisma.CandidateProfileSelect;

/**
 * What everyone else sees. The name, the CV link and both contact fields are
 * absent from the query, not blanked afterwards — a profile is personal data
 * about a named person, and an anonymous caller has no business receiving it.
 * Enough remains that a visitor can see the directory is worth signing in for.
 */
const ANONYMISED_CANDIDATE = {
  id: true,
  headline: true,
  region: true,
  city: true,
  fields: true,
  yearsExperience: true,
  summary: true,
  skills: true,
  openToWork: true,
  updatedAt: true,
} satisfies Prisma.CandidateProfileSelect;

export const CANDIDATE_PAGE_SIZE = 20;

/**
 * A CV is smaller than a scope-of-accreditation document and there is one per
 * person, so it gets its own, tighter ceiling rather than the 15 MB the
 * laboratory documents allow.
 */
export const MAX_CV_BYTES = 5 * 1024 * 1024;

/**
 * What a CV may be. PDF is the norm; the two Word formats are accepted because
 * plenty of people have only ever had a .doc. Nothing else — this is a file
 * that strangers will open.
 */
export const ALLOWED_CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
