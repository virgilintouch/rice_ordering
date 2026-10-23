import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

export const INVALID_FILTER_MESSAGE = "有筛选条件无效，未返回数据";

export function parseId(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^[1-9]\d{0,15}$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

export function requiredId(value: unknown, label: string): number {
  const id = parseId(value);
  if (id == null) throw new PublicError(`${label}无效`);
  return id;
}

function cleanText(raw: string): string {
  return raw.replace(/\u0000/g, "").trim();
}

export function requiredText(raw: string, label: string, max: number): string {
  const text = cleanText(raw);
  if (!text) throw new PublicError(`${label}为必填`);
  if (text.length > max) throw new PublicError(`${label}不能超过 ${max} 个字符`);
  return text;
}

export function optionalText(
  raw: string | undefined,
  label: string,
  max: number,
): string | null {
  const text = cleanText(raw ?? "");
  if (!text) return null;
  if (text.length > max) throw new PublicError(`${label}不能超过 ${max} 个字符`);
  return text;
}

export function parseYear(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  if (year < 2000 || year > 2100) return null;
  return year;
}

export function requiredYear(raw: string): number {
  const year = parseYear(raw);
  if (year == null) throw new PublicError("年份须为 2000–2100 的整数");
  return year;
}

const MONEY_RE = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

export function parseMoney(raw: string, label: string): number {
  const text = raw.trim();
  if (!MONEY_RE.test(text)) {
    throw new PublicError(`${label}须为大于 0、最多两位小数的金额`);
  }
  const value = Number(text);
  if (!(value > 0) || value > LIMITS.moneyMax) {
    throw new PublicError(`${label}须大于 0 且不超过 ${LIMITS.moneyMax}`);
  }
  return value;
}

export function assertMoneyNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > LIMITS.moneyMax) {
    throw new PublicError(`${label}须大于 0 且不超过 ${LIMITS.moneyMax}`);
  }
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) {
    throw new PublicError(`${label}最多两位小数`);
  }
}

export function parsePositiveInt(raw: string, label: string, max: number): number {
  const text = raw.trim();
  if (!/^[1-9]\d*$/.test(text)) throw new PublicError(`${label}须为正整数`);
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n > max) {
    throw new PublicError(`${label}须为 1–${max} 的整数`);
  }
  return n;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** LIKE/ILIKE contains-match. `%`, `_`, and `\` in the text stay literal. */
export function ilikeContains(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

export function clipDisplay(raw: string, max: number): string {
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
}
