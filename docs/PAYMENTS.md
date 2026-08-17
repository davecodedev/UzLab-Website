# Payments

Three ways to pay for membership. Two are card gateways that settle by
themselves; the third is an invoice a person reconciles.

| Method          | Grants membership          | Currency | Status |
| --------------- | -------------------------- | -------- | ------ |
| Click           | automatically, on Complete | UZS only | code ready, awaiting credentials |
| Payme           | automatically, on Perform  | UZS only | code ready, awaiting credentials |
| Bank transfer   | staff confirm by hand      | any      | live |

A gateway with no credentials set is reported as unavailable by
`GET /api/payments/gateways`, and the checkout page hides it. That is
deliberate: an option that redirects to a gateway which then rejects the
request is worse than an option that is not offered.

---

## Click

### What Click needs from us

Give these to Click for the merchant cabinet (`SHOP-API` integration):

| Field         | Value |
| ------------- | ----- |
| Prepare URL   | `https://api-production-3463.up.railway.app/api/payments/click/prepare` |
| Complete URL  | `https://api-production-3463.up.railway.app/api/payments/click/complete` |
| Return URL    | `https://uzlab.org/account` |

Both callbacks accept `application/x-www-form-urlencoded`, always answer
HTTP 200, and report success or failure in the JSON `error` member — never
through the status code. They are exempt from rate limiting.

### What we need from Click

Three values from the merchant cabinet, set as environment variables on the
Railway `api` service. **Do not put them in the repository, and do not paste
them into a chat window** — set them in Railway's dashboard, or with
`railway variables --set`.

| Variable            | Click calls it     | Used for |
| ------------------- | ------------------ | -------- |
| `CLICK_SERVICE_ID`  | ID сервиса         | Matched against `service_id` on every callback; also in the checkout URL |
| `CLICK_MERCHANT_ID` | ID мерчанта        | Checkout URL only |
| `CLICK_SECRET_KEY`  | Секретный ключ     | The MD5 signing key. This is the credential — treat it like a password |

Until all three are present, `gateways().CLICK.available` is `false` and every
callback is rejected before it touches the database.

### The protocol as implemented

`click.service.ts`. Two callbacks:

**Prepare** (`action=0`) asks whether an order can be paid.

- The signature is MD5 over
  `click_trans_id + service_id + SECRET + merchant_trans_id + amount + action + sign_time`,
  compared in constant time.
- `merchant_trans_id` is our `Payment.id`, passed out as `transaction_param`
  in the checkout URL.
- Accepted when the payment is `PENDING` **or** `HELD`. `HELD` matters: a payer
  who abandons Click's form and comes back arrives with a new
  `click_trans_id`, and refusing that would strand someone doing nothing wrong.
- Answers with `merchant_prepare_id`, a number derived from the payment id
  (`sha1(id)` first 32 bits, masked to 31). Click types that field as a
  number, so a uuid cannot be used; deriving it rather than storing it means
  Complete can recompute and compare it without a column that could drift.

**Complete** (`action=1`) says the money moved.

- Same signature with `merchant_prepare_id` inserted after `merchant_trans_id`.
- The echoed `merchant_prepare_id` is compared explicitly. The signature
  already covers it; the comparison is what stops a Complete for one order
  being replayed against another.
- A negative `error` means the payer failed at Click's end: the payment is
  cancelled, the reason code is kept, and nothing is granted.
- Otherwise the payment is marked `PAID` and `memberships.grant()` runs **in
  the same transaction**. A crash between the two would otherwise mean a paid
  invoice with no membership.
- Click retries. A second Complete for a payment already `PAID` answers `-4`
  and grants nothing further.

Error codes returned are Click's own vocabulary: `0` success, `-1` bad
signature, `-2` wrong amount, `-4` already paid, `-5` unknown order, `-6`
unknown transaction, `-9` cancelled.

### Testing it

`apps/api/test/click.e2e-spec.ts` drives both callbacks form-encoded through
the real Express adapter and the same global `ValidationPipe` production runs
— that pipe has `forbidNonWhitelisted: true`, and it rejecting Click's extra
fields is the kind of failure that would be invisible until the first real
payment.

```bash
npm run test:e2e --workspace apps/api
```

Once the credentials are in Railway, the honest end-to-end check is a real
payment of the smallest tier with a real card, then a refund from the Click
cabinet.

---

## Outstanding before Click can take money

1. **The six membership tiers are priced in USD** ($800–$4,000/year). Neither
   card gateway settles anything but so'm, so `createInvoice` refuses them
   with an explanation and the checkout page shows the transfer route only.
   Someone has to decide the so'm prices; then update
   `MembershipType.priceCents` (minor units — tiyin) and `currency` to `UZS`.
2. **Fiscalisation (ИКПУ / фискальный чек).** Uzbek law requires a fiscal
   receipt for card payments to individuals. Click can issue it if we send the
   ИКПУ code and package for each membership tier. This is a question for the
   association's accountant, not a code question — but the answer changes what
   we send on Complete.
3. **A static IP,** if Click asks to allowlist ours. Railway does not give one
   on the current plan.

## Bank transfer

Set these on the Railway `api` service and the invoice page fills itself in;
until `BANK_ACCOUNT` is set the page says the details are not published yet
rather than showing a blank table:

`BANK_BENEFICIARY`, `BANK_ACCOUNT`, `BANK_NAME`, `BANK_MFO`, `BANK_TAX_ID`,
`BANK_OKED`.

Staff confirm arrivals at `/admin/payments`. Confirming grants membership
immediately, so the queue shows invoice number, payer and amount together —
the three things being matched against a line on the statement.
