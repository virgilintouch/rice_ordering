/** Shared bounds for writes and filters. Database types stay as they are. */
export const LIMITS = {
  customerName: 64,
  source: 200,
  note: 2000,
  recipientName: 100,
  recipientPhone: 32,
  address: 500,
  label: 64,
  orderNote: 2000,
  packCountMax: 99_999,
  jinPerPackMax: 9_999,
  /** Matches NUMERIC(10,2). */
  moneyMax: 99_999_999.99,
  /** Matches NUMERIC(12,2). */
  orderAmountMax: 9_999_999_999.99,
  importMaxBytes: 2 * 1024 * 1024,
  importMaxRows: 500,
  keywordMax: 64,
  keywordCountMax: 20,
} as const;
