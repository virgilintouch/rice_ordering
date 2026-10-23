/** Safe to show in the page. Everything else becomes a generic message. */
export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

const SQLSTATE_MESSAGES: Record<string, string> = {
  "23505": "数据已存在，请检查是否重复",
  "23503": "关联数据不存在或仍被引用",
  "23514": "数据不符合约束",
  "22001": "内容过长",
  "22P02": "数据格式不正确",
  "22003": "数值超出范围",
};

function sqlState(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code: unknown }).code;
  if (typeof code !== "string" || !/^[0-9A-Z]{5}$/.test(code)) return null;
  return code;
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PublicError) return error.message;
  const state = sqlState(error);
  if (state && SQLSTATE_MESSAGES[state]) return SQLSTATE_MESSAGES[state];
  return fallback;
}

export function logServerError(scope: string, error: unknown): void {
  if (error instanceof PublicError) return;
  console.error(`[${scope}]`, error);
}

/** next/navigation redirect() throws; callers must rethrow it. */
export function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
