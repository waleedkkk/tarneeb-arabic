import { arabicRow } from "@/lib/rtl-style";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { suitName, suitSymbol } from "@/lib/tarneeb/engine";
import { clearStoredStats, loadStoredStats } from "@/lib/tarneeb/storage";
import { summarizeRoundRecords } from "@/lib/tarneeb/stats";
import type { RoundRecord } from "@/lib/tarneeb/types";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(new Date(timestamp));
}

export default function StatsScreen() {
  const [records, setRecords] = useState<RoundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const loadStats = useCallback(async () => {
    setLoading(true);
    setRecords(await loadStoredStats());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));
  const summary = summarizeRoundRecords(records);
  const clearHistory = () => Alert.alert("مسح الإحصاءات؟", "سيُحذف سجل الجولات المحفوظ على هذا الجهاز فقط، ولا يمكن التراجع عن هذه الخطوة.", [
    { text: "إلغاء", style: "cancel" },
    { text: "مسح السجل", style: "destructive", onPress: () => { void clearStoredStats().then(loadStats); } },
  ]);

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <FlatList
      data={records}
      keyExtractor={(item) => `${item.timestamp}-${item.roundNumber}`}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <Text style={styles.title}>إحصاءاتك</Text>
        <Text style={styles.subtitle}>ملخص محفوظ لجولات اللعب الفردي على هذا الجهاز.</Text>
        <View style={styles.metricGrid}>
          <Metric label="الجولات" value={String(summary.totalRounds)} />
          <Metric label="نجاح طلباتك" value={summary.ownContractAttempts === 0 ? "—" : `${summary.ownContractRate}%`} detail={summary.ownContractAttempts === 0 ? "لم تطلب بعد" : `${summary.ownContractsMade} من ${summary.ownContractAttempts}`} />
          <Metric label="لمم فريقك" value={String(summary.tricksTeam0)} detail={`مقابل ${summary.tricksTeam1}`} />
          <Metric label="صافي النقاط" value={`${summary.netScoreTeam0 >= 0 ? "+" : ""}${summary.netScoreTeam0}`} positive={summary.netScoreTeam0 >= 0} />
        </View>
        <View style={styles.historyHeader}><Text style={styles.historyTitle}>سجل الجولات</Text>{records.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="مسح سجل الإحصاءات" onPress={clearHistory} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}><Text style={styles.clearText}>مسح السجل</Text></Pressable>}</View>
      </>}
      renderItem={({ item }) => <RoundHistoryCard record={item} />}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{loading ? "جارٍ تحميل الإحصاءات…" : "لا توجد جولات محفوظة بعد"}</Text><Text style={styles.emptyText}>{loading ? "" : "أكمل جولة لعب فردي لتظهر نتيجة الطلب واللمم والنقاط هنا."}</Text></View>}
    />
  </SafeAreaView>;
}

function Metric({ label, value, detail, positive }: { label: string; value: string; detail?: string; positive?: boolean }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, positive === false && styles.negative, positive === true && styles.positive]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text>{detail && <Text style={styles.metricDetail}>{detail}</Text>}</View>;
}

function RoundHistoryCard({ record }: { record: RoundRecord }) {
  const score = record.scoreChange0;
  return <View style={styles.card}>
    <View style={styles.cardTop}><View><Text style={styles.roundTitle}>الجولة {record.roundNumber}</Text><Text style={styles.date}>{formatDate(record.timestamp)}</Text></View><View style={[styles.resultBadge, record.madeContract ? styles.resultSuccess : styles.resultFailed]}><Text style={styles.resultText}>{record.madeContract ? "التزم بالطلب" : "لم يلتزم بالطلب"}</Text></View></View>
    <Text style={styles.contract}>{record.bidderName} طلب {record.bid} · {suitName(record.trump)} {suitSymbol(record.trump)}</Text>
    <View style={styles.cardStats}><View><Text style={styles.cardStatValue}>{record.tricksTeam0}–{record.tricksTeam1}</Text><Text style={styles.cardStatLabel}>اللمم: فريقك / الخصم</Text></View><View><Text style={[styles.cardStatValue, score < 0 && styles.negative, score >= 0 && styles.positive]}>{score >= 0 ? "+" : ""}{score}</Text><Text style={styles.cardStatLabel}>نقاط فريقك</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E", direction: "ltr" },
  content: { padding: 18, paddingBottom: 34 },
  title: { color: "#FFF8E7", fontSize: 30, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  subtitle: { color: "#B4D6C7", fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 4, writingDirection: "rtl" },
  metricGrid: { flexDirection: arabicRow(), flexWrap: "wrap", gap: 10, marginTop: 18 },
  metric: { width: "48%", minHeight: 101, borderRadius: 18, padding: 13, alignItems: "flex-end", backgroundColor: "#16624A", borderWidth: 1, borderColor: "rgba(245,216,137,0.24)" },
  metricValue: { color: "#FFF8E7", fontSize: 25, lineHeight: 30, fontWeight: "900", writingDirection: "rtl" },
  metricLabel: { color: "#F5D889", fontSize: 12, fontWeight: "800", marginTop: 4, writingDirection: "rtl" },
  metricDetail: { color: "#B4D6C7", fontSize: 11, marginTop: 2, writingDirection: "rtl" },
  positive: { color: "#9EE0C6" }, negative: { color: "#F59892" },
  historyHeader: { flexDirection: arabicRow(), justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 10 },
  historyTitle: { color: "#FFF8E7", fontSize: 18, fontWeight: "900", writingDirection: "rtl" },
  clearButton: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,152,146,0.6)", paddingHorizontal: 10, paddingVertical: 6 },
  clearText: { color: "#F59892", fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  card: { backgroundColor: "#16624A", borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,248,231,0.13)" },
  cardTop: { flexDirection: arabicRow(), alignItems: "center", justifyContent: "space-between" },
  roundTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  date: { color: "#B4D6C7", fontSize: 11, textAlign: "right", marginTop: 2, writingDirection: "rtl" },
  resultBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }, resultSuccess: { backgroundColor: "rgba(158,224,198,0.18)" }, resultFailed: { backgroundColor: "rgba(245,152,146,0.16)" },
  resultText: { color: "#FFF8E7", fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  contract: { color: "#F5D889", fontSize: 13, textAlign: "right", marginTop: 12, writingDirection: "rtl" },
  cardStats: { flexDirection: arabicRow(), justifyContent: "space-between", marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: "rgba(255,248,231,0.11)" },
  cardStatValue: { color: "#FFF8E7", fontSize: 18, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  cardStatLabel: { color: "#B4D6C7", fontSize: 10, marginTop: 2, writingDirection: "rtl" },
  empty: { alignItems: "center", backgroundColor: "#16624A", borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,216,137,0.22)", padding: 24, marginTop: 4 },
  emptyTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  emptyText: { color: "#B4D6C7", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7, writingDirection: "rtl" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
