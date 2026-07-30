import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LaboratoryDocumentKind } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

/** Uploads are held in Postgres, so a hard ceiling matters more than usual. */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** What reading a submitted PDF told us about it. */
export interface AnalyzedDocument {
  kind: LaboratoryDocumentKind;
  filename: string;
  sizeBytes: number;
  characters: number;
  /** Field values found in the text, for pre-filling the form. */
  suggested: Record<string, string>;
  /** Shown back to the submitter so they can confirm we read the right file. */
  preview: string;
}

@Injectable()
export class LaboratoryDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Reading ---------------------------------------------------------------

  private async extractText(buffer: Buffer): Promise<string> {
    // pdf-parse v2 exports a class rather than v1's callable default.
    const { PDFParse } = (await import('pdf-parse')) as unknown as {
      PDFParse: new (opts: { data: Buffer }) => {
        getText: () => Promise<{ text?: string }>;
        destroy?: () => Promise<void>;
      };
    };
    const parser = new PDFParse({ data: buffer });
    try {
      const { text } = await parser.getText();
      return (text ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
    } finally {
      await parser.destroy?.();
    }
  }

  private assertPdf(file: UploadedFile) {
    if (!file?.buffer?.length) throw new BadRequestException('No file was uploaded.');
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException(
        `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB.`,
      );
    }
    // Trust the bytes, not the declared content type or the extension.
    if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new BadRequestException('That file is not a PDF.');
    }
  }

  /**
   * Reads an uploaded PDF and suggests field values, without saving anything.
   *
   * Uploading a document is not by itself useful to the registry: every filter
   * runs on structured columns, so a PDF nobody has read is invisible to search.
   * Pulling the fields out here is what makes "upload instead of typing" a real
   * alternative rather than just an attachment.
   */
  async analyze(file: UploadedFile): Promise<AnalyzedDocument> {
    this.assertPdf(file);
    const text = await this.extractText(file.buffer);
    if (!text) {
      throw new BadRequestException(
        'No text could be read from this PDF — it is probably a scan. Please enter the details manually.',
      );
    }

    return {
      kind: this.guessKind(text),
      filename: file.originalname,
      sizeBytes: file.size,
      characters: text.length,
      suggested: this.suggestFields(text),
      preview: text.slice(0, 400),
    };
  }

  /**
   * The two document types are told apart by their headings, which is more
   * reliable than the filename: the scope is an annex ("ilova … MA'QULLASH
   * SOHASI"), the certificate a standalone "MA'QULLASH TO'G'RISIDA GUVOHNOMA".
   */
  private guessKind(text: string): LaboratoryDocumentKind {
    const head = text.slice(0, 600).toUpperCase();
    const scope = /SOHASI|СОҲАСИ|ОБЛАСТ[ЬИ] АККРЕДИТАЦИИ/.test(head);
    const annex = /ILOVA|ИЛОВА|ПРИЛОЖЕНИЕ/.test(head);
    if (scope || annex) return LaboratoryDocumentKind.SCOPE;
    return LaboratoryDocumentKind.CERTIFICATE;
  }

  /** Conservative: only values matched with high confidence are offered. */
  private suggestFields(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    const head = text.slice(0, 4000);

    const number = head.match(/\b((?:O'?Z|О'?З)AK[.\s]?[A-Z]{2}[.\s]?\d{3,5}|ML[.\s]?\d{3,5})\b/i);
    if (number) out.accreditationNumber = number[1].replace(/\s/g, '').toUpperCase();

    const tin = head.match(/\b(?:STIR|ИНН|INN)\D{0,12}(\d{9})\b/i) ?? head.match(/\b(\d{9})\b/);
    if (tin) out.taxId = tin[1];

    const std = head.match(/(O['`’]?z\s?DSt[^,;\n]{0,40}\d{4})|((?:ISO|IEC)[\s/]*\d{4,5}(?::\d{4})?)/i);
    if (std) out.standard = (std[1] ?? std[2]).replace(/\s+/g, ' ').trim();

    const email = head.match(/[\w.\-]+@[\w.\-]+\.\w{2,}/);
    if (email) out.email = email[0];

    const phone = head.match(/\+?\(?\d{2,4}\)?[\s\-]?\d{2,3}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{0,2}/);
    if (phone && /\d{7,}/.test(phone[0].replace(/\D/g, ''))) out.phone = phone[0].trim();

    for (const [key, re] of [
      ['region', /(Toshkent shahri|Toshkent viloyati|Andijon|Farg['`’]?ona|Namangan|Sirdaryo|Samarqand|Qashqadaryo|Jizzax|Surxondaryo|Buxoro|Navoiy|Xorazm|Qoraqalpog['`’]?iston)/i],
    ] as const) {
      const m = head.match(re);
      if (m) out[key] = m[1];
    }
    return out;
  }

  // --- Storing ---------------------------------------------------------------

  async attach(
    laboratoryId: string,
    kind: LaboratoryDocumentKind,
    file: UploadedFile,
    userId?: string,
  ) {
    this.assertPdf(file);
    const extractedText = await this.extractText(file.buffer).catch(() => '');

    const data = {
      kind,
      filename: file.originalname.slice(0, 200),
      mimeType: 'application/pdf',
      sizeBytes: file.size,
      // Copy into a plain ArrayBuffer-backed Uint8Array: multer may hand back a
      // Buffer over a SharedArrayBuffer, which Prisma's Bytes type rejects.
      data: new Uint8Array(file.buffer),
      extractedText: extractedText || null,
      uploadedByUserId: userId,
    };

    return this.prisma.laboratoryDocument.upsert({
      where: { laboratoryId_kind: { laboratoryId, kind } },
      create: { ...data, laboratoryId },
      update: data,
      select: { id: true, kind: true, filename: true, sizeBytes: true },
    });
  }

  /** Metadata only — never the bytes, which would bloat every listing. */
  listFor(laboratoryId: string) {
    return this.prisma.laboratoryDocument.findMany({
      where: { laboratoryId },
      select: { id: true, kind: true, filename: true, sizeBytes: true, createdAt: true },
    });
  }

  async download(laboratoryId: string, kind: LaboratoryDocumentKind) {
    const doc = await this.prisma.laboratoryDocument.findUnique({
      where: { laboratoryId_kind: { laboratoryId, kind } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
