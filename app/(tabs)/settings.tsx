import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "@/lib/tarneeb/game-context";
import { CardBack } from "@/components/tarneeb/card";
import type { CardBackPattern, CardFanCurve, OpponentCardDensity, TableTextSize } from "@/lib/tarneeb/types";

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

export default function SettingsScreen() {
  const { settings, updateSettings } = useGame();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>الإعدادات</Text>
        <Text style={styles.subtitle}>خصص النسخة المحلية من طرنيب بما يناسب جلستك.</Text>
        <Section title="هدف المباراة"><View style={styles.choiceRow}>{([31, 41, 61] as const).map((score) => <Choice key={score} label={`${score} نقطة`} active={settings.targetScore === score} onPress={() => updateSettings({ targetScore: score })} />)}</View></Section>
        <Section title="أسلوب الخصوم"><View style={styles.choiceRow}>{(["هادئ", "متوازن", "جريء"] as const).map((level) => <Choice key={level} label={level} active={settings.aiLevel === level} onPress={() => updateSettings({ aiLevel: level })} />)}</View></Section>
        <Section title="التغذية الراجعة"><ToggleRow label="الاهتزاز للمسات المهمة" description="عند بدء الجولة ولعب الورق والنتائج." value={settings.hapticsEnabled} onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })} /><ToggleRow label="المؤثرات الصوتية" description="أصوات خفيفة للتوزيع ولعب الورق وحسم اللمّة." value={settings.soundEnabled} onChange={(soundEnabled) => updateSettings({ soundEnabled })} /></Section>
        <Section title="مظهر الأوراق"><View style={styles.choiceRow}>{CARD_FAN_CURVES.map((curve) => <Choice key={curve.value} label={curve.label} active={settings.cardFanCurve === curve.value} onPress={() => updateSettings({ cardFanCurve: curve.value })} />)}</View><Text style={styles.curveDescription}>اختر ارتفاع القوس وميل الأوراق في يدك. يطبّق التغيير فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="نقش ظهر البطاقات"><View style={styles.patternRow}>{CARD_BACK_PATTERNS.map((pattern) => <CardBackChoice key={pattern.value} {...pattern} active={settings.cardBackPattern === pattern.value} onPress={() => updateSettings({ cardBackPattern: pattern.value })} />)}</View><Text style={styles.curveDescription}>اختر النقش الذي يظهر على أوراق الخصوم. يُطبّق التغيير فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="قراءة الطاولة"><View style={styles.choiceRow}>{TABLE_TEXT_SIZES.map((size) => <Choice key={size.value} label={size.label} active={settings.tableTextSize === size.value} onPress={() => updateSettings({ tableTextSize: size.value })} />)}</View><Text style={styles.curveDescription}>يكبّر أسماء اللاعبين والنتائج وبيانات الطرنيب داخل الطاولة لتسهيل القراءة. يُطبّق فورًا ويُحفظ على جهازك.</Text></Section>
        <Section title="تكديس أوراق الخصوم"><View style={styles.choiceRow}>{OPPONENT_CARD_DENSITIES.map((density) => <Choice key={density.value} label={density.label} active={settings.opponentCardDensity === density.value} onPress={() => updateSettings({ opponentCardDensity: density.value })} />)}</View><Text style={styles.curveDescription}>يتحكم في تباعد أوراق الخصوم على الطاولة. اختر المتقارب للشاشات الصغيرة أو المتباعد لتمييز الأوراق أكثر.</Text></Section>
        <Section title="للاعبين المتقدمين"><ToggleRow label="مؤشر قوة الأنواع" description="يعرض الاقتراح والدرجات وأيقونة شرح طريقة الاحتساب في المزايدة." value={settings.showStrengthIndicator} onChange={(showStrengthIndicator) => updateSettings({ showStrengthIndicator })} /></Section>
        <View style={styles.note}><Text style={styles.noteTitle}>اللعب الجماعي</Text><Text style={styles.noteText}>يمكنك إنشاء غرفة محلية وضم ثلاثة لاعبين عبر الشبكة نفسها أو نقطة الاتصال، من دون حاجة إلى الإنترنت.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressed]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function CardBackChoice({ value, label, active, onPress }: { value: CardBackPattern; label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={`نقش ظهر البطاقات ${label}`} onPress={onPress} style={({ pressed }) => [styles.patternChoice, active && styles.patternChoiceActive, pressed && styles.pressed]}><CardBack compact pattern={value} /><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggleRow}><Switch value={value} onValueChange={onChange} trackColor={{ false: "#365A4C", true: "#D39F28" }} thumbColor="#FFF8E7" /><View style={styles.toggleText}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E", direction: "ltr" }, content: { padding: 22, paddingBottom: 40 }, title: { color: "#FFF8E7", fontSize: 31, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, subtitle: { color: "#B4D6C7", fontSize: 14, lineHeight: 21, textAlign: "right", marginTop: 4, writingDirection: "rtl" }, section: { backgroundColor: "#16624A", borderRadius: 20, padding: 16, marginTop: 18 }, sectionTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 13, writingDirection: "rtl" }, choiceRow: { flexDirection: "row-reverse", gap: 8 }, choice: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,248,231,0.25)", alignItems: "center", justifyContent: "center" }, choiceActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, patternRow: { flexDirection: "row-reverse", gap: 8 }, patternChoice: { flex: 1, minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,248,231,0.25)", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 6 }, patternChoiceActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, choiceText: { color: "#D9EEE4", fontWeight: "700", fontSize: 12, writingDirection: "rtl" }, choiceTextActive: { color: "#17211D" }, curveDescription: { color: "#B4D6C7", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 10, writingDirection: "rtl" }, pressed: { transform: [{ scale: 0.965 }], opacity: 0.82, elevation: 1, shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }, toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,248,231,0.12)" }, toggleText: { flex: 1, alignItems: "flex-end" }, toggleLabel: { color: "#FFF8E7", fontSize: 14, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, toggleDescription: { color: "#B4D6C7", fontSize: 11, textAlign: "right", marginTop: 2, writingDirection: "rtl" }, note: { backgroundColor: "rgba(227,179,65,0.13)", borderWidth: 1, borderColor: "rgba(227,179,65,0.35)", borderRadius: 18, padding: 15, marginTop: 22 }, noteTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 5, writingDirection: "rtl" },
});
