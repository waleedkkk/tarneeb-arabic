import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

describe("عزل أداء طاولة اللعب", () => {
  it("يفصل مؤقّت الدور عن قيمة سياق اللعبة العامة ويحدّثه مرة واحدة في الثانية", () => {
    const gameContext = source("lib/tarneeb/game-context.tsx");

    expect(gameContext).toContain("const TurnTimerContext = createContext<TurnTimerState>");
    expect(gameContext).toContain("setInterval(updateRemainingTime, 1000)");
    expect(gameContext).toContain("sameTurnTimer(current, nextTimer) ? current : nextTimer");
    expect(gameContext).toContain("<TurnTimerContext.Provider value={turnTimer}>");
    expect(gameContext).not.toContain("      turnTimer,\n    }),");
  });

  it("يحرّك مؤشر الإفلات بقيمة مشتركة بدل حالة React في الطاولة", () => {
    const table = source("components/tarneeb/table.tsx");
    const fan = source("components/tarneeb/card-fan.tsx");

    expect(table).toContain("const dragProgress = useSharedValue(0)");
    expect(table).toContain("<DropTarget visible={humanTurn} progress={dragProgress} />");
    expect(table).not.toContain("setDraggingCard");
    expect(fan).toContain("dragProgress?: SharedValue<number>");
    expect(fan).toContain("dragProgress.value = withTiming(1");
  });

  it("يثبت البطاقات ومقاعد الخصوم لتفادي إعادة الرسم غير اللازمة", () => {
    const card = source("components/tarneeb/card.tsx");
    const fan = source("components/tarneeb/card-fan.tsx");
    const table = source("components/tarneeb/table.tsx");

    expect(card).toContain("export const PlayingCard = memo(function PlayingCard");
    expect(card).toContain("export const CardBack = memo(function CardBack");
    expect(fan).toContain("export const CurvedCardHand = memo(function CurvedCardHand");
    expect(fan).toContain("const FanCardSlot = memo(function FanCardSlot");
    expect(table).toContain("export const GameTable = memo(function GameTable");
    expect(table).toContain("const PlayerSeat = memo(function PlayerSeat");
  });
});
