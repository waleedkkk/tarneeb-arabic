import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";

const shuffleSource = require("../../assets/sounds/card-shuffle.mp3");
const cardSource = require("../../assets/sounds/card-place.mp3");
const trickSource = require("../../assets/sounds/trick-win.mp3");
const timerAlertSource = require("../../assets/sounds/timer-alert.mp3");

function replay(player: ReturnType<typeof useAudioPlayer>, enabled: boolean) {
  if (!enabled) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // يظل اللعب متاحًا إذا رفض الجهاز تشغيل الصوت أو قاطعه.
  }
}

export function useGameSounds(enabled: boolean) {
  const shufflePlayer = useAudioPlayer(shuffleSource);
  const cardPlayer = useAudioPlayer(cardSource);
  const trickPlayer = useAudioPlayer(trickSource);
  const timerAlertPlayer = useAudioPlayer(timerAlertSource);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  return {
    playShuffle: useCallback(() => replay(shufflePlayer, enabled), [enabled, shufflePlayer]),
    playCard: useCallback(() => replay(cardPlayer, enabled), [enabled, cardPlayer]),
    playTrick: useCallback(() => replay(trickPlayer, enabled), [enabled, trickPlayer]),
    playTimerAlert: useCallback(() => replay(timerAlertPlayer, enabled), [enabled, timerAlertPlayer]),
  };
}
