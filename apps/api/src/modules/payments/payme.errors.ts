/**
 * Payme's merchant protocol is JSON-RPC with a fixed error vocabulary. The
 * codes are not ours to choose — Payme's own conformance suite asserts on them
 * before a merchant is allowed live, and the wrong code for a condition fails
 * that test even when the behaviour is right.
 *
 * Messages are returned in the three languages Payme expects.
 */
export const PaymeErrorCode = {
  /** Malformed request or a method we do not implement. */
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  /** Basic-auth failed, or the request did not carry it. */
  UNAUTHORIZED: -32504,

  /** The order does not exist, or the account fields do not identify one. */
  ORDER_NOT_FOUND: -31050,
  /** The order exists but cannot be paid — already paid, or cancelled. */
  ORDER_UNAVAILABLE: -31051,
  /** Amount in the request does not match the amount on the order. */
  WRONG_AMOUNT: -31001,

  /** Transaction not found by the id Payme supplied. */
  TRANSACTION_NOT_FOUND: -31003,
  /** The transaction is not in a state where this operation is legal. */
  CANNOT_PERFORM: -31008,
  CANNOT_CANCEL: -31007,
} as const;

export type PaymeErrorCodeValue =
  (typeof PaymeErrorCode)[keyof typeof PaymeErrorCode];

export interface PaymeMessage {
  ru: string;
  uz: string;
  en: string;
}

const MESSAGES: Record<number, PaymeMessage> = {
  [PaymeErrorCode.UNAUTHORIZED]: {
    ru: 'Недостаточно прав для выполнения операции.',
    uz: 'Amalni bajarish uchun huquqlar yetarli emas.',
    en: 'Insufficient privileges for this operation.',
  },
  [PaymeErrorCode.ORDER_NOT_FOUND]: {
    ru: 'Заказ не найден.',
    uz: 'Buyurtma topilmadi.',
    en: 'Order not found.',
  },
  [PaymeErrorCode.ORDER_UNAVAILABLE]: {
    ru: 'Заказ не может быть оплачен.',
    uz: "Buyurtma to'lanishi mumkin emas.",
    en: 'This order cannot be paid.',
  },
  [PaymeErrorCode.WRONG_AMOUNT]: {
    ru: 'Неверная сумма.',
    uz: "Noto'g'ri summa.",
    en: 'Incorrect amount.',
  },
  [PaymeErrorCode.TRANSACTION_NOT_FOUND]: {
    ru: 'Транзакция не найдена.',
    uz: 'Tranzaksiya topilmadi.',
    en: 'Transaction not found.',
  },
  [PaymeErrorCode.CANNOT_PERFORM]: {
    ru: 'Невозможно выполнить операцию.',
    uz: 'Amalni bajarib bo‘lmaydi.',
    en: 'Unable to perform this operation.',
  },
  [PaymeErrorCode.CANNOT_CANCEL]: {
    ru: 'Невозможно отменить транзакцию.',
    uz: 'Tranzaksiyani bekor qilib bo‘lmaydi.',
    en: 'Unable to cancel this transaction.',
  },
  [PaymeErrorCode.METHOD_NOT_FOUND]: {
    ru: 'Метод не найден.',
    uz: 'Metod topilmadi.',
    en: 'Method not found.',
  },
  [PaymeErrorCode.INVALID_REQUEST]: {
    ru: 'Некорректный запрос.',
    uz: "Noto'g'ri so'rov.",
    en: 'Malformed request.',
  },
};

/**
 * Thrown by the handlers and converted to a JSON-RPC error body by the
 * controller. A thrown error must never become an HTTP error status: Payme
 * expects 200 with an `error` member, and anything else it treats as the
 * endpoint being broken.
 */
export class PaymeError extends Error {
  constructor(
    readonly code: number,
    /** Which request field was at fault, when the code calls for it. */
    readonly data?: string,
  ) {
    super(`Payme error ${code}`);
  }

  toJson() {
    return {
      code: this.code,
      message: MESSAGES[this.code] ?? MESSAGES[PaymeErrorCode.INVALID_REQUEST],
      ...(this.data ? { data: this.data } : {}),
    };
  }
}
