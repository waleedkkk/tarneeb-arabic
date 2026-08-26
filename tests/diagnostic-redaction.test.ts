import { describe, expect, it } from "vitest";
import { redactDiagnosticText } from "../lib/tarneeb/diagnostic-redaction";

describe("خصوصية سجل التشخيص", () => {
  it("يحجب أوراق اللاعبين وبيانات الاتصال ورموز الغرفة", () => {
    const source = "roomCode=482913 key=abc123token host=192.168.1.9 port=48152 hand=[AS, 10H, JC] cards=[QD, 7S]";
    const redacted = redactDiagnosticText(source);

    expect(redacted).toContain("roomCode=[محجوب]");
    expect(redacted).toContain("key=[محجوب]");
    expect(redacted).toContain("host=[محجوب]");
    expect(redacted).toContain("hand=[محجوب]");
    expect(redacted).toContain("cards=[محجوب]");
    expect(redacted).not.toContain("482913");
    expect(redacted).not.toContain("192.168.1.9");
    expect(redacted).not.toContain("10H");
    expect(redacted).not.toContain("QD");
  });

  it("يقيد طول النص لضمان بقاء السجل صغيرًا على الهاتف", () => {
    expect(redactDiagnosticText("نص ".repeat(1_000)).length).toBe(1_200);
  });
});
