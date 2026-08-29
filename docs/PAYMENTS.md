# Payments

## What the checkout offers

**One route: a card through Click.** `/membership/pay` shows a membership
type and a pay button, and nothing else. There is no method chooser — asking
someone to decide between a card and a bank transfer before they have decided
to join is a question they cannot answer yet.

**Everything else is a conversation.** A gateway that is switched off, an
organisation that fits none of the six packages, a laboratory whose accounts
department needs an invoice on a legal entity — all of them land on the same
"talk to us about the price" panel, which is on the page permanently rather
than only as an error state.

**Pricing** comes from the association's own price list and lives in
`apps/api/scripts/seed-membership-pricing.ts`. Two categories, three packages
each, monthly and annual for every package — twelve `MembershipType` rows.
Re-run it with `npm run seed:membership-pricing --workspace apps/api` after
editing; it upserts by slug, so existing members keep their type.

| Method        | Grants membership          | Currency | Offered on the site |
| ------------- | -------------------------- | -------- | ------------------- |
| Click         | automatically, on Complete | UZS only | **live** — credentials set, awaiting first real payment |
| Payme         | automatically, on Perform  | UZS only | no — code exists, not surfaced |
| Bank transfer | staff confirm by hand      | any      | no — arranged by e-mail, confirmed in `/admin/payments` |

Bank transfer is deliberately no longer self-service. The API and the staff
queue still work, so a transfer agreed over e-mail is still recorded and still
grants membership; members simply do not raise those invoices themselves.

A gateway with no credentials is reported as unavailable by
`GET /api/payments/gateways`, and the page replaces the pay button with an
explanation. That is the point: an option that redirects to a gateway which
then rejects the request is worse than an option that is not offered.

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
callback is rejected before it touches the database. They are set on the
Railway `api` service as of 2026-08-17, and `CLICK_MERCHANT_USER_ID` is stored
alongside them — nothing reads it yet, but it is what Click's Merchant API
(refunds, status lookups) needs, and it is easier to keep than to ask for
again.

Verified against production with correctly-signed callbacks: a valid
signature on an order that does not exist answers `-5`, a tampered signature
answers `-1`, and a callback carrying someone else's `service_id` answers
`-1`. That is the proof the key itself is right — the checks in front of it
would look identical with a wrong key, because both end in `-1`.

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

1. ~~The membership tiers are priced in USD.~~ **Done.** All twelve tiers are
   in so'm, from the association's own price list.
2. ~~Fiscalisation (ИКПУ).~~ **Done, on Click's side.** They configured it
   against the ИКПУ supplied during contracting, so nothing extra is sent on
   Complete.
3. ~~Credentials.~~ **Done.** Set on Railway; signature verification confirmed
   against production.

What is left is a single real card payment on the cheapest tier, watched
end to end, then refunded from the Click cabinet. Nothing before that proves
money actually moves.

## Bank transfer

Set these on the Railway `api` service and the invoice page fills itself in;
until `BANK_ACCOUNT` is set the page says the details are not published yet
rather than showing a blank table:

`BANK_BENEFICIARY`, `BANK_ACCOUNT`, `BANK_NAME`, `BANK_MFO`, `BANK_TAX_ID`,
`BANK_OKED`.

Staff confirm arrivals at `/admin/payments`. Confirming grants membership
immediately, so the queue shows invoice number, payer and amount together —
the three things being matched against a line on the statement.
