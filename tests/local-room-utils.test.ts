import { createHomeState, createNetworkRound } from "../lib/tarneeb/engine";
import { parseRoomQrData, roomDetailsToQrData, stateForViewer, validateRoomQrData } from "../lib/tarneeb/local-room-utils";
import { describe, expect, it } from "vitest";

describe("الغرفة المحلية", () => {
  it("يعيد ترتيب الطاولة للاعب المنضم دون كشف أوراق بقية اللاعبين", () => {
    const source = createNetworkRound(createHomeState(), { 0: "أحمد", 1: "سارة", 2: "ليان", 3: "رامي" }, true);
    source.scores = { 0: 19, 1: 8 };

    const viewer = stateForViewer(source, 3);

    expect(viewer.players[0].name).toBe("رامي");
    expect(viewer.players[2].name).toBe("سارة");
    expect(viewer.players[0].hand).toEqual(source.players[3].hand);
    expect(viewer.players[1].hand).toEqual([]);
    expect(viewer.players[1].handCount).toBe(13);
    expect(viewer.scores).toEqual({ 0: 8, 1: 19 });
  });

  it("يرمز بيانات الغرفة ويفكها دون فقدان المفتاح أو المنفذ", () => {
    const details = { host: "192.168.1.21", port: 42872, roomId: "ABCD23", key: "ZXCV1234" };
    expect(parseRoomQrData(roomDetailsToQrData(details))).toEqual(details);
  });

  it("يرفض رمز غرفة غير آمن أو لا يتضمن عنوان شبكة صالحًا", () => {
    expect(parseRoomQrData("tarneeb://local?host=999.1.1.1&port=42872&room=A&key=B")).toBeNull();
    expect(parseRoomQrData("tarneeb://local?host=192.168.1.1&port=80&room=A&key=B")).toBeNull();
  });

  it("يوضح سبب رفض رمز الغرفة للمسح أو الإدخال اليدوي", () => {
    expect(validateRoomQrData("").message).toContain("ضع رمز الغرفة");
    expect(validateRoomQrData("https://example.com").message).toContain("ليس رمز غرفة طرنيب");
    expect(validateRoomQrData("tarneeb://local?host=999.1.1.1&port=42872&room=A&key=B").message).toContain("عنوان شبكة محلية");
    expect(validateRoomQrData("tarneeb://local?host=192.168.1.1&port=80&room=A&key=B").message).toContain("منفذ اتصال");
  });
});
