import { FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGame } from "@/lib/tarneeb/game-context";
import { legalCards, suitName, suitStrength, suitSymbol } from "@/lib/tarneeb/engine";
import type { Suit } from "@/lib/tarneeb/types";
import { GameTable, LastTrickBanner } from "@/components/tarneeb/table";
import { PlayingCard } from "@/components/tarneeb/card";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export default function GameScreen() {
  const game = useGame();
  const { state } = game;

  if (state.phase === "home") return <Home onStart={game.startMatch} />;
  if (state.phase === "bidding") return <Bidding />;
  if (state.phase === "trump") return <TrumpSelection />;
  if (state.phase === "roundResult") return <RoundResult />;

  return (
    <SafeAreaView style={styles.safe}>
      <GameTable state={state} onCardPress={(cardId) => {
        const card = state.players[0].hand.find((item) => item.id === cardId);
        if (card && legalCards(state.players[0].hand, state.trick).some((item) => item.id === card.id)) game.playHumanCard(card);
      }} />
      {state.phase === "trickResult" && <View style={styles.resultOverlay}><LastTrickBanner state={state} /><PrimaryButton label="ابدأ اللمّة التالية" onPress={game.nextTrick} /></View>}
    </SafeAreaView>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.homeSafe}>
      <View style={styles.homeAccentOne} /><View style={styles.homeAccentTwo} />
      <View style={styles.homeContent}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>ط</Text></View>
        <Text style={styles.title}>طرنيب</Text>
        <Text style={styles.subtitle}>اجمع اللمم، ارفع الطلب، وكن أول من يصل إلى الهدف.</Text>
        <View style={styles.featureGrid}>
          <Feature label="4 لاعبين" text="فريقان متقابلان" />
          <Feature label="محلي" text="دون اتصال" />
          <Feature label="هدف 31" text="قابل للتغيير" />
        </View>
        <View style={styles.homeSpacer} />
        <PrimaryButton label="ابدأ مباراة جديدة" onPress={onStart} large />
        <Text style={styles.homeFootnote}>خصوم آليون بثلاثة أنماط لعب وإعدادات محفوظة على جهازك.</Text>
      </View>
    </SafeAreaView>
  );
}

function Feature({ label, text }: { label: string; text: string }) {
  return <View style={styles.feature}><Text style={styles.featureLabel}>{label}</Text><Text style={styles.featureText}>{text}</Text></View>;
}

function Bidding() {
  const game = useGame();
  const { state } = game;
  const highest = state.bidding.highestBid;
  const minBid = (highest ?? 6) + 1;
  const isHumanTurn = state.bidding.currentPlayer === 0;
  const strengths = SUITS.map((suit) => suitStrength(state.players[0].hand, suit));
  const strongest = [...strengths].sort((a, b) => b.score - a.score)[0];
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RoundHeader round={state.round} label="المزايدة" />
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>العرض الأعلى</Text>
          <Text style={styles.bidValue}>{highest ?? "—"}</Text>
          <Text style={styles.panelText}>{highest === null ? "لم يُسجل عرض بعد" : `صاحب الطلب: ${state.players[state.bidding.highestBidder!].name}`}</Text>
        </View>
        <View style={styles.playerStrip}>{state.players.map((player) => <View key={player.id} style={[styles.playerChip, state.bidding.currentPlayer === player.id && styles.playerChipActive, !state.bidding.activeSeats[player.id] && styles.playerChipPassed]}><Text style={styles.playerChipText}>{player.name}</Text><Text style={styles.playerChipSub}>{state.bidding.activeSeats[player.id] ? (state.bidding.currentPlayer === player.id ? "دوره" : "بالانتظار") : "مرّ"}</Text></View>)}</View>
        <View style={styles.biddingHand} accessibilityLabel="أوراقك الحالية للمزايدة">
          <View style={styles.biddingHandHeader}><View><Text style={styles.biddingHandTitle}>أوراقك</Text><Text style={styles.biddingHandHint}>اسحب لمراجعة جميع الأوراق قبل الطلب</Text></View><Text style={styles.biddingHandCount}>{state.players[0].hand.length} ورقة</Text></View>
          <FlatList
            horizontal
            data={state.players[0].hand}
            keyExtractor={(card) => card.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.biddingHandList}
            renderItem={({ item, index }) => <PlayingCard card={item} entranceDelay={index * 22} />}
          />
        </View>
        <View style={styles.strengthPanel} accessibilityLabel="مؤشر قوة أنواع أوراقك">
          <View style={styles.strengthHeader}><View><Text style={styles.strengthTitle}>قوة الأنواع</Text><Text style={styles.strengthDescription}>تُحسب من عدد الأوراق وA وK وQ وJ و10</Text></View><Text style={styles.strengthSuggestion}>الأقوى: {suitName(strongest.suit)}</Text></View>
          <View style={styles.strengthGrid}>{strengths.map((strength) => <SuitStrengthCard key={strength.suit} {...strength} />)}</View>
        </View>
        <Text style={styles.sectionTitle}>{isHumanTurn ? "اختر عرضك" : "يفكر الخصوم في المزايدة…"}</Text>
        <Text style={styles.sectionText}>{isHumanTurn ? `يمكنك طلب ${minBid} أو أكثر.` : "ستظهر نتيجتهم بعد لحظات."}</Text>
        <View style={styles.bidGrid}>{Array.from({ length: 13 - minBid + 1 }, (_, index) => minBid + index).map((bid) => <NumberButton key={bid} label={String(bid)} disabled={!isHumanTurn} onPress={() => game.submitHumanBid(bid)} />)}</View>
        <Pressable disabled={!isHumanTurn} onPress={() => game.submitHumanBid(null)} style={({ pressed }) => [styles.secondaryButton, pressed && isHumanTurn && styles.buttonPressed, !isHumanTurn && styles.buttonDisabled]}><Text style={styles.secondaryButtonText}>مرّر</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrumpSelection() {
  const game = useGame();
  const { state } = game;
  const humanIsBidder = state.bidding.highestBidder === 0;
  const strengths = SUITS.map((suit) => suitStrength(state.players[0].hand, suit));
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.trumpContent}>
        <Text style={styles.kicker}>الطلب {state.bidding.highestBid}</Text>
        <Text style={styles.pageTitle}>{humanIsBidder ? "اختر الطرنيب" : "يختار الخصم الطرنيب"}</Text>
        <Text style={styles.pageSubtitle}>{humanIsBidder ? "حدد النوع الذي يمنح فريقك أفضل فرصة للفوز باللمم." : `${state.players[state.bidding.highestBidder!].name} يراجع أوراقه…`}</Text>
        {humanIsBidder && <View style={styles.trumpStrengthPanel}><Text style={styles.trumpStrengthTitle}>مؤشر قوة أوراقك</Text><View style={styles.strengthGrid}>{strengths.map((strength) => <SuitStrengthCard key={strength.suit} {...strength} />)}</View></View>}
        <View style={styles.suitGrid}>{SUITS.map((suit) => <Pressable key={suit} disabled={!humanIsBidder} onPress={() => game.selectHumanTrump(suit)} style={({ pressed }) => [styles.suitButton, pressed && humanIsBidder && styles.buttonPressed, !humanIsBidder && styles.buttonDisabled]}><Text style={[styles.suitSymbol, (suit === "hearts" || suit === "diamonds") && styles.suitRed]}>{suitSymbol(suit)}</Text><Text style={styles.suitName}>{suitName(suit)}</Text></Pressable>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundResult() {
  const game = useGame();
  const { state } = game;
  const summary = state.roundSummary!;
  const matchWinner = state.scores[0] >= game.settings.targetScore ? "فريقك" : state.scores[1] >= game.settings.targetScore ? "الفريق المنافس" : null;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centerPage}>
        <Text style={styles.kicker}>نهاية الجولة {state.round}</Text>
        <Text style={styles.pageTitle}>{matchWinner ? `فاز ${matchWinner} بالمباراة` : summary.madeContract ? "تم تحقيق الطلب" : "لم يتحقق الطلب"}</Text>
        <Text style={styles.pageSubtitle}>كان الطلب {summary.bid}، وحصل فريقك على {summary.roundTricks[0]} لمم مقابل {summary.roundTricks[1]} للخصم.</Text>
        <View style={styles.finalScore}><ScoreBlock label="فريقك" score={state.scores[0]} change={summary.scoreChange[0]} /><View style={styles.scoreDivider} /><ScoreBlock label="الخصم" score={state.scores[1]} change={summary.scoreChange[1]} /></View>
        {matchWinner ? <PrimaryButton label="ابدأ مباراة جديدة" onPress={game.startMatch} /> : <PrimaryButton label="الجولة التالية" onPress={game.nextRound} />}
        <Pressable onPress={game.exitMatch} style={({ pressed }) => [styles.exitButton, pressed && styles.buttonPressed]}><Text style={styles.exitText}>العودة للرئيسية</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

function RoundHeader({ round, label }: { round: number; label: string }) {
  return <View style={styles.roundHeader}><Text style={styles.roundBrand}>طرنيب</Text><View><Text style={styles.roundNumber}>الجولة {round}</Text><Text style={styles.roundLabel}>{label}</Text></View></View>;
}

function ScoreBlock({ label, score, change }: { label: string; score: number; change: number }) {
  return <View style={styles.scoreBlock}><Text style={styles.scoreBlockLabel}>{label}</Text><Text style={styles.scoreBlockValue}>{score}</Text><Text style={[styles.scoreChange, change < 0 && styles.negativeChange]}>{change > 0 ? `+${change}` : change}</Text></View>;
}

function PrimaryButton({ label, onPress, large = false }: { label: string; onPress: () => void; large?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, large && styles.primaryButtonLarge, pressed && styles.buttonPressed]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function NumberButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.numberButton, pressed && !disabled && styles.buttonPressed, disabled && styles.buttonDisabled]}><Text style={styles.numberText}>{label}</Text></Pressable>;
}

function SuitStrengthCard({ suit, count, highCount, bars, label }: ReturnType<typeof suitStrength>) {
  const red = suit === "hearts" || suit === "diamonds";
  return <View style={styles.strengthCard}><View style={styles.strengthCardTop}><Text style={[styles.strengthSuit, red && styles.strengthSuitRed]}>{suitSymbol(suit)}</Text><Text style={styles.strengthSuitName}>{suitName(suit)}</Text><Text style={[styles.strengthLabel, label === "قوي" && styles.strengthLabelStrong, label === "محدود" && styles.strengthLabelLow]}>{label}</Text></View><View style={styles.strengthBars}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={[styles.strengthBar, index < bars && styles.strengthBarActive]} />)}</View><Text style={styles.strengthDetail}>{count} أوراق · {highCount} عالية</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E" },
  homeSafe: { flex: 1, backgroundColor: "#0E3B2E", overflow: "hidden" },
  homeContent: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28, alignItems: "center" },
  homeAccentOne: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#16624A", right: -120, top: -120 },
  homeAccentTwo: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: "rgba(227,179,65,0.35)", left: -90, bottom: 70 },
  logoMark: { width: 88, height: 88, borderRadius: 28, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#FFF8E7", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  logoMarkText: { color: "#0E3B2E", fontSize: 50, fontWeight: "900", lineHeight: 58 },
  title: { color: "#FFF8E7", fontSize: 42, fontWeight: "900", marginTop: 16, writingDirection: "rtl" },
  subtitle: { color: "#D9EEE4", fontSize: 16, lineHeight: 25, textAlign: "center", marginTop: 6, maxWidth: 320, writingDirection: "rtl" },
  featureGrid: { flexDirection: "row-reverse", gap: 8, marginTop: 34 },
  feature: { width: 95, minHeight: 73, borderRadius: 16, padding: 10, backgroundColor: "rgba(255,248,231,0.09)", borderWidth: 1, borderColor: "rgba(255,248,231,0.16)", alignItems: "center", justifyContent: "center" },
  featureLabel: { color: "#F5D889", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  featureText: { color: "#D9EEE4", fontSize: 11, marginTop: 4, textAlign: "center", writingDirection: "rtl" },
  homeSpacer: { flex: 1 },
  homeFootnote: { color: "#B4D6C7", fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 14, writingDirection: "rtl" },
  primaryButton: { minWidth: 240, minHeight: 52, paddingHorizontal: 18, borderRadius: 16, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  primaryButtonLarge: { alignSelf: "stretch" },
  primaryButtonText: { color: "#17211D", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.45 },
  scrollContent: { padding: 20, paddingBottom: 34 },
  roundHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  roundBrand: { color: "#E3B341", fontSize: 25, fontWeight: "900", writingDirection: "rtl" },
  roundNumber: { color: "#FFF8E7", textAlign: "right", fontWeight: "800", writingDirection: "rtl" },
  roundLabel: { color: "#B4D6C7", textAlign: "right", fontSize: 12, writingDirection: "rtl" },
  panel: { backgroundColor: "#FFF8E7", borderRadius: 24, padding: 22, alignItems: "center" },
  panelEyebrow: { color: "#52635C", fontSize: 13, writingDirection: "rtl" },
  bidValue: { color: "#0E3B2E", fontSize: 58, fontWeight: "900", lineHeight: 64, marginVertical: 4 },
  panelText: { color: "#52635C", fontSize: 14, writingDirection: "rtl" },
  playerStrip: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" },
  playerChip: { width: "47%", minHeight: 58, padding: 8, borderRadius: 14, backgroundColor: "#16624A", borderWidth: 1, borderColor: "transparent", alignItems: "center" },
  playerChipActive: { borderColor: "#38BDF8", backgroundColor: "#1A7358" },
  playerChipPassed: { opacity: 0.45 },
  playerChipText: { color: "#FFF8E7", fontWeight: "800", writingDirection: "rtl" },
  playerChipSub: { color: "#B4D6C7", fontSize: 11, marginTop: 2, writingDirection: "rtl" },
  biddingHand: { backgroundColor: "rgba(255,248,231,0.08)", borderWidth: 1, borderColor: "rgba(255,248,231,0.16)", borderRadius: 20, marginTop: 18, paddingVertical: 12 },
  biddingHandHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 9 },
  biddingHandTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  biddingHandHint: { color: "#B4D6C7", fontSize: 11, marginTop: 2, textAlign: "right", writingDirection: "rtl" },
  biddingHandCount: { color: "#F5D889", fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  biddingHandList: { paddingHorizontal: 12, gap: 4, paddingBottom: 5 },
  strengthPanel: { backgroundColor: "rgba(56,189,248,0.09)", borderWidth: 1, borderColor: "rgba(56,189,248,0.28)", borderRadius: 20, marginTop: 14, padding: 14 },
  strengthHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  strengthTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  strengthDescription: { color: "#B4D6C7", fontSize: 10, marginTop: 3, textAlign: "right", writingDirection: "rtl" },
  strengthSuggestion: { color: "#8DDBFF", backgroundColor: "rgba(56,189,248,0.15)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
  strengthGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  strengthCard: { width: "48%", backgroundColor: "rgba(14,59,46,0.48)", borderRadius: 13, padding: 9, borderWidth: 1, borderColor: "rgba(255,248,231,0.11)" },
  strengthCardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  strengthSuit: { color: "#FFF8E7", fontSize: 18, fontWeight: "900" },
  strengthSuitRed: { color: "#F59892" },
  strengthSuitName: { flex: 1, color: "#D9EEE4", fontSize: 12, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  strengthLabel: { color: "#F5D889", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  strengthLabelStrong: { color: "#6EE7B7" },
  strengthLabelLow: { color: "#B4D6C7" },
  strengthBars: { flexDirection: "row-reverse", gap: 3, marginTop: 9 },
  strengthBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,248,231,0.15)" },
  strengthBarActive: { backgroundColor: "#38BDF8" },
  strengthDetail: { color: "#B4D6C7", fontSize: 10, marginTop: 6, textAlign: "right", writingDirection: "rtl" },
  sectionTitle: { color: "#FFF8E7", fontSize: 22, fontWeight: "900", textAlign: "right", marginTop: 28, writingDirection: "rtl" },
  sectionText: { color: "#B4D6C7", textAlign: "right", fontSize: 13, marginTop: 4, writingDirection: "rtl" },
  bidGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginTop: 18, justifyContent: "center" },
  numberButton: { width: 59, height: 52, borderRadius: 14, backgroundColor: "#FFF8E7", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#0E3B2E", fontSize: 21, fontWeight: "900" },
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#B4D6C7", alignItems: "center", justifyContent: "center", marginTop: 16 },
  secondaryButtonText: { color: "#FFF8E7", fontSize: 15, fontWeight: "800", writingDirection: "rtl" },
  centerPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  trumpContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 },
  kicker: { color: "#E3B341", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  pageTitle: { color: "#FFF8E7", fontSize: 31, fontWeight: "900", marginTop: 10, textAlign: "center", writingDirection: "rtl" },
  pageSubtitle: { color: "#B4D6C7", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 8, writingDirection: "rtl" },
  suitGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12, marginTop: 34, justifyContent: "center" },
  trumpStrengthPanel: { alignSelf: "stretch", backgroundColor: "rgba(56,189,248,0.09)", borderWidth: 1, borderColor: "rgba(56,189,248,0.28)", borderRadius: 20, padding: 14, marginTop: 18 },
  trumpStrengthTitle: { color: "#FFF8E7", fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 10, writingDirection: "rtl" },
  suitButton: { width: 134, height: 124, borderRadius: 22, backgroundColor: "#FFF8E7", alignItems: "center", justifyContent: "center" },
  suitSymbol: { color: "#17211D", fontSize: 44, fontWeight: "900", lineHeight: 48 },
  suitRed: { color: "#C9413A" },
  suitName: { color: "#52635C", marginTop: 3, fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  finalScore: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "rgba(255,248,231,0.1)", borderRadius: 24, padding: 20, marginVertical: 30, minWidth: 270 },
  scoreBlock: { flex: 1, alignItems: "center" },
  scoreBlockLabel: { color: "#B4D6C7", fontSize: 13, writingDirection: "rtl" },
  scoreBlockValue: { color: "#FFF8E7", fontSize: 39, fontWeight: "900", marginTop: 2 },
  scoreChange: { color: "#6EE7B7", fontSize: 14, fontWeight: "800" },
  negativeChange: { color: "#F59892" },
  scoreDivider: { width: 1, height: 70, backgroundColor: "rgba(255,248,231,0.2)" },
  exitButton: { padding: 12, marginTop: 12 },
  exitText: { color: "#B4D6C7", fontSize: 14, writingDirection: "rtl" },
  resultOverlay: { position: "absolute", left: 0, right: 0, bottom: 2, alignItems: "center" },
});
