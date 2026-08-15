import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useGame } from "@/lib/tarneeb/game-context";

export default function SettingsScreen() {
  const { settings, updateSettings } = useGame();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>الإعدادات</Text>
        <Text style={styles.subtitle}>خصص النسخة المحلية من طرنيب بما يناسب جلستك.</Text>
        <Section title="هدف المباراة"><View style={styles.choiceRow}>{([31, 41, 61] as const).map((score) => <Choice key={score} label={`${score} نقطة`} active={settings.targetScore === score} onPress={() => updateSettings({ targetScore: score })} />)}</View></Section>
        <Section title="أسلوب الخصوم"><View style={styles.choiceRow}>{(["هادئ", "متوازن", "جريء"] as const).map((level) => <Choice key={level} label={level} active={settings.aiLevel === level} onPress={() => updateSettings({ aiLevel: level })} />)}</View></Section>
        <Section title="التغذية الراجعة"><ToggleRow label="الاهتزاز للمسات المهمة" description="عند بدء الجولة ولعب الورق والنتائج." value={settings.hapticsEnabled} onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })} /><ToggleRow label="المؤثرات الصوتية" description="أصوات خفيفة للتوزيع ولعب الورق وحسم اللمّة." value={settings.soundEnabled} onChange={(soundEnabled) => updateSettings({ soundEnabled })} /></Section>
        <Section title="للاعبين المتقدمين"><ToggleRow label="مؤشر قوة الأنواع" description="يعرض الاقتراح والدرجات وأيقونة شرح طريقة الاحتساب في المزايدة." value={settings.showStrengthIndicator} onChange={(showStrengthIndicator) => updateSettings({ showStrengthIndicator })} /></Section>
        <View style={styles.note}><Text style={styles.noteTitle}>اللعب الجماعي</Text><Text style={styles.noteText}>هذه النسخة تعمل محليًا على جهاز واحد. سيُضاف إنشاء الغرف ودعوات الأصدقاء في مرحلة توسعة مستقلة.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressed]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggleRow}><Switch value={value} onValueChange={onChange} trackColor={{ false: "#365A4C", true: "#D39F28" }} thumbColor="#FFF8E7" /><View style={styles.toggleText}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E" }, content: { padding: 22, paddingBottom: 40 }, title: { color: "#FFF8E7", fontSize: 31, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, subtitle: { color: "#B4D6C7", fontSize: 14, lineHeight: 21, textAlign: "right", marginTop: 4, writingDirection: "rtl" }, section: { backgroundColor: "#16624A", borderRadius: 20, padding: 16, marginTop: 18 }, sectionTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 13, writingDirection: "rtl" }, choiceRow: { flexDirection: "row-reverse", gap: 8 }, choice: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,248,231,0.25)", alignItems: "center", justifyContent: "center" }, choiceActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" }, choiceText: { color: "#D9EEE4", fontWeight: "700", fontSize: 12, writingDirection: "rtl" }, choiceTextActive: { color: "#17211D" }, pressed: { transform: [{ scale: 0.965 }], opacity: 0.82, elevation: 1, shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }, toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,248,231,0.12)" }, toggleText: { flex: 1, alignItems: "flex-end" }, toggleLabel: { color: "#FFF8E7", fontSize: 14, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, toggleDescription: { color: "#B4D6C7", fontSize: 11, textAlign: "right", marginTop: 2, writingDirection: "rtl" }, note: { backgroundColor: "rgba(227,179,65,0.13)", borderWidth: 1, borderColor: "rgba(227,179,65,0.35)", borderRadius: 18, padding: 15, marginTop: 22 }, noteTitle: { color: "#F5D889", fontSize: 15, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 5, writingDirection: "rtl" },
});
