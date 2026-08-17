import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { PaymentsController } from '../src/modules/payments/payments.controller.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { PaymeService } from '../src/modules/payments/payme.service.js';
import { ClickService } from '../src/modules/payments/click.service.js';
import { MembershipsService } from '../src/modules/payments/memberships.service.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

/**
 * Click's callbacks, exercised the way Click sends them: form-encoded, over
 * the real Express adapter, through the same global ValidationPipe production
 * runs. The pipe is included deliberately — `forbidNonWhitelisted` rejecting
 * Click's extra fields would be invisible in a unit test and fatal in
 * production.
 */

const SECRET = 'test-secret-key';
const SERVICE_ID = '12345';
const PAYMENT_ID = '9f1c4e5a-0000-4000-8000-000000000001';
const AMOUNT_MINOR = 150_000_000; // 1,500,000.00 so'm in tiyin

/** The same masking the service uses, restated so the test is not circular. */
const PREPARE_ID =
  createHash('sha1').update(PAYMENT_ID).digest().readUInt32BE(0) & 0x7fffffff;

function sign(fields: Record<string, string>, isComplete: boolean): string {
  const parts = [
    fields.click_trans_id,
    fields.service_id,
    SECRET,
    fields.merchant_trans_id,
    ...(isComplete ? [fields.merchant_prepare_id ?? ''] : []),
    fields.amount,
    fields.action,
    fields.sign_time,
  ];
  return createHash('md5').update(parts.join('')).digest('hex');
}

function callback(over: Record<string, string> = {}) {
  const base: Record<string, string> = {
    click_trans_id: '778899',
    service_id: SERVICE_ID,
    click_paydoc_id: '445566',
    merchant_trans_id: PAYMENT_ID,
    amount: '1500000.00',
    action: '0',
    sign_time: '2026-08-17 12:00:00',
    ...over,
  };
  base.sign_string = base.sign_string ?? sign(base, base.action === '1');
  return base;
}

describe('Click callbacks', () => {
  let app: INestApplication;
  let row: Record<string, unknown>;
  let granted: number;

  beforeEach(async () => {
    granted = 0;
    row = {
      id: PAYMENT_ID,
      gateway: PaymentGateway.CLICK,
      status: PaymentStatus.PENDING,
      amountMinor: AMOUNT_MINOR,
      currency: 'UZS',
      durationDays: 365,
      userId: 'u1',
      membershipTypeId: 'm1',
    };

    const prisma = {
      payment: {
        findFirst: ({ where }: { where: { id: string; gateway: string } }) =>
          Promise.resolve(
            where.id === PAYMENT_ID && where.gateway === PaymentGateway.CLICK
              ? { ...row }
              : null,
          ),
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
            CLICK_SECRET_KEY: SECRET,
            CLICK_SERVICE_ID: SERVICE_ID,
            CLICK_MERCHANT_ID: '54321',
            WEB_URL: 'https://uzlab.org',
          }) as Record<string, string>
        )[key] ?? fallback,
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        ClickService,
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
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Exactly what main.ts installs.
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

  const post = (path: string, body: Record<string, string>) =>
    request(app.getHttpServer()).post(path).type('form').send(body);

  it('prepares a pending payment and returns a numeric prepare id', async () => {
    const res = await post('/payments/click/prepare', callback());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(0);
    expect(res.body.merchant_prepare_id).toBe(PREPARE_ID);
    expect(Number.isInteger(res.body.merchant_prepare_id)).toBe(true);
    expect(row.status).toBe(PaymentStatus.HELD);
  });

  it('rejects a tampered signature', async () => {
    const res = await post(
      '/payments/click/prepare',
      callback({ sign_string: 'f'.repeat(32) }),
    );

    expect(res.body.error).toBe(-1);
    expect(row.status).toBe(PaymentStatus.PENDING);
  });

  it('rejects a callback for another merchant service', async () => {
    const res = await post('/payments/click/prepare', callback({ service_id: '999' }));
    expect(res.body.error).toBe(-1);
  });

  it('rejects a wrong amount', async () => {
    const res = await post('/payments/click/prepare', callback({ amount: '1.00' }));
    expect(res.body.error).toBe(-2);
  });

  it('re-prepares a payment the payer abandoned and came back to', async () => {
    await post('/payments/click/prepare', callback());
    expect(row.status).toBe(PaymentStatus.HELD);

    const second = await post(
      '/payments/click/prepare',
      callback({ click_trans_id: '778900' }),
    );
    expect(second.body.error).toBe(0);
    expect(row.gatewayTransactionId).toBe('778900');
  });

  it('completes a held payment once, and grants membership once', async () => {
    await post('/payments/click/prepare', callback());

    const complete = callback({
      action: '1',
      merchant_prepare_id: String(PREPARE_ID),
    });
    const first = await post('/payments/click/complete', complete);

    expect(first.body.error).toBe(0);
    expect(row.status).toBe(PaymentStatus.PAID);
    expect(granted).toBe(1);

    // Click retries. The second call must be accepted without paying twice.
    const second = await post('/payments/click/complete', complete);
    expect(second.body.error).toBe(-4);
    expect(granted).toBe(1);
  });

  it('refuses a complete carrying a prepare id we never issued', async () => {
    await post('/payments/click/prepare', callback());

    const res = await post(
      '/payments/click/complete',
      callback({ action: '1', merchant_prepare_id: '1' }),
    );

    expect(res.body.error).toBe(-6);
    expect(row.status).toBe(PaymentStatus.HELD);
    expect(granted).toBe(0);
  });

  it('cancels when Click reports the payer failed', async () => {
    await post('/payments/click/prepare', callback());

    const res = await post(
      '/payments/click/complete',
      callback({
        action: '1',
        merchant_prepare_id: String(PREPARE_ID),
        error: '-5017',
        error_note: 'Insufficient funds',
      }),
    );

    expect(res.body.error).toBe(-9);
    expect(row.status).toBe(PaymentStatus.CANCELLED);
    expect(row.cancelReason).toBe(-5017);
    expect(granted).toBe(0);
  });

  it('reports an unknown order rather than a server error', async () => {
    const res = await post(
      '/payments/click/prepare',
      callback({ merchant_trans_id: 'not-an-order' }),
    );
    expect(res.body.error).toBe(-5);
  });

  it('refuses a complete that never went through prepare', async () => {
    const res = await post(
      '/payments/click/complete',
      callback({ action: '1', merchant_prepare_id: String(PREPARE_ID) }),
    );
    expect(res.body.error).toBe(-6);
    expect(granted).toBe(0);
  });

  it('advertises Click as available once its credentials are set', async () => {
    const res = await request(app.getHttpServer()).get('/payments/gateways');
    expect(res.status).toBe(200);
    expect(res.body.CLICK).toEqual({ available: true, currencies: ['UZS'] });
    expect(res.body.PAYME.available).toBe(false);
  });
});
