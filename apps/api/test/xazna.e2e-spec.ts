import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import request from 'supertest';
import { PaymentsController } from '../src/modules/payments/payments.controller.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { PaymeService } from '../src/modules/payments/payme.service.js';
import { ClickService } from '../src/modules/payments/click.service.js';
import { XaznaService } from '../src/modules/payments/xazna.service.js';
import { MembershipsService } from '../src/modules/payments/memberships.service.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

/**
 * Xazna's three methods, driven as JSON-RPC over HTTP Basic through the real
 * Express adapter and the production ValidationPipe.
 *
 * The pipe is in deliberately: it has `forbidNonWhitelisted`, and it rejecting
 * a field Xazna sends is the kind of failure that stays invisible until the
 * first real payment.
 */

const USER = 'uzlab';
const PASSWORD = 'xazna-test-password';
const BASIC = 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64');
const INVOICE = '5f1c4e5a-0000-4000-8000-0000000000aa';
const TX = '7bd081c4-d698-43f1-9c1f-03f650d7d6e0';
const AMOUNT_MINOR = 50_000_000; // 500 000.00 so'm in tiyin

describe('Xazna callbacks', () => {
  let app: INestApplication;
  let row: Record<string, unknown>;
  let granted: number;

  beforeEach(async () => {
    granted = 0;
    row = {
      id: INVOICE,
      gateway: PaymentGateway.XAZNA,
      status: PaymentStatus.PENDING,
      amountMinor: AMOUNT_MINOR,
      currency: 'UZS',
      durationDays: 30,
      userId: 'u1',
      membershipTypeId: 'm1',
      gatewayTransactionId: null,
    };

    const prisma = {
      payment: {
        findFirst: ({ where }: { where: Record<string, unknown> }) => {
          if (where.gatewayTransactionId !== undefined) {
            return Promise.resolve(
              row.gatewayTransactionId === where.gatewayTransactionId
                ? { ...row }
                : null,
            );
          }
          return Promise.resolve(
            where.id === INVOICE && where.gateway === PaymentGateway.XAZNA
              ? { ...row }
              : null,
          );
        },
        findUnique: () =>
          Promise.resolve({
            membershipType: { name: "Polnopravnoe chlenstvo — Paket 1" },
            user: { fullName: 'Test Lab' },
            payerName: null,
          }),
        update: ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(row, data);
          return Promise.resolve({ ...row });
        },
      },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
    };

    const config = {
      get: (key: string, fallback?: unknown) =>
        (
          ({
            XAZNA_MERCHANT_ID: 'xazna-merchant-uuid',
            XAZNA_BASIC_USER: USER,
            XAZNA_BASIC_PASSWORD: PASSWORD,
            WEB_URL: 'https://uzlab.org',
          }) as Record<string, string>
        )[key] ?? fallback,
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        XaznaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        {
          provide: MembershipsService,
          useValue: {
            grant: () => {
              granted += 1;
              return Promise.resolve();
            },
          },
        },
        { provide: PaymeService, useValue: {} },
        { provide: ClickService, useValue: { configured: false } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  const rpc = (method: string, params: unknown, auth: string | null = BASIC) => {
    const req = request(app.getHttpServer()).post('/payments/xazna');
    if (auth) req.set('Authorization', auth);
    return req.send({ jsonrpc: '2.0', method, id: '1234', params });
  };

  it('getinfo returns the amount in tiyin, with details for the payer', async () => {
    const res = await rpc('getinfo', { invoice: INVOICE });

    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.id).toBe('1234');
    expect(res.body.result.invoice).toBe(INVOICE);
    expect(res.body.result.amount).toBe(AMOUNT_MINOR);
    expect(res.body.result.details.days).toBe(30);
    expect(res.body.error).toBeUndefined();
  });

  it('refuses a call with no credentials, and says nothing about the invoice', async () => {
    const res = await rpc('getinfo', { invoice: INVOICE }, null);

    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(-3);
    expect(res.body.result).toBeNull();
  });

  it('refuses a call with the wrong password', async () => {
    const wrong = 'Basic ' + Buffer.from(`${USER}:nope`).toString('base64');
    const res = await rpc('getinfo', { invoice: INVOICE }, wrong);
    expect(res.body.error.code).toBe(-3);
  });

  it('answers -1 for an invoice that does not exist', async () => {
    const res = await rpc('getinfo', { invoice: 'not-an-invoice' });
    expect(res.body.error.code).toBe(-1);
    expect(res.body.error.message).toBe('invoys topilmadi');
  });

  it('pays, grants membership once, and is idempotent on a retry', async () => {
    const params = { invoice: INVOICE, amount: AMOUNT_MINOR, xaznaTransactionId: TX };

    const first = await rpc('pay', params);
    expect(first.body.result).toEqual({ message: 'success', code: 0 });
    expect(row.status).toBe(PaymentStatus.PAID);
    expect(granted).toBe(1);

    // Xazna repeating the same transaction is a retry, not a second payment.
    const retry = await rpc('pay', params);
    expect(retry.body.result).toEqual({ message: 'success', code: 0 });
    expect(granted).toBe(1);
  });

  it('accepts the amount in so`m too, because the guide is inconsistent about the unit', async () => {
    const res = await rpc('pay', {
      invoice: INVOICE,
      amount: AMOUNT_MINOR / 100,
      xaznaTransactionId: TX,
    });
    expect(res.body.result).toEqual({ message: 'success', code: 0 });
    expect(granted).toBe(1);
  });

  it('refuses an amount that is neither the tiyin nor the so`m figure', async () => {
    const res = await rpc('pay', {
      invoice: INVOICE,
      amount: 1000,
      xaznaTransactionId: TX,
    });
    expect(res.body.error.code).toBe(-4);
    expect(row.status).toBe(PaymentStatus.PENDING);
    expect(granted).toBe(0);
  });

  it('refuses a different transaction paying an invoice already settled', async () => {
    await rpc('pay', { invoice: INVOICE, amount: AMOUNT_MINOR, xaznaTransactionId: TX });
    const second = await rpc('pay', {
      invoice: INVOICE,
      amount: AMOUNT_MINOR,
      xaznaTransactionId: 'a-different-transaction',
    });

    expect(second.body.error.code).toBe(-2);
    expect(granted).toBe(1);
  });

  it('getinfo on a paid invoice answers -2 rather than inviting another payment', async () => {
    await rpc('pay', { invoice: INVOICE, amount: AMOUNT_MINOR, xaznaTransactionId: TX });
    const res = await rpc('getinfo', { invoice: INVOICE });
    expect(res.body.error.code).toBe(-2);
  });

  it('pay requires a transaction id', async () => {
    const res = await rpc('pay', { invoice: INVOICE, amount: AMOUNT_MINOR });
    expect(res.body.error.code).toBe(-4);
    expect(granted).toBe(0);
  });

  it('check reports the status of a transaction it knows', async () => {
    await rpc('pay', { invoice: INVOICE, amount: AMOUNT_MINOR, xaznaTransactionId: TX });

    const res = await rpc('check', { xaznaTransactionId: TX });
    expect(res.body.result).toEqual({ xaznaTransactionId: TX, success: true });
  });

  it('check answers -1 for a transaction it has never seen', async () => {
    const res = await rpc('check', { xaznaTransactionId: 'unknown-transaction' });
    expect(res.body.error.code).toBe(-1);
  });

  it('answers -4 for a method the guide does not define', async () => {
    const res = await rpc('cancel', { invoice: INVOICE });
    expect(res.body.error.code).toBe(-4);
  });

  it('advertises Xazna once its credentials are set', async () => {
    const res = await request(app.getHttpServer()).get('/payments/gateways');
    expect(res.body.XAZNA).toEqual({ available: true, currencies: ['UZS'] });
  });
});
