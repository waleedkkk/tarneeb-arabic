import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GameSettings, MatchState } from "./types";

const MATCH_KEY = "tarneeb.match.v1";
const SETTINGS_KEY = "tarneeb.settings.v1";

export async function loadStoredMatch(): Promise<MatchState | null> {
  try {
    const raw = await AsyncStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchState;
    if (!parsed || typeof parsed.phase !== "string" || !Array.isArray(parsed.players)) return null;
    // لا يمكن استئناف غرفة شبكة بعد إغلاق التطبيق، لأن المضيف والاتصال لا يعودان صالحين.
    if (parsed.matchMode === "localRoom") return null;
    return {
      ...parsed,
      matchMode: "solo",
      players: parsed.players.map((player) => ({
        ...player,
        handCount: typeof player.handCount === "number" ? player.handCount : player.hand.length,
      })),
    };
  } catch {
    return null;
  }
}

export async function saveStoredMatch(state: MatchState): Promise<void> {
  try {
    if (state.phase === "home") {
      await AsyncStorage.removeItem(MATCH_KEY);
      return;
    }
    await AsyncStorage.setItem(MATCH_KEY, JSON.stringify(state));
  } catch {
    // فشل التخزين لا يوقف مسار اللعب المحلي.
  }
}

export async function loadStoredSettings(): Promise<Partial<GameSettings> | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<GameSettings>) : null;
  } catch {
    return null;
  }
}

export async function saveStoredSettings(settings: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // تظل الإعدادات الحالية قابلة للاستخدام إن تعذر التخزين.
  }
}
