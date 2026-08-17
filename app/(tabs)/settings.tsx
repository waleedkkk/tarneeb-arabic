import { arabicRow } from "@/lib/rtl-style";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "@/lib/tarneeb/game-context";
import { CardBack } from "@/components/tarneeb/card";
import { AI_PERSONAS, getAiPersona } from "@/lib/tarneeb/personas";
import type { AiLevel, AiPersonaId, AiStyle, AnimationSpeed, CardBackPattern, CardFaceTheme, CardFanCurve, OpponentCardDensity, OpponentPersonaAssignments, SoundProfile, TableTextSize, TableTheme, TurnTimerSeconds } from "@/lib/tarneeb/types";

const CARD_FAN_CURVES: { value: CardFanCurve; label: string }[] = [
  { value: "gentle", label: "خفيف" },
  { value: "balanced", label: "متوازن" },
  { value: "deep", label: "عميق" },
];
const CARD_BACK_PATTERNS: { value: CardBackPattern; label: string }[] = [
  { value: "royal", label: "ملكي" },
  { value: "navy", label: "شبكي" },
  { value: "emerald", label: "تراثي" },
];
const TABLE_TEXT_SIZES: { value: TableTextSize; label: string }[] = [
  { value: "normal", label: "عادي" },
  { value: "large", label: "كبير" },
];
const OPPONENT_CARD_DENSITIES: { value: OpponentCardDensity; label: string }[] = [
  { value: "compact", label: "متقارب" },
  { value: "balanced", label: "متوازن" },
  { value: "spacious", label: "متباعد" },
];
const TURN_TIMER_OPTIONS: { value: TurnTimerSeconds; label: string }[] = [
  { value: 0, label: "معطّل" },
  { value: 30, label: "30 ث" },
  { value: 45, label: "45 ث" },
  { value: 60, label: "60 ث" },
];
const AI_LEVELS: { value: AiLevel; label: string }[] = [
  { value: "مبتدئ", label: "مبتدئ" },
  { value: "متوازن", label: "متوازن" },
  { value: "خبير", label: "خبير" },
];
const AI_STYLES: { value: AiStyle; label: string }[] = [
  { value: "حذر", label: "حذر" },
  { value: "متوازن", label: "متوازن" },
  { value: "مبادر", label: "مبادر" },
];
const TABLE_THEMES: { value: TableTheme; label: string }[] = [
  { value: "emerald", label: "زمردية" },
  { value: "midnight", label: "ليلية" },
  { value: "sand", label: "رملية" },
];
const CARD_FACE_THEMES: { value: CardFaceTheme; label: string }[] = [
  { value: "ivory", label: "عاجية" },
  { value: "parchment", label: "ورقية" },
  { value: "midnight", label: "داكنة" },
];
const SOUND_PROFILES: { value: SoundProfile; label: string }[] = [
  { value: "هادئة", label: "هادئة" },
  { value: "متوازنة", label: "متوازنة" },
  { value: "بارزة", label: "بارزة" },
];
const ANIMATION_SPEEDS: { value: AnimationSpeed; label: string }[] = [
  { value: "هادئة", label: "هادئة" },
  { value: "متوازنة", label: "متوازنة" },
  { value: "سريعة", label: "سريعة" },
];

export default function SettingsScreen() {
  const { settings, updateSettings } = useGame();
  const selectOpponentPersona = (seat: 1 | 2 | 3, personaId: AiPersonaId) => {
    const current = settings.opponentPersonas;
    const currentSeat = ([1, 2, 3] as const).find((candidate) => current[candidate] === personaId);
    const next: OpponentPersonaAssignments = { ...current, [seat]: personaId };
    if (currentSeat !== undefined && currentSeat !== seat) next[currentSeat] = current[seat];
    updateSettings({ opponentPersonas: next });
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>الإعدادات</Text>
        <Text style={styles.subtitle}>خصص النسخة المحلية من طرنيب بما يناسب جلستك.</Text>
        <Section title="هدف المباراة"><View style={styles.choiceRow}>{([31, 41, 61] as const).map((score) => <Choice key={score} label={`${score} نقطة`} active={settings.targetScore === score} onPress={() => updateSettings({ targetScore: score })} />)}</View></Section>
        <Section title="مستوى الخصوم"><View style={styles.choiceRow}>{AI_LEVELS.map((level) => <Choice key={level.value} label={level.label} active={settings.aiLevel === level.value} onPress={() => updateSettings({ aiLevel: level.value })} />)}</View><Text style={styles.curveDescription}>المبتدئ يتبع القواعد الأساسية، والمتوازن يدير المخاطرة، والخبير يقرأ الأوراق المكشوفة ويحافظ على أوراقه الرابحة.</Text></Section>
        <Section title="أسلوب الخصوم"><View style={styles.choiceRow}>{AI_STYLES.map((style) => <Choice key={style.value} label={style.label} active={settings.aiStyle === style.value} onPress={() => updateSettings({ aiStyle: style.value })} />)}</View><Text style={styles.curveDescription}>الحذر يقلّل المزايدات والمخاطرة، والمتوازن مناسب للتعلّم، والمبادر يضغط للمّات عندما تكون يده قوية.</Text></Section>
        <Section title="شخصيات الخصوم">
          <Text style={styles.curveDescription}>لكل خصم شخصية مستقلة تؤثر في قراراته داخل مستوى الصعوبة المختار. عند اختيار شخصية مستخدمة لمقعد آخر، تتبادل المقعدَين تلقائيًا لتبقى الأسماء فريدة.</Text>
          {([1, 2, 3] as const).map((seat) => <OpponentPersonaPicker key={seat} seat={seat} value={settings.opponentPersonas[seat]} onSelect={(personaId) => selectOpponentPersona(seat, personaId)} />)}
        </Section>
        <Section title="التغذية الراجعة"><ToggleRow label="الاهتزاز للمسات المهمة" description="عند بدء الجولة ولعب الورق والنتائج." value={settings.hapticsEnabled} onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })} /><ToggleRow label="المؤثرات الصوتية" description="أصوات خفيفة للتوزيع ولعب الورق وحسم اللمّة." value={settings.soundEnabled} onChange={(soundEnabled) => updateSettings({ soundEnabled })} /></Section>
        <Section title="صوت اللعبة"><View style={styles.choiceRow}>{SOUND_PROFILES.map((profile) => <Choice key={profile.value} label={profile.label} active={settings.soundProfile === profile.value} onPress={() => updateSettings({ soundProfile: profile.value })} />)}</View><Text style={styles.curveDescription}>يتحكم في شدة أصوات توزيع الأوراق ولعبها وحسم اللمّة، مع بقاء زر المؤثرات الصوتية هو مفتاح التشغيل العام.</Text></Section>
        <Section title="سرعة الحركات"><View style={styles.choiceRow}>{ANIMATION_SPEEDS.map((speed) => <Choice key={speed.value} label={speed.label} active={settings.animationSpeed === speed.value} onPress={() => updateSettings({ animationSpeed: speed.value })} />)}</View><Text style={styles.curveDescription}>تطبّق على توزيع الأوراق والسحب والرمي وجمع اللمّة. اختر السريعة لوتيرة أسرع أو الهادئة لمشاهدة التحركات بوضوح.</Text></Section>
        <Section title="مؤقّت الدور"><View style={styles.timerChoiceRow}>{TURN_TIMER_OPTIONS.map((option) => <Choice key={option.value} label={option.label} active={settings.turnTimerSeconds === option.value} onPress={() => updateSettings({ turnTimerSeconds: option.value })} />)}</View><Text style={styles.curveDescription}>يظهر في دورك فقط خلال اللعب الفردي وينبّه صوتيًا قبل آخر خمس ثوانٍ. لا يمنعك انتهاء الوقت من إكمال الحركة.</Text></Section>
        <Section title="مظهر الأوراق"><View style={styles.choiceRow}>{CARD_FAN_CURVES.map((curve) => <Choice key={curve.value} label={curve.label} active={settings.cardFanCurve === curve.value} onPress={() => updateSettings({ cardFanCurve: curve.value })} />)}</View><Text style={styles.curveDescription}>اختر ارتفاع القوس وميل الأوراق في يدك. يطبّق التغيير فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="نقش ظهر البطاقات"><View style={styles.patternRow}>{CARD_BACK_PATTERNS.map((pattern) => <CardBackChoice key={pattern.value} {...pattern} active={settings.cardBackPattern === pattern.value} onPress={() => updateSettings({ cardBackPattern: pattern.value })} />)}</View><Text style={styles.curveDescription}>اختر النقش الذي يظهر على أوراق الخصوم. يُطبّق التغيير فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="وجه البطاقات"><View style={styles.choiceRow}>{CARD_FACE_THEMES.map((theme) => <Choice key={theme.value} label={theme.label} active={settings.cardFaceTheme === theme.value} onPress={() => updateSettings({ cardFaceTheme: theme.value })} />)}</View><Text style={styles.curveDescription}>غيّر خلفية وجه أوراقك وتباين أرقامها، مع الحفاظ على وضوح اللونين الأحمر والأسود.</Text></Section>
        <Section title="سطح الطاولة"><View style={styles.choiceRow}>{TABLE_THEMES.map((theme) => <Choice key={theme.value} label={theme.label} active={settings.tableTheme === theme.value} onPress={() => updateSettings({ tableTheme: theme.value })} />)}</View><Text style={styles.curveDescription}>اختر سطحًا زمرديًا تقليديًا أو ليليًا هادئًا أو رمليًا دافئًا. يظهر التغيير فورًا داخل المباراة.</Text></Section>
        <Section title="قراءة الطاولة"><View style={styles.choiceRow}>{TABLE_TEXT_SIZES.map((size) => <Choice key={size.value} label={size.label} active={settings.tableTextSize === size.value} onPress={() => updateSettings({ tableTextSize: size.value })} />)}</View><Text style={styles.curveDescription}>يكبّر أسماء اللاعبين والنتائج وبيانات الطرنيب داخل الطاولة لتسهيل القراءة. يُطبّق فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="تكديس أوراق الخصوم"><View style={styles.choiceRow}>{OPPONENT_CARD_DENSITIES.map((density) => <Choice key={density.value} label={density.label} active={settings.opponentCardDensity === density.value} onPress={() => updateSettings({ opponentCardDensity: density.value })} />)}</View><Text style={styles.curveDescription}>يتحكم في تباعد أوراق الخصوم على الطاولة. اختر المتقارب للشاشات الصغيرة أو المتباعد لتمييز الأوراق أكثر.</Text></Section>
        <Section title="للاعبين المتقدمين"><ToggleRow label="مؤشر قوة الأنواع" description="يعرض الاقتراح والدرجات وأيقونة شرح طريقة الاحتساب في المزايدة." value={settings.showStrengthIndicator} onChange={(showStrengthIndicator) => updateSettings({ showStrengthIndicator })} /><ToggleRow label="بطاقات تعريف الخصوم" description="اعرض ملف كل خصم وأسلوب لعبه عند النقر على صورته الرمزية أثناء المباراة." value={settings.showOpponentProfileCards} onChange={(showOpponentProfileCards) => updateSettings({ showOpponentProfileCards })} /></Section>
        <View style={styles.note}><Text style={styles.noteTitle}>اللعب الجماعي</Text><Text style={styles.noteText}>يمكنك إنشاء غرفة محلية وضم ثلاثة لاعبين عبر الشبكة نفسها أو نقطة الاتصال، من دون حاجة إلى الإنترنت.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressed]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function CardBackChoice({ value, label, active, onPress }: { value: CardBackPattern; label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={`نقش ظهر البطاقات ${label}`} onPress={onPress} style={({ pressed }) => [styles.patternChoice, active && styles.patternChoiceActive, pressed && styles.pressed]}><CardBack compact pattern={value} /><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function OpponentPersonaPicker({ seat, value, onSelect }: { seat: 1 | 2 | 3; value: AiPersonaId; onSelect: (personaId: AiPersonaId) => void }) {
  const persona = getAiPersona(value);
  const seatLabel = seat === 2 ? "شريكك" : seat === 1 ? "الخصم الأيمن" : "الخصم الأيسر";
  return <View style={styles.personaPicker}><View style={styles.personaHeading}><View style={styles.personaAvatar}><Text style={styles.personaAvatarText}>{persona.name.slice(0, 1)}</Text></View><View style={styles.personaCopy}><Text style={styles.personaSeat}>{seatLabel}: {persona.name}</Text><Text style={styles.personaTitle}>{persona.title}</Text></View></View><Text style={styles.personaDescription}>{persona.description}</Text><View style={styles.personaOptions}>{Object.values(AI_PERSONAS).map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`اختيار شخصية ${option.name}`} onPress={() => onSelect(option.id)} style={({ pressed }) => [styles.personaOption, value === option.id && styles.personaOptionActive, pressed && styles.pressed]}><Text style={[styles.personaOptionText, value === option.id && styles.personaOptionTextActive]}>{option.name}</Text></Pressable>)}</View></View>;
}
function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggleRow}><Switch value={value} onValueChange={onChange} trackColor={{ false: "#365A4C", true: "#D39F28" }} thumbColor="#FFF8E7" /><View style={styles.toggleText}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E", direction: "ltr" }, content: { padding: 22, paddingBottom: 40 }, title: { color: "#FFF8E7", fontSize: 31, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, subtitle: { color: "#B4D6C7", fontSize: 14, lineHeight: 21, textAlign: "right", marginTop: 4, writingDirection: "rtl" }, section: { backgroundColor: "#16624A", borderRadius: 20, padding: 16, marginTop: 18 }, sectionTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 13, writingDirection: "rtl" }, choiceRow: { flexDirection: arabicRow(), gap: 8 }, timerChoiceRow: { flexDirection: arabicRow(), gap: 7 }, choice: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,248,231,0.25)", alignItems: "center", justifyContent: "center" }, choiceActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, patternRow: { flexDirection: arabicRow(), gap: 8 }, patternChoice: { flex: 1, minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,248,231,0.25)", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 6 }, patternChoiceActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, choiceText: { color: "#D9EEE4", fontWeight: "700", fontSize: 12, writingDirection: "rtl" }, choiceTextActive: { color: "#17211D" }, curveDescription: { color: "#B4D6C7", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 10, writingDirection: "rtl" }, personaPicker: { borderTopWidth: 1, borderTopColor: "rgba(255,248,231,0.14)", paddingTop: 13, marginTop: 13 }, personaHeading: { flexDirection: arabicRow(), alignItems: "center", gap: 9 }, personaAvatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center" }, personaAvatarText: { color: "#17211D", fontSize: 15, fontWeight: "900", writingDirection: "rtl" }, personaCopy: { flex: 1, alignItems: "flex-end" }, personaSeat: { color: "#FFF8E7", fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, personaTitle: { color: "#F5D889", fontSize: 11, fontWeight: "700", textAlign: "right", writingDirection: "rtl", marginTop: 1 }, personaDescription: { color: "#B4D6C7", fontSize: 11, lineHeight: 16, textAlign: "right", marginTop: 6, writingDirection: "rtl" }, personaOptions: { flexDirection: arabicRow(), flexWrap: "wrap", gap: 6, marginTop: 9 }, personaOption: { minWidth: 54, minHeight: 32, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,248,231,0.24)", alignItems: "center", justifyContent: "center" }, personaOptionActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, personaOptionText: { color: "#D9EEE4", fontWeight: "700", fontSize: 11, writingDirection: "rtl" }, personaOptionTextActive: { color: "#17211D" }, pressed: { transform: [{ scale: 0.965 }], opacity: 0.82, elevation: 1, shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }, toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,248,231,0.12)" }, toggleText: { flex: 1, alignItems: "flex-end" }, toggleLabel: { color: "#FFF8E7", fontSize: 14, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, toggleDescription: { color: "#B4D6C7", fontSize: 11, textAlign: "right", marginTop: 2, writingDirection: "rtl" }, note: { backgroundColor: "rgba(227,179,65,0.13)", borderWidth: 1, borderColor: "rgba(227,179,65,0.35)", borderRadius: 18, padding: 15, marginTop: 22 }, noteTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 5, writingDirection: "rtl" },
});
