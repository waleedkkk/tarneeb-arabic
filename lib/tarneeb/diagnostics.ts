import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { redactDiagnosticText } from "./diagnostic-redaction";

const DIAGNOSTIC_KEY = "tarneeb.diagnostics.v1";
const MAX_ENTRIES = 30;

export type DiagnosticKind = "react" | "javascript" | "network" | "state" | "manual";

export interface DiagnosticEntry {
  id: string;
  at: string;
  kind: DiagnosticKind;
  message: string;
  stack?: string;
  appVersion: string;
  nativeBuild: string;
  platform: string;
  fatal?: boolean;
}

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let writeQueue = Promise.resolve();
let globalHandlerInstalled = false;

function createEntry(input: Omit<DiagnosticEntry, "id" | "at" | "appVersion" | "nativeBuild" | "platform">): DiagnosticEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    kind: input.kind,
    message: redactDiagnosticText(input.message) || "خطأ غير موصوف",
    stack: input.stack ? redactDiagnosticText(input.stack) : undefined,
    fatal: input.fatal,
    appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "غير معروف",
    nativeBuild: Constants.nativeBuildVersion ?? "غير معروف",
    platform: Platform.OS,
  };
}

export async function readDiagnostics(): Promise<DiagnosticEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTIC_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DiagnosticEntry => entry && typeof entry.message === "string" && typeof entry.at === "string").slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function recordDiagnostic(input: Omit<DiagnosticEntry, "id" | "at" | "appVersion" | "nativeBuild" | "platform">): Promise<void> {
  const entry = createEntry(input);
  writeQueue = writeQueue.then(async () => {
    const existing = await readDiagnostics();
    await AsyncStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)));
  }).catch(() => undefined);
  return writeQueue;
}

export async function clearDiagnostics(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DIAGNOSTIC_KEY);
  } catch {
    // لا يعرقل فشل التخزين مسار الاستخدام العادي.
  }
}

export function formatDiagnosticReport(entries: DiagnosticEntry[]): string {
  return JSON.stringify({
    reportVersion: 1,
    createdAt: new Date().toISOString(),
    privacy: "لا يتضمن التقرير أوراق اللاعبين أو رموز الغرفة أو مفاتيح الاتصال.",
    entries,
  }, null, 2);
}

export function installGlobalDiagnosticHandler() {
  if (globalHandlerInstalled) return;
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  globalHandlerInstalled = true;
  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void recordDiagnostic({ kind: "javascript", message: error?.message ?? String(error), stack: error?.stack, fatal: Boolean(isFatal) });
    previousHandler?.(error, isFatal);
  });
}
