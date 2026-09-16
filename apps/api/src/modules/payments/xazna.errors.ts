/**
 * Xazna's error vocabulary, from the integration guide.
 *
 * Its four codes are the whole set the guide defines, so anything we would
 * otherwise want to say has to arrive as UNKNOWN. That is a limitation of the
 * protocol rather than of this file — the detail goes in `message`, which the
 * guide shows being displayed to the payer.
 */
export const XaznaErrorCode = {
  INVOICE_NOT_FOUND: -1,
  INVOICE_ALREADY_PAID: -2,
  MERCHANT_UNAVAILABLE: -3,
  UNKNOWN: -4,
} as const;

export type XaznaErrorCodeValue =
  (typeof XaznaErrorCode)[keyof typeof XaznaErrorCode];

export class XaznaError extends Error {
  constructor(
    readonly code: XaznaErrorCodeValue,
    message?: string,
  ) {
    super(message ?? DEFAULT_MESSAGE[code]);
  }

  toJson() {
    return { code: this.code, message: this.message };
  }
}

/**
 * Wording for each code. Uzbek, because the guide's own example returns
 * `"invoys topilmadi"` — Xazna shows these to the payer, so they should read
 * as the rest of its app does, not as our server's internal English.
 */
const DEFAULT_MESSAGE: Record<XaznaErrorCodeValue, string> = {
  [XaznaErrorCode.INVOICE_NOT_FOUND]: 'invoys topilmadi',
  [XaznaErrorCode.INVOICE_ALREADY_PAID]: "invoys allaqachon to'langan",
  [XaznaErrorCode.MERCHANT_UNAVAILABLE]: 'merchant vaqtincha mavjud emas',
  [XaznaErrorCode.UNKNOWN]: "noma'lum xatolik",
};
