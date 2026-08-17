import { arabicRow } from "@/lib/rtl-style";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const rules = [
  ["التوزيع", "تلعب أربعة مقاعد بفريقين متقابلين. يحصل كل لاعب على 13 ورقة في بداية الجولة."],
  ["المزايدة", "يتنافس اللاعبون على طلب من 7 إلى 13. أعلى طلب يحدد المتعهد، ثم يختار المتعهد نوع الطرنيب."],
  ["اتباع النوع", "عند قيادة نوعٍ ما، يجب لعب ورقة منه عند توفرها. إن لم تتوفر، يمكنك لعب أي ورقة أخرى."],
  ["حسم اللمّة", "تفوز أعلى ورقة من النوع المقاد، إلا إذا لعبت ورقة طرنيب؛ عندها تفوز أعلى ورقة من نوع الطرنيب."],
  ["النقاط", "إذا حقق فريق المتعهد طلبه، يضيف عدد لممه. أما إذا أخفق فيُخصم منه مقدار الطلب، ويحصل الفريق الآخر على لممه."],
];

export default function RulesScreen() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>قواعد النسخة المحلية</Text><Text style={styles.intro}>هذه هي القواعد المعتمدة داخل التطبيق، ويمكن تكييف سياسة النقاط لاحقًا بما يلائم مجموعتك.</Text>{rules.map(([title, text], index) => <View key={title} style={styles.rule}><View style={styles.ruleNumber}><Text style={styles.ruleNumberText}>{index + 1}</Text></View><View style={styles.ruleCopy}><Text style={styles.ruleTitle}>{title}</Text><Text style={styles.ruleText}>{text}</Text></View></View>)}<View style={styles.tip}><Text style={styles.tipTitle}>تلميح سريع</Text><Text style={styles.tipText}>راقب الأنواع التي خرجت، وحافظ على أوراق الطرنيب القوية للحظة المناسبة.</Text></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E" }, content: { padding: 22, paddingBottom: 40 }, title: { color: "#FFF8E7", fontSize: 29, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, intro: { color: "#B4D6C7", fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 8, marginBottom: 20, writingDirection: "rtl" }, rule: { flexDirection: arabicRow(), gap: 12, padding: 15, backgroundColor: "#16624A", borderRadius: 18, marginBottom: 10 }, ruleNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center" }, ruleNumberText: { color: "#17211D", fontSize: 14, fontWeight: "900" }, ruleCopy: { flex: 1, alignItems: "flex-end" }, ruleTitle: { color: "#FFF8E7", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, ruleText: { color: "#D9EEE4", fontSize: 13, lineHeight: 20, marginTop: 3, textAlign: "right", writingDirection: "rtl" }, tip: { backgroundColor: "#FFF8E7", borderRadius: 18, padding: 16, marginTop: 10, alignItems: "flex-end" }, tipTitle: { color: "#0E3B2E", fontSize: 15, fontWeight: "900", writingDirection: "rtl" }, tipText: { color: "#52635C", fontSize: 13, lineHeight: 20, marginTop: 4, textAlign: "right", writingDirection: "rtl" },
});
