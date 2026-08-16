import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GameSettings, MatchState, RoundRecord } from "./types";

const MATCH_KEY = "tarneeb.match.v1";
const SETTINGS_KEY = "tarneeb.settings.v1";
export const STATS_KEY = "tarneeb.stats.v1";

export async function loadStoredMatch(): Promise<MatchState | null> {
  try {
    const raw = await AsyncStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchState;
    if (!parsed || typeof parsed.phase !== "string" || !Array.isArray(parsed.players)) return null;
    // لا يمكن استئناف غرفة شبكة بعد إغلاق التطبيق، لأن المضيف والاتصال لا يعودان صالحين.
    if (parsed.matchMode === "localRoom") return null;
    const players = parsed.players.map((player) => ({
      ...player,
      handCount: typeof player.handCount === "number" ? player.handCount : player.hand.length,
    }));
    const legacyBids = parsed.bidding?.bids?.map((entry) => ({
      ...entry,
      playerName: players.find((player) => player.id === entry.playerId)?.name ?? `اللاعب ${entry.playerId + 1}`,
    })) ?? [];
    return {
      ...parsed,
      matchMode: "solo",
      players,
      matchLog: {
        bids: Array.isArray(parsed.matchLog?.bids) ? parsed.matchLog.bids : legacyBids,
        tricks: Array.isArray(parsed.matchLog?.tricks) ? parsed.matchLog.tricks : [],
      },
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

/** يعيد سجل نتائج اللعب الفردي المحفوظ على الجهاز، من الأحدث إلى الأقدم. */
export async function loadStoredStats(): Promise<RoundRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((record): record is RoundRecord => typeof record?.roundNumber === "number" && typeof record?.timestamp === "number")
      : [];
  } catch {
    return [];
  }
}

/** يضيف نتيجة الجولة المكتملة مع الاحتفاظ بأحدث مئة جولة فقط. */
export async function appendRoundRecord(record: RoundRecord): Promise<void> {
  try {
    const current = await loadStoredStats();
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify([record, ...current].slice(0, 100)));
  } catch {
    // تبقى نتيجة الجولة ظاهرة حتى إن تعذر حفظ الإحصاءات على الجهاز.
  }
}

export async function clearStoredStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
  } catch {
    // لا نعرض خطأ يقطع شاشة الإحصاءات عند تعذر مسح التخزين.
  }
}
