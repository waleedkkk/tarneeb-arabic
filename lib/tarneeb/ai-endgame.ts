import { cardBeats, createDeck, legalCards, resolveTrick, teamOf } from "./engine";
import { aiPartnerSeat } from "./ai-probability";
import type { AiLevel, Card, MatchState, Seat, Suit, Team, Trick } from "./types";
import { SUITS } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

/**
 * AI 3.0 — حلّ نهاية الجولة.
 *
 * عندما يتبقى لدى الذكاء الاصطناعي 4 أوراق أو أقل، يحسب هذا المحرك أفضل ورقة
 * يلعبها الآن عبر محاكاة مونت كارلو: يوزّع الأوراق غير المرئية على الخصوم
 * والشريك بآلاف التوزيعات العادلة الممكنة (وفق handCount فقط، دون قراءة أيدي
 * الخصوم المخفية)، ثم يجرّب لكل ورقة مرشّحة تسلسل اللعب الكامل حتى نهاية الجولة
 * باستجابة تقليدية مبسطة من بقية المقاعد، ويرتب الخيارات بحسب فرق اللمم
 * المتوقع لفريقه.
 *
 * لا يقرأ هذا الملف أيدي المقاعد الأخرى إطلاقًا؛ يعتمد على
 * estimateAiDistribution العادلة من ai-probability.ts فقط.
 */

export interface EndgameDecision {
  card: Card;
  /** فرق اللمم المتوقع لفريق الذكاء من هذا الاختيار (قيمة أعلى أفضل). */
  expectedTricksDiff: number;
}

function makeRng(seed: number): () => number {
  // مولّد mulberry32 حتمي — نفس البذرة تعطي نفس التسلسل دائمًا.
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rngSeed?: number): T[] {
  const shuffled = [...items];
  const random = rngSeed !== undefined ? makeRng(rngSeed) : () => Math.random();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function cardsOfSuit(hand: Card[], suit: Suit): Card[] {
  return hand.filter((card) => card.suit === suit);
}

function byLowestRank(left: Card, right: Card): number {
  return left.rank - right.rank || left.suit.localeCompare(right.suit);
}

function byHighestRank(left: Card, right: Card): number {
  return right.rank - left.rank || left.suit.localeCompare(right.suit);
}

interface SimHands {
  /** الأوراق المتبقية لكل مقعد داخل المحاكاة، مُرتبة. */
  hands: Record<Seat, Card[]>;
}

/** يوزّع الأوراق غير المرئية عشوائيًا بنسب handCount الفعلية لبقية المقاعد (عينة عادلة). */
function sampleHands(state: MatchState, playerId: Seat, aiHand: Card[], unseen: Card[], rngSeed = 0): SimHands | null {
  const hands: Record<Seat, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  hands[playerId] = aiHand;
  const others = SEATS.filter((seat) => seat !== playerId);
  // وزّع الأوراق غير المرئية بنسب handCount الفعلية لبقية المقاعد.
  // عندما لا تطابق unseen.length مجموع handCount للبقية (مثلاً لأن معرفات
  // الأوراق المخفية غير كاملة)، تُوزّع المتاحة بنسبها النسبية على المقاعد
  // المتبقية بما يحافظ على عدالة العينة دون إسقاط أي ورقة.
  let othersTotal = 0;
  others.forEach((seat) => { othersTotal += Math.max(0, state.players[seat].handCount); });
  if (unseen.length === 0) { return null; }
  const unseenCopy = shuffle(unseen, rngSeed);
  let assigned = 0;
  if (othersTotal === 0) {
    // لا معلومات عن توزيع البقية: وزّع بالتساوي.
    others.forEach((seat, seatIndex) => {
      const count =
        seatIndex === others.length - 1
          ? unseen.length - assigned
          : Math.floor(unseen.length / others.length);
      hands[seat] = unseenCopy.slice(assigned, assigned + count).sort(byLowestRank);
      assigned += count;
    });
  } else {
    others.forEach((seat, seatIndex) => {
      const fractional = (unseen.length * Math.max(0, state.players[seat].handCount)) / othersTotal;
      const count =
        seatIndex === others.length - 1
          ? unseen.length - assigned
          : Math.round(fractional);
      const clamped = Math.max(0, Math.min(count, unseen.length - assigned));
      hands[seat] = unseenCopy.slice(assigned, assigned + clamped).sort(byLowestRank);
      assigned += clamped;
    });
  }
  return { hands };
}

/** استجابة تقليدية مبسطة لمقعد محاكى: يلعب ورقة قانونية عشوائية مع ميل خفيف للأوراق المنخفضة. */
function simulateOpponentResponse(
  simHands: SimHands,
  seat: Seat,
  trick: Trick,
  trumpSuit: Suit,
  rngSeed: number,
  partnerTeam: Team | null = null,
): Card {
  const hand = simHands.hands[seat];
  const playable = legalCards(hand, trick);
  // ميل عشوائي شبه ثابت داخل المحاكاة الواحدة لتفادي القرارات الصورية.
  const jitter = rngSeed % Math.max(1, playable.length);
  const isAlly = partnerTeam !== null && teamOf(seat) === partnerTeam;
  // الورقة الرابحة حاليًا داخل اللمّة إن وجدت.
  const currentWinner: Card | null =
    trick.plays.length > 0
      ? trick.plays.reduce((best, play) => {
          const leadSuit = trick.plays[0].card.suit;
          return cardBeats(play.card, best, leadSuit, trumpSuit) ? play.card : best;
        }, trick.plays[0].card)
      : null;

  let candidates = [...playable].sort(byLowestRank);
  if (isAlly) {
    // الشريك لا يرمي أوراقًا رابحة على لمّة يسودها فريق الذكاء، ولا يقود
    // أنواعًا تحتوي أوراقًا قوية يملكها الذكاء؛ يلعب ورقة منخفضة آمنة.
    if (currentWinner && teamOf(trick.plays[0].playerId as Seat) === partnerTeam) {
      candidates = candidates.filter((card) => card.rank <= 10);
    }
  } else if (currentWinner && teamOf(trick.plays[0].playerId as Seat) !== teamOf(seat)) {
    // الخصم يحاول خطف اللمّة عند توفر ورقة رابحة.
    const stealing = candidates.filter((candidate) =>
      cardBeats(candidate, currentWinner, trick.plays[0].card.suit, trumpSuit),
    );
    if (stealing.length > 0) { candidates = [...stealing].sort(byLowestRank); }
  }
  if (candidates.length === 0) { candidates = [...playable].sort(byLowestRank); }
  return candidates[jitter % Math.min(2, candidates.length)] ?? candidates[0];
}

/** يجرّب تسلسل اللعب الكامل من ورقة الذكاء الأولى ويعيد فرق اللمم لفريقه حتى نهاية الجولة. */
function simulateFromCard(
  simHands: SimHands,
  state: MatchState,
  playerId: Seat,
  firstCard: Card,
  rngBase: number,
): number {
  const trumpSuit = state.bidding.trumpSuit!;
  const team = teamOf(playerId);
  const hands: Record<Seat, Card[]> = {
    0: simHands.hands[0].map((card) => ({ ...card })),
    1: simHands.hands[1].map((card) => ({ ...card })),
    2: simHands.hands[2].map((card) => ({ ...card })),
    3: simHands.hands[3].map((card) => ({ ...card })),
  };

  // ابدأ من وضع اللمّة الحالية الفعلي: الأوراق الملعوبة جزئيًا ونوع القيادة،
  // مع اعتبار firstCard هي ورقة الذكاء داخل هذه اللمّة إن لم يكن قد لعب فيها بعد.
  const trickPlays = [...state.trick.plays];
  const currentLeader = state.trick.leaderId;
  const currentLeadSuit: Suit | null = trickPlays.length > 0 ? trickPlays[0].card.suit : null;
  let winningPlay: { seat: Seat; card: Card } | null = null;
  let winningCardRef: Card | null = null;
  // winningCardRef غير صفري فقط داخل guard حيث currentLeadSuit !== null،
  // أي بعد وجود أوراق في اللمّة الحالية أو بعد تعيين firstCard.
  // نثبّت التضييق بمتغير وسيط داخل guard.
  const playedIdsInTrick = new Set<string>();
  trickPlays.forEach((play) => {
    playedIdsInTrick.add(`${play.card.suit}-${play.card.rank}`);
    if (winningPlay === null) {
      winningPlay = { seat: play.playerId as Seat, card: play.card };
      winningCardRef = play.card;
    } else if (currentLeadSuit && winningCardRef !== null && cardBeats(play.card, winningCardRef, currentLeadSuit, trumpSuit)) {
      winningPlay = { seat: play.playerId as Seat, card: play.card };
      winningCardRef = play.card;
    }
  });

  // أزل من أيدي المحاكاة الأوراق الملعوبة في اللمّة الحالية (نوع + رتبة) لضمان عدم تكرارها.
  trickPlays.forEach((play) => {
    const seat = play.playerId as Seat;
    hands[seat] = hands[seat].filter(
      (handCard) => handCard.suit !== play.card.suit || handCard.rank !== play.card.rank,
    );
  });

  // إن لم يلعب الذكاء بعد في اللمّة الحالية، عُدّ firstCard ورقة لعبه فيها.
  let myTrickCard: Card | null = null;
  if (!playedIdsInTrick.has(`${firstCard.suit}-${firstCard.rank}`)) {
    myTrickCard = firstCard;
    playedIdsInTrick.add(`${firstCard.suit}-${firstCard.rank}`);
    hands[playerId] = hands[playerId].filter(
      (handCard) => handCard.suit !== firstCard.suit || handCard.rank !== firstCard.rank,
    );
    if (winningPlay === null || (currentLeadSuit && winningCardRef !== null && cardBeats(firstCard, winningCardRef, currentLeadSuit, trumpSuit))) {
      winningPlay = { seat: playerId, card: firstCard };
      winningCardRef = firstCard;
    }
  } else {
    // الورقة اختيرت لمعها سابقة: أزل نسخة منها فقط من يد المحاكاة (لا تتكرر).
    const seenOnce: Card | undefined = hands[playerId].find(
      (handCard) => handCard.suit === firstCard.suit && handCard.rank === firstCard.rank,
    );
    if (seenOnce) { hands[playerId] = hands[playerId].filter((handCard) => handCard.id !== seenOnce.id); }
  }

  // نهاية الجولة الحقيقية تبقى بعدد أوراق الذكاء المتبقي تقريبًا؛ محاكاة 13 لمّة
  // بأيدٍ افتراضية طويلة تظلم أوراق الذكاء وتفسد المقارنة. نحصر المحاكاة على
  // عدد لمم بقية أيدي البقية الفعلية (متوسط handCount) + الورقة الأولى.
  const remainingRounds = Math.max(
    simHands.hands[playerId].length,
    Math.max(
      state.players[0].handCount,
      state.players[1].handCount,
      state.players[2].handCount,
      state.players[3].handCount,
    ),
  );

  let tricksDiff = 0;
  let leader: Seat = winningPlay ? winningPlay.seat : currentLeader;
  let simTricks = 0;

  while (simTricks < remainingRounds && hands[0].length + hands[1].length + hands[2].length + hands[3].length > 0) {
    let leadSuit: Suit | null = null;
    let currentWinner: { seat: Seat; card: Card } | null = null;
    const plays: { seat: Seat; card: Card }[] = [];
    // من لعب في اللمّة الحالية يبدأ بعده؛ وإن اكتملت اللمّة يبدأ فائزها.
    let firstPlayerIndex = 0;
    if (simTricks === 0 && winningPlay) {
      const winnerSeat = winningPlay.seat;
      firstPlayerIndex = (winnerSeat - currentLeader + 4) % 4;
      leadSuit = currentLeadSuit;
    }

    for (let i = 0; i < 4; i += 1) {
      const seat = SEATS[(currentLeader + firstPlayerIndex + i) % 4] as Seat;
      const trick: Trick = { leaderId: currentLeader, leadSuit, plays: plays.map((p) => ({ playerId: p.seat, card: p.card })) };
      const playable = legalCards(hands[seat], trick).length > 0 ? legalCards(hands[seat], trick) : hands[seat].length > 0 ? [...hands[seat]].sort(byLowestRank) : [];
      let card: Card | undefined;
      if (seat === playerId) {
        if (playable.length === 0) { /* يد فارغة، تجاوز */ }
        else {
          let chosen = [...playable].sort(byLowestRank)[0];
          const currentLeadSuitAtPlay = leadSuit;
          const winnerAtPlay = currentWinner;
          if (winnerAtPlay !== null && currentLeadSuitAtPlay !== null) {
            const winningOptions = playable.filter((candidate) =>
              cardBeats(candidate, winnerAtPlay.card, currentLeadSuitAtPlay, trumpSuit),
            );
            if (winningOptions.length > 0) chosen = [...winningOptions].sort(byLowestRank)[0];
          }
          card = chosen;
        }
      } else if (playable.length > 0) {
        card = simulateOpponentResponse({ hands }, seat, trick, trumpSuit, rngBase + simTricks * 7 + i, team);
      }
      if (!card) continue;
      if (leadSuit === null) leadSuit = card.suit;
      plays.push({ seat, card });
      if (currentWinner === null || (leadSuit && cardBeats(card, currentWinner.card, leadSuit, trumpSuit))) {
        currentWinner = { seat, card };
      }
      hands[seat] = hands[seat].filter((handCard) => handCard.id !== card.id);
    }

    const finalWinner = currentWinner ?? winningPlay;
    if (finalWinner && teamOf(finalWinner.seat) === team) tricksDiff += 1;
    else tricksDiff -= 1;
    leader = finalWinner?.seat ?? currentLeader;
    winningPlay = null;
    simTricks += 1;
  }
  return tricksDiff;
}

/**
 * يقيّم ورقة الاختيار الأولى عبر محاكاة مونت كارلو لبقية الجولة، ويعيد
 * الأفضل بحسب فرق اللمم المتوقع. يعيد null عند عدم ملاءمة الحلّ
 * (مستوى غير خبير، أو يد طويلة، أو حالة غير مكتملة).
 */
export interface EndgameOptions {
  /**
   * يسمح للحلّ بالعمل في حالات نهاية الجولة الصافية دون سجل لمم ظاهر.
   * يُفعّل في الاختبارات المنعزلة فقط؛ في اللعب الفعلي يبقى معطلًا افتراضيًا
   * كي لا يطمس الحلّ العشوائي قرارات AI 2.x عند غياب المعرفة.
   */
  allowPureEndgame?: boolean;
}

export function solveEndgame(
  state: MatchState,
  playerId: Seat,
  level: AiLevel,
  options: EndgameOptions = {},
): EndgameDecision | null {
  const isExpert = level === "خبير" || (level === "متوازن" && state.players[playerId].hand.length <= 2);
  if (!isExpert) { return null; }
  if (state.phase !== "playing" || !state.bidding.trumpSuit) { return null; }
  if (state.players[playerId].hand.length > 4) { return null; }

  const hand = state.players[playerId].hand;
  const playable = legalCards(hand, state.trick);
  if (playable.length <= 1) { return null; }

  // لا يُفعّل الحلّ عند غياب معرفة ظاهرة كافية: بدون سجل لمم أو فراغات مستنتجة
  // تتحول المحاكاة إلى تخمين عشوائي يطمس قرارات AI 2.x الأذكى (حفظ الطرنيب،
  // تمييز الشخصيات، ضغط العقد). المعرفة المرئية تشمل اللمم المكتملة الظاهرة
  // في سجل المباراة والأوراق الملعوبة جزئيًا في اللمّة الحالية.
  const hasVisibleHistory =
    state.matchLog.tricks.length > 0 ||
    state.trick.plays.length > 0 ||
    state.players.some((player, index) => index !== playerId && player.handCount < hand.length);
  if (!hasVisibleHistory && !options.allowPureEndgame) { return null; }

  // الأوراق المؤكدة الظاهرة (اليد + اللمم المكتملة + الأوراق الملعوبة في اللمّة الحالية).
  // نطابق عبر النوع والرتبة لا المعرف، لتتوافق المعرفة مع أيدي الاختبار المختلفة المعرّفات.
  const knownKeys = new Set(
    hand.map((card) => `${card.suit}-${card.rank}`),
  );
  state.matchLog.tricks.forEach((entry) =>
    entry.plays.forEach((play) => knownKeys.add(`${play.card.suit}-${play.card.rank}`)),
  );
  state.trick.plays.forEach((play) => knownKeys.add(`${play.card.suit}-${play.card.rank}`));
  const unseen = createDeck().filter((card) => !knownKeys.has(`${card.suit}-${card.rank}`));

  // عدد التوزيعات يوازي عمق اليد؛ اليد القصيرة جدًا تُحاكى بدقة أكبر.
  const handSize = hand.length;
  const sampleCount = handSize <= 2 ? 28 : handSize <= 3 ? 20 : 16;

  const trumpSuit = state.bidding.trumpSuit!;
  const team = teamOf(playerId);
  // تُولَّد عينات التوزيع بنفس البذور عبر الأوراق كلها حتى تُوازن ظروف اللعب
  // بين البدائل (يغيّر سلوك الخصوم داخل العينة نفسها، لا توزيعها)، ويُثبَّت
  // بذرة كل عينة بهوية حالة الطاولة المرئية فقط فلا يتحيز القرار لورقة محددة.
  const sceneKey = [state.round, state.trick.leaderId, state.bidding.highestBid ?? 0].join(",");
  const sceneHash = Array.from(sceneKey).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2654435761);
  // فراغات الأنواع الظاهرة من سجل اللمم: مقعدٌ رمى نوعًا آخر بعد قيادة نوعٍ ما.
  // عند بقاء أوراق من النوع المقود في أيدي، يعني ذلك فراغًا حقيقيًا يستحق القطع.
  const voidSuitsBySeat = new Map<string, Set<Suit>>();
  state.matchLog.tricks.forEach((entry) => {
    const leadSuit = entry.plays[0]?.card.suit ?? null;
    if (!leadSuit) return;
    entry.plays.slice(1).forEach((play) => {
      if (play.card.suit !== leadSuit) {
        const key = String(play.playerId);
        let set = voidSuitsBySeat.get(key);
        if (!set) { set = new Set(); voidSuitsBySeat.set(key, set); }
        set.add(leadSuit);
      }
    });
  });

  const scores = playable.map((card) => {
    let totalDiff = 0;
    let validSamples = 0;
    for (let sample = 0; sample < sampleCount; sample += 1) {
      const simHands = sampleHands(state, playerId, hand, unseen, (sceneHash * 37 + sample * 137) >>> 0);
      if (simHands === null) continue;
      validSamples += 1;
      // بذرة سلوك الخصوم داخل العينة ثابتة عبر الأوراق؛ الفرق الوحيد المقارَن
      // هو ورقة الاختيار الأولى للذكاء.
      const myTricks = simulateFromCard(simHands, state, playerId, card, (sceneHash * 73 + sample * 211) >>> 0);
      // فرق اللمم لفريق الذكاء مقابل خصمه في هذه المحاكاة.
      totalDiff += myTricks;
    }
    // إضافة مرجح خفيف يفضّل الحسم المضمون: الآص (طرنيب أو عادي) يسبق الأوراق الأدنى.
    if (validSamples === 0) { return { card, expectedTricksDiff: -Infinity }; }
    const certaintyBoost = card.rank === 14 ? 0.5 : card.rank >= 13 ? 0.25 : 0;
    // يعاقب قيادة نوع عرف خصم فراغًا ظاهرًا فيه (مطابقة لذكاء AI 2.1):
    // خصمٌ رمى نوعًا آخر بعد قيادة هذا النوع ثم بقيت أوراق منه تعني أن
    // الخصم سيفرغه بالطرنيب فور قيادتها.
    const exposedVoidPenalty = (() => {
      if (card.suit === trumpSuit) return 0;
      let penalty = 0;
      voidSuitsBySeat.forEach((suits, seatKey) => {
        const seatNumber = Number(seatKey);
        if (seatNumber === playerId) return;
        const seat = state.players.find((player) => player.id === seatNumber);
        if (!seat) return;
        if (teamOf(seatNumber as Seat) === teamOf(playerId)) return;
        if (suits.has(card.suit)) penalty += 4;
      });
      return penalty;
    })();
    return { card, expectedTricksDiff: totalDiff / validSamples + certaintyBoost - exposedVoidPenalty };
  });

  scores.sort((left, right) => right.expectedTricksDiff - left.expectedTricksDiff || right.card.rank - left.card.rank);
  if (scores[0].expectedTricksDiff === -Infinity) { return null; }
  return { card: scores[0].card, expectedTricksDiff: scores[0].expectedTricksDiff };
}
