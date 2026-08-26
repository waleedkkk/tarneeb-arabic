import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const soundHook = readFileSync(join(root, "lib/tarneeb/use-game-sounds.ts"), "utf8");
const trickSound = join(root, "assets/sounds/trick-win.mp3");
const cardSound = join(root, "assets/sounds/card-place.mp3");

describe("مؤثرات صوت اللعبة", () => {
  it("يربط حسم اللمّة بملف مستقل وقابل للتشغيل عن صوت رمي البطاقة", () => {
    expect(soundHook).toContain('const trickSource = require("../../assets/sounds/trick-win.mp3")');
    expect(soundHook).toContain('const cardSource = require("../../assets/sounds/card-place.mp3")');
    expect(soundHook).toContain("playTrick: useCallback(() => replay(trickPlayer, enabled, profile)");
    expect(existsSync(trickSound)).toBe(true);
    expect(statSync(trickSound).size).toBeGreaterThan(1024);
    expect(trickSound).not.toBe(cardSound);
  });
});
