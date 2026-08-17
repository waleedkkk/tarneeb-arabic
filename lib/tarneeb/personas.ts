import type { AiPersonaId, AiPersonaTendency, OpponentPersonaAssignments } from "./types";

export interface AiPersona {
  id: AiPersonaId;
  name: string;
  title: string;
  description: string;
  tendency: AiPersonaTendency;
  bidBias: number;
  trumpLengthBias: number;
  trumpHonorBias: number;
  leadRankBias: number;
  preserveTrump: boolean;
  preferWinningPressure: boolean;
}

/**
 * ملفات مستقلة تضيف طابعًا مفهومًا للخصم من دون تجاوز مستوى الصعوبة المختار.
 * تظل القواعد القانونية للّمة والمزايدة محكومة بمحرك الذكاء الاصطناعي نفسه.
 */
export const AI_PERSONAS: Record<AiPersonaId, AiPersona> = {
  layaan: {
    id: "layaan", name: "ليان", title: "الحارسة", description: "تحافظ على أوراقها الرابحة ولا ترفع الطلب إلا مع يد موثوقة.", tendency: "تحفّظ",
    bidBias: -0.45, trumpLengthBias: 0.1, trumpHonorBias: 0.85, leadRankBias: -0.12, preserveTrump: true, preferWinningPressure: false,
  },
  faris: {
    id: "faris", name: "فارس", title: "الشريك الوفي", description: "يلعب بهدوء ويدعم اللمّات التي بدأها فريقه قبل المخاطرة.", tendency: "دعم",
    bidBias: 0, trumpLengthBias: 0.5, trumpHonorBias: 0.4, leadRankBias: -0.03, preserveTrump: true, preferWinningPressure: false,
  },
  samar: {
    id: "samar", name: "سامر", title: "المبادر", description: "يضغط بالأنواع القوية ويسعى إلى حسم اللمّة عند توفر فرصة آمنة.", tendency: "ضغط",
    bidBias: 0.6, trumpLengthBias: 0.8, trumpHonorBias: 0.25, leadRankBias: 0.18, preserveTrump: false, preferWinningPressure: true,
  },
  rania: {
    id: "rania", name: "رانيا", title: "المستدرِجة", description: "تفتح بأنواع متوازنة لاستكشاف الخصوم وتترك الأوراق العالية للحظة الأنسب.", tendency: "استدراج",
    bidBias: 0.2, trumpLengthBias: 0.25, trumpHonorBias: 0.65, leadRankBias: -0.05, preserveTrump: true, preferWinningPressure: false,
  },
  nader: {
    id: "nader", name: "نادر", title: "قارئ الطاولة", description: "يركّز على الأنواع التي كشفها الخصوم ويختار أقل ورقة رابحة ممكنة بدقة.", tendency: "تحكّم",
    bidBias: 0.1, trumpLengthBias: 0.35, trumpHonorBias: 0.7, leadRankBias: 0.06, preserveTrump: true, preferWinningPressure: false,
  },
};

export const DEFAULT_OPPONENT_PERSONAS: OpponentPersonaAssignments = { 1: "layaan", 2: "faris", 3: "samar" };

export function getAiPersona(personaId: AiPersonaId | undefined): AiPersona {
  return AI_PERSONAS[personaId ?? "faris"];
}
