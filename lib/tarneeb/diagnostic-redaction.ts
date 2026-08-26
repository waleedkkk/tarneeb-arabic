const SENSITIVE_ARRAY = /\b(hand|cards?)\s*[:=]\s*\[[^\]]*\]/gi;
const SENSITIVE_ASSIGNMENT = /\b(room(?:Id|Code)?|key|token|secret|password|host|address|port)\s*[:=]\s*([^\s,;\]}]+)/gi;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{20,}\b/g;
const MAX_TEXT_LENGTH = 1_200;

/** يزيل بيانات الاتصال والأوراق وأي معرّف طويل من نص التشخيص قبل حفظه أو مشاركته. */
export function redactDiagnosticText(value: unknown): string {
  const source = typeof value === "string" ? value : value instanceof Error ? value.message : String(value ?? "");
  return source
    .replace(SENSITIVE_ARRAY, "$1=[محجوب]")
    .replace(SENSITIVE_ASSIGNMENT, "$1=[محجوب]")
    .replace(LONG_TOKEN, "[معرّف-محجوب]")
    .slice(0, MAX_TEXT_LENGTH);
}
